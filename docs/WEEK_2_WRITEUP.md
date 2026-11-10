# Week 2 Write-up: Double Machine Learning and Uplift Evaluation

**Project:** EconoCausal — Dynamic Pricing via Double Machine Learning

## Objective

The second week focused on estimating how email campaigns affect different customer profiles using EconML Double Machine Learning and evaluating whether model-based targeting performs better than random targeting.

## 1. Propensity-score matching diagnostics

I estimated customers’ probabilities of receiving each email relative to receiving no email, using information available before the campaign.

I performed propensity-score matching and compared customer characteristics before and after matching using standardized mean differences.

Matching used the nearest propensity log-odds within a caliper of 0.2 times the pooled pre-match log-odds standard deviation, with replacement: the same no-email customer could be reused. Balance used a fixed pre-match standard-deviation denominator, and the report tracked unmatched customers, control reuse and effective sample size.

The original groups were already well balanced because email assignment was randomized. Matching was designed as a diagnostic exercise for this randomized study and slightly worsened some measured differences; it was not used to construct the DML training sample. The original training data was retained for Double Machine Learning.

## 2. Double Machine Learning training

I trained three EconML `CausalForestDML` models, one each for visits, purchases and spending. Each model estimated:

- Men’s Email compared with No Email.
- Women’s Email compared with No Email.

Random Forest models were used to learn expected outcomes and treatment probabilities from customer characteristics. Cross-fitting kept the helper-model training separate from the observations on which their residual predictions were calculated.

The outcome and treatment helper predictions are used to form residuals: what remains after accounting for patterns in the baseline features. The final causal forest learns how the remaining treatment variation relates to remaining outcome variation across customer profiles. Cross-fitting helps reduce overfitting bias; it does not establish the causal assumptions by itself.

The causal forest then estimated how treatment effects vary across customer profiles. For example, a visit-effect estimate of +5 percentage points could represent a change from 10% to 15% for similar customers. The effect score alone does not provide those absolute probabilities.

These are estimated effects for customer profiles, often called individual treatment-effect scores. They are not directly observed individual effects, because each customer experiences only one campaign assignment.

## 3. Held-out uplift and Qini evaluation

I evaluated model rankings using the held-out test data. Uplift curves compared prioritizing customers by predicted treatment effect with contacting customers in random order.

I also calculated Qini scores, which summarize the ranking advantage over random targeting, and estimated uncertainty using 1,000 bootstrap resamples.

These bootstrap intervals keep the trained model fixed; they do not include uncertainty from retraining. They are not adjusted for the six outcome/email comparisons. EDA had already examined the full dataset, so the evaluation is exploratory even though test rows were excluded from model fitting.

The saved normalized Qini results from notebook 05 were:

| Outcome | Email | Qini area | Approximate 95% interval | Interpretation |
|---|---|---:|---|---|
| Visit | Men's | 0.00336 | −0.00077 to 0.00703 | Ranking advantage uncertain |
| Visit | Women's | 0.01028 | 0.00679 to 0.01429 | Positive exploratory evidence |
| Purchase | Men's | 0.00034 | −0.00070 to 0.00136 | Ranking advantage uncertain |
| Purchase | Women's | 0.00097 | 0.00003 to 0.00186 | Weak exploratory evidence |
| Spend | Men's | 0.08562 | −0.07967 to 0.24244 | Ranking advantage uncertain |
| Spend | Women's | 0.11463 | −0.04769 to 0.27267 | Ranking advantage uncertain |

Qini measures a ranking advantage, not model accuracy or a probability. Its units depend on the outcome, so spending areas should not be compared directly with visit areas. The women's purchase interval barely excludes zero and is especially fragile given the multiple comparisons.

An email helping on average and a model identifying the best recipients are different questions. Men's Email can increase average visits while its model's ranking advantage remains uncertain. We therefore did not claim that every model outperformed random targeting or that the charts proved increased profit.

## 4. React and Plotly visualization

I integrated Plotly charts into the React dashboard to display uplift curves, Qini-style excess-gain curves and uncertainty summaries.

The Customer scores page supports filtering by outcome, email comparison, training/test population, shopping channel, recency and minimum estimated effect. It also provides effect distributions, a paginated customer table and downloads of filtered scores. For the matching graph, blue means before matching and orange means after matching; each mark represents an email-versus-no-email difference in a baseline feature. These colours do not identify the two treatment groups on that graph. Evaluation uses held-out rows; displaying training scores does not make them independent evidence.

## 5. Mid-project review: causal audit

[Notebook 06](../06_mid_project_audit.ipynb) first reloaded the exact saved models and checked that all six exported effect columns could be reproduced. It then used smaller, separate pairwise visit models on 3,000 training rows per email comparison for practical repeated DoWhy refutations. Each test ran 30 perturbations; these were not full-model audits of purchase and spending effects.

| Test | Why it was done | Saved finding |
|---|---|---|
| Add a random column | Meaningless information should not substantially change estimates | Men's 7.164 → 7.137 pp; women's 7.108 → 6.995 pp |
| Shuffle email labels | Breaking the assignment relationship should remove the large estimated effect | Men's 0.252 pp; women's 0.221 pp, both near zero relative to the original audit effects |
| Use random 80% subsets | Check sensitivity to which customers are included | Men's 7.513 pp; women's 5.640 pp |

Here, **pp** means percentage points and the perturbed effects summarize repeated audit fits. A large diagnostic p-value means a discrepancy was not detected, not that causality was proved.

The women's subset diagnostic p-value was approximately **0.040**, triggering a stability warning. This is reported, not hidden or treated as proof that the final model is wrong. Audit effects use a different sample and smaller model from the final model and must not be substituted for its estimates.

Separate hypothetical label-perturbation scenarios illustrated sensitivity to violations using a simple linear estimator. These chosen scenarios do not measure actual hidden confounding. Refutation tests cannot mathematically prove that all hidden confounders have been removed; randomized assignment is the main basis for causal interpretation.

## 6. Mid-project dashboard load validation

Recorded checks loaded all 64,000 customer scores, selected the 19,200 test rows, and verified filtering, charts, pagination and complete filtered CSV exports. One example filter selected 2,178 customers; its exported CSV contained all matching rows, not just the visible page. Uploaded historical data was kept separate from saved model evidence and did not retrain the models. See the dated-stage evidence in [verification notes](VERIFICATION.md); its initial scope statements describe the mid-project stage, before later Week 3/4 additions.

## Week 2 outcome

The project produced reproducible Double Machine Learning models, customer-effect estimates and an interactive evaluation dashboard. The strongest exploratory targeting evidence was for Women’s Email increasing visits. The mid-project review added model-consistency checks, causal refutations and dashboard load validation, retaining the subset stability warning.

## Deliverables and review explanation

- [Notebook 04: matching diagnostics](../04_propensity_matching.ipynb).
- [Notebook 05: Double ML and uplift evaluation](../05_double_ml.ipynb).
- [Notebook 06: mid-project audit](../06_mid_project_audit.ipynb).

> “In Week 2, I checked group similarity, trained models to estimate the extra benefit of each email, and evaluated whether the scores help rank customers. I then challenged the analysis using DoWhy and checked that the dashboard can filter thousands of scores. Some results were encouraging, but I retained the uncertain spending rankings and the audit stability warning.”

**Documentation review:** 10 November 2026. Cross-checked against notebooks 04–06 and the recorded dashboard verification. Statistical findings refer to the saved verified run; this documentation review did not retrain the models.
