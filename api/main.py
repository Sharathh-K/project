"""Run: python -m uvicorn api.main:app --host 127.0.0.1 --port 8002"""
from functools import lru_cache
from typing import Literal

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, model_validator

from api.service import Engine, ROOT, engineer, drift
from api.optimization import allocate_email, cents


class Customer(BaseModel):
    """Only information available before sending the campaign is allowed."""
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    customer_id: str = Field(min_length=1, max_length=100)
    recency: int = Field(ge=1, le=12)
    history: float = Field(ge=0)
    mens: Literal[0, 1]
    womens: Literal[0, 1]
    newbie: Literal[0, 1]
    zip_code: str = Field(min_length=1, max_length=100)
    channel: str = Field(min_length=1, max_length=100)


class Batch(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    customers: list[Customer] = Field(min_length=1, max_length=5000)

    @model_validator(mode="after")
    def unique_ids(self):
        ids = [customer.customer_id for customer in self.customers]
        if len(set(ids)) != len(ids):
            raise ValueError("Customer IDs must be unique.")
        return self


class Campaign(Batch):
    budget: float = Field(default=5000, ge=0)
    email_cost: float = Field(default=0.10, gt=0)


@lru_cache(maxsize=1)
def get_engine():
    """Load the trusted local models once, then reuse them across requests."""
    try:
        return Engine()
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(503, str(exc)) from exc


app = FastAPI(
    title="EconoCausal Week 4 API",
    version="1.0.0",
    description=("Local email-effect predictions, baseline drift screening and "
                 "equal-cost budget allocation. No uploaded data is saved."),
)


@app.get("/api/health")
def health():
    return {"status": "running"}


@app.get("/api/model")
def model():
    engine = get_engine()
    return {
        "model_id": engine.model_id,
        "training_rows": len(engine.reference),
        "max_batch_rows": 5000,
        "actions": ["No E-Mail", "Mens E-Mail", "Womens E-Mail"],
    }


@app.post("/api/drift")
def check_drift(body: Batch):
    rows = [customer.model_dump() for customer in body.customers]
    return drift(get_engine().reference, engineer(pd.DataFrame(rows)))


@app.post("/api/score")
def score(body: Batch):
    return get_engine().score([customer.model_dump() for customer in body.customers])


@app.post("/api/recommend")
def recommend(body: Campaign):
    # Score on the server: callers cannot substitute arbitrary effect estimates.
    try:
        cents(body.budget, "Budget")
        cents(body.email_cost, "Email cost", positive=True)
        customers = [customer.model_dump() for customer in body.customers]
        result = get_engine().score(customers)
        rows, summary = allocate_email(
            pd.DataFrame(result["rows"]), body.budget, body.email_cost
        )
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc

    result["rows"] = rows.to_dict("records")
    result["allocation"] = summary
    avoided = len(rows) * summary["email_cost"] - summary["allocated_cost"]
    result["plain_summary"] = (
        f"Contact {summary['contacted']} of {len(rows)} customers, "
        f"spending ${summary['allocated_cost']:,.2f}. "
        f"This uses ${avoided:,.2f} less contact cost than emailing everyone. "
        f"Predicted additional revenue is ${summary['predicted_incremental_revenue']:,.2f}; "
        "it is not measured sales."
    )
    return result


# A production build can be served by this same local process.
if (ROOT / "dashboard/dist").exists():
    app.mount("/", StaticFiles(directory=ROOT / "dashboard/dist", html=True), name="dashboard")
