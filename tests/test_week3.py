"""Run: python -m unittest discover -s tests -p 'test_week3.py'.
Load the tagged function cell without executing the full notebook pipeline.
"""
import unittest
import json
import itertools
from pathlib import Path
from decimal import Decimal
import numpy as np
import pandas as pd
from scipy.optimize import linprog
from scipy.sparse import csc_matrix
ROOT=Path(__file__).resolve().parents[1]
nb=json.loads((ROOT/'07_budget_optimization.ipynb').read_text())
functions=next(c for c in nb['cells'] if 'optimizer_functions' in c.get('metadata',{}).get('tags',[]))
exec(compile(''.join(functions['source']),'07_budget_optimization.ipynb','exec'))

class OptimizerTests(unittest.TestCase):
    def test_random_small_cases_against_exhaustive_search(self):
        rng=np.random.default_rng(123)
        for case in range(8):
            values=rng.uniform(-1,2,size=(5,2))
            rows=pd.DataFrame(values,columns=['spend_mens','spend_womens'])
            rows['customer_id']=[str(i) for i in range(5)]
            budget=[0,.1,.2,.3,.5][case%5]
            best=0
            for actions in itertools.product([0,1,2],repeat=5):
                if sum(a!=0 for a in actions)*10<=cents(budget,'Budget'):
                    best=max(best,sum(values[i,a-1] for i,a in enumerate(actions) if a))
            allocation,summary=allocate_email(rows,budget,.1)
            self.assertAlmostEqual(summary['predicted_incremental_revenue'],best)
            self.assertLessEqual(summary['allocated_cost'],budget)
            self.assertEqual(len(allocation),5)
    def test_bad_scores_and_ids(self):
        for rows in [pd.DataFrame({'customer_id':['a','a'],'spend_mens':[1,1],'spend_womens':[2,2]}),
                     pd.DataFrame({'customer_id':['a'],'spend_mens':[np.nan],'spend_womens':[1]})]:
            with self.assertRaises(ValueError): allocate_email(rows)
    def test_cost_precision(self):
        self.assertEqual(cents(.29,'Budget'),29)
        for value in [np.inf,np.nan,-1,.001]:
            with self.assertRaises((ValueError,ArithmeticError)): cents(value,'Budget')
if __name__=='__main__': unittest.main()
