# Verification record — mid-project review

## Notebooks and data

- Executed 01 EDA, 03 causal graph, 04 matching and the new 06 audit against the same source and prepared results used by the reviewed 02/05 run.
- Notebook 01 now defines its own root/settings/export helper; the repository does not require the missing old `common.py`.
- Notebook 06 completed all six code cells. It verified source/preprocessing fingerprints and all six exported effect columns from the exact saved three-arm models.
- The actual DoWhy refutations used 3,000 training rows per comparison, 40-tree pairwise forests, two cross-fitting folds and 30 perturbations per check. There were six refuter calls (three types for each of two comparisons).
- Independent group-mean calculations agree with the separate linear estimates used for sensitivity scenarios.
- No test rows were used for refutation fitting. The audit covers visits only; it is not a full-model, all-outcome robustness certification.
- Men's original / shuffled / subset visit effects: 7.164 / 0.252 / 7.513 percentage points.
- Women's original / shuffled / subset visit effects: 7.108 / 0.221 / 5.640 percentage points. Women's subset diagnostic p ≈ 0.040 is explicitly flagged. No seed was changed to hide it.

## Automated dashboard tests

Nine tests passed:
1. Load 64,000 scores and select 19,200 test rows.
2. Filter and chart the same population at full scale.
3. Reproduce all six Python normalized Qini areas in JavaScript within 1e-9.
4. Handle empty and single-arm groups without inventing uplift.
5. Budget planning respects available rows and valid positive email cost.
6. Reject malformed score uploads and duplicate row IDs.
7. Validate raw historical CSV separately from scores.
8. Tied predictions receive no arbitrary ranking advantage.
9. Decimal budget arithmetic avoids a fixed overspend allowance.

The example Web / recency <= 6 / minimum women's visit effect 5 pp filter selected 2,178 rows. One local Node run took about 35 ms for filtering plus its curve calculation; this is not a universal browser load-time guarantee.

## Browser checks

Using the Codex in-app browser at its narrow default viewport:
- Loaded the full dashboard and source metrics.
- Budget $100 and assumed cost $0.10 displayed capacity of 1,000.
- Filtered to 2,178 rows and verified the corresponding 1,434-row email/control evaluation population.
- Confirmed an empty search clears results and disables download/pagination appropriately.
- Reset and switched to all 64,000 loaded scores.
- Verified the next page updates from page 1 to page 2.
- Uploaded the full historical CSV: preview displayed all 64,000 rows and kept model evidence separate.
- Uploaded the full score CSV: loaded all 64,000 rows and labelled it as uploaded data.
- Downloaded filtered scores through the browser and independently verified the resulting CSV contains all 2,178 matching rows, not only the visible page.
- Inspected the randomized/mock DAG page, uplift evidence, uncertainty labels, audit warning and help page.
- No browser console errors were captured during these checks.
- A screenshot is saved as `dashboard-preview.jpg`.

## Build and limits

The production Vite build succeeded. Plotly creates a large JavaScript bundle (about 5.1 MB before gzip); Vite reports a non-fatal chunk-size warning. The bundled 64,000-score CSV is about 13 MB. This is suitable for the requested local demonstration, not a claim of optimized production loading or a hosted enterprise service.

No cloud deployment, always-on hosting, live model API, Week 3 optimization or Week 4 drift detection was performed. The browser preview requires a running local server. UI smoke checks were performed at the available narrow viewport, not across a complete device/browser matrix.


## Week 3 verification

- Notebook 07: all eight code cells executed successfully with SciPy 1.15.3; no saved error outputs. Full 64,000-row default solved with a certified optimal status and integral decisions, then matched the independent exact equal-cost objective.
- Three Python unit tests pass, including eight randomly generated small problems checked against exhaustive enumeration of every possible action.
- Fourteen Node tests pass, including the previous nine dashboard tests and five allocation tests. Four real-data fixtures (zero budget, test $100, test $1,000, all-row $5,000) reproduce SciPy objective values and selected IDs. Fixtures verify score and report fingerprints.
- Production build passes. Plotly still produces a large-bundle advisory; no new runtime dependency was added.
- Browser QA: 64,000-row default, zero budget, invalid zero cost, $1 budget selecting ten test customers, action filtering, page 2, no-result search and empty new-customer population verified.
- Browser CSV download verified: all 20,748 Women’s Email recommendations were exported, rather than the 25 visible table rows.
- The historical audit warning and spending uncertainty remain visible. An optimum on predicted revenue does not establish observed gains.
