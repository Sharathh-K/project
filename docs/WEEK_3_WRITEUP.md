# Week 3 — Prescriptive optimization and allocation matrix

## What the brief asks for

The Week 3 pictures ask for a SciPy solver that maximizes predicted revenue within a strict budget and a customer allocation table. The supplied EconoCausal guide (section 6) explicitly maps discounts to email actions for Hillstrom and asks us to assume a cost per email. Consequently the actions here are Men’s Email, Women’s Email and No Email. No invented $10/$20 discount effects are used.

## What we built and why

Notebook `07_budget_optimization.ipynb` continues after the audit. It reads the audited score snapshot, checks raw-data identity, records input hashes, optimizes spending-effect estimates, compares planning strategies, explores budgets and costs, and exports recommendations.

We maximize predicted incremental revenue because the Week 3 objective is revenue. Visit uplift is not converted to dollars: the separate spending model supplies the dollar effects. Both spending rankings were uncertain on held-out data, so all results remain experimental planning predictions.

For each customer, choose the better of the two predicted email effects. If neither is positive, choose No Email. With one common email cost, the budget is an integer contact limit. SciPy `linprog` with HiGHS interior-point and crossover solves the bounded cardinality problem. Its integral vertices permit whole-customer solutions; we explicitly verify 0/1 values and compare the objective with an independent exact top-K rule. This special-case proof does not extend to unequal costs or additional constraints.

Budgets and costs use integer cents. Zero budget selects nobody, invalid costs are rejected, each customer receives at most one action, and unused budget is allowed. Stable tie handling chooses Men’s Email for equal action effects and then source-row ID for tied customers.

## Simple example

A has predicted effects $0.80 for Men’s Email and $0.30 for Women’s Email. B has $0.20 and $0.90. C has negative effects. D has $0.40 and $0.10. At $0.10 per email with a $0.20 budget, choose A’s Men’s Email and B’s Women’s Email. The predicted extra revenue is $1.70 and the assumed cost is $0.20. These are illustrative effects, not measured campaign returns.

## Dashboard: Budget allocation

- Budget and cost per email: editable assumptions, shared with Start & data.
- Allocation population: all loaded, test, training or new scored customers. Other Customer scores filters do not silently alter the allocation.
- Summary: contacts, spend, remaining budget, predicted extra revenue, and revenue less email cost.
- Allocation chart: counts of Men’s Email, Women’s Email and No Email recommendations.
- Strategy comparison: optimized, equal-contact random targeting, no email, and blanket email choices. Over-budget blanket strategies are marked infeasible.
- Allocation matrix: every customer’s action, cost, predicted benefit and reason. Action/ID filters only filter the view, not the budget decision.
- CSV export: all rows matching the table filters, not only the current page.

The browser uses the independently tested exact equal-cost rule for live updates. It does not call SciPy or an API in the browser. The Python notebook is the SciPy reference implementation. Browser tests compare its decisions against executed SciPy outputs, including all 64,000 rows.

## What the results mean

A model-based optimizer will normally outperform random selection on the same predictions it maximizes. That comparison is a planning benchmark, not an independent causal evaluation. The Week 2 held-out uplift evidence and the Week 2 audit warnings remain unchanged. All-row plans contain training customers and are retrospective demonstrations.

Revenue minus email costs is not profit; product margins and other costs are unavailable. Neither positive predictions nor optimization identifies certain individual persuadables. IDs are source-row labels, not contact addresses. No email is sent by this project.

The executed default ($5,000 budget, $0.10 per email, all 64,000 profiles) selects 50,000 customers: 29,252 Men’s Emails, 20,748 Women’s Emails and 14,000 No Email actions. Allocated cost is exactly $5,000. Predicted extra revenue is $49,659.71; revenue less assumed email costs is $44,659.71, not profit. Equal-contact random targeting has predicted extra revenue of $24,125.30. Blanket targeting costs $6,400 and is infeasible under this budget. These are retrospective model-based figures, not measured outcomes.

The executed notebook and `dashboard/public/results/optimization_report.json` contain the actual default results, solver status, budget scenarios and score fingerprints. `allocation_default.csv` contains the default recommendations.

## How to reproduce

1. Pull the repository and select your project Python kernel.
2. Run `07_budget_optimization.ipynb` from top to bottom. Its default uses the committed snapshot and does not require retraining.
3. To use freshly trained results instead, run notebooks 01–06, run `python dashboard/export_data.py`, then run notebook 07.
4. Run `cd dashboard` and `npm run dev`. Open Budget allocation. Rebuild if using production preview.
5. Run Python verification from the repository root: `python -m unittest discover -s tests -p 'test_week3.py'`. In dashboard run `npm test` and `npm run build`.

## Week 4 plan (not implemented in Week 3)

- REST endpoints for validated scoring and allocation, with documented request/response examples and model provenance.
- A drift detector comparing incoming baseline features with training reference data; distinguish data drift from proven effect changes.
- Loading/error handling and final plain-English summaries, with any savings comparisons using explicit assumptions and feasible baselines.
- Package and document the service and dashboard for reproducible local operation. A public deployment and automatic email sending are not implied.

## Viva script

“Week 2 estimated how emails might change customer spending. In Week 3, I used those estimates with a budget to recommend one email or no email for each customer. SciPy solves the budget problem, and the dashboard shows the choices and costs. I checked the solution independently and kept predictions separate from guaranteed business results.”
