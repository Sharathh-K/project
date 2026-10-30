import unittest
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient
from api.main import app,get_engine
from api.service import engineer,drift

ROW=dict(customer_id='a',recency=3,history=100,mens=1,womens=0,newbie=0,zip_code='Urban',channel='Web')
class FakeEngine:
    model_id='test'
    reference=engineer(pd.DataFrame([ROW]*200))
    def score(self,rows):
        scored=[dict(r,spend_mens=1.,spend_womens=2.) for r in rows]
        return dict(rows=scored,drift=drift(self.reference,engineer(pd.DataFrame(rows))))
class Week4Tests(unittest.TestCase):
    def setUp(self):
        app.dependency_overrides.clear()
        self.client=TestClient(app)
    def test_validation(self):
        for rows in [[ROW,ROW],[dict(ROW,visit=1)],[dict(ROW,recency=13)],[dict(ROW,history=-1)],[]]:
            self.assertEqual(self.client.post('/api/score',json={'customers':rows}).status_code,422)
    def test_drift(self):
        baseline=engineer(pd.DataFrame([ROW]*200))
        self.assertEqual(drift(baseline,baseline)['status'],'no_warning')
        changed=baseline.copy();changed['history']=10000
        self.assertEqual(drift(baseline,changed)['status'],'review')
        self.assertEqual(drift(baseline,changed.head(2))['status'],'insufficient_data')
        changed=baseline.copy();changed['channel']='Unknown'
        self.assertEqual(drift(baseline,changed)['metrics'][-1]['unknown_fraction'],1)
    def test_missing_model(self):
        from pathlib import Path
        from tempfile import TemporaryDirectory
        from api.service import Engine
        with TemporaryDirectory() as folder:
            with self.assertRaises(FileNotFoundError): Engine(Path(folder))

    def test_health(self):
        self.assertEqual(self.client.get('/api/health').status_code,200)
    def test_campaign(self):
        from unittest.mock import patch
        with patch('api.main.get_engine',return_value=FakeEngine()):
            result=self.client.post('/api/recommend',json={'customers':[ROW,dict(ROW,customer_id='b')],'budget':.1,'email_cost':.1})
            self.assertEqual(result.status_code,200)
            self.assertEqual(result.json()['allocation']['contacted'],1)
            self.assertEqual(result.json()['allocation']['allocated_cost'],.1)
            bad=self.client.post('/api/recommend',json={'customers':[ROW],'budget':.001})
            self.assertEqual(bad.status_code,422)
if __name__=='__main__': unittest.main()
