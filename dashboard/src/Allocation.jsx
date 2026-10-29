import React, {useEffect, useMemo, useState} from 'react';
import Papa from 'papaparse';
import {optimizeEmails} from './optimization.mjs';
const fmt = n => new Intl.NumberFormat('en-US', {maximumFractionDigits:2}).format(n);
const dollars = n => '$' + fmt(n);

export default function Allocation({scores, source, budget, setBudget, cost, setCost, Chart, Metric}) {
  const [population,setPopulation] = useState('all');
  const [action,setAction] = useState('All');
  const [search,setSearch] = useState('');
  const [page,setPage] = useState(0);
  const cohort = useMemo(() => scores.filter(r => population==='all' || r.split===population),[scores,population]);
  const plan = useMemo(() => {
    try { return optimizeEmails(cohort,budget,cost); }
    catch(e) { return {error:e.message}; }
  },[cohort,budget,cost]);
  const visible = useMemo(() => (plan.allocation || []).filter(r =>
    (action==='All' || r.recommended_action===action) && String(r.customer_id).toLowerCase().includes(search.toLowerCase())),[plan,action,search]);
  useEffect(()=>setPage(0),[plan,action,search]);
  function download() {
    const text = Papa.unparse(visible,{escapeFormulae:true});
    const url = URL.createObjectURL(new Blob([text],{type:'text/csv'}));
    const a=document.createElement('a'); a.href=url; a.download='week3_allocation.csv'; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const s=plan.summary;
  return <>
    <section className="card">
      <h2>Week 3 · Choose the best email within a budget</h2>
      <p>Choose Men’s Email, Women’s Email or No Email to maximize <b>predicted extra spending</b>. Each customer can receive at most one email. Both email types use the same assumed cost.</p>
      <small>Score source: {source}. No email is sent. Customer IDs are historical row labels.</small>
      <div className="filters">
        <label>Allocation budget ($)<input type="number" min="0" step="0.01" value={budget} onChange={e=>setBudget(e.target.value)}/></label>
        <label>Cost per email ($)<input type="number" min="0.01" step="0.01" value={cost} onChange={e=>setCost(e.target.value)}/></label>
        <label>Allocation population<select value={population} onChange={e=>setPopulation(e.target.value)}>
          <option value="all">All loaded customers</option><option value="test">Test customers</option>
          <option value="train">Training customers</option><option value="new">New scored customers</option>
        </select></label>
      </div>
      <p>Population defines the budget allocation. Customer scores page filters do not apply here. The action and ID filters below only change the table view.</p>
      <div className="error" role="note">Planning estimates, not promised sales. Both spending rankings remain uncertain in held-out evaluation. The women’s visit audit has a subset-stability warning. All-customer plans include training rows.</div>
      <details><summary>How this matches the SciPy notebook</summary>
        <p>Notebook 07 uses SciPy linear optimization with verified whole-customer decisions. With equal email costs, the exact solution is to pick each customer’s better positive spending effect and take the highest values that fit. This browser uses that equivalent rule for live updates; tests compare it with SciPy results. Unequal costs or extra business constraints need a different solver.</p>
        <p>The objective is revenue. Revenue less email cost is shown for transparency, but is not profit: product margins and other costs are unknown. No discount amount can be inferred from Hillstrom.</p>
      </details>
    </section>
    {plan.error ? <p className="error" role="alert">{plan.error}</p> : <>
      <div className="metrics">
        <Metric label="Customers selected" value={fmt(s.contacted)} note={`of ${fmt(s.customers)} eligible rows`}/>
        <Metric label="Allocated cost" value={dollars(s.allocated_cost)} note={`Budget ${dollars(s.budget)}`}/>
        <Metric label="Unused budget" value={dollars(s.unused_budget)} note="Budget is a ceiling, not a spending target"/>
        <Metric label="Predicted extra revenue" value={dollars(s.predicted_incremental_revenue)} note="Sum of selected spending-effect estimates"/>
        <Metric label="Revenue less email cost" value={dollars(s.predicted_revenue_less_email_cost)} note="Prediction; excludes product and other costs"/>
      </div>
      <section className="card">
        <h2>Allocation overview</h2>
        <p>The plan assigns {fmt(s.mens)} Men’s Emails, {fmt(s.womens)} Women’s Emails and {fmt(s.no_email)} No Email decisions.</p>
        {s.customers===0 ? <p>No customers in this population. Choose another population or upload scored data on Customer scores.</p> : <Chart data={[{type:'bar',x:['Men’s Email','Women’s Email','No Email'],y:[s.mens,s.womens,s.no_email],marker:{color:['#176b68','#b67747','#9caaa3']}}]} layout={{yaxis:{title:{text:'Customers'}}}}/>}
      </section>
      <section className="card">
        <h2>Strategy comparison</h2>
        <p>All benefits below are predictions from the same model, not observed campaign returns. Random targeting uses the same contact count and cost as this plan. Blanket strategies can exceed the budget.</p>
        <Chart data={[{type:'bar',x:plan.benchmarks.filter(b=>b.feasible).map(b=>b.strategy.replace('Random customers + random email (expected)','Random (expected)')),y:plan.benchmarks.filter(b=>b.feasible).map(b=>b.revenue),marker:{color:'#176b68'}}]} layout={{yaxis:{title:{text:'Predicted extra revenue ($)'}},margin:{b:100,t:30,l:65,r:20}}}/>
        <div className="table-wrap"><table><thead><tr><th>Strategy</th><th>Predicted extra revenue</th><th>Cost</th><th>Within budget?</th></tr></thead><tbody>
          {plan.benchmarks.map(b=><tr key={b.strategy}><td>{b.strategy}</td><td>{dollars(b.revenue)}</td><td>{dollars(b.cost)}</td><td>{b.feasible?'Yes':'No — infeasible'}</td></tr>)}
        </tbody></table></div>
      </section>
      <section className="card">
        <div className="card-head"><h2>Customer allocation matrix</h2><button onClick={download} disabled={!visible.length}>Download allocation CSV</button></div>
        <p>Every eligible customer has an action, including No Email. These view filters do not redistribute the budget. Download includes all {fmt(visible.length)} visible matches, not just this page.</p>
        <div className="filters">
          <label>Show recommended action<select value={action} onChange={e=>setAction(e.target.value)}>{['All','Mens E-Mail','Womens E-Mail','No E-Mail'].map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Find allocation row<input placeholder="row_000123" value={search} onChange={e=>setSearch(e.target.value)}/></label>
        </div>
        <div className="table-wrap"><table><thead><tr><th>Row ID</th><th>Split</th><th>Recommendation</th><th>Cost ($)</th><th>Predicted extra revenue ($)</th><th>Reason</th></tr></thead><tbody>
          {visible.slice(page*25,(page+1)*25).map(r=><tr key={r.customer_id}><td>{r.customer_id}</td><td>{r.split}</td><td>{r.recommended_action}</td><td>{r.allocated_cost.toFixed(2)}</td><td>{r.predicted_incremental_revenue.toFixed(3)}</td><td>{r.reason}</td></tr>)}
        </tbody></table></div>
        {!visible.length && <p>No rows match this view.</p>}
        <div className="pagination"><span>Page {page+1} of {Math.max(1,Math.ceil(visible.length/25))}</span><button disabled={page===0} onClick={()=>setPage(page-1)}>Previous</button><button disabled={(page+1)*25>=visible.length} onClick={()=>setPage(page+1)}>Next</button></div>
      </section>
    </>}
  </>;
}
