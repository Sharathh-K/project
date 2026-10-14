# EconoCausal — Exploratory Data Analysis Report

## 1. Project Overview

This report presents an Exploratory Data Analysis (EDA) of the Hillstrom MineThatData E-Mail Analytics dataset. The objective is to understand customer characteristics, historical purchasing behavior, website engagement, campaign outcomes, and spending patterns before conducting further causal analysis.

## 2. Dataset Overview

The dataset contains **64,000 customer records and 12 columns**.

The variables cover:
- Customer characteristics, including recency, new-customer status, and historical spending.
- Customer attributes, including channel, ZIP-code category, and previous interest in men's and women's merchandise.
- Campaign assignment: Men's E-Mail, Women's E-Mail, or No E-Mail.
- Outcomes: website visits, purchases, and spending.

All 12 columns have zero missing values. The dataset contains 6,562 rows flagged as exact duplicates across all columns. These were not removed because the dataset has no unique customer identifier, so identical records cannot automatically be assumed to represent accidental duplication.

## 3. Overall Performance

| Metric | Result |
|---|---:|
| Total customer records | 64,000 |
| Website visits | 9,394 |
| Overall visit rate | 14.68% |
| Total purchases | 578 |
| Overall purchase rate | 0.90% |
| Total spending | $67,258.13 |
| Average spending per customer | $1.05 |

The purchase rate is calculated across all customer records, not only those who visited the website.

## 4. Campaign Segment Analysis

The dataset contains three campaign groups: Men's E-Mail, Women's E-Mail, and No E-Mail.

| Metric | Men's E-Mail | Women's E-Mail | No E-Mail |
|---|---:|---:|---:|
| Customers | 21,307 | 21,387 | 21,306 |
| Visit rate | 18.28% | 15.14% | 10.62% |
| Purchase rate | 1.25% | 0.88% | 0.57% |
| Average spend per customer | $1.42 | $1.08 | $0.65 |
| Total purchases | 267 | 189 | 122 |
| Total spending | $30,311.69 | $23,038.11 | $13,908.33 |

The Men's E-Mail group had the highest observed visit rate, purchase rate, average spending per customer, and total spending. The Women's E-Mail group also had higher observed engagement and spending than the No E-Mail group.

These are descriptive comparisons. They do not, by themselves, establish that the emails caused the differences.

## 5. Customer Engagement and Purchasing Behavior

The dataset recorded 9,394 website visits and 578 purchases. Among visitors, approximately 6.15% made a purchase.

The `visit`, `conversion`, and `spend` variables were consistent: all 578 customers with a conversion had positive spending, while customers without a conversion had zero spending.

Spending was highly right-skewed. Most customers had zero spending, while a smaller group made purchases with varying amounts. Among purchasers, the average spend was approximately $116.36. The top 10% of purchasers accounted for approximately 32.27% of revenue from purchasers.

## 6. Historical Spending Analysis

Historical spending was examined using both the numerical `history` variable and the categorical `history_segment` variable.

The mean historical spending was approximately $242.09, while the median was $158.11. The mean being higher than the median, along with a maximum of $3,345.93, suggests a right-skewed distribution.

Comparisons across historical spending segments showed differences in observed visit rates, purchase rates, and average spending. Higher historical spending segments generally showed stronger engagement and spending patterns in the campaign dataset. These relationships may help identify customer groups for further investigation but do not establish causal effects.

## 7. New and Existing Customers

Existing customers (`newbie = 0`) had a higher observed visit rate than new customers (`newbie = 1`):

- Existing customers: 17.31%
- New customers: 12.07%

Existing customers also had a higher purchase rate and average spending per customer in this dataset. These findings suggest differences in observed behavior between the two groups, although other customer characteristics may also contribute to the differences.

## 8. Correlation Analysis

The numerical correlation matrix showed that most pairs of variables had weak linear correlations. Conversion and spending had a strong positive correlation of approximately 0.73, which is expected because purchases are associated with positive spending.

Visit and conversion had a positive correlation of approximately 0.23. Correlation measures association, not causation, and should be interpreted in the context of the dataset's variable definitions.

## 9. Data Quality and Limitations

- No missing values were found.
- The dataset contains exact duplicate rows; these were flagged but not automatically removed.
- Binary indicators such as `visit`, `conversion`, `mens`, `womens`, and `newbie` are stored as integers, which is appropriate for their 0/1 coding.
- Spending is highly skewed, with most customer records showing zero spending.
- Observed campaign differences should not be interpreted as causal effects solely from descriptive charts and summaries.
- The analysis depends on the variables available in the dataset and does not establish whether the observed patterns generalize to other customer populations or campaigns.

## 10. Conclusion and Next Steps

The EDA revealed meaningful differences in customer engagement, purchasing outcomes, and spending across campaign groups and customer characteristics. The Men's E-Mail group had the strongest observed performance across the main campaign metrics. Historical spending and new-customer status were also associated with differences in observed behavior.

The next stage of EconoCausal is to conduct a causal analysis to estimate the incremental effect of email campaigns compared with the No E-Mail group. This will require an appropriate causal design and careful interpretation of the treatment assignments, outcome variables, and assumptions.

**Overall conclusion:** EDA provides a foundation for understanding the data and generating hypotheses. Causal analysis is needed before making stronger claims about the impact of the email campaigns.
s