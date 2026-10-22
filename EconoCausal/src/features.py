import pandas as pd
import numpy as np

df = pd.read_csv(r"E:\EconoCausal\data\hillstrom.csv")

# treatment (the promotional offer)
df["treated"] = (df["segment"] != "No E-Mail").astype(int)

# 1. customer value
df["log_history"] = np.log1p(df["history"])
df["high_value"] = (df["history"] > df["history"].median()).astype(int)
df["value_tier"] = pd.qcut(df["history"], 3, labels=["low", "mid", "high"])
df["value_tier_label"] = df["value_tier"].map({"low": 0, "mid": 1, "high": 2}).astype(int)

# 2. activity
df["recency_group"] = pd.cut(df["recency"], bins=[0, 3, 6, 12],
                             labels=["recent", "mid", "old"])
df["recent_buyer"] = (df["recency"] <= 3).astype(int)
df["lapsed"] = (df["recency"] >= 9).astype(int)

# 3. interest
def interest(row):
    if row["mens"] == 1 and row["womens"] == 1:
        return "both"
    if row["mens"] == 1:
        return "mens_only"
    if row["womens"] == 1:
        return "womens_only"
    return "neither"

df["interest_type"] = df.apply(interest, axis=1)

# 4. spending rate, loyalty, channel, location
df["history_per_month"] = df["history"] / df["recency"]
df["existing"] = 1 - df["newbie"]
df["multichannel"] = (df["channel"] == "Multichannel").astype(int)
df["rural"] = (df["zip_code"] == "Rural").astype(int)

# quick check: visit rate for treated vs not treated in each group
for col in ["value_tier", "recency_group", "interest_type"]:
    print(col)
    print(df.groupby([col, "treated"], observed=True)["visit"].mean().unstack().round(3))
    print()

df.to_csv(r"E:\EconoCausal\data\hillstrom_features.csv", index=False)
print("saved: hillstrom_features.csv")