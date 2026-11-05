import pandas as pd
import pytest
from pydantic import ValidationError

from api import main


def test_budget_scenarios_score_once_and_return_ordered_marginals(monkeypatch):
    customers = [
        main.Customer(
            recency=10,
            history=100,
            mens=0,
            womens=1,
            newbie=0,
            zip_code="Urban",
            channel="Web",
        )
    ]
    request = main.BudgetScenariosRequest(
        customers=customers,
        budgets=[20, 0, 10],
        cost_mens=0.1,
        cost_womens=0.15,
        value_per_conversion=100,
    )
    score_calls = []
    optimize_calls = []
    scored_table = pd.DataFrame({"ite_mens": [0.1], "ite_womens": [0.2]})

    def fake_score(model, scored_customers):
        score_calls.append((model, scored_customers))
        return scored_table

    def fake_optimize(scored, cost, budget, value_per_conversion):
        optimize_calls.append((scored, budget))
        return None, {
            "total_cost": budget,
            "total_expected_revenue": budget * 2,
            "mens_emails": int(budget),
            "womens_emails": 0,
        }

    monkeypatch.setattr(main.app.state, "model", object(), raising=False)
    monkeypatch.setattr(main, "score", fake_score)
    monkeypatch.setattr(main, "optimize_campaign", fake_optimize)

    response = main.budget_scenarios(request)

    assert len(score_calls) == 1
    assert [scenario["budget"] for scenario in response["scenarios"]] == [0, 10, 20]
    assert [scenario["marginal_revenue_per_budget_dollar"] for scenario in response["scenarios"]] == [None, 2, 2]
    assert response["scenarios"][-1]["selected_customers"] == 20
    assert all(scored is scored_table for scored, _ in optimize_calls)


def test_budget_scenarios_require_distinct_nonnegative_budget_limits():
    customer = main.Customer(
        recency=10,
        history=100,
        mens=0,
        womens=1,
        newbie=0,
        zip_code="Urban",
        channel="Web",
    )
    request_data = {"customers": [customer], "budgets": [0, 10]}

    assert main.BudgetScenariosRequest(**request_data).budgets == [0, 10]
    with pytest.raises(ValidationError):
        main.BudgetScenariosRequest(**{**request_data, "budgets": [10, 10]})
    with pytest.raises(ValidationError):
        main.BudgetScenariosRequest(**{**request_data, "budgets": [-1, 10]})
