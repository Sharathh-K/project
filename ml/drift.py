"""Data drift detector: compares a new CSV to the training data."""
import json, sys
from pathlib import Path
import pandas as pd
from scipy.stats import ks_2samp

REF = Path("EconoCausal/data/hillstrom.csv")
NUM = ["recency", "history", "mens", "womens", "newbie"]


def check(new_df, alpha=0.01):
    ref = pd.read_csv(REF)
    rows = []
    for c in NUM:
        if c in new_df:
            s, p = ks_2samp(ref[c].dropna(), new_df[c].dropna())
            # large samples flag tiny gaps, so also require a real gap (ks > 0.1)
            rows.append({"feature": c, "ks": round(float(s), 4),
                         "p_value": float(p), "drift": bool(p < alpha and s > 0.1)})
    drifted = [r["feature"] for r in rows if r["drift"]]
    msg = ("Warning: customer behavior changed in " + ", ".join(drifted)
           if drifted else "No drift detected. The model is still a good fit.")
    return {"drifted": drifted, "message": msg, "details": rows}


if __name__ == "__main__":
    out = check(pd.read_csv(sys.argv[1]))
    print(json.dumps(out, indent=2))
