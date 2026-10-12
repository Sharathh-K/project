"""EconoCausal - EDA on the Hillstrom email dataset.
Run from the E:\\EconoCausal folder:  python src\\eda.py
Graphs are saved in E:\\EconoCausal\\eda_outputs
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

sns.set_theme(style="whitegrid")
os.makedirs("eda_outputs", exist_ok=True)

def save(name):
    plt.tight_layout()
    plt.savefig(f"eda_outputs/{name}.png", dpi=110)
    plt.close()
    print("saved:", name)

# ---------- 1. LOAD AND BASIC CHECK ----------
df = pd.read_csv("data/hillstrom.csv")
print("\n=== 1. BASIC INFO ===")
print("Shape (rows, columns):", df.shape)
print(df.head())
print("\nData types:\n", df.dtypes)
print("\nMissing values:", int(df.isna().sum().sum()))
print("Duplicate rows:", int(df.duplicated().sum()))
print("\nSummary of numbers:\n", df.describe().round(2))

order = ["No E-Mail", "Womens E-Mail", "Mens E-Mail"]

# ---------- 2. SINGLE-VARIABLE (UNIVARIATE) GRAPHS ----------
print("\n=== 2. SINGLE-VARIABLE GRAPHS ===")
fig, ax = plt.subplots(1, 3, figsize=(15, 4))
sns.histplot(df["recency"], bins=12, ax=ax[0]); ax[0].set_title("recency (months)")
sns.histplot(df["history"].clip(upper=1500), bins=40, ax=ax[1]); ax[1].set_title("history (past spend, capped at 1500)")
sns.histplot(df.loc[df.spend > 0, "spend"], bins=30, ax=ax[2]); ax[2].set_title("spend (buyers only)")
save("01_histograms")

fig, ax = plt.subplots(1, 4, figsize=(16, 4))
for a, c in zip(ax, ["channel", "zip_code", "newbie", "segment"]):
    sns.countplot(x=c, data=df, ax=a); a.set_title(c); a.tick_params(axis="x", rotation=20)
save("02_countplots")

print(df[["visit", "conversion"]].mean().round(4))

# ---------- 3. TWO-VARIABLE (BIVARIATE) GRAPHS ----------
print("\n=== 3. BIVARIATE GRAPHS ===")
fig, ax = plt.subplots(1, 4, figsize=(17, 4))
for a, c in zip(ax, ["segment", "channel", "zip_code", "newbie"]):
    sns.barplot(x=c, y="visit", data=df, ax=a, errorbar=None); a.set_title(f"visit rate by {c}"); a.tick_params(axis="x", rotation=20)
save("03_visit_rate_by_group")

fig, ax = plt.subplots(1, 2, figsize=(11, 4))
sns.boxplot(x="visit", y="history", data=df, ax=ax[0]); ax[0].set_title("history vs visit")
sns.boxplot(x="visit", y="recency", data=df, ax=ax[1]); ax[1].set_title("recency vs visit")
save("04_boxplots")

# ---------- 4. MULTIVARIATE (HUE) GRAPHS ----------
print("\n=== 4. MULTIVARIATE (HUE) GRAPHS ===")
fig, ax = plt.subplots(1, 3, figsize=(17, 4.5))
for a, c in zip(ax, ["channel", "zip_code", "newbie"]):
    sns.barplot(x=c, y="visit", hue="segment", hue_order=order, data=df, ax=a, errorbar=None)
    a.set_title(f"visit rate by {c}, split by email group")
save("05_hue_visit_by_group_and_email")

plt.figure(figsize=(8, 4.5))
sns.lineplot(x="recency", y="visit", hue="segment", hue_order=order, data=df, errorbar=None, marker="o")
plt.title("visit rate by recency, split by email group")
save("06_hue_recency_lines")

# ---------- 5. ENCODING ----------
print("\n=== 5. ENCODING ===")
enc = df.drop(columns=["history_segment"])          # duplicate of history
enc["treatment"] = (enc["segment"] != "No E-Mail").astype(int)   # any email = 1
enc["mens_email"] = (enc["segment"] == "Mens E-Mail").astype(int)
enc = pd.get_dummies(enc, columns=["zip_code", "channel"], dtype=int)   # one-hot
print(enc.head())
print("Columns after encoding:", list(enc.columns))

# ---------- 6. CORRELATION ----------
print("\n=== 6. CORRELATION ===")
corr = enc.drop(columns=["segment"]).corr()
plt.figure(figsize=(12, 9))
sns.heatmap(corr, annot=True, fmt=".2f", cmap="coolwarm", center=0, annot_kws={"size": 7})
plt.title("Correlation heatmap (encoded data)")
save("07_correlation_heatmap")
print("\nCorrelation with visit:\n", corr["visit"].drop(["visit"]).sort_values(ascending=False).round(3))

# ---------- 7. RANDOMIZATION CHECK ----------
print("\n=== 7. RANDOMIZATION CHECK (features should look similar in all 3 groups) ===")
print(df.groupby("segment")[["recency", "history", "mens", "womens", "newbie"]].mean().round(3))
print(pd.crosstab(df["segment"], df["channel"], normalize="index").round(3))
print("\nDone. Open the folder E:\\EconoCausal\\eda_outputs to see the graphs.")