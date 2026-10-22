import pandas as pd

df = pd.read_csv(r"E:\EconoCausal\data\hillstrom.csv")

print("1. SHAPE:", df.shape)
print("\n2. GROUP SIZES")
print(df["segment"].value_counts())

print("\n3. OUTCOMES BY EMAIL GROUP")
print(df.groupby("segment")[["visit", "conversion", "spend"]].mean().round(4))

print("\n4. VISIT RATE BY GROUP AND CHANNEL")
print(df.pivot_table(index="channel", columns="segment",
                     values="visit", aggfunc="mean").round(3))

print("\n5. VISIT RATE BY GROUP AND NEW/EXISTING CUSTOMER")
print(df.pivot_table(index="newbie", columns="segment",
                     values="visit", aggfunc="mean").round(3))

print("\n6. BALANCE CHECK (averages per group)")
print(df.groupby("segment")[["recency", "history", "mens", "womens", "newbie"]].mean().round(3))