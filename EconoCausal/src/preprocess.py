import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

df = pd.read_csv(r"E:\EconoCausal\data\hillstrom_features.csv")

# 1. LABEL ENCODING (ordered category)
df["recency_label"] = df["recency_group"].map({"recent": 0, "mid": 1, "old": 2})

# 2. ONE-HOT ENCODING (categories with no order)
df = pd.get_dummies(df, columns=["channel", "zip_code", "interest_type"],
                    drop_first=True, dtype=int)

# 3. SPLIT INTO TARGET, TREATMENT AND FEATURES
y = df["visit"]        # target
T = df["treated"]      # treatment (got the promotional email or not)

# not allowed as features: outcomes, the treatment itself, and text copies
drop = ["visit", "conversion", "spend",
        "segment", "treated",
        "recency_group", "value_tier"]
X = df.drop(columns=drop)

print("Feature columns:", list(X.columns))
print("Any missing values:", X.isna().sum().sum())

# 4. TRAIN / TEST SPLIT
X_train, X_test, y_train, y_test, T_train, T_test = train_test_split(
    X, y, T, test_size=0.2, random_state=42, stratify=T)

X_train = X_train.copy()
X_test = X_test.copy()

# 5. SCALING (number columns only, fit on train only)
cols = ["recency", "history", "log_history", "history_per_month"]
scaler = StandardScaler()
X_train[cols] = scaler.fit_transform(X_train[cols])
X_test[cols] = scaler.transform(X_test[cols])

# 6. CHECKS
print("\nTrain shape:", X_train.shape, " Test shape:", X_test.shape)
print("\nScaled columns (train): mean should be near 0, std near 1")
print(X_train[cols].describe().loc[["mean", "std"]].round(2))
print("\nTreated share  train:", round(T_train.mean(), 3), " test:", round(T_test.mean(), 3))
print("Visit rate     train:", round(y_train.mean(), 3), " test:", round(y_test.mean(), 3))

# 7. SAVE
X_train.assign(visit=y_train, treated=T_train).to_csv(r"E:\EconoCausal\data\train.csv", index=False)
X_test.assign(visit=y_test, treated=T_test).to_csv(r"E:\EconoCausal\data\test.csv", index=False)
print("\nsaved: train.csv and test.csv")