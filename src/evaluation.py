"""Evaluation curves for the held-out randomized e-mail experiment."""

import numpy as np

GRID = np.linspace(0.01, 1.0, 100)
ARMS = {
    "Mens E-Mail": "ite_mens",
    "Womens E-Mail": "ite_womens",
}
CONTROL = "No E-Mail"


def _curves(outcome, treated, score):
    order = np.argsort(-score, kind="stable")
    outcome = outcome[order]
    treated = treated[order]

    cumulative_treated_outcome = np.cumsum(outcome * treated)
    cumulative_control_outcome = np.cumsum(outcome * (1 - treated))
    cumulative_treated = np.cumsum(treated)
    cumulative_control = np.cumsum(1 - treated)
    indices = np.clip((GRID * len(outcome)).astype(int) - 1, 0, len(outcome) - 1)

    treated_count = np.maximum(cumulative_treated[indices], 1)
    control_count = np.maximum(cumulative_control[indices], 1)
    qini = (
        cumulative_treated_outcome[indices]
        - cumulative_control_outcome[indices] * treated_count / control_count
    ) / treated.sum() * 1000
    uplift = (
        cumulative_treated_outcome[indices] / treated_count
        - cumulative_control_outcome[indices] / control_count
    ) * 100
    return qini, uplift


def _qini_area(qini):
    x = np.concatenate(([0.0], GRID))
    gap = np.concatenate(([0.0], qini)) - np.concatenate(([0.0], qini[-1] * GRID))
    return float(np.sum(np.diff(x) * (gap[1:] + gap[:-1]) / 2))


def build_evaluation_curves(test, predictions, n_boot=300, seed=0):
    """Build arm-vs-control Qini and uplift curves with paired bootstrap bands."""
    required = {"segment", "conversion", "Customer ID"}
    missing = required.difference(test.columns)
    if missing:
        raise ValueError(f"Evaluation data is missing columns: {', '.join(sorted(missing))}.")

    curve_count = len(GRID)
    rng = np.random.default_rng(seed)
    curves = []

    for arm, score_column in ARMS.items():
        if score_column not in predictions:
            raise ValueError(f"Predictions are missing column: {score_column}.")

        mask = test["segment"].isin([CONTROL, arm]).to_numpy()
        outcome = test.loc[mask, "conversion"].to_numpy(dtype=float)
        treated = (test.loc[mask, "segment"] == arm).to_numpy(dtype=float)
        score = predictions.loc[mask, score_column].to_numpy(dtype=float)
        if not len(outcome) or treated.sum() == 0 or (1 - treated).sum() == 0:
            raise ValueError(f"Evaluation data must contain both {arm} and {CONTROL} customers.")
        if not np.isfinite(outcome).all() or not np.isfinite(score).all():
            raise ValueError(f"Evaluation data contains non-finite outcomes or {score_column} scores.")

        qini, uplift = _curves(outcome, treated, score)
        bootstrap_qini = np.empty((n_boot, curve_count))
        bootstrap_uplift = np.empty((n_boot, curve_count))
        for sample_index in range(n_boot):
            indices = rng.integers(0, len(outcome), len(outcome))
            sample_treated = treated[indices]
            if sample_treated.sum() == 0 or sample_treated.sum() == len(indices):
                bootstrap_qini[sample_index] = np.nan
                bootstrap_uplift[sample_index] = np.nan
                continue
            bootstrap_qini[sample_index], bootstrap_uplift[sample_index] = _curves(
                outcome[indices],
                sample_treated,
                score[indices],
            )

        qini_lower, qini_upper = np.nanpercentile(bootstrap_qini, [5, 95], axis=0)
        uplift_lower, uplift_upper = np.nanpercentile(bootstrap_uplift, [5, 95], axis=0)
        average_uplift = float((outcome[treated == 1].mean() - outcome[treated == 0].mean()) * 100)
        top_30_index = int(np.argmin(np.abs(GRID - 0.30)))

        curves.append({
            "arm": arm,
            "control": CONTROL,
            "n_customers": int(mask.sum()),
            "qini": {
                "x": GRID.tolist(),
                "y": qini.tolist(),
                "random": (qini[-1] * GRID).tolist(),
                "lower": qini_lower.tolist(),
                "upper": qini_upper.tolist(),
                "area": _qini_area(qini),
                "area_ci": [
                    float(np.nanpercentile([_qini_area(sample) for sample in bootstrap_qini], 5)),
                    float(np.nanpercentile([_qini_area(sample) for sample in bootstrap_qini], 95)),
                ],
                "top_30_qini": float(qini[top_30_index]),
                "random_top_30_qini": float(qini[-1] * GRID[top_30_index]),
            },
            "uplift": {
                "x": GRID.tolist(),
                "y": uplift.tolist(),
                "average": average_uplift,
                "lower": uplift_lower.tolist(),
                "upper": uplift_upper.tolist(),
            },
        })

    return {
        "evaluation": "held-out randomized test set",
        "outcome": "conversion",
        "n_test_customers": int(len(test)),
        "confidence_level": 0.90,
        "bootstrap_samples": n_boot,
        "curves": curves,
    }
