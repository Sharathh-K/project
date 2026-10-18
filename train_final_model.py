"""Fit and save the finalized admission-chance regression model on all rows."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
import sklearn
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "Jamboree_Admission.csv"
ARTIFACTS_DIR = ROOT / "artifacts"
MODEL_PATH = ARTIFACTS_DIR / "jamboree_admission_model.joblib"
METADATA_PATH = ARTIFACTS_DIR / "model_metadata.json"
TARGET = "Chance of Admit"
IDENTIFIER = "Serial No."

# Selected in compare_models.py by the best mean 5-fold training CV R-squared.
MODEL_NAME = "Ridge"
MODEL_PARAMETERS = {"alpha": 1.0}


def main() -> None:
    data = pd.read_csv(DATA_PATH)
    data.columns = data.columns.str.strip()
    if TARGET not in data.columns:
        raise KeyError(f"Required target column {TARGET!r} not found")

    y = pd.to_numeric(data[TARGET], errors="raise")
    X = data.drop(columns=[TARGET, IDENTIFIER], errors="ignore")
    X = X.apply(pd.to_numeric, errors="raise")

    model = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("regressor", Ridge(**MODEL_PARAMETERS)),
        ]
    )
    model.fit(X, y)

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    metadata = {
        "model": MODEL_NAME,
        "parameters": MODEL_PARAMETERS,
        "target": TARGET,
        "features": X.columns.tolist(),
        "identifier_excluded": IDENTIFIER,
        "training_rows": int(len(X)),
        "preprocessing": [
            "median imputation (fit on all training rows)",
            "standard scaling (fit on all training rows)",
        ],
        "selection": "Best mean 5-fold CV R-squared on the training partition; see model_comparison_results.json",
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
        "scikit_learn_version": sklearn.__version__,
    }
    METADATA_PATH.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(f"Fitted {MODEL_NAME} on all {len(X)} rows with features: {X.columns.tolist()}")
    print(f"Saved model: {MODEL_PATH}")
    print(f"Saved metadata: {METADATA_PATH}")


if __name__ == "__main__":
    main()
