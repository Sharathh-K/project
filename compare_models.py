"""Compare regression algorithms for the Jamboree admission dataset.

The held-out test set is used only for final evaluation; hyperparameters are
selected using cross-validation within the training partition.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV, KFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "Jamboree_Admission.csv"
TARGET = "Chance of Admit"
IDENTIFIER = "Serial No."
RANDOM_STATE = 42


def main() -> None:
    data = pd.read_csv(DATA_PATH)
    data.columns = data.columns.str.strip()
    if TARGET not in data.columns:
        raise KeyError(f"Required target column {TARGET!r} not found")

    y = pd.to_numeric(data[TARGET], errors="raise")
    X = data.drop(columns=[TARGET, IDENTIFIER], errors="ignore")
    X = X.apply(pd.to_numeric, errors="raise")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE
    )

    preprocessor = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    cv = KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    candidates = {
        "LinearRegression": (
            LinearRegression(),
            {},
        ),
        "Ridge": (
            Ridge(),
            {"regressor__alpha": [0.01, 0.1, 1.0, 10.0, 100.0]},
        ),
        "RandomForest": (
            RandomForestRegressor(random_state=RANDOM_STATE, n_jobs=-1),
            {
                "regressor__n_estimators": [200],
                "regressor__max_depth": [None, 4, 8],
                "regressor__min_samples_leaf": [1, 2, 4],
                "regressor__max_features": [1.0, "sqrt"],
            },
        ),
        "GradientBoosting": (
            GradientBoostingRegressor(random_state=RANDOM_STATE),
            {
                "regressor__n_estimators": [100, 200],
                "regressor__learning_rate": [0.03, 0.05, 0.1],
                "regressor__max_depth": [1, 2],
                "regressor__min_samples_leaf": [2, 4],
            },
        ),
    }

    results: list[dict[str, object]] = []
    best_search: GridSearchCV | None = None
    best_name: str | None = None
    for name, (regressor, param_grid) in candidates.items():
        pipeline = Pipeline(
            steps=[("preprocess", preprocessor), ("regressor", regressor)]
        )
        search = GridSearchCV(
            pipeline,
            param_grid=param_grid,
            scoring="r2",
            cv=cv,
            n_jobs=-1,
            refit=True,
            return_train_score=False,
        )
        search.fit(X_train, y_train)
        predictions = search.predict(X_test)
        row: dict[str, object] = {
            "algorithm": name,
            "best_cv_r2": float(search.best_score_),
            "test_r2": float(r2_score(y_test, predictions)),
            "test_mae": float(mean_absolute_error(y_test, predictions)),
            "test_rmse": float(np.sqrt(mean_squared_error(y_test, predictions))),
            "best_params": search.best_params_,
        }
        results.append(row)
        print(
            f"{name:18s} CV R2={row['best_cv_r2']:.4f} | "
            f"test R2={row['test_r2']:.4f} | MAE={row['test_mae']:.4f} | "
            f"RMSE={row['test_rmse']:.4f} | params={search.best_params_}"
        )
        if best_search is None or search.best_score_ > best_search.best_score_:
            best_search = search
            best_name = name

    assert best_search is not None and best_name is not None
    results.sort(key=lambda result: float(result["best_cv_r2"]), reverse=True)
    summary = {
        "selection_metric": "mean 5-fold cross-validated R2 on the training partition",
        "random_state": RANDOM_STATE,
        "test_size": 0.2,
        "best_algorithm": best_name,
        "best_params": best_search.best_params_,
        "results": results,
    }
    output_path = ROOT / "model_comparison_results.json"
    output_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(f"\nSelected by training CV: {best_name} {best_search.best_params_}")
    print(f"Wrote comparison summary to {output_path}")
    print("Use the test metrics as an estimate, not as a tuning target.")


if __name__ == "__main__":
    main()
