# Week 1 Write-up: Data Understanding, Causal Graphing and Dashboard Setup

**Project:** EconoCausal — Dynamic Pricing via Double Machine Learning

## Objective

The first week focused on understanding the dataset, preparing it for causal analysis, defining causal relationships using Microsoft’s DoWhy library, and building the initial React dashboard.

## 1. Dataset understanding and exploratory analysis

I examined the Hillstrom dataset, which contains 64,000 customer records. Customers were randomly assigned to three groups: Men’s Email, Women’s Email and No Email.

I studied customer information such as previous spending, months since the last purchase, shopping channel and previous product-category purchases. I also examined the campaign outcomes: website visits, purchases and spending.

The analysis checked missing values, repeated records, spending distributions, response rates and differences between treatment groups. There were no missing values. Duplicate-looking records were retained because the dataset does not contain a verified customer identifier that proves they represent repeated customers.

Purchases were rare—578 customers purchased—so website visits were selected as the primary outcome. Purchasing and spending were retained as secondary outcomes.

## 2. Preprocessing and feature engineering

I corrected the area-label spelling inconsistency and created useful features:

- Log-transformed past spending to represent its skewed distribution.
- Recency bands to group customers by how recently they purchased.
- A prior-interest count using previous men’s and women’s category purchases.

I separated the data into 70% training and 30% testing, preserving the treatment-group proportions. Categorical encoding was fitted only on training data.

Only information available before the campaign was used as model input. Email assignment and campaign outcomes were excluded from the customer-feature matrix to prevent information leakage.

## 3. Causal graphing using DoWhy

I created a causal directed acyclic graph identifying:

- **Treatment:** Email assignment.
- **Outcomes:** Visits, purchases and spending.
- **Baseline predictors:** Customer information recorded before the campaign.

Because the email assignments were randomized, the real-data graph did not assume that past spending or other baseline characteristics caused email assignment.

I also created a separate mock retail example where past spending influenced both receiving an offer and future spending. This demonstrated confounding: the direct comparison estimated an effect of about $70.79, while adjustment recovered approximately $19.88, close to the deliberately simulated true effect of $20.

## 4. Dashboard scaffolding

I initialized a React dashboard with historical-data upload and validation, dataset summaries, causal-graph views and editable budget and assumed email-cost inputs.

The budget controls show how many emails a budget could cover. Optimal allocation is reserved for Week 3.

## Week 1 outcome

The project established a reproducible data-preparation process, explicit causal assumptions and an initial dashboard. Although the project theme includes discounts and dynamic pricing, the supplied dataset supports email-treatment analysis; it does not contain discount amounts for estimating discount-specific effects.
