# EconoCausal — Weeks 1–3 and mid-project review

Causal analysis of the 64,000-row Hillstrom randomized email experiment. This repository estimates email effects; it does not contain observed discount amounts. Effects are estimates for similar customer profiles, not known personal counterfactuals.

Start with [the complete interview and dashboard guide](docs/INTERVIEW_GUIDE.md). The mid-project audit includes a women's-email subset stability warning; do not present all checks as passed.

## Open the dashboard with the included verified results

You do not need to retrain the Python models just to view the dashboard. Install Node.js 20.19+ (or a compatible newer LTS) first. Open **this `project` folder** in VS Code, then use its terminal:

```bash
git pull origin main
cd dashboard
npm install
npm run dev
```

Open **http://127.0.0.1:5174/**. Keep this terminal running while using it. This local address does not expire, but it only responds while the computer and server are running. Press Control+C to stop; `npm run dev` starts it again. If port 5174 is occupied, stop the other server or run `npm run dev -- --port 5175` and use the printed address. The old 8001 server is a different dashboard instance.

For lockfile-reproducible installation, use `pnpm install --frozen-lockfile` instead of `npm install` if pnpm is available. Test and build:

```bash
npm test
npm run build
npm run preview
```

`preview` serves the built dashboard on the same port; stop the dev server first. No cloud hosting or always-on service is configured. Team members need repository access, a clone and their own local server; your `127.0.0.1` link does not open your computer from theirs.

## Reproduce the analysis in VS Code

Use Python 3.12. From the repository root:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Select this `.venv` as the notebook kernel, then run these notebooks in order:

1. `01_eda.ipynb` — data quality, experiment balance and exploratory insights.
2. `02_preprocessing_feature_engineering.ipynb` — this is the current preprocessing notebook (not an old `02_preprocess.ipynb`).
3. `03_causal_graph.ipynb` — randomized and mock-retail DAGs.
4. `04_propensity_matching.ipynb` — balance diagnostic.
5. `05_double_ml.ipynb` — training and held-out evaluation.
6. `06_mid_project_audit.ipynb` — consistency checks and repeated refutations.
7. `07_budget_optimization.ipynb` — SciPy revenue allocation under a strict budget; see [Week 3 write-up](docs/WEEK_3_WRITEUP.md).

Notebook 01 is now self-contained; it does not need the old `common.py`. Model and preprocessing files are generated locally. Old `data/processed/train.csv` files retained in the repository are not inputs to the revised notebooks 05/06. Do not mix model files from different runs. If you regenerate preprocessing, rerun 05 and 06.

## Refresh dashboard results after rerunning notebooks

From the repository root, with the Python environment activated:

```bash
python dashboard/export_data.py
```

After exporting notebooks 01–06, run notebook 07 to refresh the allocation snapshot, then refresh the browser. If using the built preview, rebuild after exporting. The export validates source fingerprints and prepared-model inputs before copying the generated results. `dashboard/public/results/` contains the shareable demonstration snapshot; training artifacts stay under ignored `models/` and `results/` directories.

The Python export script is an operational bridge, not a duplicate notebook. It contains no training logic. Browser CSV uploads validate and preview data; they do not call a training service.

## Scope

Included: EDA, preprocessing, graphs, matching, DML, uplift/Qini, DoWhy audit, historical uploads, budget planning, 64,000-score filtering, charts and exports. Week 3 adds SciPy allocation, equal-cost live planning, a customer allocation matrix, benchmark comparisons and CSV exports. Not yet included: Week 4 REST API/drift detection or live scoring/retraining of raw uploads.

The audit refits smaller pairwise visit models. It cannot prove that hidden confounding is absent and does not refute every final-model ITE score. See [verification notes](docs/VERIFICATION.md) for the actual test evidence and limitations.

## Week 3 quick start

Open **Budget allocation**. The default is all 64,000 customer profiles, a $5,000 budget and an assumed $0.10 cost for either email. Edit these inputs to explore different plans. Zero budget selects nobody; No Email costs zero. Predictions are uncertain and all-row plans include training data. No discounts or realized profit are inferred.

Notebook 07 can run directly on the committed audited dashboard snapshot. To use a new training run, export notebooks 01–06 first, then rerun 07. Its outputs are under `results/optimization/`, with a shareable default in `dashboard/public/results/`. The browser solves the equivalent equal-cost problem locally; a REST API belongs to Week 4.

Read [Week 1](docs/WEEK_1_WRITEUP.md), [Week 2](docs/WEEK_2_WRITEUP.md), and [Week 3](docs/WEEK_3_WRITEUP.md) write-ups.
