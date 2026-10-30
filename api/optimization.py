"""Shared Week 3 optimizer used by the notebook and REST service."""
from decimal import Decimal
import numpy as np
import pandas as pd
from scipy.optimize import linprog
from scipy.sparse import csc_matrix

def cents(value, name, positive=False):
    """Keep the budget exact: dollar inputs must have at most two decimals."""
    amount = Decimal(str(value))
    if not amount.is_finite() or amount < 0 or (positive and amount == 0):
        raise ValueError(f'{name} must be finite and {"positive" if positive else "nonnegative"}.')
    scaled = amount * 100
    if scaled != scaled.to_integral_value():
        raise ValueError(f'{name} must have at most two decimal places.')
    if scaled > 100_000_000_000:
        raise ValueError(f'{name} is too large.')
    return int(scaled)


def allocate_email(rows, budget=5000, email_cost=0.10):
    """Maximize predicted incremental spend; one email or no email per row.

    Both email types have the same user-assumed cost. For each customer we
    can first choose the better email, then solve a cardinality linear program.
    This reduction is exact ONLY for equal action costs and no extra constraints.
    """
    budget_cents = cents(budget, 'Budget')
    cost_cents = cents(email_cost, 'Email cost', positive=True)
    required = ['customer_id', 'spend_mens', 'spend_womens']
    if not set(required).issubset(rows.columns):
        raise ValueError('Missing customer_id or spending effect columns.')
    if rows.customer_id.isna().any() or not rows.customer_id.is_unique:
        raise ValueError('Customer IDs must be present and unique.')
    values = rows[['spend_mens', 'spend_womens']].to_numpy(dtype=float)
    if not np.isfinite(values).all():
        raise ValueError('Spending effects must be finite.')
    result = rows.copy().reset_index(drop=True)
    best = values.max(axis=1) if len(rows) else np.array([])
    best_arm = np.where(values[:, 0] >= values[:, 1], 'Mens E-Mail', 'Womens E-Mail')
    capacity = min(len(rows), budget_cents // cost_cents)
    eligible = np.flatnonzero(best > 0)
    chosen = np.zeros(len(rows), dtype=bool)
    solver_message, gap = 'No positive affordable action; no email selected.', 0.0
    if capacity and len(eligible):
        # Binary z_i: send the customer's better email (1) or no email (0).
        # Minimize the negative effect because scipy.optimize.linprog minimizes.
        # The unit-cost cardinality constraint has an integral polytope.
        # HiGHS interior-point crossover returns a vertex, so this LP has whole-customer decisions.
        fit = linprog(c=-best[eligible], A_ub=csc_matrix(np.ones((1, len(eligible)))),
                      b_ub=[capacity], bounds=(0, 1), method='highs-ipm',
                      options={'time_limit': 60, 'presolve': False})
        if not fit.success or fit.status != 0:
            raise RuntimeError(f'Optimizer did not certify an optimum: {fit.message}')
        if not np.allclose(fit.x, np.rint(fit.x), atol=1e-6):
            raise RuntimeError('Solver returned non-integer decisions.')
        solver_value = float(best[eligible] @ np.rint(fit.x))
        # Independent exact solution for this equal-cost special case.
        # Stable tie rule: effect descending, then source row ID ascending.
        order = sorted(eligible, key=lambda i: (-best[i], str(result.customer_id.iloc[i])))
        selected = order[:capacity]
        canonical_value = float(best[selected].sum())
        if not np.isclose(solver_value, canonical_value, rtol=1e-8, atol=1e-8):
            raise AssertionError('SciPy and independent equal-cost solution disagree.')
        chosen[selected] = True
        solver_message, gap = fit.message, 0.0
    result['recommended_action'] = np.where(chosen, best_arm, 'No E-Mail')
    result['allocated_cost'] = chosen.astype(int) * cost_cents / 100
    result['predicted_incremental_revenue'] = np.where(chosen, best, 0)
    result['predicted_revenue_less_email_cost'] = result.predicted_incremental_revenue - result.allocated_cost
    result['reason'] = np.where(chosen, 'Selected within budget',
                              np.where(best <= 0, 'No positive predicted revenue effect', 'Budget limit'))
    spent_cents = int(chosen.sum()) * cost_cents
    assert spent_cents <= budget_cents
    assert result.customer_id.is_unique
    assert (result.loc[chosen, 'predicted_incremental_revenue'] > 0).all()
    revenue = float(result.predicted_incremental_revenue.sum())
    summary = {'customers': len(rows), 'budget': budget_cents / 100,
               'email_cost': cost_cents / 100, 'contacted': int(chosen.sum()),
               'mens': int((result.recommended_action == 'Mens E-Mail').sum()),
               'womens': int((result.recommended_action == 'Womens E-Mail').sum()),
               'no_email': int((~chosen).sum()), 'allocated_cost': spent_cents / 100,
               'unused_budget': (budget_cents - spent_cents) / 100,
               'predicted_incremental_revenue': revenue,
               'predicted_revenue_less_email_cost': revenue - spent_cents / 100,
               'solver_status': 'optimal', 'solver_message': solver_message, 'optimality_gap': gap}
    return result, summary


def comparison_table(rows, summary):
    """All benefits are model predictions, not measured campaign returns."""
    n, k = len(rows), summary['contacted']
    cost = summary['email_cost']
    random_revenue = float(rows[['spend_mens', 'spend_womens']].to_numpy().mean() * k) if n else 0.
    records = [dict(strategy='Optimized', revenue=summary['predicted_incremental_revenue'],
                    cost=summary['allocated_cost'], feasible=True),
               dict(strategy='Random customers + random email (expected)', revenue=random_revenue,
                    cost=k * cost, feasible=True),
               dict(strategy='No email', revenue=0., cost=0., feasible=True)]
    for arm in ['mens', 'womens']:
        records.append(dict(strategy=f'Blanket {arm} email', revenue=float(rows[f'spend_{arm}'].sum()),
                            cost=n * cost, feasible=n * cents(cost, 'Cost') <= cents(summary['budget'], 'Budget')))
    table = pd.DataFrame(records)
    table['revenue_less_email_cost'] = table.revenue - table.cost
    return table
