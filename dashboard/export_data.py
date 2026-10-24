"""Refresh the dashboard from notebooks 01–06. Run from the repository root."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import pandas as pd

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1],
                    help='Repository containing notebook results')
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parent / 'public',
                    help='Dashboard public directory')
args = parser.parse_args()
root, public = args.root.resolve(), args.output.resolve()
results = root / 'results'
out = public / 'results'
out.mkdir(parents=True, exist_ok=True)

def read(name):
    path = results / name
    if not path.exists():
        raise FileNotFoundError(f'Missing {name}. Run notebooks 01–06 first.')
    return json.loads(path.read_text())

eda = read('eda.json')
prep = read('causal_preprocessing_summary.json')
graph = read('causal_graphs/causal_graph_review.json')
model = read('double_ml/model_info.json')
audit = read('mid_project_audit/audit.json')
source_hash = hashlib.sha256((root / 'data/raw/hillstrom.csv').read_bytes()).hexdigest()
assert all(x == source_hash for x in [eda['source_sha256'], graph['source_sha256'], model['raw_sha256'], audit['source_sha256']]), 'Source datasets differ. Rerun notebooks.'
for name, digest in model['input_sha256'].items():
    assert hashlib.sha256((root / name).read_bytes()).hexdigest() == digest, f'Stale model input: {name}. Rerun 05 and 06.'
curves = read('double_ml/uplift_curves.json')
for outcome in curves:
    for arm, curve in curves[outcome].items():
        curve['qini'] = curve['normalized_qini']
        curve['qini_ci95'] = [curve['lower95'], curve['upper95']]
        curve['finding'] = ('Positive ranking evidence (exploratory)' if curve['lower95'] > 0
                            else 'Negative ranking evidence (exploratory)' if curve['upper95'] < 0
                            else 'Ranking advantage uncertain')
matching = pd.read_csv(results / 'propensity_matching/matching_summary.csv').to_dict('records')
for m in matching:
    m['max_imbalance_before'] = m['max_abs_SMD_before']
    m['max_imbalance_after'] = m['max_abs_SMD_after']
    prefix = 'mens' if m['arm'].startswith('Mens') else 'womens'
    m['balance'] = pd.read_csv(results / f'propensity_matching/{prefix}_balance.csv').to_dict('records')
graph['mock'].update(known_true_effect=graph['mock']['known_effect'],
                     naive_difference=graph['mock']['unadjusted_difference'],
                     dowhy_adjusted_effect=graph['mock']['adjusted_effect'])
report = dict(eda=eda, preprocessing=prep, causal_graph=graph, matching=matching,
              uplift=curves, audit=audit['audit'], audit_limits=audit['limits'],
              model_info=model, source_sha256=source_hash,
              exact_model_checks=audit['exact_model_checks'])
(out / 'report.json').write_text(json.dumps(report, indent=2, allow_nan=False))
scores = pd.read_csv(results / 'double_ml/customer_scores.csv')
assert len(scores) == eda['rows'] and scores.customer_id.is_unique
assert (scores.split == 'test').sum() == model['test_rows']
# Include every row, not a tiny demonstration subset. Preserve precision for JS parity checks.
shutil.copy2(results / 'double_ml/customer_scores.csv', out / 'customer_scores.csv')
for name in ['hillstrom_visit_dag.png', 'mock_retail_dag.png']:
    shutil.copy2(results / 'causal_graphs' / name, out / name)
for name in ['eda.png', 'eda_interest_effects.png']:
    shutil.copy2(results / 'figures' / name, out / name)
guide = Path(__file__).resolve().parents[1] / 'docs/INTERVIEW_GUIDE.md'
if guide.exists(): shutil.copy2(guide, public / 'INTERVIEW_GUIDE.md')
print(f'Exported {len(scores):,} scores, six uplift comparisons, DAGs, EDA and audit to {public}')
