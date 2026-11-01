import json

import pandas as pd
from fastapi.testclient import TestClient

from api.main import app

COLS = ["recency", "history", "mens", "womens", "newbie", "history_floor", "zip_code", "channel"]
src = pd.read_csv("Data/Processed/test.csv").sample(3000, random_state=1)
df = src[COLS].copy()
df.insert(0, "customer_id", src["Customer ID"].astype(str))


def send(frame):
    return client.post("/drift", json={"customers": json.loads(frame.to_json(orient="records"))}).json()


with TestClient(app) as client:
    same = send(df)
    print("UNCHANGED DATA ->", same["status"])
    for m in same["messages"]:
        print("  ", m)

    shifted = df.copy()
    shifted["history"] = shifted["history"] * 1.6
    shifted["recency"] = shifted["recency"] + 3
    shifted["channel"] = "Web"
    drifted = send(shifted)
    print("\nSHIFTED DATA ->", drifted["status"])
    for m in drifted["messages"]:
        print("  ", m)

    small = send(df.head(100))
    print("\nTINY UPLOAD ->", small["status"], "|", small["messages"][0])