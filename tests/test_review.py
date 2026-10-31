"""Regression checks for the final resource review."""
import contextlib
import io
import itertools
import json
from pathlib import Path
import tempfile
import unittest
import numpy as np
import pandas as pd

class EdaBalanceTests(unittest.TestCase):
    def test_constant_feature_differences_are_not_hidden(self):
        root=Path(__file__).resolve().parents[1]
        notebook=json.loads((root/'01_eda.ipynb').read_text())
        code=next(''.join(c['source']) for c in notebook['cells']
                  if c['cell_type']=='code' and 'baseline_columns =' in ''.join(c['source']))
        arms=['Mens E-Mail','Womens E-Mail','No E-Mail']
        data=pd.DataFrame({'segment':np.repeat(arms,2),'recency':[1]*6,
                           'history':[1,1,0,0,0,0],'mens':[0]*6,'womens':[0]*6,
                           'newbie':[0]*6,'zip_code':['Urban']*6,'channel':['Web']*6})
        with tempfile.TemporaryDirectory() as folder:
            scope=dict(data=data,ARMS=arms,np=np,pd=pd,itertools=itertools,ROOT=Path(folder))
            with self.assertRaisesRegex(ValueError,'constant feature'):
                exec(compile(code,'01_eda.ipynb','exec'),scope)
            data['history']=0
            with contextlib.redirect_stdout(io.StringIO()):
                exec(compile(code,'01_eda.ipynb','exec'),scope)
            self.assertTrue((scope['balance'].largest_absolute_smd==0).all())
