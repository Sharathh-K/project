# EconoCausal

### Budget-aware e-mail campaign optimization with causal machine learning

EconoCausal estimates how Mens and Womens promotional e-mails change customer
conversion behavior, then uses those estimates to build a campaign plan under a
fixed budget. It brings causal analysis, model evaluation, constrained
optimization, a REST API, and a React dashboard into one workflow.

> **Decision support, not a guarantee:** individual treatment effects and
> revenue are model estimates. Campaign costs and revenue per conversion are
> assumptions supplied to the optimizer.

---

## Contents

- [Project at a glance](#-project-at-a-glance)
- [Dataset](#-dataset)
- [Key findings](#-key-findings)
- [Repository structure](#-repository-structure)
- [Getting started](#-getting-started)
- [Run the dashboard](#-run-the-dashboard)
- [API reference](#-api-reference)
- [Modeling workflow](#-modeling-workflow)
- [Limitations and responsible use](#-limitations-and-responsible-use)
- [Technology](#-technology)

## 📌 Project at a glance

Traditional response models predict who is likely to purchase. EconoCausal
focuses on a different question: **whose behavior is estimated to change because
of a campaign e-mail?** The optimizer uses the estimated incremental effects to
choose one of three actions for each customer:

1. Send a Mens e-mail.
2. Send a Womens e-mail.
3. Send no e-mail.

The plan respects the total campaign budget and assigns at most one e-mail per
customer. It does not model discounts: the experiment contains no discount
amount, discount cost, or profit-margin information.

## 🗂️ Dataset

The analysis uses the **Kevin Hillstrom MineThatData E-Mail Analytics / Data
Mining Challenge (2008)** dataset: 64,000 customers from a randomized e-mail
marketing experiment. It includes pre-campaign customer characteristics,
randomized campaign assignments, and post-campaign outcomes.

| Variable | Description |
|---|---|
| `recency` | Time since the customer's most recent purchase |
| `history_segment` | Historical customer-spending category |
| `history` | Historical spending amount |
| `mens`, `womens` | Indicators of prior Mens/Womens merchandise purchases |
| `zip_code` | Urban, Suburban, or Rural customer category |
| `newbie` | Indicator for a new customer |
| `channel` | Phone, Web, or Multichannel |
| `segment` | Randomized campaign assignment: Mens E-Mail, Womens E-Mail, or No E-Mail |
| `visit`, `conversion`, `spend` | Outcomes measured after the campaign |
| `history_floor` | Derived indicator for customers at the dataset's minimum history value |

Only pre-campaign features are used to estimate customer-level effects.
Post-campaign outcomes are reserved for evaluation, not used as model inputs.

## 📊 Key findings

- **Average experimental effects:** Mens e-mail increased conversion by an
  estimated **0.68 percentage points** (95% CI: 0.50–0.86); Womens e-mail by
  **0.31 points** (95% CI: 0.15–0.47).
- **Illustrative $1,600 budget plan:** the optimizer assigns 15,922 Mens and 52
  Womens e-mails. Its predicted extra revenue is approximately **$20,666**,
  based on the configured e-mail costs and revenue-per-conversion assumption.
- **Robustness checks:** under the audited lower-bound effects and an average
  of two forest models, the original plan's estimated revenue decreases by
  0.12% and 0.37%, respectively.
- **Evaluation against observed outcomes:** inverse-propensity-weighted
  estimates put the plan's incremental revenue around $11.2k–$11.6k, with
  uncertainty intervals that include zero. Random Mens targeting is estimated
  at $15.5k–$16.1k. The plan has not been shown to outperform random targeting
  with this dataset.

These are experiment- and analysis-specific results, not guaranteed future
campaign performance.

## 🏗️ Repository structure

```text
project/
├── api/                         # FastAPI application and HTTP endpoints
│   ├── __init__.py
│   └── main.py
├── dashboard/                   # Vite + React user interface
│   ├── src/
│   │   ├── components/           # Results, charts, explorer, status and reports
│   │   ├── pages/                # Campaign planner and campaign tools
│   │   ├── api.js                # API client
│   │   ├── csv.js                # Browser-side CSV parsing and validation
│   │   ├── dataQuality.js        # Upload quality profiling
│   │   ├── exportTable.js        # CSV, Excel and PDF exports
│   │   ├── App.jsx
│   │   └── styles.css
│   ├── .env.example              # Dashboard API URL example
│   ├── package.json
│   └── vite.config.js
├── Data/
│   ├── Raw/                      # Source data
│   └── Processed/                # Analysis-ready data
├── Models/
│   ├── forestdr_pipe.joblib      # Trained ForestDRLearner pipeline
│   └── drift_reference.json      # Training-data drift profile
├── Notebooks/                    # EDA, causal audit, modeling and optimization
├── Reports/
│   ├── causal_audit/
│   ├── figures/
│   └── eda_summary.md
├── src/                          # Modeling, evaluation, optimization and drift
│   ├── dml_pipeline.py
│   ├── drift.py
│   ├── evaluation.py
│   └── optimizer.py
├── tests/                        # API, drift, evaluation and scenario tests
├── requirements.txt              # API and runtime dependencies
├── requirements-notebooks.txt    # Additional analysis dependencies
└── README.md
```

## 🚀 Getting started

### Prerequisites

- Python 3.14
- Node.js and npm
- Graphviz is required only for the causal-graph notebook.

### Install Python dependencies

From the project root, create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Install notebook dependencies only if you plan to run the notebooks:

```powershell
python -m pip install -r requirements-notebooks.txt
```

### Start the API

Run from the project root:

```powershell
uvicorn api.main:app --reload
```

The API is available at `http://127.0.0.1:8000`. Interactive OpenAPI
documentation is available at `http://127.0.0.1:8000/docs`.

### Run the tests

Run the backend tests from the project root:

```powershell
python -m pytest
```

The drift reference profile can be regenerated with:

```powershell
python src/drift.py
```

## 🖥️ Run the dashboard

In another terminal:

```powershell
cd dashboard
npm ci
npm run dev
```

Open the Vite URL printed in the terminal (usually
`http://localhost:5173`). The dashboard expects the API at
`http://127.0.0.1:8000` by default. To use a different API URL, copy
`dashboard/.env.example` to `dashboard/.env.local`, set
`VITE_API_BASE_URL`, and restart Vite.

The dashboard supports browser-side CSV validation and data-quality profiling,
budget-constrained campaign planning, customer lookup, budget scenarios,
segment summaries, evaluation curves, and CSV/Excel/PDF exports.

## 🔌 API reference

| Method and route | Purpose |
|---|---|
| `GET /health` | Reports model readiness, supported campaign arms, and input fields |
| `POST /predict` | Estimates Mens and Womens e-mail effects for customer features |
| `POST /optimize` | Builds a budget-constrained per-customer campaign plan |
| `POST /budget-scenarios` | Compares 2–7 budget limits while scoring customers once per request |
| `GET /evaluation/curves` | Returns held-out Qini and uplift curves with 90% bootstrap intervals |
| `POST /drift` | Compares uploaded customer data with the training-data profile |

`history_floor` is optional in API requests. When omitted, it is derived from
`history`.

## 🔬 Modeling workflow

1. **Prepare the data:** validate the dataset and separate pre-campaign
   characteristics from post-campaign outcomes.
2. **Estimate causal effects:** compare each e-mail arm with the No E-Mail
   control group using EconML Double Machine Learning estimators. The
   ForestDRLearner pipeline is used downstream.
3. **Audit assumptions:** use DoWhy to define the causal graph, identify the
   estimand, and run refutation checks. A causal graph describes assumptions;
   it does not prove them.
4. **Evaluate policies:** use randomized experimental outcomes, uplift and
   Qini curves, bootstrap uncertainty, and inverse propensity weighting.
5. **Optimize assignments:** use a SciPy linear program to maximize estimated
   incremental revenue subject to the budget and one-e-mail-per-customer
   constraints.
6. **Serve and monitor:** expose predictions and campaign plans through
   FastAPI; use population stability index checks to flag changes in uploaded
   customer features and predicted uplifts.

The optimizer's default assumptions are **$0.10 per Mens e-mail**, **$0.15 per
Womens e-mail**, and **$113.83 revenue per conversion**. They are editable in
the dashboard and should be treated as business inputs, not experimentally
measured campaign costs or profit.

## ⚠️ Limitations and responsible use

- Individual treatment effects are uncertain estimates, not promises about an
  individual customer's behavior.
- The project has not established that uplift-based targeting beats random
  targeting on this dataset. A positive model-estimated return is not proof of
  incremental business value.
- Campaign cost, conversion value, and optimization objectives materially
  affect the resulting plan.
- The experiment supports e-mail campaign analysis; it does not identify the
  effects of discounts or specific discount amounts.
- Refutation checks can reveal sensitivity, but cannot rule out unobserved
  confounding or guarantee transportability to a new population.
- Uploaded customer data should be handled according to applicable privacy,
  security, and organizational requirements.

## 🧰 Technology

- **Causal ML:** EconML, scikit-learn, LightGBM, DoWhy
- **Data and optimization:** pandas, NumPy, SciPy
- **API:** FastAPI, Pydantic, Uvicorn
- **Dashboard:** React, Vite, Plotly
- **Testing:** pytest, Vitest
