# Week 4 verification — 30 October 2026

- Executed notebooks 02, 05 and 06 in a fresh checkout to rebuild and audit model artifacts. Existing committed historical dashboard evidence was retained.
- Executed notebook 08 against the real models. All six predictions matched notebook 05 on 200 held-out rows; largest absolute difference below 2e-15. The report is in WEEK_4_VERIFICATION.json and embedded notebook output.
- Identical training baseline: no warning. Deliberately shifted history and unknown channel: review. Two-row batch: insufficient data.
- A $1 budget at $0.10 per email selected exactly 10 of 200 customers, spending exactly $1. Predictions are not realized returns.
- Eight Python tests passed, including exhaustive small-case optimizer comparison, malformed inputs, duplicate IDs, forbidden outcome fields, drift, API budget enforcement, and missing-model handling.
- Fourteen dashboard tests passed, including 64,000-row Python/JavaScript allocation parity and held-out uplift consistency.
- Vite production build passed. Its existing Plotly bundle remains large (about 5.15 MB uncompressed); this is a performance limitation, not a failed build.
- Browser check: the built dashboard loaded 64,000 historical scores; the live page scored 1,000 held-out sample customers through the actual HTTP API. It reported 948 selected, $94.80 contact cost, $5.20 contact-cost avoidance versus contacting all 1,000, and $777.28 predicted incremental revenue. These values describe the tested sample and model, not future guaranteed performance.

Run the checks again after changing models, preprocessing or optimization. Saved model files are ignored in Git and must be rebuilt on another machine. Model-input hashes and core package versions are checked at API load time.
