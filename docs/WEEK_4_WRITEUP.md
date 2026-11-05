# Week 4 Write-up — REST API, Data Drift and Dashboard Packaging

**Project:** EconoCausal: Dynamic Pricing via Double Machine Learning

**Week 4 focus:** Make the trained causal models usable through an API, add automatic data-drift screening, and polish the dashboard with plain-English summaries.

**Continuation:** `07_budget_optimization.ipynb` → `08_api_drift_packaging.ipynb`

## 1. Objective from the project pictures

The Week 4 plan asks for a REST API around the causal engine, an automated drift detector, and a polished dashboard that explains business results in simple language.

Our Hillstrom data records randomized email campaigns, not discount amounts. As permitted by the supplied guide, the application recommends Men's Email, Women's Email or No Email using an explicitly assumed email cost. The example savings figure in the brief is illustrative; our summaries calculate values from the actual plan rather than inventing a required result.

**In simple words:** earlier weeks built and checked the model, and Week 3 planned the budget. Week 4 connects these parts so a user can upload customers, obtain predictions, see warnings and download a campaign plan.

## 2. Work completed

### A. Wrapped the trained models in a FastAPI REST API

Implemented the following endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Checks whether the service is running; does not by itself confirm model readiness |
| `GET /api/model` | Loads and checks the local model, then reports its fingerprint and reference-data size |
| `POST /api/score` | Predicts email effects and automatically checks baseline drift |
| `POST /api/drift` | Checks incoming customer characteristics without generating predictions |
| `POST /api/recommend` | Scores customers, checks drift and creates a budget-constrained plan |

Interactive API documentation is available at `/docs`, with the machine-readable contract at `/openapi.json`.

The API reuses the saved encoder and EconML models from the earlier notebooks. It estimates both email effects on visits, purchases and spending: six scores per customer. It does not retrain on uploaded customers or use their later outcomes as predictors.

**Why this helps:** the React dashboard and other tools can use the trained models without manually running training cells for every new customer list.

### B. Validated inputs and model consistency

The API accepts 1–5,000 customers per request. It checks required fields, unique IDs, finite nonnegative spending history, recency from 1–12 months, binary flags and valid budget precision. Extra JSON fields, including campaign outcomes, are rejected.

The live CSV uploader selects only baseline fields and preserves IDs such as `001`. It creates row labels when CSV IDs are missing; those labels are not verified real-world identities. Unknown categories trigger drift review rather than being silently treated as familiar.

At first model load, the service checks the source-data hash, prepared-file hashes and core package versions. It also reproduces all six saved effects for 32 held-out customers to detect accidentally mixed model artifacts. The response includes a model fingerprint for traceability.

**Why this helps:** predictions should come from the correct model and preprocessing pipeline. These checks detect software/file inconsistencies; they do not establish causal validity.

### C. Added automatic drift screening

Every scoring request compares incoming baseline characteristics with the **44,800 training customers**.

| Characteristics | Comparison |
|---|---|
| `recency`, `history` | KS distance between numeric distributions |
| `mens`, `womens`, `newbie`, `zip_code`, `channel` | Total variation distance between category proportions |

A distance of **0.1 or more** triggers the screening rule. Previously unseen categories also trigger review. Batches below **100 customers** receive an `insufficient_data` overall status because small samples provide weak distribution evidence. Per-feature warnings are still shown, but the overall status takes precedence; it must not be interpreted as a clean drift check.

**Simple example:** suppose the training customers mostly shopped online, but a new list contains mostly phone shoppers. The detector warns that the incoming population looks different and deserves investigation.

A distance of 0.1 does not mean predictions are 10% wrong. Drift is a change in customer characteristics, not proof of a changed email effect. The service warns but does not automatically retrain the model.

### D. Connected scoring to the Week 3 optimizer

The API calculates the effect scores itself, then calls the same SciPy implementation used by notebook 07. Both email types have the same assumed cost, and No Email costs zero.

This avoids maintaining different Python allocation rules in the notebook and service. The optimizer continues to maximize predicted additional spending subject to the budget, with at most one email recommendation per customer.

### E. Added the Live scoring & drift dashboard page

Users can:

1. Load 1,000 held-out sample customers or upload a baseline CSV.
2. Enter the budget and assumed cost per email.
3. Click **Check drift, score and allocate**.
4. Read the campaign summary and drift status.
5. Inspect each characteristic's distance and unknown-category fraction.
6. Preview the first 20 recommendations.
7. Download the complete recommendation table.

The page shows loading and error states, prevents input changes during scoring, and clears outdated results when planning inputs change. It does not substitute old predictions when a live request fails.

The existing Budget allocation page uses already-scored records. The live page begins with customer characteristics and calls the API to calculate scores. Earlier EDA, uplift and audit pages retain their clearly labelled historical evidence.

### F. Added plain-English summaries and local packaging

The campaign summary reports selected customers, planned contact cost, contact-cost avoidance versus emailing everyone, and predicted additional revenue.

For example, contacting ten of 1,000 customers at $0.10 each costs $1. Emailing everyone would cost $100. The contact-cost difference is therefore $99. This does not establish $99 of additional profit or equivalent campaign outcomes.

The built dashboard and API can run through one local address. Added startup instructions, an API reference, a startup script, notebook 08 and verification reports. Model binaries remain local and must be regenerated on another machine.

## 3. Verified results

The following evidence comes from the executed Week 4 notebook and the subsequent full-project review recorded on 31 October 2026.

| Check | Result |
|---|---|
| API predictions versus notebook 05 on 200 held-out rows | All six scores agreed to numerical precision |
| Full saved-model consistency check on 19,200 test rows | All six scores reproduced; maximum difference below 5 × 10⁻¹⁵ |
| Identical reference data | `no_warning` |
| Deliberately shifted history and unfamiliar channel | `review` |
| Two-customer drift batch | `insufficient_data` |
| Notebook example: 200 customers, $1 budget, $0.10 per email | Ten selected; exactly $1 allocated |
| Browser example: 1,000 sample customers, same budget and cost | Ten selected; exactly $1 allocated |
| Python regression tests in the final review | 10 passed |
| Dashboard tests in the final review | 16 passed |
| Dashboard production build and live workflow | Passed |

The notebook's 200-customer example predicted **$22.82 additional revenue**. This is a model-based planning estimate, not measured sales. Artificial drift examples were deliberate tests, not evidence that actual incoming customers had changed.

## 4. How to run and demonstrate it

Use Python 3.12, install `requirements.txt`, and select that environment in VS Code. Execute notebook 02 for preprocessing and 05 for model artifacts, followed by 06 for the audit. Run 07 and 08 for their reports. See the README for the complete notebook sequence and snapshot-refresh steps.

From the repository root:

```sh
cd dashboard
pnpm install --frozen-lockfile
pnpm build
cd ..
python -m uvicorn api.main:app --host 127.0.0.1 --port 8002
```

Open **http://127.0.0.1:8002/** for the dashboard and **http://127.0.0.1:8002/docs** for interactive API documentation. The same process serves the built dashboard and API. After setup, `sh scripts/run_local.sh` provides the startup checks and launches the service.

Keep the terminal running. The localhost address is not an expiring hosted link: it works while the local server and computer are running. Teammates need their own checkout, dependencies, generated models and server.

For a viva demonstration, open **Live scoring & drift**, load the sample customers, set $1 and $0.10, run the workflow, and explain why at most ten customers can be selected. Point out the drift table and prediction warning before downloading the plan.

## 5. Deliverables

- [Notebook 08](../08_api_drift_packaging.ipynb): executable API, drift and allocation checks with explanations.
- [FastAPI application](../api/main.py): endpoint definitions and request validation.
- [Inference and drift service](../api/service.py): shared preprocessing, model checks and predictions.
- [Shared optimizer](../api/optimization.py): budget allocation reused from Week 3.
- [Live dashboard page](../dashboard/src/LiveCampaign.jsx): upload, scoring, drift results and recommendations.
- [API reference](API_REFERENCE.md): request formats, responses and error meanings.
- [Final review evidence](FINAL_REVIEW_CHECKS.json): recorded numerical checks and test counts.
- [Local startup script](../scripts/run_local.sh): starts the packaged application after setup.

## 6. Limitations retained

Passing software tests does not prove that every estimated effect is correct. Spending rankings remain uncertain, and the women's-email subset audit warning is retained. Refutations do not prove the absence of hidden confounding. Baseline drift checks cannot directly establish a change in causal effects; new campaign outcomes would be needed to investigate that.

The application recommends emails but never sends them. It does not persist uploaded customer requests, automatically retrain models, or provide public production authentication and hosting. This is a reproducible local project demonstration. Real business gains require a new randomized pilot.

## 7. Weekly outcome and viva explanation

Week 4 connected the analysis and optimizer into a usable application. A user can now submit customer information, obtain predictions and warnings, and download a budget-respecting campaign plan.

> “In Week 4, I packaged the trained causal models in a FastAPI service and connected them to the React dashboard. Every scoring request checks whether the new customers look different from the training customers. The application then predicts email effects, applies the budget optimizer and explains the plan in simple language. I verified prediction consistency and budget limits while keeping statistical uncertainty visible.”

**Documentation review:** 5 November 2026. The verification table records the earlier executed checks, including the 31 October review. This documentation-only update cross-checked the implementation and saved evidence; it did not rerun training or claim new test results.
