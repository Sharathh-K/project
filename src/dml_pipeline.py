import numpy as np
import pandas as pd

class DMLPipeline:
    
    def __init__(self, preprocessor, estimator, feature_cols, treatment_col, outcome_col, control):
        self.preprocessor = preprocessor
        self.estimator = estimator
        self.feature_cols = feature_cols
        self.treatment_col = treatment_col
        self.outcome_col = outcome_col
        self.control = control
        
    def fit(self, df):
        X = self.preprocessor.fit_transform(df[self.feature_cols])    
        self.estimator.fit(Y=df[self.outcome_col].values, T=df[self.treatment_col].values, X=X.values)
        self.arms_ = [a for a in sorted(df[self.treatment_col].unique()) if a != self.control]
        self.feature_names_ = list(X.columns)
        return self
    
    def effects(self, df):
        X = self.preprocessor.transform(df[self.feature_cols]).values
        out = {f"ite_{arm.replace(' E-Mail', '').lower()}":
               np.ravel(self.estimator.effect(X, T0=self.control, T1=arm)) for arm in self.arms_}
        return pd.DataFrame(out, index=df.index)
        
    def recommend(self, df):
        eff = self.effects(df)
        best = pd.Series(self.arms_, index=eff.columns).reindex(eff.idxmax(axis=1)).values
        best = np.where(eff.max(axis=1) > 0, best, self.control)
        return eff.assign(best_segment=best)