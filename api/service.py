"""Local inference and baseline drift checks; never fit on uploaded customers."""
from pathlib import Path
import json
import hashlib
from importlib.metadata import version
import joblib
import numpy as np
import pandas as pd
from scipy.stats import ks_2samp

ROOT = Path(__file__).resolve().parents[1]
BASELINE = ['recency','history','mens','womens','newbie','zip_code','channel']

def engineer(frame):
    frame = frame.copy()
    frame['zip_code'] = frame.zip_code.replace({'Surburban':'Suburban'})
    frame['history_log1p'] = np.log1p(frame.history)
    frame['recency_band'] = pd.cut(frame.recency, [0,4,8,12], labels=['recent_1_4','middle_5_8','longer_ago_9_12'], include_lowest=True).astype(str)
    frame['prior_interest_count'] = frame.mens + frame.womens
    return frame

def drift(reference, current):
    metrics = []
    for name in BASELINE:
        if name in ['recency','history']:
            value = float(ks_2samp(reference[name], current[name]).statistic)
            kind, unknown = 'KS distance', 0.
        else:
            a, b = reference[name].value_counts(normalize=True), current[name].value_counts(normalize=True)
            levels = a.index.union(b.index)
            value = float(abs(a.reindex(levels,fill_value=0)-b.reindex(levels,fill_value=0)).sum()/2)
            unknown = float((~current[name].isin(a.index)).mean())
            kind = 'Total variation distance'
        metrics.append(dict(feature=name, metric=kind, distance=value, threshold=0.1,
                            unknown_fraction=unknown, warning=value>=0.1 or unknown>0))
    status = 'insufficient_data' if len(current)<100 else ('review' if any(m['warning'] for m in metrics) else 'no_warning')
    return dict(status=status, reference_rows=len(reference), incoming_rows=len(current), metrics=metrics,
                explanation='Compare pre-campaign characteristics with training customers. Threshold 0.1 is a screening rule, not proof that causal effects changed. Fewer than 100 rows cannot give a reliable batch check.')

class Engine:
    def __init__(self, root=ROOT):
        path = root/'models/double_ml/double_ml_bundle.joblib'
        if not path.exists():
            raise FileNotFoundError('Run notebooks 02 and 05 before starting the API.')
        info = json.loads((root/'results/double_ml/model_info.json').read_text())
        for name, expected in info['input_sha256'].items():
            if hashlib.sha256((root/name).read_bytes()).hexdigest() != expected:
                raise ValueError(f'Training artifact changed: {name}. Re-run notebooks 02 and 05 together.')
        for package in ['numpy','scikit-learn','econml','joblib']:
            if version(package) != info['versions'][package]:
                raise ValueError(f'{package} version differs from training. Use the training environment or retrain.')
        # Only a trusted local artifact is loaded. The API never accepts model files.
        self.bundle = joblib.load(path)
        self.model_id = hashlib.sha256(path.read_bytes()).hexdigest()
        clean = pd.read_csv(root/'data/processed/causal_clean.csv')
        train = pd.read_csv(root/'data/processed/causal_train.csv')
        self.reference = engineer(clean[clean.customer_id.isin(train.customer_id)])[BASELINE]
        if len(self.reference)!=len(train):
            raise ValueError('Training reference IDs do not match.')
    def score(self, rows):
        frame = engineer(pd.DataFrame(rows))
        x = self.bundle['encoder'].transform(frame[self.bundle['raw_features']])
        for outcome, model in self.bundle['models'].items():
            for arm, label in [(1,'mens'),(2,'womens')]:
                frame[f'{outcome}_{label}'] = np.asarray(model.effect(x,T0=0,T1=arm)).ravel()
        frame['split'] = 'new'
        return dict(model_id=self.model_id, rows=frame.to_dict('records'), drift=drift(self.reference,frame),
                    warning='These are estimated effects for customer profiles, not guaranteed individual outcomes. Spending rankings remain uncertain; review the causal audit before a real campaign.')
