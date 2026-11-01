import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import ks_2samp

NUMERIC = ["recency", "history"]
CATEGORICAL = ["mens", "womens", "newbie", "history_floor", "zip_code", "channel"]
PREDICTIONS = ["ite_mens", "ite_womens"]

WATCH, ALERT = 0.10, 0.25      # PSI thresholds: below 0.10 ok, 0.10 to 0.25 watch, 0.25 and above alert
MIN_ROWS = 500                 # smaller uploads give a noisy check
EPS = 1e-4
SAMPLE = 5000
ORDER = {"ok": 0, "watch": 1, "alert": 2}


def _psi(p_ref, p_new):
    p_ref = np.clip(np.asarray(p_ref, float), EPS, None)
    p_new = np.clip(np.asarray(p_new, float), EPS, None)
    return float(np.sum((p_new - p_ref) * np.log(p_new / p_ref)))


def _status(psi):
    return "alert" if psi >= ALERT else "watch" if psi >= WATCH else "ok"


def _label(s):
    """Same text for 0, 0.0 and '0', so a float column does not look like drift."""
    s = pd.Series(s)
    if pd.api.types.is_numeric_dtype(s):
        return s.astype(float).round().astype(int).astype(str)
    return s.astype(str)


def _bin_props(x, edges):
    idx = np.searchsorted(edges, x, side="right")
    counts = np.bincount(idx, minlength=len(edges) + 1)
    return counts / counts.sum()


def _numeric_profile(x, bins=10, seed=0):
    x = pd.Series(x).dropna().to_numpy(float)
    edges = np.unique(np.quantile(x, np.linspace(0, 1, bins + 1)[1:-1]))
    sample = np.random.default_rng(seed).choice(x, size=min(SAMPLE, len(x)), replace=False)
    return {"edges": edges.tolist(), "props": _bin_props(x, edges).tolist(),
            "sample": sample.tolist(), "mean": float(x.mean())}


def build_reference(features, effects=None):
    """Profile of the training data that new uploads are compared with."""
    ref = {"n_rows": int(len(features)),
           "numeric": {c: _numeric_profile(features[c]) for c in NUMERIC},
           "categorical": {c: _label(features[c]).value_counts(normalize=True).to_dict() for c in CATEGORICAL},
           "predictions": {}}
    if effects is not None:
        ref["predictions"] = {c: _numeric_profile(effects[c]) for c in PREDICTIONS}
    return ref


def save_reference(ref, path):
    Path(path).write_text(json.dumps(ref))


def load_reference(path):
    return json.loads(Path(path).read_text())


def _numeric_row(name, prof, x, kind):
    x = pd.Series(x).dropna().to_numpy(float)
    psi = _psi(prof["props"], _bin_props(x, np.array(prof["edges"])))
    return {"feature": name, "type": kind, "psi": round(psi, 4),
            "ks_stat": round(float(ks_2samp(prof["sample"], x).statistic), 4),
            "mean_reference": round(prof["mean"], 5), "mean_new": round(float(x.mean()), 5),
            "status": _status(psi)}


def check_drift(ref, features, effects=None):
    n = len(features)
    rows = []
    for c in NUMERIC:
        rows.append(_numeric_row(c, ref["numeric"][c], features[c], "numeric"))
    for c in CATEGORICAL:
        new = _label(features[c]).value_counts(normalize=True).to_dict()
        cats = sorted(set(ref["categorical"][c]) | set(new))
        psi = _psi([ref["categorical"][c].get(k, 0) for k in cats], [new.get(k, 0) for k in cats])
        rows.append({"feature": c, "type": "categorical", "psi": round(psi, 4), "status": _status(psi)})

    preds = []
    if effects is not None and ref.get("predictions"):
        for c in PREDICTIONS:
            preds.append(_numeric_row(c, ref["predictions"][c], effects[c], "predicted uplift"))

    flagged = [r for r in rows + preds if r["status"] != "ok"]
    worst = max((r["status"] for r in rows + preds), key=ORDER.get, default="ok")

    messages = [f"{r['feature']}: PSI {r['psi']:.2f} ({r['status']})" for r in flagged]
    if n < MIN_ROWS:
        status = "insufficient_data"
        messages.insert(0, f"Only {n} rows uploaded; at least {MIN_ROWS} are needed for a reliable drift check.")
    else:
        status = worst
        headline = {
            "ok": "No meaningful change detected compared with the training data.",
            "watch": "Some features have shifted moderately. Keep an eye on the results.",
            "alert": ("Customer data differs substantially from the training data. The uplift estimates "
                      "and the allocation may be unreliable; review before acting on them."),
        }[worst]
        messages.insert(0, headline)

    return {"status": status, "n_rows": int(n),
            "thresholds": {"watch": WATCH, "alert": ALERT, "min_rows": MIN_ROWS},
            "features": rows, "predictions": preds, "messages": messages}


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1]
    train = pd.read_csv(root / "Data" / "Processed" / "train.csv")
    eff = pd.read_csv(root / "Data" / "Processed" / "effects_forestdr.csv")
    eff = train[["Customer ID"]].merge(eff, on="Customer ID", how="left", validate="one_to_one")
    assert eff[PREDICTIONS].notna().all().all(), "effects missing for some training customers"
    ref = build_reference(train, eff)
    out = root / "Models" / "drift_reference.json"
    save_reference(ref, out)
    print("saved", out, "| rows in reference:", ref["n_rows"])