# EconoCausal: Dynamic Pricing via Double Machine Learning

## Project Overview

EconoCausal is a causal machine learning project that supports data-driven marketing decisions. Rather than only predicting which customers are likely to purchase, it estimates how a customer's chance of buying changes when they receive a marketing treatment. These estimates are used to decide where a limited campaign budget is best spent.

The project combines causal inference, machine learning, evaluation, optimization, a REST API and a dashboard in one workflow.

## Business Problem

Traditional predictive models estimate outcomes such as purchase probability or expected spending. Customers who are already likely to purchase may not need a marketing push. EconoCausal estimates the incremental effect of the treatment, to separate likely purchasers from customers whose behavior changes because of the campaign ("Persuadables").

The decision supported here is which customers receive a Mens e-mail, a Womens e-mail or no e-mail under a strict budget. The dataset contains no discounts, so this implementation does not assign discount amounts. Recommendations are estimates, not guarantees of individual customer behavior.

## Dataset

The project uses the **Kevin Hillstrom MineThatData E-Mail Analytics / Data Mining Challenge (2008)** dataset: 64,000 customer records from a randomized e-mail marketing experiment, with customer characteristics, an assigned campaign group and outcomes measured after the campaign.

### Main Variables

- `recency`: time since the customer's most recent purchase.
- `history_segment`: category of historical customer spending.
- `history`: historical spending amount.
- `mens`, `womens`: indicators of prior men's / women's merchandise purchasing.
- `zip_code`: customer geographic category (Urban, Suburban, Rural).
- `newbie`: indicator for a new customer.
- `channel`: customer acquisition channel (Phone, Web, Multichannel).
- `segment`: assigned marketing group (`Mens E-Mail`, `Womens E-Mail`, `No E-Mail`).
- `visit`, `conversion`, `spend`: outcomes measured after the campaign.
- `history_floor` (derived): 1 when `history` equals the dataset minimum ($29.99), otherwise 0.

The experiment does **not** record discount amounts, discount costs or profit margins. E-mail campaign effects are estimated from the data. The optimization step uses clearly labeled assumptions (e-mail cost and revenue per conversion). Simulated effects must not be presented as findings from this dataset.

## Project Status

| Component | Status |
|---|---|
| Data preparation and EDA | Done |
| Causal graph (DoWhy) and audit | Done |
| Double ML models (LinearDML, CausalForestDML, ForestDRLearner) | Done, ForestDRLearner used downstream |
| Budget optimization (SciPy linear program) | Done and validated |
| REST API (FastAPI) and data drift detector | Done |
| Dashboard (React) | Day 1 complete: navigation, CSV upload, API connection and budget optimization |

## Key Results

- **Average effects (randomized experiment):** Mens e-mail +0.68 percentage points of conversion (95% CI 0.50 to 0.86), Womens e-mail +0.31 points (95% CI 0.15 to 0.47).
- **Optimization at a $1,600 budget** (25% of the cost of e-mailing all 64,000 customers with Mens): the plan sends 15,922 Mens and 52 Womens e-mails. Predicted extra revenue is $20,666, and each extra $1 of budget returns about $10 at the margin (shadow price).
- **Robustness:** with the audit's lower-bound effects or an average of two forest models, keeping the original plan loses only 0.12% and 0.37% of revenue.
- **Validation on real outcomes** (inverse propensity weighting with bootstrap intervals): the plan's incremental revenue is about $11.2k to $11.6k (95% intervals roughly $2k to $22k), about half of the predicted figure. Random Mens targeting scored $15.5k to $16.1k. The difference between the plan and random targeting is about -$4.3k to -$4.4k, and its 95% interval includes 0. Targeting by predicted uplift is therefore not shown to beat random targeting with this data. The average Mens effect is confirmed by the experiment.

## Repository Structure

```
project/
├── api/             REST API (FastAPI): main.py
├── src/             engine code: dml_pipeline.py, optimizer.py, drift.py
├── Models/          saved ForestDRLearner pipeline and drift reference profile
├── Notebooks/       EDA, causal graph and audit, Double ML models, budget optimization
├── Data/            Raw and Processed data
├── Reports/         audit outputs
├── tests/           smoke and drift tests
├── dashboard/       React app (in progress)
├── requirements.txt
└── requirements-notebooks.txt
```

## Setup

Developed with Python 3.14 on Windows.

```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt              # API, optimizer and tests
pip install -r requirements-notebooks.txt    # only if you want to run the notebooks
```

The causal-graph notebook uses Graphviz, which has to be installed separately on your system.

## Run the API

```
uvicorn api.main:app --reload
```

Interactive docs: http://127.0.0.1:8000/docs

| Endpoint | What it does |
|---|---|
| `GET /health` | Model loaded, arms and expected input fields |
| `POST /predict` | Estimated increase in purchase probability for a Mens and a Womens e-mail, per customer |
| `POST /optimize` | Best e-mail per customer under a budget, with expected revenue, shadow price and cost saving vs e-mailing everyone |
| `POST /drift` | Compares an upload with the training data and warns if customer behavior looks different |

`history_floor` is optional in requests and is computed from `history` when omitted.

## Run the dashboard

In a second terminal, start the React app:

```
cd dashboard
npm install
npm run dev
```

Open the Vite URL (by default http://localhost:5173). The dashboard checks the API at
`http://127.0.0.1:8000`; set `VITE_API_BASE_URL` in `dashboard/.env.local` to use a
different API address. Restart Vite after changing the environment file.

### Day 1 requirements and delivery

- Provide navigation between the campaign workspace and its methodology.
- Parse and validate customer CSVs in the browser before sending them to the API.
- Accept the model's pre-campaign fields (`recency`, `history`, `mens`, `womens`,
  `newbie`, `zip_code`, `channel`), with optional `Customer ID`/`customer_id` and
  `history_floor`. Ignore other columns, including post-campaign outcomes.
- Show API connection and model status, and report connection, validation and
  optimization errors instead of showing success-shaped fallbacks.
- Let the user set the total budget and per-arm e-mail costs; use the project
  defaults ($1,600, $0.10 and $0.15). The API's $113.83 revenue-per-conversion
  default is not an editable dashboard input.
- Call `POST /optimize` and show selected and unselected customer counts, the
  per-arm totals, and paginated allocations that can be filtered by e-mail arm.
- Keep estimates and the cost/revenue assumptions clearly labeled as such.

The dashboard currently accepts up to 100,000 rows, matching the API limit. Later
dashboard work can add the README-planned uplift/Qini visualizations and broader
evaluation views.

## Tests

```
python src/drift.py          # builds Models/drift_reference.json
python -m tests.smoke_test
python -m tests.drift_test
```

## Methodology

### 1. Data Preparation

Load the dataset, validate the schema and check data quality. Only information available before campaign assignment is used as a pre-treatment feature. Visits, conversions and campaign-period spending are outcomes, not controls.

### 2. Causal Inference

Each e-mail group is compared with the `No E-Mail` control group, with `conversion` as the main outcome. The original campaign is randomized, so assignment supports causal analysis. The design is still checked before drawing conclusions.

### 3. Double Machine Learning with EconML

Double ML models the outcome and treatment-assignment processes and combines them to estimate treatment effects while adjusting for observed pre-treatment features. Four estimators were compared (LinearDML with LightGBM, LinearDML with a random forest, CausalForestDML, ForestDRLearner). The ForestDRLearner is used downstream, with cross-fitted (out-of-fold) effects for all 64,000 customers.

### 4. Causal Modeling and Robustness with DoWhy

DoWhy is used to specify the causal graph, identify the effect and run refutation checks. A causal graph documents assumptions and does not prove them. Refutation tests can reveal sensitivity but cannot rule out unobserved confounding.

### 5. Evaluation and Uplift Analysis

Evaluation uses treatment-effect estimates with uncertainty, uplift and Qini curves, and comparisons with experimental baselines. Policies are evaluated with inverse propensity weighting, which respects the randomized design.

### 6. Optimization

A linear program (SciPy `linprog`, HiGHS) assigns each customer a Mens e-mail, a Womens e-mail or no e-mail. It maximizes expected extra revenue (estimated uplift x revenue per conversion) subject to total e-mail cost within the budget and at most one e-mail per customer. Assumptions: $0.10 per Mens e-mail, $0.15 per Womens e-mail, $113.83 revenue per conversion (average spend of converters). A budget curve, shadow price and robustness scenarios accompany the main result.

### 7. API and Drift Detection

The API serves predictions and the optimizer. The drift detector compares each upload with the training data using the population stability index (below 0.10 ok, 0.10 to 0.25 watch, 0.25 and above alert), also on the predicted uplifts. Uploads under 500 rows are flagged as too small. It detects changes in who the customers are and in the predicted uplifts. It cannot see a change in how customers respond without outcome data.

### 8. Dashboard

The React dashboard presents uploads and budget settings, uplift and Qini curves, customer-level estimates, the allocation table and plain-language summaries. It distinguishes observed experimental results from model estimates and assumptions.

## Technology Stack

- **Python:** pandas, NumPy, scikit-learn, LightGBM
- **EconML:** causal machine learning and treatment-effect estimation
- **DoWhy:** causal graphs, identification and refutation checks
- **SciPy:** budget optimization
- **FastAPI and Uvicorn:** REST API
- **React and Plotly:** dashboard

## Limitations and Responsible Interpretation

- Treatment effects are estimates, not guarantees for individual customers.
- Predicted revenue is optimistic. Report it as a range, with the experiment-based estimate as the central figure.
- Targeting by predicted uplift is not shown to beat random targeting with this data. Most of the value comes from choosing the cheaper, stronger e-mail and from setting the budget.
- Causal conclusions depend on the experimental design, correct treatment and outcome definitions, data quality and analysis choices. Passing refutation tests does not prove the absence of unobserved confounding.
- The Hillstrom data supports e-mail campaign analysis, not the effect of specific discount amounts. E-mail costs and revenue per conversion are assumptions.
- Budget optimization is meaningful only when its objective, costs, constraints and uncertainty are defined.
- Customer data should be handled according to applicable privacy, security and organizational requirements.

## Summary

EconoCausal combines causal inference and machine learning to study the incremental effect of marketing e-mails and to allocate a limited budget. The Hillstrom experiment supports the estimation, evaluation and optimization, and the API and dashboard present the results while separating evidence from assumptions.