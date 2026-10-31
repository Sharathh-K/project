# Final resource review — 31 October 2026

Reviewed the two supplied project pictures, all four pages of EconoCausal_Project_Guide.pdf, the uploaded K.csv, notebooks 01–08, the shared optimizer/API, dashboard code and saved evidence.

## Source-data check
The uploaded K.csv and data/raw/hillstrom.csv are byte-for-byte identical. SHA256: `0e5893329d8b93cefecc571777672028290ab69865718020c78c7284f291aece`.

- 64,000 rows, 12 columns, zero missing values.
- Men's email: 21,307; women's email: 21,387; no email: 21,306.
- Visit rate: 14.678125%; purchase rate: 0.903125%; mean campaign spend: $1.050908.
- 6,562 duplicate-looking rows are retained because the source lacks real customer IDs.
- Guide section 6 explicitly permits email actions with an assumed email cost. The dataset cannot identify $10-versus-$20 discount effects.

## Requirement-by-requirement result

| Requirement from the pictures/guide | Implementation and evidence | Qualification |
|---|---|---|
| Explore and prepare data | 01 EDA and 02 feature engineering | No outcome or assigned treatment enters baseline features |
| Week 1 causal graph | 03 DoWhy graphs for all six real comparisons and separate mock shop | Baseline predictors are not automatically confounders in a randomized trial |
| Mock retail confounding example | Known $20 incremental spending effect; naive and adjusted estimates | Separate simulated data; never mixed into Hillstrom training |
| Propensity matching | 04 training-only pairwise matching, caliper, replacement, overlap and fixed SMD | Diagnostic only; matching does not improve every feature |
| React scaffolding | Historical upload preview and budget controls | Historical preview is distinct from live new-customer scoring |
| Week 2 DML | 05 three EconML causal forests with Random Forest nuisance models and cross-fitting | Six estimated profile effects, not known individual counterfactuals |
| Uplift/Qini | Held-out ranking curves, random baseline, bootstrap intervals and Plotly | Only report actual evidence; spending superiority is uncertain |
| Mid-project audit | 06 exact-model export checks and smaller DoWhy refutations | Cannot prove hidden confounders are absent; women's subset warning retained |
| Thousands of customer scores | 64,000-row dashboard, shared filters/charts/table/export tests | Training rows are labelled and excluded from held-out evaluation |
| Week 3 optimization | 07 and shared api/optimization.py use SciPy; independently checked equal-cost optimum | Maximizes predicted extra revenue under the stated equal-cost assumptions |
| Allocation matrix | Historical budget page and downloadable live campaign recommendations | No email is allowed; the budget need not be wasted on negative effects |
| Week 4 REST API | FastAPI health/model/drift/score/recommend endpoints | Trusted local models; no upload-driven retraining |
| Automatic drift detector | Every scoring request checks baseline distributions against training rows | Screening distances, not proof of causal-effect change; small batches flagged |
| Plain-English summaries | Contact count, planned cost, cost avoidance and predicted revenue | No invented $4,200 savings or claim of measured returns |
| Packaging and GitHub | Notebook 08, README, API reference, startup script and tests | Local demonstrator; public hosting/authentication are not configured |

## Changes made in this review

1. Updated the interview guide and its dashboard copy: removed obsolete statements that Weeks 3/4 were unfinished, and added a Week 4 viva explanation.
2. Clarified evaluation provenance: full-data descriptive EDA preceded modeling. Test rows were excluded from fitting/tuning, but not from all descriptive inspection. Findings remain exploratory rather than a fully unseen confirmatory study.
3. Fixed an EDA edge case: a constant feature with different group means now stops with an explanation instead of silently becoming zero imbalance. This does not change results on the supplied CSV.
4. Strengthened API model loading: checks the raw source hash and reproduces all six saved effects for 32 held-out rows before serving a model. This catches accidental model swaps as well as changed preprocessing files; it is a consistency check, not causal validation.
5. Preserved uploaded customer IDs such as `001` instead of converting them to `1`; excluded outcomes from live requests and tested batch limits. Whitespace-only API IDs are rejected.
6. Enabled the API proxy for Vite preview as well as development, so the documented preview workflow can use live scoring while the API is running.

## Verification performed

- Executed notebooks 01, 03, 04, 07 and 08 again. The unchanged 02/05/06 artifacts were regenerated and executed in the previous Week 4 delivery; this review checked their source/data alignment and recomputed all six saved effects on all 19,200 held-out rows without changing or retraining the models.
- Ten Python tests and sixteen dashboard tests passed, including a deliberately wrong model, non-finite predictions, strict budgets, leading-zero IDs and 64,000-row allocation parity.
- Full prediction differences and notebook verification are recorded in the accompanying FINAL_REVIEW_CHECKS.json.
- Production dashboard build passed. The live browser workflow scored 1,000 sample customers and selected ten for an exact $1 budget.
- Statistical uncertainty was preserved. Passing software tests does not mean every refutation or ranking test supports deployment.

## Remaining limits to explain honestly

The women's-email subset refutation remains sensitive; purchase/spending effects and spending rankings are uncertain. Refutations use smaller visit models, not every full-size outcome model. Drift is based on incoming pre-campaign characteristics; newly observed campaign outcomes would be needed to investigate changed response effects directly. A new randomized pilot is needed before claiming realized financial benefit.
