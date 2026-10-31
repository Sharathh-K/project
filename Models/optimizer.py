import numpy as np
import pandas as pd
from scipy import sparse
from scipy.optimize import linprog


def optimize_campaign(df, cost, budget, value_per_conv, tol=1e-6):
    """Assign each customer a Mens e-mail, a Womens e-mail or no e-mail.

    Maximises total expected extra revenue subject to total e-mail cost <= budget
    and at most one e-mail per customer.

    df              needs columns ite_mens and ite_womens (estimated increase in
                    purchase probability), plus any id columns you want to keep
    cost            {"Mens E-Mail": dollars, "Womens E-Mail": dollars}
    budget          total e-mail budget in dollars
    value_per_conv  average revenue of one conversion in dollars
    """
    c_m, c_w = cost["Mens E-Mail"], cost["Womens E-Mail"]
    n = len(df)
    rev_m = df["ite_mens"].to_numpy() * value_per_conv
    rev_w = df["ite_womens"].to_numpy() * value_per_conv

    ident = sparse.identity(n, format="csr")
    A_ub = sparse.vstack([
        sparse.csr_matrix(np.concatenate([np.full(n, c_m), np.full(n, c_w)])),  # total cost <= budget
        sparse.hstack([ident, ident], format="csr"),                            # one e-mail per customer
    ], format="csr")
    b_ub = np.concatenate([[budget], np.ones(n)])

    res = linprog(-np.concatenate([rev_m, rev_w]), A_ub=A_ub, b_ub=b_ub,
                  bounds=(0, 1), method="highs")
    if res.status != 0:
        raise RuntimeError(f"solver did not find an optimal solution: {res.message}")

    x_m, x_w = res.x[:n], res.x[n:]
    send_m, send_w = x_m > 1 - tol, x_w > 1 - tol
    fractional = ((x_m > tol) & (x_m < 1 - tol)) | ((x_w > tol) & (x_w < 1 - tol))

    assigned = np.where(send_m, "Mens E-Mail", np.where(send_w, "Womens E-Mail", "No E-Mail"))
    has_gain = (df["ite_mens"].to_numpy() > 0) | (df["ite_womens"].to_numpy() > 0)

    out = df.copy()
    out["assigned_arm"] = assigned
    out["expected_uplift"] = np.where(send_m, df["ite_mens"], np.where(send_w, df["ite_womens"], 0.0))
    out["expected_revenue"] = np.where(send_m, rev_m, np.where(send_w, rev_w, 0.0))
    out["cost"] = np.where(send_m, c_m, np.where(send_w, c_w, 0.0))
    out["group"] = np.where(assigned != "No E-Mail", "Persuadable",
                            np.where(has_gain, "Not selected (budget)", "No positive uplift"))

    summary = {
        "budget": float(budget),
        "total_cost": float(out["cost"].sum()),
        "total_expected_revenue": float(out["expected_revenue"].sum()),
        "mens_emails": int(send_m.sum()),
        "womens_emails": int(send_w.sum()),
        "shadow_price": float(-res.ineqlin.marginals[0]),
        "fractional_dropped": int(fractional.sum()),
    }
    return out, summary
