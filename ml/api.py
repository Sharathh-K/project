"""EconoCausal REST API. Run from repo root: uvicorn ml.api:app --reload"""
import json, subprocess, sys
from pathlib import Path
import pandas as pd
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

sys.path.append(str(Path(__file__).parent))
from drift import check

app = FastAPI(title="EconoCausal API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"],
                   allow_methods=["*"], allow_headers=["*"])
RES = Path("EconoCausal/results")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/prescribe")
def prescribe(budget: float = 5000, types: str = "5,10", count: int | None = None):
    t = [str(int(x)) for x in types.split(",")]
    cmd = [sys.executable, "ml/optimize.py", "--budget", str(budget), "--types", *t]
    if count:
        cmd += ["--count", str(count)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        return {"error": r.stderr[-500:]}
    s = json.loads((RES / "prescription_summary.json").read_text())
    s["message"] = (f"This strategy gains ${s['net_gain']:,.0f} compared to "
                    f"${s['blanket_gain']:,.0f} for blanket targeting.")
    return s


@app.post("/drift")
async def drift(file: UploadFile = File(...)):
    return check(pd.read_csv(file.file))
