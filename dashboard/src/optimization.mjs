// Equal-cost specialization of notebook 07. Changing action costs independently
// or adding constraints requires the general Python solver, not this shortcut.
export function moneyCents(value, name, positive = false) {
  const text = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw Error(`${name}: enter a nonnegative amount with at most two decimals.`);
  const [whole, fraction = ''] = text.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount) || amount > 100_000_000_000 || (positive && amount === 0))
    throw Error(`${name}: enter a valid ${positive ? 'positive' : 'nonnegative'} amount.`);
  return amount;
}

export function optimizeEmails(rows, budget, cost) {
  const budgetCents = moneyCents(budget, 'Budget');
  const costCents = moneyCents(cost, 'Email cost', true);
  const ids = new Set();
  const candidates = rows.map((r) => {
    if (r.customer_id == null || String(r.customer_id).trim() === '' || ids.has(String(r.customer_id)))
      throw Error('Allocation requires unique, nonempty customer IDs.');
    ids.add(String(r.customer_id));
    if (![r.spend_mens, r.spend_womens].every(Number.isFinite)) throw Error('Spending effect scores must be finite.');
    return {row: r, best: Math.max(r.spend_mens, r.spend_womens),
      action: r.spend_mens >= r.spend_womens ? 'Mens E-Mail' : 'Womens E-Mail'};
  });
  const capacity = Math.min(rows.length, Math.floor(budgetCents / costCents));
  const positive = candidates.filter(c => c.best > 0).sort((a, b) => b.best - a.best ||
    (String(a.row.customer_id) < String(b.row.customer_id) ? -1 : String(a.row.customer_id) > String(b.row.customer_id) ? 1 : 0));
  const selected = new Set(positive.slice(0, capacity).map(c => c.row.customer_id));
  const allocation = candidates.map(({row, best, action}) => {
    const chosen = selected.has(row.customer_id);
    const allocated = chosen ? costCents / 100 : 0;
    const revenue = chosen ? best : 0;
    return {customer_id: row.customer_id, split: row.split, channel: row.channel, recency: row.recency,
      spend_mens: row.spend_mens, spend_womens: row.spend_womens,
      recommended_action: chosen ? action : 'No E-Mail', allocated_cost: allocated,
      predicted_incremental_revenue: revenue, predicted_revenue_less_email_cost: revenue - allocated,
      reason: chosen ? 'Selected within budget' : best <= 0 ? 'No positive predicted revenue effect' : 'Budget limit'};
  }).sort((a, b) => b.predicted_incremental_revenue - a.predicted_incremental_revenue ||
    (String(a.customer_id) < String(b.customer_id) ? -1 : 1));
  const spentCents = selected.size * costCents;
  if (spentCents > budgetCents) throw Error('Budget exceeded.');
  const revenue = allocation.reduce((s, r) => s + r.predicted_incremental_revenue, 0);
  const summary = {customers: rows.length, budget: budgetCents / 100, email_cost: costCents / 100,
    contacted: selected.size, mens: allocation.filter(r => r.recommended_action === 'Mens E-Mail').length,
    womens: allocation.filter(r => r.recommended_action === 'Womens E-Mail').length,
    no_email: rows.length - selected.size, allocated_cost: spentCents / 100,
    unused_budget: (budgetCents - spentCents) / 100, predicted_incremental_revenue: revenue,
    predicted_revenue_less_email_cost: revenue - spentCents / 100};
  const meanBoth = rows.length ? rows.reduce((s,r) => s + r.spend_mens + r.spend_womens,0) / (2*rows.length) : 0;
  const benchmarks = [
    {strategy:'Optimized', revenue, cost:summary.allocated_cost, feasible:true},
    {strategy:'Random customers + random email (expected)', revenue:meanBoth*selected.size, cost:summary.allocated_cost, feasible:true},
    {strategy:'No email', revenue:0, cost:0, feasible:true},
    ...['mens','womens'].map(arm => ({strategy:`Blanket ${arm} email`, revenue:rows.reduce((s,r)=>s+r[`spend_${arm}`],0),
      cost:rows.length*costCents/100, feasible:rows.length*costCents<=budgetCents}))];
  return {allocation, summary, benchmarks};
}
