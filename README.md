# EconoCausal: Exploratory Data Analysis of Email Marketing Campaigns

## Project Overview

This project focuses on exploring customer behavior and marketing campaign outcomes using the Hillstrom MineThatData E-Mail Analytics dataset. It forms part of EconoCausal, a causal machine learning project that aims to understand the incremental impact of marketing campaigns and support data-driven marketing decisions.

The purpose of this stage is to understand the dataset, examine customer characteristics, identify data quality issues, and investigate patterns in campaign responses and purchasing behavior before building causal models.

## Objectives

- Understand the structure and characteristics of the dataset.
- Examine customer demographics and historical purchasing behavior.
- Analyze the distribution of customers across marketing treatment groups.
- Investigate website visits, purchase conversions, and customer spending.
- Identify missing values, duplicate records, unusual values, and potential data quality issues.
- Compare campaign outcomes across the treatment and control groups.
- Prepare the dataset for subsequent causal inference and machine learning tasks.

## Dataset Description

**Dataset:** Hillstrom MineThatData E-Mail Analytics / Data Mining Challenge (2008)

**Dataset size:** 64,000 customer records.

The dataset comes from an email marketing experiment involving three groups: customers who received a men's merchandise email, customers who received a women's merchandise email, and customers who received no email.

### Important Features

| Column | Description |
|---|---|
| `recency` | Time since the customer's most recent purchase |
| `history_segment` | Category describing historical customer spending |
| `history` | Customer's historical spending amount |
| `mens` | Indicator associated with prior men's merchandise purchasing |
| `womens` | Indicator associated with prior women's merchandise purchasing |
| `zip_code` | Customer geographic category |
| `newbie` | Indicator identifying new customers |
| `channel` | Customer acquisition channel |
| `segment` | Assigned email marketing group |
| `visit` | Whether the customer visited the website during the measurement period |
| `conversion` | Whether the customer made a purchase during the measurement period |
| `spend` | Customer spending during the measurement period |

The dataset provides a useful foundation for understanding customer responses to marketing campaigns. It does not directly contain discount amounts, discount costs, or profit margins.

## Tools and Technologies

- **Python:** Data analysis and scripting.
- **pandas:** Data loading, cleaning, and manipulation.
- **NumPy:** Numerical operations and statistical calculations.
- **Matplotlib:** Data visualization.
- **Seaborn:** Statistical charts and distribution analysis.
- **Jupyter Notebook:** Interactive analysis and documentation.

## Exploratory Data Analysis Workflow

### 1. Data Loading and Inspection

- Load the dataset into a pandas DataFrame.
- Examine the number of rows and columns.
- Inspect column names, data types, and sample records.
- Review descriptive statistics and identify potential data quality concerns.

### 2. Data Quality Assessment

- Check for missing values.
- Identify duplicate records.
- Examine invalid values and unexpected categories.
- Verify the expected encoding of categorical and binary variables.
- Document any cleaning or transformation decisions.

### 3. Univariate Analysis

Study individual variables to understand the customer population.

- Distribution of historical spending and recency.
- Customer acquisition channel distribution.
- Customer history segments.
- Distribution of campaign assignments.
- Frequency of website visits, conversions, and spending.

### 4. Campaign Group Analysis

Compare the three assigned groups:

- Men's email campaign.
- Women's email campaign.
- No-email control group.

Examine group sizes and compare website visit rates, conversion rates, and spending. These comparisons provide an initial view of campaign outcomes and help guide the subsequent causal analysis.

### 5. Customer Behavior Analysis

Explore relationships between pre-campaign customer characteristics and campaign outcomes.

Examples include:

- Historical spending versus conversion.
- Purchase recency versus website visits.
- Customer acquisition channel versus conversion.
- New versus returning customers.
- Historical spending segments versus campaign response.

### 6. Visualization and Insights

Create charts to communicate the main findings, including:

- Bar charts for campaign group sizes and conversion rates.
- Histograms and box plots for spending and recency.
- Comparative plots for campaign outcomes.
- Charts examining relationships between customer history and purchasing behavior.

Each visualization should include a brief interpretation supported by the observed data.

### 7. Preparation for Causal Modeling

Document the findings and prepare suitable pre-treatment features for later causal analysis.

Variables measured after the campaign, including website visits, conversions, and campaign-period spending, should be treated carefully. They may be outcomes or intermediate variables rather than appropriate control features when estimating the total effect of a campaign.

The results of this stage will help inform subsequent analysis using causal inference techniques.

## Expected Deliverables

- A structured Jupyter Notebook containing the EDA workflow.
- A summary of dataset dimensions, data types, and descriptive statistics.
- A data quality report covering missing values, duplicates, and unusual values.
- Visualizations of customer characteristics and marketing outcomes.
- A comparison of the three campaign groups.
- A concise set of data-driven observations and limitations.
- A prepared dataset and documented recommendations for the next modeling stage.

## Scope and Limitations

This stage focuses on exploratory analysis rather than final causal conclusions.

Observed differences between campaign groups should be interpreted in the context of the experiment's randomized assignment. Descriptive EDA alone does not establish the size or reliability of heterogeneous treatment effects.

The dataset measures email campaign exposure rather than specific discount levels. Therefore, any future discount-pricing or budget-optimization module will require additional information or clearly identified simulation assumptions.

## Conclusion

Exploratory Data Analysis provides the foundation for the EconoCausal project by establishing an understanding of customer characteristics, marketing group assignments, data quality, and campaign outcomes.

The findings from this stage will support the development of subsequent causal machine learning models and help ensure that later analyses are based on a well-understood and appropriately prepared dataset.
