# EconoCausal: from the dataset to the mid-project review

This guide describes the implemented work through notebooks 01–06 and the React dashboard. It does not claim that Week 3 optimization or Week 4 APIs and drift detection are finished.

## 1. The business question

A company wants to spend its campaign budget where the campaign makes an extra difference. A normal prediction model might find people who are likely to buy anyway. A causal model asks how an action changes the outcome.

Example: Riya has an 80% buying chance with or without an offer. Kabir has a 10% chance without an offer and 20% with it. Riya is more likely to buy, but Kabir has the larger estimated uplift: 10 percentage points. These are teaching numbers, not observed personal counterfactuals.

The project pictures describe discounts. The supplied Hillstrom data actually records randomized emails, and the guide explicitly permits this adaptation. We compare men's merchandise email and women's merchandise email with no email. We cannot estimate a $10 versus $20 discount effect from a file without discount amounts.

**One-sentence introduction:** “I built a causal campaign-analysis workflow that estimates which customer profiles gain the most from an email, evaluates its targeting performance, and exposes its assumptions and uncertainty in a dashboard.”

## 2. What is in the dataset?

There are 64,000 rows and 12 original columns. The source describes random assignment to three groups, followed by a two-week outcome window.

| Role | Columns | Plain meaning |
|---|---|---|
| Past customer information | recency, history, mens, womens, newbie, zip_code, channel | Information available before the email |
| Redundant spending band | history_segment | A grouped version of history |
| Treatment | segment | Which email, if any, was assigned |
| Outcomes | visit, conversion, spend | Whether they visited, purchased, and how much they spent afterwards |

`mens` and `womens` are prior product-category purchase flags, not customer gender. `newbie` means a new customer in the past twelve months. `customer_id` added later is a generated row label, not a verified real-world customer identifier.

No email: 21,306 rows. Men's email: 21,307. Women's email: 21,387. Randomization comes from the study description; similar group sizes alone do not prove it.

## 3. Notebook 01 — EDA: understand before modelling

**What:** checked dimensions, types, missing values, duplicate-looking rows, value ranges, outcome consistency, response rates, baseline balance, spending distributions, and exploratory subgroups.

**Why:** a sophisticated model can still give a misleading answer if its source is misunderstood. We also need to know whether an outcome is too rare for precise estimates.

**Results:**
- No missing values in the supplied source.
- 6,562 duplicate-looking rows. We kept them because there is no true customer ID proving accidental duplication.
- 578 purchases, about 0.90% of customers. Visits occurred for about 14.68%. Visits are therefore the primary modelling outcome; purchase and spend remain secondary.
- Past spending is strongly right-skewed. Valid high values were retained, not automatically treated as errors.
- Recorded purchases imply visits, and positive spend agrees with purchase indicators.
- The largest baseline standardized difference across treatment pairs was about 0.017. That is consistent with balanced randomization on measured features, not a test of every hidden variable.
- Observed visit rates were about 10.62% for no email, 18.28% for men's email, and 15.14% for women's email.
- Women's email had a larger exploratory visit difference among customers with prior women's-category interest. This suggests possible effect variation; it does not establish each person's response.

EDA used the full source. Subsequent models exclude held-out outcomes from fitting, but this project is exploratory rather than a pristine confirmatory experiment. EDA uses 1–3/4–8/9–12 month display groups; preprocessing uses fixed 1–4/5–8/9–12 bands. Those are different descriptive choices; they are not the same subgroup table.

**Interview wording:** “I checked both data quality and whether the experiment groups looked comparable. I noticed purchases were rare, so I reported purchase uncertainty and used visits as the main outcome.”

## 4. Notebook 02 — preprocessing and feature engineering

**What:** corrected the known `Surburban` spelling to `Suburban`; checked numeric and binary values; preserved valid records; made three baseline-only features; encoded categories; and split the data.

| Decision | Why |
|---|---|
| `history_log1p = log(1 + history)` | Offers a compressed view of skewed past spending; original spending is retained |
| `recency_band` | Groups months into 1–4, 5–8, 9–12 for a simple recency representation |
| `prior_interest_count = mens + womens` | Indicates breadth of prior shopping interests; separate flags remain |
| Exclude `history_segment` | Spending already has numeric and log representations |
| Keep treatment and outcomes outside X | Prevents the model learning from the action or future response as if it were baseline information |
| One-hot encode categories | Turns labels into numeric indicator columns |
| Fit the encoder on training rows only | Avoids learning preprocessing from the test sample |
| No oversampling or outcome balancing | Preserves the randomized study and natural purchase rate |

The split is 44,800 training rows and 19,200 test rows, stratified by treatment with seed 42. There are 16 encoded baseline features. The new `causal_train.csv` and `causal_test.csv` are used downstream; older `train.csv` files are not substituted.

Random Forests do not require feature scaling. A log feature is a modelling option, not a universal cure for skewness or proof of better accuracy.

**Analogy:** label the ingredients before cooking. Customer history is an ingredient; the final purchase is the answer we are trying to learn, so we must not slip it into the ingredients.

## 5. Notebook 03 — causal graphs with DoWhy

A DAG is a map of assumed cause-and-effect directions, with no directed loops. It is based on study knowledge, not simply a correlation heatmap.

**Real experiment:** email assignment points to the outcome; baseline details also point to the outcome. Because assignment was randomized, we do not draw baseline details causing email assignment. Under this graph, DoWhy identifies an empty backdoor adjustment set. The baseline features can still predict response and modify treatment effects.

**Separate mock shop:** past spending affects both who receives an offer and future spending. This makes past spending a confounder. DoWhy identifies that it must be adjusted for.

We generated a mock effect of exactly $20. The unadjusted difference was about $70.79 because big spenders received more offers. After adjustment, the estimate was about $19.88. Finite-sample noise explains why it is not exactly $20. Independent least-squares calculations agree with DoWhy.

Mock data are teaching data only. They are never mixed into Hillstrom training, evaluation, or the real dashboard score table. Six real-data DoWhy estimates were also checked against direct training-group differences.

**Interview wording:** “I used two graphs to distinguish randomized assignment from observational confounding. A graph states assumptions; it does not discover or prove them automatically.”

## 6. Notebook 04 — propensity matching

Propensity is the probability of receiving treatment given baseline characteristics. In the full experiment, each email group has design probability about one third. Within an email-versus-no-email pair, the conditional probability is about one half.

We fit logistic regression on baseline features, match treated rows to controls on the log-odds of their scores, and impose a 0.2 pooled-standard-deviation caliper. A control can be reused. We count unmatched treated rows, unique controls, reuse, and effective sample size.

The balance ruler is the standardized mean difference. Its denominator is fixed at the pre-match pooled standard deviation, so the before/after comparison uses the same scale.

**Results:** about 99.97% of men's-email treated rows and 99.99% of women's-email treated rows were matched. Maximum absolute imbalance changed from about 0.0138 to 0.0231 for men's email and 0.0133 to 0.0329 for women's email. Both remain below the 0.1 diagnostic guideline, but matching did not improve the largest imbalance. Effective control sample sizes were about 4,193 and 4,262 because controls were reused.

This is an extra diagnostic required by the project, not a reason to discard the original randomized training sample. Notebook 05 uses that original sample. Matching cannot ensure balance on unmeasured characteristics.

**Analogy:** we tried pairing similar pupils in two already similar classrooms. Pairing was not automatically better than using the original classrooms.

## 7. Notebook 05 — Double Machine Learning

For each of visit, purchase and spending, we trained an EconML `CausalForestDML` model with three categorical treatments.

1. An outcome Random Forest learns the typical outcome from baseline features.
2. A treatment Random Forest learns assignment probabilities from baseline features.
3. EconML subtracts these predicted parts and learns how remaining treatment variation relates to remaining outcome variation, allowing effects to differ across profiles.

Cross-fitting uses three training folds: a helper predicts each fold after fitting the other folds. The causal forest uses honest splitting so observations used to choose splits are separated from those used to estimate within-leaf effects. The holdout is separate from all training folds.

These methods reduce certain estimation biases; they cannot automatically remove unmeasured confounding. The study assumptions still matter.

**Effect interpretation:** `visit_womens = 0.05` means an estimated +5 percentage point visit effect for similar profiles, not a 5% total visit chance. A hypothetical change from 10% to 15% illustrates it. We cannot observe both treatment futures for one customer; these are CATE estimates, often called ITE scores in project language. A positive score is not a confirmed persuadable person.

**Validation:** all six effects were evaluated on test customers, with no tuning based on these test outcomes. Pointwise model intervals and aggregate differences were reported. Saved-model predictions were reloaded and checked.

### Uplift and Qini

Rank test customers by estimated effect. In each email/control pair, weighted outcomes use +2Y for email and −2Y for control because assignment probability is one half. Cumulative gain is divided by the whole pair size. The random line represents randomly ordering the same population. Qini area is the area above that line using the notebook's explicitly defined normalization; tied scores are grouped fairly.

We used 1,000 bootstrap samples for approximate intervals, conditional on the trained model. These do not include retraining uncertainty and are not adjusted for six comparisons.

| Outcome | Men's email ranking | Women's email ranking |
|---|---|---|
| Visits | Uncertain advantage | Positive exploratory evidence |
| Purchase | Uncertain advantage | Weak evidence, near-zero lower bound |
| Spend | Uncertain advantage | Uncertain advantage |

For women's visits, normalized Qini was about 0.01028, with interval [0.00679, 0.01429]. Men's visits were about 0.00336, with interval [−0.00077, 0.00703]. These areas are not percentages or ROI.

Men's email increased average held-out visits by about 7.35 percentage points; women's email by 4.46. The ability to rank people is a different question from the average benefit. Men's email can have a larger average effect while women's email has more detectable ranking heterogeneity. A higher targeting curve for visits does not prove more profit.

## 8. Notebook 06 — mid-project audit

First, we verified the actual saved three-arm models: source fingerprints, prepared input fingerprints, treatment/outcome alignment and all six exported test-score columns. These are software consistency checks, not proof of causality.

Second, DoWhy refitted smaller **pairwise models of visits** on 3,000 training rows per pair. Each uses 40 causal trees and 30 repetitions per refuter. This keeps runtime practical. It tests the model family on smaller samples, not every final-model score, purchase/spend model, or exact original estimator.

| Check | Question | Verified result |
|---|---|---|
| Random common cause | Does adding meaningless information disturb the estimate? | Effects remained close to the originals |
| Shuffled treatment | Does the estimate move near zero when the real assignment relationship is broken? | About 0.252 pp for men's and 0.221 pp for women's email |
| 80% subsets | Does a smaller sample give a similar average effect? | Men's relatively stable; women's needs review |

The men's original audit effect was about 7.164 pp; subset mean about 7.513 pp. The women's original was about 7.108 pp; subset mean about 5.640 pp, a reduction of about 1.468 pp. DoWhy's diagnostic p-value was approximately 0.040 for that check. We expose this warning instead of declaring all tests passed. The smaller audit sample differs from the final model's sample; its average also changes when composition changes. The diagnostic does not identify a hidden confounder or invalidate every result.

A separate **linear average-effect model** was subjected to hypothetical shared treatment/outcome label perturbations at 1%, 5% and 10%. These are chosen stress scenarios, not measured amounts of hidden confounding or confidence limits for the causal forest.

Thirty repetitions provide exploratory evidence, not high-power confirmation. Large refutation p-values mean a discrepancy was not detected; they do not certify the assumptions. Future work should use larger repeated audit fits and fresh validation before operational decisions.

**Do not tell the interviewer:** “I mathematically proved there are no hidden confounders.”

**Say:** “I checked specific failure modes and reported a subset-stability warning. Randomization supports the causal design; refutation tests cannot verify every assumption.”

## 9. Dashboard walkthrough — explain every control

The interface uses React and Plotly.js with the verified notebook outputs. It bundles all 64,000 scores and opens on the 19,200 test-customer view for score exploration.

### Start & data
- Dataset cards show source row count, missing cells, rare purchases and duplicate-looking records.
- Historical CSV upload validates schema, types, range and outcome consistency, then shows group visit rates. Files stay in your browser. It does not train a model. Clear uploaded preview restores the source chart.
- Budget and assumed email cost show affordable contact capacity for currently filtered customers. Example: $100 at $0.10 per email covers at most 1,000 people, capped by the number available. Costs are assumptions, not source data. No optimization is performed.
- The EDA section expands to display spending, recency and response charts. Preprocessing text explains the actual transformations and split.

### Causal graph
- The real DAG shows randomized email and baseline predictors of outcomes.
- The mock DAG explains a confounder, alongside its known, unadjusted and adjusted effects.
- Matching summaries show retained matches, control reuse/effective size and before/after balance. Expand each comparison to inspect all features.

### Customer scores
- Outcome selects visits, purchase or spend.
- Email comparison selects men's or women's email versus no email.
- Population chooses test, training, all, or new scored rows. Training/all views are descriptive, not independent validation.
- Channel chooses Web, Phone or Multichannel.
- Maximum recency restricts months since a previous purchase; lower means more recent.
- Minimum effect is in percentage points for binary outcomes and dollars for spending. Blank means no lower limit.
- Search finds a generated row ID.
- All filters update the count, mean predicted effect, positive-score count, histogram and paginated table together. The table displays 25 rows at a time; the count and export cover every matching row.
- The filtered uplift chart uses only bundled test rows and only the selected email/control pair. It is exploratory, without a new confidence interval. Repeated filter searches can find chance patterns.
- Upload scored CSV accepts the notebook-generated schema. It changes score exploration, not the original saved evaluation or audit. Unverified uploaded scores do not receive an independent uplift claim.
- Reset restores the original test-score view. Download exports all filtered rows. Next/Previous changes only the visible table page.

**Demo:** choose visits → women's email → test → Web → recency at most 6 → minimum effect 5 pp. Explain that the count is the number matching those settings, not a number of guaranteed extra visitors. Remove filters to restore the full evaluation population.

### Uplift evidence
- Outcome selector changes both email comparisons.
- Gain chart compares ranked and random targeting. The second chart shows excess gain over random.
- The displayed Qini intervals always describe the original held-out evaluation, even if customer filters or uploads changed elsewhere.
- Hover for values, click legend entries to show/hide lines, drag to zoom and double-click to reset.

### Causal audit
- The opening text separates exact-model consistency checks from smaller refutation fits.
- Tables show original effect, changed effect, expected reference and diagnostic p-value.
- The stability warning highlights a small diagnostic p-value; the full-output disclosure explains the scope.
- Stress charts show assumed scenarios on a separate linear model. They do not show discovered confounders.

### How to use
A short demonstration script links to this detailed guide. The dashboard does not contain a production API, live retraining service, optimal allocation, or drift detector at this stage.

## 10. Requirement map and honest status

| Requirement | Delivered through this review |
|---|---|
| EDA and preprocessing | Standalone notebooks; checked data and engineered baseline inputs |
| Week 1 DoWhy DAG | Real randomized graph plus separate confounded mock shop |
| Propensity matching | Training-only diagnostic, fixed balance denominator, reuse accounting |
| Week 1 React scaffolding | Historical CSV preview and budget/cost controls |
| Week 2 EconML DML | Three outcome models, six email/control effect scores, cross-fitting |
| Week 2 Plotly uplift/Qini | Saved evaluation, uncertainty table, interactive charts |
| Mid-project causal audit | DoWhy refutations, separate hypothetical sensitivity scenarios, explicit warning |
| Mid-project data load | 64,000 scores, filters, chart/table/export consistency, automated tests and browser review |
| Week 3 optimization | Not implemented in this scope |
| Week 4 API/drift | Not implemented in this scope |

## 11. A two-minute interview answer

“My project studies whether campaign emails cause extra customer responses rather than just predict likely buyers. I used the 64,000-row Hillstrom randomized email experiment. I checked data quality, kept legitimate records, engineered only pre-campaign features, and separated treatment and outcomes from predictors. I used DoWhy to define the real randomized DAG and a separate mock example showing why confounder adjustment matters.

“I then checked propensity matching, but retained the original randomized sample for DML because it was already balanced. EconML causal forests with Random Forest nuisance models estimated heterogeneous effects, using cross-fitting and an independent model holdout. I evaluated targeting with uplift and Qini curves and uncertainty intervals. Women's-email visit rankings showed clearer evidence; purchase and spending claims were weaker.

“For the mid-project review I verified the saved models and ran repeated DoWhy refutations on smaller training-only pairwise models. Shuffled-treatment estimates approached zero, but the women's subset test exposed sensitivity, which I reported. I built a React/Plotly dashboard to explore all customer scores and explain the evidence. I did not claim personal counterfactuals, discount effects, hidden-confounder proof, or profit optimization that the data and scope do not support.”

## Sources

Project requirements: the two supplied project images and EconoCausal Project Guide. Actual quantitative values above come from the executed notebook outputs bundled in this repository's dashboard report.

- Original study: https://blog.minethatdata.com/2008/03/minethatdata-e-mail-analytics-and-data.html
- EconML: https://www.pywhy.org/EconML/_autosummary/econml.dml.CausalForestDML.html
- DoWhy refutations: https://www.pywhy.org/dowhy/v0.9.1/user_guide/effect_inference/refute.html
