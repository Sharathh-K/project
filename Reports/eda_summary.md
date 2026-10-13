# EDA Summary and Key Findings

## 1. Dataset Overview

- **Total rows:** 64,000
- **Total columns:** 12
- **Memory usage:** Approximately 5.9 MB
- **Missing values:** 0
- **Exact duplicate rows detected:** 6,562
- **Duplicate rows removed:** 0

The dataset contains customer characteristics, historical purchasing information, marketing campaign assignments, website visits, conversions, and spending.

## 2. Data Quality Assessment

All 12 columns contain 64,000 non-null values. No missing values were detected.

A total of 6,562 exact duplicate rows were identified. These rows were retained because the dataset does not provide a unique customer identifier to establish whether identical records represent the same customer. Their validity should be investigated before using the data for causal modelling.

No cleaning or preprocessing was performed as part of this EDA.

## 3. Numerical Variable Analysis

| Statistic | Recency | History | Spend |
|---|---:|---:|---:|
| Mean | 5.76 | 242.09 | 1.05 |
| Median | 6.00 | 158.11 | 0.00 |
| Standard deviation | 3.51 | 256.16 | 15.04 |
| Minimum | 1.00 | 29.99 | 0.00 |
| Maximum | 12.00 | 3,345.93 | 499.00 |
| Skewness | 0.14 | 2.42 | 20.59 |

### Observations

- `recency` has a relatively balanced distribution with slight positive skewness.
- `history` is positively skewed, indicating that a smaller number of customers have substantially higher historical spending.
- `spend` is highly positively skewed. Its median is zero, while its mean is 1.05, indicating that spending is concentrated at zero for many customers, with a smaller number of larger values.

## 4. Categorical Variable Analysis

### Historical spending segment

| Category | Customer count |
|---|---:|
| $0–$100 | 22,970 |
| $100–$200 | 14,254 |
| $200–$350 | 12,289 |
| $350–$500 | 6,409 |
| $500–$750 | 4,911 |
| $750–$1,000 | 1,859 |
| $1,000+ | 1,308 |

The largest historical spending segment is $0–$100.

### Other categorical distributions

| Variable | Category counts |
|---|---|
| `zip_code` | Surburban: 28,776; Urban: 25,661; Rural: 9,563 |
| `channel` | Web: 28,217; Phone: 28,021; Multichannel: 7,762 |
| `mens` | 1: 35,266; 0: 28,734 |
| `womens` | 1: 35,182; 0: 28,818 |
| `newbie` | 1: 32,144; 0: 31,856 |
| `visit` | 1: 9,394; 0: 54,606 |
| `conversion` | 1: 578; 0: 63,422 |

The customer counts are reasonably distributed across the main channels and merchandise-history indicators. Website visits and conversions are less frequent than non-visits and non-conversions.

*Note: `Surburban` is the category spelling present in the dataset.*

## 5. Campaign Segment Analysis

| Campaign segment | Customers | Purchases | Conversion rate |
|---|---:|---:|---:|
| Mens E-Mail | 21,307 | 267 | 1.25% |
| Womens E-Mail | 21,387 | 189 | 0.88% |
| No E-Mail | 21,306 | 122 | 0.57% |

### Observations

- The three campaign groups have similar customer counts.
- `Mens E-Mail` has the highest observed conversion rate at approximately 1.25%.
- `Womens E-Mail` has an observed conversion rate of approximately 0.88%.
- `No E-Mail` has the lowest observed conversion rate at approximately 0.57%.

These results describe differences between the groups. Causal analysis will help estimate the impact of campaign assignment more rigorously.

## 6. Spending by Campaign Segment

| Campaign segment | Average spend | Median spend | Total spend |
|---|---:|---:|---:|
| Mens E-Mail | 1.42 | 0.00 | 30,311.69 |
| Womens E-Mail | 1.08 | 0.00 | 23,038.11 |
| No E-Mail | 0.65 | 0.00 | 13,908.33 |

The `Mens E-Mail` group has the highest average and total spending. All three groups have a median spend of zero, consistent with the large number of customers who did not make a purchase.

## 7. Overall Customer Outcomes

- **Customers who visited:** 9,394 (14.68%)
- **Customers who converted:** 578 (0.90%)
- **Overall average spend per customer:** 1.05

Only a small proportion of customers converted, and the spending distribution is dominated by zero values.

## 8. Correlation Analysis

| Variable pair | Correlation |
|---|---:|
| Recency and history | -0.247 |
| Recency and spend | -0.016 |
| History and spend | 0.022 |

`Recency` and `history` show a modest negative correlation. The correlations involving `spend` are close to zero, indicating little linear association between these variables in the full dataset.

Correlation does not establish causation.

## 9. Conclusion

The EDA reveals differences in campaign conversion rates and spending, as well as substantial skewness in customer spending. The campaign groups are similar in size, making them suitable for further comparative investigation.

These findings provide a foundation for the next stage of the EconoCausal project: estimating treatment effects using causal inference methods such as Double Machine Learning (DML).

**Limitation:** The Hillstrom dataset records email campaign assignment rather than discount amounts, discount costs, or profit margins. It can support email campaign effectiveness analysis directly, but dynamic discount optimization requires additional data or explicitly documented simulation assumptions.
