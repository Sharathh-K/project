import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import Papa from 'papaparse';
import {optimizeEmails,moneyCents} from './optimization.mjs';
const toy=[{customer_id:'A',spend_mens:.8,spend_womens:.3},{customer_id:'B',spend_mens:.2,spend_womens:.9},{customer_id:'C',spend_mens:-.3,spend_womens:-.1},{customer_id:'D',spend_mens:.4,spend_womens:.1}];
test('Exact cents enforce budgets, including zero and fractional inputs',()=>{
  assert.equal(optimizeEmails(toy,'0.20','0.10').summary.contacted,2);
  assert.equal(optimizeEmails(toy,'0.30','0.10').summary.contacted,3);
  assert.equal(optimizeEmails(toy,'0.09','0.10').summary.contacted,0);
  assert.equal(optimizeEmails(toy,0,.1).summary.contacted,0);
  for(const [b,c] of [[-1,.1],[1,0],[1,.001],['',.1],[NaN,.1],[1,Infinity]]) assert.throws(()=>optimizeEmails(toy,b,c));
  assert.equal(moneyCents('0.29','Budget'),29);
});
test('Optimal action, no negative effect, deterministic tie and no fractional customer',()=>{
  const plan=optimizeEmails(toy,.2,.1);
  assert.ok(Math.abs(plan.summary.predicted_incremental_revenue-1.7)<1e-12);
  assert.equal(plan.allocation.find(r=>r.customer_id==='A').recommended_action,'Mens E-Mail');
  assert.equal(plan.allocation.find(r=>r.customer_id==='B').recommended_action,'Womens E-Mail');
  assert.equal(plan.allocation.find(r=>r.customer_id==='C').recommended_action,'No E-Mail');
  const tied=[{customer_id:'B',spend_mens:1,spend_womens:1},{customer_id:'A',spend_mens:1,spend_womens:1}];
  assert.equal(optimizeEmails(tied,.1,.1).allocation[0].customer_id,'A');
  assert.equal(optimizeEmails([],1,.1).summary.contacted,0);
  assert.throws(()=>optimizeEmails([...toy,toy[0]],1,.1));
  assert.throws(()=>optimizeEmails([{customer_id:'A',spend_mens:NaN,spend_womens:1}],1,.1));
});
test('Brute-force enumeration independently verifies browser objective',()=>{
  for(const budget of [0,.1,.2,.3,1]){
    let best=0;
    for(let code=0;code<3**toy.length;code++){
      let num=code, contacts=0, value=0;
      for(const r of toy){const a=num%3; num=Math.floor(num/3); if(a){contacts++; value+=a===1?r.spend_mens:r.spend_womens;}}
      if(contacts*10<=moneyCents(budget,'Budget')) best=Math.max(best,value);
    }
    assert.ok(Math.abs(optimizeEmails(toy,budget,.1).summary.predicted_incremental_revenue-best)<1e-12);
  }
});
test('Random baseline same cost; blanket explicitly infeasible',()=>{
  const plan=optimizeEmails(toy,.2,.1);
  assert.equal(plan.benchmarks[0].cost,plan.benchmarks[1].cost);
  assert.equal(plan.benchmarks.at(-1).feasible,false);
});
test('Real 64,000-row browser allocations agree with executed SciPy notebook',()=>{
  const evidence=JSON.parse(fs.readFileSync(new URL('../public/results/optimization_report.json',import.meta.url)));
  const text=fs.readFileSync(new URL('../public/results/customer_scores.csv',import.meta.url),'utf8');
  assert.equal(createHash('sha256').update(text).digest('hex'),evidence.scores_sha256);
  const reportText=fs.readFileSync(new URL('../public/results/report.json',import.meta.url));
  assert.equal(createHash('sha256').update(reportText).digest('hex'),evidence.report_sha256);
  const rows=Papa.parse(text,{header:true,dynamicTyping:true,skipEmptyLines:true}).data;
  assert.equal(rows.length,64000);
  for(const fixture of evidence.fixtures){
    const cohort=fixture.population==='all'?rows:rows.filter(r=>r.split===fixture.population);
    const plan=optimizeEmails(cohort,fixture.summary.budget,fixture.summary.email_cost);
    for(const key of ['contacted','mens','womens','no_email','allocated_cost','unused_budget']) assert.equal(plan.summary[key],fixture.summary[key]);
    assert.ok(Math.abs(plan.summary.predicted_incremental_revenue-fixture.summary.predicted_incremental_revenue)<1e-7);
    assert.deepEqual(plan.allocation.filter(r=>r.recommended_action!=='No E-Mail').map(r=>r.customer_id).sort(),fixture.selected_ids);
  }
});
