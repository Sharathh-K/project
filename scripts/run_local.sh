#!/bin/sh
# Run from any folder after activating the project's Python 3.12 environment.
set -eu
cd "$(dirname "$0")/.."
if [ ! -f models/double_ml/double_ml_bundle.joblib ]; then
  echo 'Run notebooks 02 and 05 first to create the local models.' >&2
  exit 1
fi
if [ ! -f dashboard/dist/index.html ]; then
  echo 'Build the dashboard first: cd dashboard && pnpm install --frozen-lockfile && pnpm build' >&2
  exit 1
fi
exec python -m uvicorn api.main:app --host 127.0.0.1 --port 8002
