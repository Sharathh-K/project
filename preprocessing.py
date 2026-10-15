import pandas as pd
from pathlib import Path

# Locate the project folder and load the raw dataset
project_dir = Path(__file__).resolve().parent
data_path = project_dir / "Kevin_Hillstrom_MineThatData_E-MailAnalytics_DataMiningChallenge_2008.03.20.csv"

df = pd.read_csv(data_path)

print("Dataset loaded successfully!")
print("Dataset shape:", df.shape)
print(df.head())

# Check data quality
print("\nMissing values:")
print(df.isnull().sum())

print("\nExact duplicate rows:", df.duplicated().sum())

print("\nColumn names:")
print(df.columns.tolist())

print("\nData types:")

# Standardize category spelling
df["zip_code"] = df["zip_code"].replace({"Surburban": "Suburban"})

print("\nZIP code category counts:")
print(df["zip_code"].value_counts())

# Validate treatment and outcome variables
print("\nCampaign groups:")
print(df["segment"].value_counts())

print("\nVisit and conversion combinations:")
print(pd.crosstab(df["visit"], df["conversion"]))

print("\nTotal spend:", df["spend"].sum())


# Identify new and returning customers
df["customer_type"] = df["newbie"].map({
    1: "New",
    0: "Returning"
})

print("\nCustomer type counts:")
print(df["customer_type"].value_counts())

# Validate treatment groups
print("\nTreatment group counts:")
print(df["segment"].value_counts())

print("\nTreatment group proportions:")
print(df["segment"].value_counts(normalize=True).round(3))

# Validate outcome variables
print("\nVisit values:")
print(df["visit"].value_counts().sort_index())

print("\nConversion values:")
print(df["conversion"].value_counts().sort_index())

# Check for invalid conversion records
invalid_conversions = df[
    (df["conversion"] == 1) & (df["visit"] == 0)
]

print("\nConversions without a visit:", len(invalid_conversions))

# Save the preprocessed dataset
output_path = project_dir / "hillstrom_preprocessed.csv"
df.to_csv(output_path, index=False)

print("\nPreprocessed dataset saved to:", output_path)
print("Final dataset shape:", df.shape)