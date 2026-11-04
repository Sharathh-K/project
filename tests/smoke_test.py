import json

import pandas as pd
from fastapi.testclient import TestClient

from api.main import app

COLS = ["recency", "history", "mens", "womens", "newbie", "history_floor", "zip_code", "channel"]

test = pd.read_csv("Data/Processed/test.csv")

# the history_floor rule used by the API must reproduce the stored column
rule = (test["history"].round(2) <= 29.99).astype(int)
assert (rule == test["history_floor"]).all(), "history_floor rule does not match the stored column"
print("history_floor rule matches the stored column: OK")

sample = test.head(3000)
df = sample[COLS].drop(columns="history_floor")          # sent without it, so the API has to compute it
df.insert(0, "customer_id", sample["Customer ID"].astype(str))
customers = json.loads(df.to_json(orient="records"))

with TestClient(app) as client:
    print(client.get("/health").json())

    r = client.post("/predict", json={"customers": customers[:3]})
    print(r.status_code, r.json())

    budget = len(customers) * 0.10 * 0.25          # 25% of the cost of e-mailing everyone with Mens
    r = client.post("/optimize", json={"customers": customers, "budget": budget})
    print(r.status_code)
    out = r.json()
    print(out["summary"])
    print(out["allocations"][:2])
    assert {"customer_id", "zip_code", "channel", "newbie", "ite_mens", "ite_womens"} <= set(out["allocations"][0])
    assert out["summary"]["total_cost"] <= budget + 1e-6, "budget exceeded"
    print("budget respected: OK")