# Jamboree Admission Modeling

This project explores the graduate-admission dataset, compares regression models using a held-out test set, then fits the selected model on all available rows.

## Files

- `Jamboree_Admission_EDA.ipynb` — executable exploratory analysis and plots.
- `compare_models.py` — preprocessing pipelines, train/test split, and training-only 5-fold hyperparameter comparison. Writes `model_comparison_results.json`.
- `train_final_model.py` — fits the selected configuration on the full dataset and saves a reusable pipeline in `artifacts/`.
- `requirements.txt` — project dependencies.

## Run

Install dependencies with `pip install -r requirements.txt`, then run `python compare_models.py` and `python train_final_model.py`. Open and run the EDA notebook in Jupyter or VS Code as needed.

## Modeling decisions

The cleaned target is `Chance of Admit`; `Serial No.` is excluded because it is an identifier. Missing-value imputation and standard scaling are kept inside sklearn pipelines. The best candidate was selected by mean 5-fold cross-validated R-squared on the training partition; the held-out test metrics are reported for evaluation and not used for tuning. The selected model is Ridge regression with `alpha=1.0`.

## Outputs

`artifacts/jamboree_admission_model.joblib` is the fitted sklearn pipeline, including its imputer and scaler. Load it with `joblib.load(...)` and call `.predict()` with a dataframe containing these columns: `GRE Score`, `TOEFL Score`, `University Rating`, `SOP`, `LOR`, `CGPA`, and `Research`. `artifacts/model_metadata.json` records the training configuration and feature order.
