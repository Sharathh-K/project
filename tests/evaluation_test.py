import numpy as np
import pandas as pd

from src.evaluation import GRID, _curves, build_evaluation_curves


def test_evaluation_curves_include_random_baseline_and_bootstrap_bands():
    rows = []
    predictions = []
    for arm, segment in (
        ("No E-Mail", "No E-Mail"),
        ("Mens E-Mail", "Mens E-Mail"),
        ("Womens E-Mail", "Womens E-Mail"),
    ):
        for index in range(60):
            rows.append({
                "Customer ID": f"{segment}-{index}",
                "segment": segment,
                "conversion": int(index % 5 == 0 or (segment != "No E-Mail" and index % 4 == 0)),
            })
            predictions.append({
                "ite_mens": (60 - index) / 100,
                "ite_womens": index / 100,
            })

    report = build_evaluation_curves(pd.DataFrame(rows), pd.DataFrame(predictions), n_boot=40, seed=7)

    assert report["evaluation"] == "held-out randomized test set"
    assert report["n_test_customers"] == 180
    assert report["confidence_level"] == 0.90
    assert len(report["curves"]) == 2
    for curve in report["curves"]:
        assert curve["qini"]["x"] == GRID.tolist()
        assert curve["uplift"]["x"] == GRID.tolist()
        assert len(curve["qini"]["random"]) == len(GRID)
        np.testing.assert_allclose(curve["qini"]["random"], curve["qini"]["y"][-1] * GRID)
        assert len(curve["qini"]["lower"]) == len(GRID)
        assert len(curve["qini"]["upper"]) == len(GRID)
        assert len(curve["qini"]["gap_lower"]) == len(GRID)
        assert len(curve["qini"]["gap_upper"]) == len(GRID)
        assert len(curve["uplift"]["lower"]) == len(GRID)
        assert len(curve["uplift"]["upper"]) == len(GRID)
        assert curve["qini"]["area_ci"][0] <= curve["qini"]["area_ci"][1]
        assert np.all(np.asarray(curve["qini"]["lower"]) <= np.asarray(curve["qini"]["upper"]))
        assert np.all(np.asarray(curve["qini"]["gap_lower"]) <= np.asarray(curve["qini"]["gap_upper"]))
        assert np.all(np.asarray(curve["uplift"]["lower"]) <= np.asarray(curve["uplift"]["upper"]))


def test_qini_gap_band_uses_each_bootstrap_sample_random_baseline():
    rows = []
    predictions = []
    for segment in ("No E-Mail", "Mens E-Mail", "Womens E-Mail"):
        for index in range(60):
            rows.append({
                "Customer ID": f"{segment}-{index}",
                "segment": segment,
                "conversion": int(index % 5 == 0 or (segment != "No E-Mail" and index % 4 == 0)),
            })
            predictions.append({
                "ite_mens": (60 - index) / 100,
                "ite_womens": index / 100,
            })

    seed = 19
    n_boot = 40
    test = pd.DataFrame(rows)
    prediction_frame = pd.DataFrame(predictions)
    report = build_evaluation_curves(test, prediction_frame, n_boot=n_boot, seed=seed)

    mask = test["segment"].isin(["No E-Mail", "Mens E-Mail"]).to_numpy()
    outcome = test.loc[mask, "conversion"].to_numpy(dtype=float)
    treated = (test.loc[mask, "segment"] == "Mens E-Mail").to_numpy(dtype=float)
    score = prediction_frame.loc[mask, "ite_mens"].to_numpy(dtype=float)
    rng = np.random.default_rng(seed)
    bootstrap_gaps = []
    for _ in range(n_boot):
        indices = rng.integers(0, len(outcome), len(outcome))
        sample_treated = treated[indices]
        if sample_treated.sum() == 0 or sample_treated.sum() == len(indices):
            continue
        sample_qini, _ = _curves(outcome[indices], sample_treated, score[indices])
        bootstrap_gaps.append(sample_qini - sample_qini[-1] * GRID)

    expected_lower, expected_upper = np.percentile(bootstrap_gaps, [5, 95], axis=0)
    mens_qini = report["curves"][0]["qini"]
    np.testing.assert_allclose(mens_qini["gap_lower"], expected_lower)
    np.testing.assert_allclose(mens_qini["gap_upper"], expected_upper)


def test_evaluation_curves_require_outcome_and_treatment():
    test = pd.DataFrame({"segment": ["No E-Mail"], "conversion": [0]})
    predictions = pd.DataFrame({"ite_mens": [0.1], "ite_womens": [0.2]})

    try:
        build_evaluation_curves(test, predictions, n_boot=5)
    except ValueError as error:
        assert "Customer ID" in str(error)
    else:
        raise AssertionError("Expected missing evaluation columns to be rejected.")
