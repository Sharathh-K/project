"""EconoCausal - Week 4: compare targeting strategies at the same budget.
Run from repo root:  python ml/compare_strategies.py --budget 5000 --coupon 5
Run ml/optimize.py first, because this reads prescription.csv.
Output: EconoCausal/results/strategy_comparison.csv
"""
import argparse
import numpy as np
import pandas as pd
from optimize import lift, VALUE_PER_VISIT, IN_PATH, OUT_DIR


def net_gain(ite, coupon):
    """Model-estimated net gain: extra visits worth VALUE_PER_VISIT minus coupon cost."""
    return float((np.asarray(ite) * lift(coupon) * VALUE_PER_VISIT - coupon).sum())


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--budget", type=float, default=5000)
    p.add_argument("--coupon", type=int, default=5, help="coupon size for baselines")
    a = p.parse_args()

    df = pd.read_csv(IN_PATH)
    df = df[df["split"] == "test"]
    best = df.sort_values("ite_pred", ascending=False).drop_duplicates("customer_id")
    ite = best["ite_pred"].values              # sorted high to low
    n = int(a.budget // a.coupon)

    rng = np.random.default_rng(42)
    random_gain = np.mean(
        [net_gain(rng.choice(ite, n, replace=False), a.coupon) for _ in range(200)]
    )
    top_gain = net_gain(ite[:n], a.coupon)

    presc = pd.read_csv(OUT_DIR / "prescription.csv")
    rows = [
        {"strategy": "Random customers", "coupons": n,
         "spent": n * a.coupon, "net_gain": round(random_gain, 2)},
        {"strategy": "Top customers by ITE", "coupons": n,
         "spent": n * a.coupon, "net_gain": round(top_gain, 2)},
        {"strategy": "Optimizer (prescription)", "coupons": len(presc),
         "spent": int(presc["discount"].sum()),
         "net_gain": round(float(presc["net_gain"].sum()), 2)},
    ]
    out = pd.DataFrame(rows)
    out.to_csv(OUT_DIR / "strategy_comparison.csv", index=False)
    print(out.to_string(index=False))


if __name__ == "__main__":
    main()
