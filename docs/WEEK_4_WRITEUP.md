# Week 4 — API, data drift and dashboard polish

## What we added and why
1. **REST API:** reusable endpoints score new baseline customer records with the trained EconML models. This makes notebook work available to the React dashboard without retraining on uploads.
2. **Automatic drift screening:** every scoring request compares incoming baseline characteristics against the 44,800 training customers. Numeric and categorical distances flag changes requiring review. A warning does not prove the email effect has changed.
3. **Shared budget solver:** notebook 07 and the API import the same SciPy optimizer. The API derives effects itself rather than accepting invented user-supplied effect scores.
4. **Live scoring & drift page:** upload baseline CSV data or load a held-out sample, set budget/cost, run the workflow, inspect warnings and recommendations, and download all rows.
5. **Plain-language summary:** reports contact count, actual planned contact cost, contact-cost difference versus emailing everyone, and predicted additional revenue. Predictions are clearly distinguished from measured sales.
6. **Notebook 08 and tests:** verify API/notebook prediction agreement, unchanged/shifted/small-batch drift behavior, input validation and budget limits.

## Simple example
With $1 and a $0.10 cost per email, the system can send at most ten emails. It ranks customers by their better positive estimated spending effect and chooses up to ten. If uploaded customers differ substantially from training customers, the page says review. It does not promise a profitable real campaign.

## Dashboard walkthrough
Open **Live scoring & drift**. Start with **Use 1,000 held-out sample customers** to demonstrate the workflow, or upload a CSV with recency, history, mens, womens, newbie, zip_code and channel. Customer IDs are optional in CSV; generated row IDs identify records only. Set the budget and equal cost per email, then choose **Check drift, score and allocate**. Review the drift table, the plan summary and the first 20 recommendations; download the complete plan. An unavailable API shows an error, never fabricated live predictions.

The older EDA, graph, matching, uplift and audit pages retain the historical analysis. The budget-allocation page supports historical scores; the live page supports new-customer inference. These are different populations.

## Run the full local application
Install Python requirements in a Python 3.12 virtual environment. Execute 02, 05 and 06 to create trusted local model artifacts; run 07 and 08 for their reports. Model binaries and generated working data are intentionally not pushed to Git.

```sh
cd dashboard
pnpm install --frozen-lockfile
pnpm build
cd ..
python -m uvicorn api.main:app --host 127.0.0.1 --port 8002
```

Open http://127.0.0.1:8002/ . The same process serves the built dashboard and API. Keep that terminal running. The link is local, not an expiring hosted link; it stops when the server stops or the laptop sleeps. Development alternative: run the API on 8002 and `pnpm dev` in dashboard; Vite proxies `/api` to 8002.

## What we can honestly conclude
The engineering workflow is testable and reusable. It does not prove that every individual effect is correct. Hillstrom randomizes email campaigns, not discount amounts. Spending rankings remain uncertain, and the women's-email smaller-sample audit warning remains visible. A randomized pilot is needed before claiming realized business gains. Week 4 completes a local project demonstration, not enterprise deployment security.
