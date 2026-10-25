# Week 2 Write-up: Double Machine Learning and Uplift Evaluation

**Project:** EconoCausal — Dynamic Pricing via Double Machine Learning

## Objective

The second week focused on estimating how email campaigns affect different customer profiles using EconML Double Machine Learning and evaluating whether model-based targeting performs better than random targeting.

## 1. Propensity-score matching diagnostics

I estimated customers’ probabilities of receiving each email relative to receiving no email, using information available before the campaign.

I performed propensity-score matching and compared customer characteristics before and after matching using standardized mean differences.

The original groups were already well balanced because email assignment was randomized. Matching slightly worsened some differences, so the matched data was used for diagnostics. The original training data was retained for Double Machine Learning.

## 2. Double Machine Learning training

I trained three EconML `CausalForestDML` models, one each for visits, purchases and spending. Each model estimated:

- Men’s Email compared with No Email.
- Women’s Email compared with No Email.

Random Forest models were used to learn expected outcomes and treatment probabilities from customer characteristics. Cross-fitting kept the helper-model training separate from the observations on which their residual predictions were calculated.

The causal forest then estimated how treatment effects vary across customer profiles. For example, a visit-effect estimate of +5 percentage points means an estimated increase from 10% to 15% for similar customers.

These are estimated effects for customer profiles, often called individual treatment-effect scores. They are not directly observed individual effects, because each customer experiences only one campaign assignment.

## 3. Held-out uplift and Qini evaluation

I evaluated model rankings using the held-out test data. Uplift curves compared prioritizing customers by predicted treatment effect with contacting customers in random order.

I also calculated Qini scores, which summarize the ranking advantage over random targeting, and estimated uncertainty using 1,000 bootstrap resamples.

For visits:

- **Men’s Email:** Qini approximately 0.00336; its uncertainty interval included zero, so the ranking advantage remained uncertain.
- **Women’s Email:** Qini approximately 0.01028; its interval remained above zero, providing positive exploratory ranking evidence.

Women’s Email also showed a small exploratory purchase-ranking advantage. Spending-ranking advantages remained uncertain for both emails. Therefore, the results did not support claiming that every model outperformed random targeting.

## 4. React and Plotly visualization

I integrated Plotly charts into the React dashboard to display uplift curves, Qini-style excess-gain curves and uncertainty summaries.

The Customer scores page supports filtering by outcome, email comparison, training/test population, shopping channel, recency and minimum estimated effect. It also provides effect distributions, a paginated customer table and downloads of filtered scores.

## Week 2 outcome

The project produced reproducible Double Machine Learning models, customer-effect estimates and an interactive evaluation dashboard. The strongest exploratory targeting evidence was for Women’s Email increasing visits. These results provided the foundation for the subsequent mid-project causal audit.
