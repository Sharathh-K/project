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

## 8. Detailed request journey: from a CSV to a campaign plan

The Week 4 workflow connects existing analysis to an application. It does not train a new causal model for each upload.

1. **Receive customers.** The user loads the held-out demonstration sample or uploads a CSV containing information known before the campaign. The browser converts the selected fields into a JSON request.
2. **Validate the request.** FastAPI and Pydantic check the field structure, allowed values, batch size and unique customer IDs. The recommendation endpoint also checks that the budget and email cost can be represented in whole cents.
3. **Load the model on first use.** The API checks the local artifacts and loads the saved model bundle. A cached engine is reused for later requests in that process, avoiding repeated loading. The first model-dependent request can therefore take longer than later requests.
4. **Recreate the feature engineering.** The service corrects `Surburban`, calculates `log(1 + history)`, creates the same recency groups, and adds the previous-interest count. It then uses the saved training encoder, rather than learning new categories from the upload.
5. **Predict six effects.** Each of the three outcome models compares Men's Email and Women's Email against No Email. Non-finite predictions are rejected.
6. **Screen baseline drift.** The incoming characteristics are compared with the training reference. The response includes an overall status and one diagnostic row per baseline characteristic. The implementation calculates predictions and drift within the same scoring request; a drift warning does not automatically block predictions or allocation.
7. **Allocate the budget.** For `/api/recommend`, the server passes its own spending-effect predictions to the shared Week 3 optimizer. It does not accept caller-supplied treatment-effect scores as a substitute.
8. **Return and explain.** The response contains the scores, drift report, allocation, model fingerprint, caution about uncertainty and a plain-English campaign summary. The browser shows a preview and exports the complete recommendation table.

**Analogy:** the saved model is a trained shop assistant. The API is the counter where a customer list is submitted. The drift check asks whether this list looks unfamiliar. The optimizer chooses a plan within the available money, and the dashboard displays the proposed plan.

## 9. Input fields and what they mean

| Field | Meaning and role | Example |
|---|---|---|
| `customer_id` | A unique label for joining predictions back to the submitted row; not a model predictor | `customer-001` |
| `recency` | Months since the earlier purchase; integer from 1 to 12 | `3` |
| `history` | Earlier spending, finite and nonnegative | `100.0` |
| `mens` | Previous men's-merchandise purchase flag, 0 or 1 | `1` |
| `womens` | Previous women's-merchandise purchase flag, 0 or 1 | `0` |
| `newbie` | Dataset's pre-campaign new-customer flag, 0 or 1 | `0` |
| `zip_code` | Dataset's area category, not a numerical postal code | `Urban` |
| `channel` | Earlier shopping-channel category | `Web` |
| `budget` | Maximum contact expenditure for a recommendation request | `1.00` |
| `email_cost` | Same positive assumed cost for either email type | `0.10` |

Men's and women's purchase flags are not customer gender. Email treatments are recommendations produced by the application, not these baseline flags.

The browser allows an optional ID column and creates row labels if absent. Direct JSON API requests require IDs. The CSV upload limit is **5 MB in the browser**; the API separately enforces **1–5,000 customer rows**. The browser's file limit is not a claim of a general server-side request-byte quota.

A CSV may contain extra columns, but the live uploader selects the baseline inputs and ID. Direct API JSON validation rejects unexpected fields. Campaign assignment, visits, purchases and later spending must not be used to decide a new customer's effect estimate.

### Example API request

This illustrative request can be entered into **POST /api/recommend → Try it out** on the local `/docs` page:

```json
{
  "customers": [
    {
      "customer_id": "customer-001",
      "recency": 3,
      "history": 100.0,
      "mens": 1,
      "womens": 0,
      "newbie": 0,
      "zip_code": "Urban",
      "channel": "Web"
    }
  ],
  "budget": 1.0,
  "email_cost": 0.1
}
```

This is a format demonstration, not a saved prediction for a real customer. With one customer, the drift status is `insufficient_data`. The optimizer can recommend at most one email; it can recommend none if both spending effects are nonpositive. A $1 budget does not require spending the entire dollar.

For `/api/score` and `/api/drift`, send only `customers`, without the budget fields.

## 10. Reading the returned effects correctly

| Returned field | Meaning | Illustrative interpretation |
|---|---|---|
| `visit_mens`, `visit_womens` | Email-minus-no-email difference in visit probability | `0.05` means +5 percentage points |
| `conversion_mens`, `conversion_womens` | Email-minus-no-email difference in purchase probability | `0.002` means +0.2 percentage points |
| `spend_mens`, `spend_womens` | Email-minus-no-email difference in expected spending | `0.80` means an estimated extra $0.80 |

These example values are explanatory, not additional measured results. A +5 percentage-point effect could describe a change from 10% to 15%, but the effect alone does not tell us those two absolute probabilities. A negative effect indicates a predicted decrease compared with no email.

The estimates describe average differences for similar customer profiles. We cannot observe the same person both receiving and not receiving the email in the same campaign. The service returns effect estimates and warnings; it does not supply new per-customer confidence intervals in the live response.

The recommendation response adds `recommended_action`, selected-action predicted revenue and allocation totals. No Email has zero incremental effect relative to itself; it does not mean the customer will spend nothing. The `split = new` label marks rows entering the inference workflow. Even held-out sample rows receive that label when submitted through the API; this does not make them a newly collected experiment.

## 11. Drift calculations explained with small examples

Drift asks whether the incoming customers look different from the customers used for training. It does not require new campaign outcomes.

### Numeric characteristics: KS distance

For `recency` and `history`, the code compares cumulative distributions and takes their largest gap:

`KS distance = maximum absolute difference between the two cumulative proportions`.

For example, suppose 80% of training customers spent at most $200 previously, but only 50% of incoming customers did. The gap at $200 is 0.30, so the KS distance is at least 0.30 and exceeds the 0.10 screening threshold. The implementation uses the KS **distance**, not its p-value.

### Categorical characteristics: total variation distance

For category and binary fields:

`TV distance = 0.5 × sum of absolute differences in category proportions`.

Suppose training customers are 60% Web and 40% Phone, while an incoming batch is 30% Web and 70% Phone. The distance is:

`0.5 × (|0.60 − 0.30| + |0.40 − 0.70|) = 0.30`.

This flags a change in channel proportions. It does not mean the model is 30% inaccurate.

### Unknown categories and overall status

`unknown_fraction` is the share of incoming values absent from the training reference for that categorical feature. An unfamiliar channel can trigger its own warning even if the total distance is below 0.10. Unknown categories are accepted by the saved encoder's unknown-category handling, but acceptance does not establish reliable predictions for them.

| Overall status | Exact interpretation | Appropriate response |
|---|---|---|
| `no_warning` | At least 100 rows and no feature crosses the screening rule | Continue reviewing the plan and existing model limitations |
| `review` | At least 100 rows and a distance or unknown-category warning exists | Check column meanings, collection methods and population differences |
| `insufficient_data` | Fewer than 100 rows, regardless of individual feature warnings | Inspect the feature warnings and obtain a larger representative batch for a stronger check |

The threshold is a declared heuristic. These are separate, one-feature-at-a-time checks, so they may miss changes in relationships between features. They do not monitor changes in actual visits, purchases, spending outcomes or treatment effects. This is request-triggered screening, not a scheduled background monitoring service with stored alert history.

## 12. Dashboard demonstration and every live-page control

| Element | What the user does or learns |
|---|---|
| Use 1,000 held-out sample customers | Loads historical profiles for a reproducible demonstration; no new experiment is created |
| CSV upload | Supplies new baseline profiles; invalid input clears previous results and displays an error |
| Customers ready | Confirms the number of rows prepared for the next request |
| Budget ($) | Sets maximum expenditure; changing it clears the previous plan |
| Cost per email ($) | Sets the equal assumed contact cost for both email types; changing it also clears the plan |
| Check drift, score and allocate | Sends one recommendation request; controls are disabled while it runs |
| API documentation | Opens the endpoint descriptions and interactive request interface |
| Campaign summary | Explains selected count, contact cost, contact-cost difference and predicted additional revenue |
| Drift table | Shows each characteristic, its distance, unfamiliar-category share and review flag |
| First 20 recommendations | Gives a short preview, not the entire result set |
| Download all recommendations | Exports all returned customers and recommendations to `live_campaign.csv` |
| Model fingerprint | Identifies the loaded model bundle for tracing the result |

**Suggested demonstration:** load the 1,000-row sample, set budget to $1 and cost to $0.10, then run the request. Explain that ten is the maximum affordable contact count; fewer are possible if there are insufficient positive predictions. Inspect drift before discussing the plan. Download the full result and distinguish predicted extra revenue from measured sales.

The separate **Budget allocation** page works from already-scored records. **Live scoring & drift** starts from baseline profiles and asks the API to generate predictions. The removed “How to use” navigation page is not needed for this workflow; the repository documentation remains available.

## 13. Notebook 08: what each stage verifies

1. **Prediction parity:** submit 200 held-out profiles through the API and compare all six effects with notebook 05's saved predictions. This tests consistency of serving and preprocessing, not whether the causal estimates are true.
2. **Drift behaviour:** compare identical reference data, deliberately shifted data and a tiny batch. Expected statuses are `no_warning`, `review` and `insufficient_data`, respectively.
3. **Integrated recommendation:** send the $1 / $0.10 campaign request and check the returned action counts and budget limits using the shared optimizer.
4. **Invalid input rejection:** exercise duplicate IDs, invalid histories, outcome fields accidentally included in JSON, and fractional-cent budgets. Invalid requests must fail instead of returning misleading plans.
5. **Evidence export:** save the verification report for inspection and reproducibility. The earlier results in section 3 are from executed runs; this expanded write-up does not imply a new run.

The model-load check on 32 rows, notebook test on 200 rows and recorded full comparison on 19,200 rows are different checks. They should not be described as the same sample size or as new model accuracy scores.

## 14. Operating the application and investigating problems

| Symptom | Meaning and next step |
|---|---|
| Site cannot be reached | Check that the local server is running on port 8002 and use the address printed by it |
| `/api/health` works but scoring fails | Process availability does not confirm model readiness; inspect `/api/model` and its error |
| HTTP 422 | Correct the submitted fields, ranges, IDs or monetary precision according to the response |
| HTTP 503 for model files or compatibility | Restore a consistent environment and artifacts, or regenerate preprocessing and models together |
| Models retrained but old predictions appear | Restart the API; its engine is cached in memory |
| Dashboard source changed but old interface appears | Rebuild the dashboard, then refresh the browser |
| Drift review warning | Investigate the incoming population; do not interpret the warning as proof of model failure or automatically retrain |

After regenerating analysis, follow the [README refresh sequence](../README.md): export the analysis snapshot, rerun notebook 07 for its allocation snapshot, run notebook 08 for verification, and rebuild the dashboard after snapshot changes. Keep training dependencies consistent with the saved model. Model files are trusted local artifacts, not uploads accepted by the API.

The local server does not persist incoming customer requests. Nevertheless, uploaded information is processed in memory and the downloaded CSV remains on the user's computer. A real deployment would require explicit access control, privacy practices, monitoring and operational support; these were not delivered as part of the local demonstration.

## 15. What Week 4 achieved and what remains a future task

Week 4 delivered a working connection between causal models, customer uploads, drift screening and a budget-respecting recommendation. The practical benefit is repeatable inference without rerunning training notebooks for every list, with visible checks and a downloadable plan.

Future work would include a fresh randomized pilot to measure actual gains, stronger full-size robustness analysis, validated drift thresholds, outcome monitoring, and secure deployment if required. These are future tasks, not completed features. The existing women's-email audit warning and uncertainty in spending rankings remain relevant even when all software checks succeed.

**Short viva explanation:**

> “In Week 4, I made our trained model usable through a FastAPI service. A user uploads earlier customer information, and the service applies the saved preprocessing and predicts the extra benefit of each email. It checks whether the customers look different from the training data and uses the budget optimizer to recommend actions. The dashboard explains the plan and exports it. I checked prediction consistency and budget limits, while clearly showing that revenue is predicted and drift warnings need investigation.”


**Documentation review:** 7 November 2026. Expanded against notebook 08, the API implementation, live dashboard and saved verification evidence. Historical numerical and test results retain their original scope and dates; no models were retrained for this documentation update.
