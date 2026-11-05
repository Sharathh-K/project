import math
import sys
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal, Optional

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))          # engine code: dml_pipeline, optimizer, drift

import dml_pipeline                            # noqa: E402,F401  (the saved model refers to this module)
from drift import check_drift, load_reference  # noqa: E402
from evaluation import build_evaluation_curves  # noqa: E402
from optimizer import optimize_campaign        # noqa: E402

MODEL_PATH = ROOT / "Models" / "forestdr_pipe.joblib"
DRIFT_PATH = ROOT / "Models" / "drift_reference.json"
EVALUATION_PATH = ROOT / "Data" / "Processed" / "test.csv"
MAX_ROWS = 100_000
HISTORY_FLOOR = 29.99                          # smallest history value in the data; history_floor flags it


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.model = joblib.load(MODEL_PATH)
    app.state.drift_ref = load_reference(DRIFT_PATH) if DRIFT_PATH.exists() else None
    app.state.evaluation_curves = None
    app.state.evaluation_lock = threading.Lock()
    yield


app = FastAPI(title="EconoCausal API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- request / response shapes ----------
class Customer(BaseModel):
    customer_id: Optional[str] = None
    recency: int = Field(ge=0)
    history: float = Field(ge=0)
    mens: int = Field(ge=0, le=1)
    womens: int = Field(ge=0, le=1)
    newbie: int = Field(ge=0, le=1)
    history_floor: Optional[float] = Field(None, description="1 if history is at the minimum ($29.99); worked out from history when omitted")
    zip_code: Literal["Urban", "Suburban", "Rural"]
    channel: Literal["Phone", "Web", "Multichannel"]


class PredictRequest(BaseModel):
    customers: list[Customer] = Field(min_length=1, max_length=MAX_ROWS)


class OptimizeRequest(PredictRequest):
    budget: float = Field(gt=0, description="total e-mail budget in dollars")
    cost_mens: float = Field(0.10, gt=0, description="dollars per Mens e-mail")
    cost_womens: float = Field(0.15, gt=0, description="dollars per Womens e-mail")
    value_per_conversion: float = Field(113.83, gt=0, description="average revenue of one conversion, dollars")
    include_all: bool = Field(False, description="return every customer, not only the Persuadables")


class BudgetScenariosRequest(PredictRequest):
    budgets: list[float] = Field(min_length=2, max_length=7, description="ascending budget limits to compare")
    cost_mens: float = Field(0.10, gt=0, description="dollars per Mens e-mail")
    cost_womens: float = Field(0.15, gt=0, description="dollars per Womens e-mail")
    value_per_conversion: float = Field(113.83, gt=0, description="average revenue of one conversion, dollars")

    @field_validator("budgets")
    @classmethod
    def validate_budgets(cls, budgets):
        if any(not math.isfinite(budget) or budget < 0 for budget in budgets):
            raise ValueError("budgets must be finite, non-negative amounts")
        if len(set(budgets)) != len(budgets):
            raise ValueError("budgets must not contain duplicates")
        return sorted(budgets)


# ---------- helpers ----------
def score(model, customers):
    """Customers -> table with estimated uplift for each e-mail and the best option."""
    df = pd.DataFrame([c.model_dump() for c in customers])
    df["customer_id"] = df["customer_id"].fillna(pd.Series(df.index.astype(str), index=df.index))
    df["history_floor"] = pd.to_numeric(df["history_floor"]).fillna(
        (df["history"].round(2) <= HISTORY_FLOOR).astype(float))
    rec = model.recommend(df)
    df["ite_mens"] = rec["ite_mens"].to_numpy()
    df["ite_womens"] = rec["ite_womens"].to_numpy()
    df["best_segment"] = rec["best_segment"].to_numpy()
    return df


def build_budget_scenarios(scored, budgets, cost, value_per_conversion):
    """Optimize multiple budget limits against one pre-scored customer table."""
    scenarios = []
    previous_budget = None
    previous_revenue = None
    for budget in budgets:
        _, summary = optimize_campaign(scored, cost, budget, value_per_conversion)
        expected_revenue = summary["total_expected_revenue"]
        scenarios.append({
            "budget": float(budget),
            "total_cost": summary["total_cost"],
            "total_expected_revenue": expected_revenue,
            "mens_emails": summary["mens_emails"],
            "womens_emails": summary["womens_emails"],
            "selected_customers": summary["mens_emails"] + summary["womens_emails"],
            "marginal_revenue_per_budget_dollar": (
                (expected_revenue - previous_revenue) / (budget - previous_budget)
                if previous_budget is not None and budget > previous_budget
                else None
            ),
        })
        previous_budget = budget
        previous_revenue = expected_revenue
    return scenarios


# ---------- endpoints ----------
@app.get("/health")
def health():
    m = app.state.model
    return {"status": "ok", "model": type(m).__name__, "arms": list(m.arms_),
            "features": list(m.feature_cols), "drift_reference": app.state.drift_ref is not None}


@app.post("/predict")
def predict(req: PredictRequest):
    """Estimated increase in purchase probability for a Mens and a Womens e-mail, per customer."""
    df = score(app.state.model, req.customers)
    cols = ["customer_id", "ite_mens", "ite_womens", "best_segment"]
    return {"n": len(df), "results": df[cols].to_dict("records")}


@app.post("/optimize")
def optimize(req: OptimizeRequest):
    """Best e-mail for each customer under a strict budget (linear program)."""
    df = score(app.state.model, req.customers)
    cost = {"Mens E-Mail": req.cost_mens, "Womens E-Mail": req.cost_womens}
    try:
        plan, summary = optimize_campaign(df, cost, req.budget, req.value_per_conversion)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    n = len(plan)
    summary.update({
        "n_customers": n,
        "n_persuadables": int((plan["group"] == "Persuadable").sum()),
        "groups": {k: int(v) for k, v in plan["group"].value_counts().items()},
        "blanket_mens_cost": n * req.cost_mens,
        "cost_saving_vs_blanket_mens": n * req.cost_mens - summary["total_cost"],
    })

    cols = ["customer_id", "recency", "history", "zip_code", "channel", "newbie", "assigned_arm", "ite_mens", "ite_womens",
            "expected_uplift", "expected_revenue", "cost", "group"]
    rows = plan if req.include_all else plan[plan["group"] == "Persuadable"]
    return {"summary": summary, "allocations": rows[cols].to_dict("records")}


@app.post("/budget-scenarios")
def budget_scenarios(req: BudgetScenariosRequest):
    """Compare campaign budgets while scoring uploaded customers only once."""
    scored = score(app.state.model, req.customers)
    cost = {"Mens E-Mail": req.cost_mens, "Womens E-Mail": req.cost_womens}
    try:
        scenarios = build_budget_scenarios(
            scored,
            req.budgets,
            cost,
            req.value_per_conversion,
        )
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    return {"n_customers": len(scored), "scenarios": scenarios}


@app.get("/evaluation/curves")
def evaluation_curves():
    """Return holdout Qini and uplift curves with 90% bootstrap confidence bands."""
    with app.state.evaluation_lock:
        cached = app.state.evaluation_curves
        if cached is not None:
            return cached
        if not EVALUATION_PATH.exists():
            raise HTTPException(status_code=503, detail="Held-out evaluation data is not available.")

        test = pd.read_csv(EVALUATION_PATH)
        if "Customer ID" not in test:
            raise HTTPException(status_code=500, detail="Held-out evaluation data has no Customer ID column.")
        customers = [
            Customer.model_validate({**row, "customer_id": str(row["Customer ID"])})
            for row in test.to_dict(orient="records")
        ]
        predictions = score(app.state.model, customers)
        try:
            curves = build_evaluation_curves(test, predictions)
        except ValueError as error:
            raise HTTPException(status_code=500, detail=str(error)) from error
        app.state.evaluation_curves = curves
        return curves


@app.post("/drift")
def drift(req: PredictRequest):
    """Compare an upload with the training data and warn if customer behaviour looks different."""
    ref = app.state.drift_ref
    if ref is None:
        raise HTTPException(status_code=503, detail="Drift reference not built. Run: python src/drift.py")
    df = score(app.state.model, req.customers)
    return check_drift(ref, df, df[["ite_mens", "ite_womens"]])