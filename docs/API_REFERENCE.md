# Week 4 API

Run from the repository root in Python 3.12 after installing `requirements.txt` and executing notebooks 02 and 05 (06 for the audit):

```sh
python -m uvicorn api.main:app --host 127.0.0.1 --port 8002
```

Interactive documentation: http://127.0.0.1:8002/docs . Machine-readable contract: `/openapi.json`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Process is running; does not claim models are ready |
| GET | `/api/model` | Loads local model, returns its SHA256 fingerprint and reference size; 503 if files are missing |
| POST | `/api/score` | Six email-effect estimates and automatic drift screening |
| POST | `/api/drift` | Baseline-distribution screening without predictions |
| POST | `/api/recommend` | Server scoring, automatic drift and Week 3 budget optimization |

Example body for `/api/recommend`:

```json
{"customers":[{"customer_id":"example-1","recency":3,"history":100,"mens":1,"womens":0,"newbie":0,"zip_code":"Urban","channel":"Web"}],"budget":1,"email_cost":0.10}
```

For `/api/score` or `/api/drift`, omit budget and email_cost. Batches contain 1–5,000 unique customer IDs. History must be finite and nonnegative, recency an integer 1–12, and the three flags 0 or 1. Extra JSON fields, including post-campaign outcomes, are rejected. Categories unseen during training are accepted by the fitted encoder but flagged in drift screening. `Surburban` is normalized to `Suburban`.

Responses include rows and drift; recommendations also include allocation totals and a plain summary. Visit/conversion effects are probability differences (multiply by 100 for percentage points); spend effects are dollars. The model fingerprint identifies the exact trusted local bundle. The API never accepts uploaded pickle/joblib models and never persists customer requests.

422 means invalid input; 503 means missing artifacts or unsuccessful optimization. Restart the API after rebuilding model artifacts; it caches the model in memory. No automatic model retraining occurs.

Numeric drift uses KS distance; categorical drift uses total variation. Threshold 0.1 is a heuristic. Unknown categories trigger review; fewer than 100 rows yields insufficient_data. These checks cannot establish causal-effect stability or absence of hidden confounding.

Keep the service bound to 127.0.0.1. Public deployment requires authentication, request quotas, secure hosting, privacy review and monitoring; this project delivers a local demonstrator. References: [FastAPI testing](https://fastapi.tiangolo.com/tutorial/testing/) and [SciPy KS documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_2samp.html).
