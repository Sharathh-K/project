"""
EconoCausal - Week 2: Double ML training (EconML) -> ITE per customer.

Run from the repo root:
    python EconoCausal/ml/train_dml.py

Output: EconoCausal/results/ite_results.csv
Columns: customer_id, arm, split, treatment, spend, visit, conversion, ite_pred
"""
from pathlib import Path

import numpy as np
import pandas as pd
from econml.dml import CausalForestDML
from lightgbm import LGBMRegressor
from sklearn.dummy import DummyClassifier
from sklearn.model_selection import train_test_split

# ---------------------------------------------------------------- config
DATA_PATH = Path("EconoCausal/data/hillstrom.csv")
OUT_DIR = Path("EconoCausal/results")
OUT_DIR.mkdir(parents=True, exist_ok=True)

SEED = 42
OUTCOME = "visit"
CONTROL = "No E-Mail"
ARMS = ["Mens E-Mail", "Womens E-Mail"]

NUMERIC = ["recency", "history", "mens", "womens", "newbie"]
CATEGORICAL = ["history_segment", "zip_code", "channel"]
# NOTE: visit / conversion / spend are NEVER features (that would be leakage).


# ---------------------------------------------------------------- data
def load_data():
    df = pd.read_csv(DATA_PATH)
    df["customer_id"] = df.index
    print("Segments:", df["segment"].unique().tolist())

    # One-hot encode once on the full data so every arm has the same columns
    X_all = pd.concat(
        [df[NUMERIC], pd.get_dummies(df[CATEGORICAL], dtype=float)], axis=1
    ).astype(float)
    return df, X_all


# ---------------------------------------------------------------- model
def build_model():
    # Outcome model: predicts spend from customer features
    model_y = LGBMRegressor(
        n_estimators=200,
        learning_rate=0.05,
        num_leaves=15,
        min_child_samples=50,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=SEED,
        verbose=-1,
    )
    # Treatment model: the e-mail was randomly assigned (~50/50 within each
    # pair), so the propensity is constant. DummyClassifier("prior") returns
    # exactly that, which is the correct model for a randomized experiment.
    model_t = DummyClassifier(strategy="prior")

    return CausalForestDML(
        model_y=model_y,
        model_t=model_t,
        discrete_treatment=True,
        n_estimators=500,
        min_samples_leaf=50,
        max_depth=None,
        cv=3,
        random_state=SEED,
    )


# ---------------------------------------------------------------- checks
def decile_table(test_df):
    """Actual uplift per ITE decile on held-out data (decile 1 = highest ITE)."""
    t = test_df.copy()
    t["decile"] = pd.qcut(
        t["ite_pred"].rank(method="first", ascending=False), 10, labels=range(1, 11)
    )
    rows = []
    for dec, g in t.groupby("decile", observed=True):
        treated = g.loc[g["treatment"] == 1, OUTCOME].mean()
        control = g.loc[g["treatment"] == 0, OUTCOME].mean()
        rows.append(
            {
                "decile": dec,
                "n": len(g),
                "mean_pred_ite": g["ite_pred"].mean(),
                "actual_uplift": treated - control,
            }
        )
    return pd.DataFrame(rows)


# ---------------------------------------------------------------- main
def train_arm(df, X_all, arm):
    print(f"\n===== {arm} vs {CONTROL} (outcome: {OUTCOME}) =====")
    sub = df[df["segment"].isin([arm, CONTROL])].copy()
    sub["treatment"] = (sub["segment"] == arm).astype(int)
    X = X_all.loc[sub.index]

    # Stratify on treatment so train and test keep the same treated share
    idx_train, idx_test = train_test_split(
        sub.index, test_size=0.3, random_state=SEED, stratify=sub["treatment"]
    )

    est = build_model()
    est.fit(
        sub.loc[idx_train, OUTCOME].values,
        sub.loc[idx_train, "treatment"].values,
        X=X.loc[idx_train],
    )

    # ITE for every customer in this comparison
    sub["ite_pred"] = est.effect(X).ravel()
    sub["split"] = "train"
    sub.loc[idx_test, "split"] = "test"
    sub["arm"] = arm

    # Sanity check 1: average predicted effect vs simple difference in means
    test = sub.loc[idx_test]
    naive = (
        test.loc[test["treatment"] == 1, OUTCOME].mean()
        - test.loc[test["treatment"] == 0, OUTCOME].mean()
    )
    ate = est.ate(X.loc[idx_test])
    lo, hi = est.ate_interval(X.loc[idx_test], alpha=0.05)
    print(f"Test naive diff in means : {naive:.3f}")
    print(f"Test model ATE           : {ate:.3f}  (95% CI {lo:.3f} to {hi:.3f})")
    print(f"ITE min / mean / max     : {test['ite_pred'].min():.3f} / "
          f"{test['ite_pred'].mean():.3f} / {test['ite_pred'].max():.3f}")

    # Sanity check 2: do high-ITE deciles really show more actual uplift?
    print("\nUplift by predicted-ITE decile (test set):")
    print(decile_table(test).round(3).to_string(index=False))

    
         cols = list(dict.fromkeys(
        ["customer_id", "arm", "split", "treatment", OUTCOME,
         "visit", "conversion", "ite_pred"]
    ))
    return sub[cols]     


def main():
    df, X_all = load_data()
    results = pd.concat([train_arm(df, X_all, arm) for arm in ARMS], ignore_index=True)
    out_path = OUT_DIR / "ite_results.csv"
    results.to_csv(out_path, index=False)
    print(f"\nSaved {len(results):,} rows to {out_path}")


if __name__ == "__main__":
    main()
