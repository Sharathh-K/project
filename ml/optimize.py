"""EconoCausal - Week 3: prescriptive optimization (SciPy MILP).
Run from repo root:  python ml/optimize.py --budget 5000 --types 5 10
Output: EconoCausal/results/prescription.csv + prescription_summary.json
"""
import argparse, json
from pathlib import Path
import numpy as np
import pandas as pd
from scipy.optimize import milp, LinearConstraint, Bounds
from scipy.sparse import identity, kron, csr_matrix, vstack

IN_PATH = Path("EconoCausal/results/ite_results_visit.csv")
OUT_DIR = Path("EconoCausal/results")
POOL = 5000          # only the top customers by ITE are considered
VALUE_PER_VISIT = 25.0   # ASSUMPTION: $ value of one extra visit
K = 3.0              # ASSUMPTION: lift(d) = ITE * (1 - exp(-d / K))


def lift(d):
    return 1 - np.exp(-np.asarray(d, float) / K)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--budget", type=float, default=5000)
    p.add_argument("--types", type=int, nargs="+", default=[5, 10])
    p.add_argument("--count", type=int, default=None, help="max coupons")
    a = p.parse_args()
    types = np.array(sorted(a.types), float)

    df = pd.read_csv(IN_PATH)
    df = df[df["split"] == "test"]  # held-out customers only
    best = df.sort_values("ite_pred", ascending=False).drop_duplicates("customer_id")
    pool = best[best["ite_pred"] > 0].head(POOL).reset_index(drop=True)
    n, k = len(pool), len(types)

    uplift = pool["ite_pred"].values[:, None] * lift(types)[None, :]   # n x k
    gain = uplift * VALUE_PER_VISIT - types[None, :]                   # net $
    cons = [
        LinearConstraint(kron(identity(n), np.ones((1, k)), format="csr"), -np.inf, 1),
        LinearConstraint(csr_matrix(np.tile(types, n)), -np.inf, a.budget),
    ]
    if a.count:
        cons.append(LinearConstraint(csr_matrix(np.ones((1, n * k))), -np.inf, a.count))

    res = milp(-gain.ravel(), constraints=cons, integrality=np.ones(n * k),
               bounds=Bounds(0, 1))
    if not res.success:
        raise SystemExit("Optimizer failed: " + res.message)

    x = res.x.reshape(n, k).round()
    take = x.sum(1) > 0.5
    j = x.argmax(1)[take]
    out = pd.DataFrame({
        "customer_id": pool.loc[take, "customer_id"].values,
        "arm": pool.loc[take, "arm"].values,
        "discount": types[j],
        "ite": pool.loc[take, "ite_pred"].values.round(4),
        "expected_extra_visit": uplift[take, j].round(4),
        "net_gain": gain[take, j].round(2),
    }).sort_values("net_gain", ascending=False)
    out.to_csv(OUT_DIR / "prescription.csv", index=False)

    # baseline: blanket targeting, same budget, biggest coupon, random customers
    big = types.max()
    nb = int(a.budget // big)
    base_gain = nb * (best["ite_pred"].mean() * lift(big) * VALUE_PER_VISIT - big)
    summary = {
        "budget": a.budget, "spent": float(out["discount"].sum()),
        "coupons": int(len(out)), "net_gain": float(out["net_gain"].sum()),
        "extra_visits": float(out["expected_extra_visit"].sum()),
        "blanket_gain": float(base_gain),
        "by_type": {str(int(t)): int((out["discount"] == t).sum()) for t in types},
        "assumption": f"lift = ITE*(1-exp(-d/{K})), visit worth ${VALUE_PER_VISIT}",
    }
    (OUT_DIR / "prescription_summary.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
