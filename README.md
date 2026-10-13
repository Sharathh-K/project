# EconoCausal: Dynamic Pricing via Double Machine Learning

## Project Overview

EconoCausal is a causal machine learning project designed to support data-driven marketing decisions. Rather than only predicting which customers are likely to purchase, it aims to estimate how customer outcomes may change when they receive a marketing treatment. These estimates can help identify customers who may respond to a campaign and support more informed allocation of marketing resources.

The project combines causal inference, machine learning, evaluation, optimization, and dashboard development in one workflow.

## Business Problem

Traditional predictive models estimate outcomes such as purchase probability or expected spending. However, customers who are already likely to purchase may not need an additional marketing incentive. EconoCausal focuses on estimating the incremental effect of a treatment, helping distinguish likely purchasers from customers whose behavior may change because of a campaign.

The long-term objective is to use estimated treatment effects and business constraints to support campaign or discount-allocation decisions. Recommendations are estimates, not guarantees of individual customer behavior.

## Dataset

The project uses the **Kevin Hillstrom MineThatData E-Mail Analytics / Data Mining Challenge (2008)** dataset. It contains 64,000 customer records from a randomized email-marketing experiment.

The dataset includes customer characteristics and purchase-history information, an assigned campaign group, and outcomes measured after the campaign.

### Main Variables

- `recency`: Time since the customer's most recent purchase.
- `history_segment`: Category representing historical customer spending.
- `history`: Historical spending amount.
- `mens`: Indicator associated with prior men's merchandise purchasing.
- `womens`: Indicator associated with prior women's merchandise purchasing.
- `zip_code`: Customer geographic category.
- `newbie`: Indicator for a new customer.
- `channel`: Customer acquisition channel.
- `segment`: Assigned marketing group (`Mens E-Mail`, `Womens E-Mail`, or `No E-Mail`).
- `visit`: Whether the customer visited the website during the measurement period.
- `conversion`: Whether the customer made a purchase during the measurement period.
- `spend`: Spending measured during the campaign period.

The original experiment provides a useful foundation for studying email-campaign effects. It does **not** directly record different discount amounts, discount costs, or profit margins. The initial analysis should therefore estimate email-campaign effects. Any later discount-pricing or budget-optimization component needs suitable additional data or clearly documented assumptions. Simulated discount effects must not be presented as findings from this dataset.

## Project Objectives

1. Prepare and validate the campaign dataset.
2. Explore customer characteristics, treatment-group sizes, and outcome rates.
3. Define causal questions and document assumptions about treatment assignment and outcomes.
4. Estimate average and customer-specific treatment effects using appropriate causal inference methods.
5. Evaluate campaign targeting using suitable baselines and uplift metrics.
6. Run robustness and refutation checks and report limitations.
7. Explore resource-allocation optimization once treatment effects, costs, and a business objective are defined.
8. Present analysis and recommendations through a dashboard and, where required, an API.

## Methodology

### 1. Data Preparation

Load the dataset, validate its schema, check data quality, and prepare customer features. Only information available before campaign assignment should be used as pre-treatment features. Variables measured after treatment—such as visits, conversions, or campaign-period spending—should be treated as outcomes or post-treatment variables when estimating total campaign effects, rather than casually included as controls.

### 2. Causal Inference

The first analysis can compare one email group with the `No E-Mail` control group. For example, compare `Mens E-Mail` with `No E-Mail`, using `conversion` as the outcome. The `Womens E-Mail` group can be analyzed separately or handled using an estimator designed for multiple treatments.

Because the original campaign is randomized, treatment assignment supports causal analysis. The experimental design and any deviations from it should still be checked before drawing conclusions.

### 3. Double Machine Learning with EconML

EconML provides estimators for machine-learning-based treatment-effect estimation, including Double Machine Learning (DML). DML uses models for the outcome and treatment-assignment processes and combines them to estimate treatment effects while adjusting for observed pre-treatment features.

Depending on the estimator and research question, the analysis may estimate an average treatment effect or heterogeneous effects across customer profiles. Estimates are subject to sampling uncertainty and depend on the suitability of the data, model, and assumptions.

### 4. Causal Modeling and Robustness with DoWhy

DoWhy supports specifying a causal graph, identifying the assumptions needed for an estimate, estimating effects through supported methods, and running refutation or robustness checks.

A causal graph documents assumptions; it does not prove those assumptions are true. Refutation tests can reveal sensitivity but cannot guarantee that all unobserved confounding has been eliminated.

### 5. Evaluation and Uplift Analysis

Model evaluation should include interpretable treatment-effect estimates, uncertainty where available, and comparisons with appropriate experimental baselines. Uplift and Qini-style evaluation can help assess whether a targeting policy prioritizes customers with greater incremental response. The evaluation procedure should respect the randomized treatment design and avoid data leakage.

### 6. Optimization

An optimization module may eventually allocate limited campaign resources to maximize a defined business objective under budget or operational constraints. The objective could be incremental profit, revenue, conversions, or another explicitly selected metric.

For the Hillstrom dataset, the treatment is an email campaign rather than a discount amount. A discount optimizer therefore requires additional information about discount levels, costs, and preferably margins, or a clearly labeled simulation. Optimized recommendations should not be described as empirically validated discount effects without suitable data.

### 7. Dashboard and API

A dashboard can present campaign comparisons, estimated treatment effects, uplift evaluation, uncertainty, and resource-allocation scenarios. An API can make validated model results available to the frontend or other applications. The interface should distinguish observed experimental results from model estimates and simulated scenarios.

## Technology Stack

- **Python:** Main programming language for data processing and modeling.
- **pandas and NumPy:** Data manipulation and numerical computation.
- **scikit-learn:** Supporting machine learning models and preprocessing.
- **EconML:** Causal machine learning and treatment-effect estimation.
- **DoWhy:** Causal graphs, identification workflows, and refutation checks.
- **SciPy:** Numerical optimization, when the objective and constraints are defined.
- **React:** Frontend dashboard.
- **Plotly:** Interactive charts and visualizations.
- **FastAPI (optional):** REST API for serving results.

The final stack may be adjusted to match the team's implementation requirements.

## Expected Deliverables

- A documented and validated dataset-preparation workflow.
- Reproducible causal analysis for selected campaign comparisons.
- Trained and evaluated causal models.
- Uplift and treatment-effect evaluation reports.
- Documented causal assumptions, robustness checks, and limitations.
- An optimization prototype if suitable cost and objective information is available.
- A dashboard and optional API for presenting model outputs.
- Project documentation explaining methodology and responsible interpretation.

## Limitations and Responsible Interpretation

- Treatment effects are estimates and are not guarantees for individual customers.
- Causal conclusions depend on the experimental design, correct treatment/outcome definitions, data quality, and analysis choices.
- Passing refutation tests does not prove the absence of unobserved confounding.
- The Hillstrom dataset supports email-campaign analysis, not direct estimation of the effects of specific discount amounts.
- Budget optimization is meaningful only when its objective, costs, constraints, and uncertainty are defined.
- Customer data should be handled according to applicable privacy, security, and organizational requirements.

## Summary

EconoCausal combines causal inference and machine learning to study the incremental effects of marketing campaigns and support more effective targeting decisions. The Hillstrom experiment provides the foundation for analyzing email-treatment effects with EconML and DoWhy. Evaluation, optimization, and dashboard components build on those estimates while clearly distinguishing evidence from assumptions and simulations.
