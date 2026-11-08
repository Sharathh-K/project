# Week 3 Write-up — Budget Optimization and Customer Allocation

**Project:** EconoCausal: Dynamic Pricing via Double Machine Learning

**Week 3 focus:** Prescriptive optimization with SciPy and an allocation matrix in the React dashboard

**Continuation:** `06_mid_project_audit.ipynb` → `07_budget_optimization.ipynb`

## 1. Objective from the project pictures

The Week 3 plan asks us to maximize predicted revenue within a strict marketing budget and build a table showing the recommended offer for each customer.

The supplied Hillstrom dataset contains men's email, women's email and no-email assignments. It does not contain discount amounts. Following section 6 of the supplied project guide, we therefore use email as the action and assign an explicit, editable cost per email. We do not invent effects for $10 or $20 discounts.

**In simple words:** Week 2 estimated how much an email might help. Week 3 decides whom to contact and which email to recommend when the shop has limited money.

## 2. Work completed

### A. Continued from the existing causal analysis

Created `07_budget_optimization.ipynb` to use the saved customer-effect scores and audit evidence from the earlier work. The notebook checks source-data identity and records the score and report fingerprints so the allocation can be traced to its inputs.

The optimizer uses the predicted effects on **spending**, because its objective is additional revenue. Visit probabilities are not converted into dollars. The earlier audit and uncertainty warnings remain relevant.

### B. Implemented the SciPy budget optimizer

For each customer, the available decisions are:

- Recommend Men's Email.
- Recommend Women's Email.
- Recommend No Email.

The objective is to maximize the sum of predicted additional spending, subject to two rules: total email cost must stay within the budget, and each customer receives at most one recommendation.

Both email types use the same assumed cost; No Email costs zero. Under this assumption, we first identify each customer's better email. Customers with no positive predicted spending effect are not selected. The budget determines how many positive-effect customers can be contacted.

SciPy's `linprog` solver solves this equal-cost allocation problem. The implementation verifies that decisions are whole customers and checks the resulting objective against an independent highest-benefit-first calculation. This simplification applies to equal action costs; unequal costs or extra constraints would require revisiting the optimization.

Budgets are calculated in integer cents to avoid rounding-related overspending. Zero budget selects nobody. Invalid inputs and duplicate IDs are rejected. Unused budget is allowed when additional contacts have no positive predicted benefit.

The shared implementation now lives in `api/optimization.py`, imported by notebook 07 and later reused by Week 4. This keeps the calculation consistent without maintaining two Python implementations.

### C. Compared strategies and explored assumptions

Compared the optimized plan with:

- Random customers receiving a random email, using the same contact count and cost.
- Sending no email.
- Sending the same email to everybody.

Blanket strategies that exceed the budget are marked infeasible. The notebook also explores different budgets and assumed email costs, and saves the resulting tables and figures.

The random benchmark is an analytical expectation: choose the same number of customers uniformly and give each a 50/50 chance of either email. It does not require exactly half to receive each type, and it is not an observed campaign or a single simulated random draw.

These are comparisons using model predictions. A higher optimized prediction does not independently prove that a real campaign will earn more revenue.

### D. Built the Budget allocation dashboard page

The React and Plotly page provides:

- Editable budget and cost per email.
- Population selection: all loaded, test, training or new scored customers.
- Summary values for selected customers, planned cost, unused budget and predicted additional revenue.
- A chart showing counts of Men's Email, Women's Email and No Email recommendations.
- A strategy-comparison table and chart.
- An allocation matrix showing each customer's ID, recommendation, cost, predicted benefit and reason.
- Action/ID filters, pagination and CSV download of every matching row—not just the visible page.

The browser uses the mathematically equivalent equal-cost rule for immediate updates. Tests compare its decisions with the SciPy notebook, including the full 64,000-customer dataset. Filtering the allocation table changes the view, not the underlying budget decision.

## 3. Simple example

The following numbers are illustrative, not results from four identified Hillstrom customers.

| Customer | Extra spend predicted for Men's Email | Extra spend predicted for Women's Email | Better action |
|---|---:|---:|---|
| A | $0.80 | $0.30 | Men's Email |
| B | $0.20 | $0.90 | Women's Email |
| C | −$0.10 | −$0.20 | No Email |
| D | $0.40 | $0.10 | Men's Email |

With a **$0.20 budget** and **$0.10 cost per email**, only two customers can be contacted. The plan chooses A and B, spending exactly $0.20 for a predicted additional revenue of $1.70. Customer D is excluded because of the budget, while C is excluded because both predicted effects are negative.

## 4. Results from the saved default run

These figures were checked against `dashboard/public/results/optimization_report.json`.

| Item | Result |
|---|---:|
| Customer profiles considered | 64,000 |
| Budget | $5,000.00 |
| Assumed cost per email | $0.10 |
| Customers selected | 50,000 |
| Men's Email recommendations | 29,252 |
| Women's Email recommendations | 20,748 |
| No Email recommendations | 14,000 |
| Allocated cost | $5,000.00 |
| Unused budget | $0.00 |
| Predicted additional revenue | $49,659.71 |
| Predicted revenue less assumed email costs | $44,659.71 |
| Equal-contact random strategy: predicted additional revenue | $24,125.30 |
| Cost of emailing all 64,000 customers | $6,400.00 — exceeds the budget |

**Interpretation:** the solver produces an optimal plan for the specified prediction-based, equal-cost problem. These are retrospective planning estimates, not observed campaign returns. Revenue less email cost is not profit because product margins and other costs are unavailable. The objective maximizes additional revenue, not revenue minus contact cost: a positive effect smaller than the assumed email cost can still be selected if capacity remains. A net-return objective would be a different optimization requirement.

## 5. Validation and limitations

Checked budget limits, zero budgets, invalid costs, duplicate IDs, negative effects, deterministic ties and whole-customer decisions. Small examples were checked against exhaustive enumeration, and dashboard allocations were compared with SciPy results at full dataset scale.

Both spending-ranking intervals include zero, so spending-targeting superiority remains uncertain. The women's-email subset audit warning is also retained. Plans using all 64,000 profiles include training customers and are demonstrations rather than independent evaluations. Positive scores do not identify guaranteed individual persuadables.

Generated IDs identify dataset rows, not contact addresses. The project recommends actions; it does not send emails. A new randomized pilot would be needed to measure actual business gains.

## 6. Weekly outcome and viva explanation

Week 3 turned causal-effect estimates into an actionable, budget-respecting customer plan. The dashboard makes the choices, costs and assumptions visible so a manager can inspect the proposed campaign.

> “In Week 3, I used the predicted email effects from our causal models to recommend one email or no email for each customer. I implemented a SciPy optimizer that maximizes predicted additional spending without exceeding the marketing budget. I built a dashboard allocation table and tested the decisions against an independent calculation. The results are planning predictions, so I explain their uncertainty rather than promise guaranteed profit.”

The later REST API, drift detector and live scoring workflow are documented separately in the [Week 4 write-up](WEEK_4_WRITEUP.md).

**Documentation review:** 5 November 2026. Numbers above describe the saved default run, not a newly executed campaign or newly retrained model. See [final review evidence](FINAL_REVIEW_CHECKS.json) for the earlier recorded verification.
