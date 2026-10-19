import { useRef, useState } from 'react'
import { Icon } from './Icon'
import { runAnalysis } from './services/api'

const REQUIRED = ['recency', 'history', 'mens', 'womens', 'zip_code', 'newbie', 'channel', 'segment', 'visit', 'conversion', 'spend']
const MAX_MB = 20
const kb = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB')

function splitLine(line) {
  const out = []
  let cur = '', q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += c }
    else if (c === '"') q = true
    else if (c === ',') { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out
}

async function readCsv(f) {
  if (!f.name.toLowerCase().endsWith('.csv')) return { error: 'Please choose a .csv file.' }
  if (f.size > MAX_MB * 1048576) return { error: 'File is larger than ' + MAX_MB + ' MB.' }
  const lines = (await f.text()).split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { error: 'The file is empty or has no data rows.' }
  const columns = splitLine(lines[0]).map((c) => c.trim())
  const preview = lines.slice(1, 6).map((l) => splitLine(l))
  return { file: { name: f.name, size: f.size, raw: f, columns, preview, total: lines.length - 1, missing: REQUIRED.filter((c) => !columns.includes(c)) } }
}

const Card = ({ title, step, sub, children, tone, action }) => (
  <section className={'card ' + (tone || '')}>
    <div className="card-h"><h2>{step && <span className="step">{step}</span>}{title}</h2>{action}</div>
    {sub && <p className="sub">{sub}</p>}
    {children}
  </section>
)
const Modal = ({ title, onClose, children }) => (
  <div className="overlay" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
      <h2>{title}</h2>{children}<button className="btn" autoFocus onClick={onClose}>Close</button>
    </div>
  </div>
)
const Note = ({ kind = 'info', children }) => <div className={'msg ' + kind} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>

function Upload({ file, setFile }) {
  const ref = useRef(null)
  const [over, setOver] = useState(false)
  const [err, setErr] = useState('')
  async function pick(f) {
    if (!f) return
    setErr('')
    const r = await readCsv(f)
    if (r.error) { setErr(r.error); return }
    setFile(r.file)
  }
  return (
    <Card step="1" title="Upload your data" sub="CSV with customer details, the offer sent, and the outcome.">
      {!file ? (
        <div className={'drop' + (over ? ' over' : '')} onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]) }}>
          <Icon d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" size={40} />
          <b>Drop your file here</b><span className="muted">CSV only, up to {MAX_MB} MB</span>
          <button className="btn" onClick={() => ref.current.click()}>Browse files</button>
          <input ref={ref} type="file" accept=".csv,text/csv" hidden onChange={(e) => pick(e.target.files[0])} />
        </div>
      ) : (
        <div className="filebox">
          <div><b>{file.name}</b><span className="muted">{kb(file.size)} | {file.total.toLocaleString('en-US')} rows | read in your browser only</span></div>
          <div className="row"><button className="btn" onClick={() => ref.current.click()}>Change</button><button className="btn ghost" onClick={() => setFile(null)}>Remove</button>
            <input ref={ref} type="file" accept=".csv,text/csv" hidden onChange={(e) => pick(e.target.files[0])} /></div>
        </div>
      )}
      {err && <Note kind="error">{err}</Note>}
      {file && file.missing.length > 0 && <Note kind="warn">Missing expected columns: {file.missing.join(', ')}</Note>}
      {file && file.missing.length === 0 && <Note kind="ok">All expected columns found.</Note>}
    </Card>
  )
}

function Plan({ file, plan, setPlan }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const n = Number(plan.budget)
  const ok = plan.budget !== '' && Number.isFinite(n) && n >= 0
  const toggle = (v) => setPlan({ ...plan, types: plan.types.includes(v) ? plan.types.filter((x) => x !== v) : [...plan.types, v].sort((a, b) => a - b) })
  async function submit(e) {
    e.preventDefault()
    setMsg(null)
    if (!ok) return setMsg({ k: 'error', t: 'Enter a budget of 0 or more.' })
    if (!file) return setMsg({ k: 'warn', t: 'Upload a CSV first.' })
    setBusy(true)
    try {
      const r = await runAnalysis({ ...plan, budget: n }, file.raw)
      setMsg(r.status === 'pending' ? { k: 'info', t: 'Your plan is valid. ' + r.message } : { k: 'ok', t: 'The server answered. Showing results is the next step.' })
    } catch (err) { setMsg({ k: 'error', t: 'Could not reach the server: ' + err.message }) }
    setBusy(false)
  }
  return (
    <form onSubmit={submit}>
      <Card step="2" title="Set your discount plan" sub="Choose a budget and the coupons you can offer.">
        <div className="field"><label htmlFor="b">Total discount budget ($)</label>
          <input id="b" type="number" min="0" value={plan.budget} onChange={(e) => setPlan({ ...plan, budget: e.target.value })} aria-invalid={!ok} />
          {!ok && <span className="err">Enter a number of 0 or more.</span>}</div>
        <div className="field"><label htmlFor="c">Number of coupons</label>
          <select id="c" value={plan.count} onChange={(e) => setPlan({ ...plan, count: e.target.value })}>
            <option value="auto">Let the model decide</option>{[100, 250, 500, 1000].map((v) => <option key={v} value={v}>{v.toLocaleString('en-US')}</option>)}</select></div>
        <div className="field"><span className="lab">Coupon types</span>
          <div className="chips">{[1, 2, 5, 10].map((v) => <button type="button" key={v} className={'chip' + (plan.types.includes(v) ? ' on' : '')} aria-pressed={plan.types.includes(v)} onClick={() => toggle(v)}>${v}</button>)}</div></div>
        <button className="btn primary wide" disabled={busy}>{busy ? 'Checking...' : 'Search best customers'} <Icon d="M5 12h14M13 6l6 6-6 6" /></button>
        {msg && <Note kind={msg.k}>{msg.t}</Note>}
      </Card>
    </form>
  )
}

function Dag() {
  const box = (x, y, w, t, s, f, st) => (<g><rect x={x} y={y} width={w} height="56" rx="12" fill={f} stroke={st} /><text x={x + w / 2} y={y + 24} textAnchor="middle" fontSize="14" fontWeight="700" fill="#10303a">{t}</text><text x={x + w / 2} y={y + 42} textAnchor="middle" fontSize="11" fill="#52666f">{s}</text></g>)
  return (
    <svg viewBox="0 0 460 250" width="100%" role="img" aria-label="Customer features point to the email offer and to the visit; the email offer points to the visit">
      <defs><marker id="ar" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0L10,5L0,10z" fill="#52666f" /></marker></defs>
      <line x1="195" y1="76" x2="110" y2="160" stroke="#52666f" strokeWidth="2" markerEnd="url(#ar)" />
      <line x1="265" y1="76" x2="350" y2="160" stroke="#52666f" strokeWidth="2" markerEnd="url(#ar)" />
      <line x1="170" y1="195" x2="288" y2="195" stroke="#176F60" strokeWidth="3" markerEnd="url(#ar)" />
      {box(130, 20, 200, 'Customer features', 'recency, history, channel', '#e6f1fb', '#8db5dc')}
      {box(20, 165, 150, 'Email offer', 'treatment', '#f1ebfb', '#b7a3e0')}
      {box(290, 165, 150, 'Visit / purchase', 'outcome', '#e3f4ef', '#7fc3b2')}
    </svg>
  )
}

export function Home({ file, setFile, plan, setPlan, dataset }) {
  const [info, setInfo] = useState(false)
  return (
    <>
      <div className="welcome">
        <div><h1>Welcome back!</h1><p>Find the customers who buy only because of the offer, and spend your discount budget on them.</p><span className="chip-s">Dataset: {dataset}</span></div>
        <div className="goal"><span className="target" aria-hidden="true">◎</span><div><b>Your goal</b><p>Pick the right audience, set a discount plan, and maximize incremental lift.</p></div></div>
      </div>
      <div className="cols">
        <div className="col"><Upload file={file} setFile={setFile} />
          <Card step="3" title="Causal graph (DAG)" sub="How the factors affect each other. Arrows show causal direction." action={<button className="btn small" onClick={() => setInfo(true)}>View details</button>}>
            <Dag /><p className="muted">Illustrative diagram. It was not learned from your data.</p></Card></div>
        <div className="col"><Plan file={file} plan={plan} setPlan={setPlan} />
          <Card title="How it works"><ol className="how">
            <li>The model estimates each customer's Individual Treatment Effect (ITE).</li>
            <li>It finds possible persuadables: customers whose purchase chance may rise because of the offer.</li>
            <li>The budget goes to customers expected to add real, incremental value.</li></ol>
            <p className="muted">The goal is to separate purchases caused by the offer from purchases that would have happened anyway.</p></Card></div>
      </div>
      <div className="cols">
        <Card tone="purple" title="What this means"><p>Double Machine Learning estimates the effect of an offer while accounting for the customer traits it can observe, such as recency and past spend.</p></Card>
        <Card tone="purple" title="Quick tips"><ul className="tips">
          <li>Make sure the CSV has customer details, the offer sent, and the outcome.</li>
          <li>A bigger budget reaches more people but can lower spending efficiency.</li>
          <li>Pick coupon types that match your campaign goal.</li></ul></Card>
      </div>
      {info && <Modal title="About the causal graph" onClose={() => setInfo(false)}>
        <p><b>Treatment:</b> the email offer you choose to send.</p><p><b>Outcome:</b> whether the customer visits or buys.</p>
        <p><b>Confounders:</b> customer traits (recency, history, channel) that affect both who gets an offer and who buys. If ignored, they can fake an effect.</p>
        <p><b>Why a graph:</b> it states our assumptions openly, and Double Machine Learning uses them to separate the offer's own effect from these traits.</p></Modal>}
    </>
  )
}

export function DataPage({ file, setFile, dataset }) {
  const demo = { columns: ['recency', 'history', 'channel', 'segment', 'visit'], preview: [['10', '142.44', 'Phone', 'Womens E-Mail', '0'], ['6', '329.08', 'Web', 'No E-Mail', '0'], ['9', '675.83', 'Web', 'Mens E-Mail', '1']] }
  const d = file || demo
  return (
    <>
      <h1>Data</h1><p className="lead">Dataset: {dataset}</p>
      <div className="cols"><Upload file={file} setFile={setFile} />
        <Card title="Data-quality checklist"><ul className="tips">
          <li>{file ? (file.missing.length ? 'Check: missing columns ' + file.missing.join(', ') : 'Pass: all expected columns present') : 'Upload a file to run the checks'}</li>
          <li>Needs a treatment column (the offer sent)</li><li>Needs an outcome column (visit, purchase or spend)</li><li>Needs customer detail columns</li></ul></Card></div>
      <Card title="Preview" sub={file ? 'First rows of your file, read in your browser.' : 'Sample rows for illustration only. Upload a CSV to see your own data.'}>
        <div className="scroll"><table><thead><tr>{d.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>{d.preview.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div></Card>
    </>
  )
}

export function ModelPage() {
  return (
    <>
      <h1>Model</h1><span className="status">Not trained | Backend integration pending</span>
      <div className="cols">
        <Card title="Double Machine Learning"><p>Two helper models remove the influence of customer traits. What remains is the effect of the offer.</p>
          <ol className="how"><li>Predict the outcome from customer traits</li><li>Predict who gets the offer from customer traits</li><li>Compare what is left over</li><li>Estimate each customer's effect</li></ol></Card>
        <Card title="Variables"><p><b>Treatment:</b> email offer (segment)</p><p><b>Outcome:</b> visit, conversion or spend</p>
          <p><b>Customer features:</b> recency, history, mens, womens, zip_code, newbie, channel</p><p className="muted">No model has been run.</p></Card>
      </div>
    </>
  )
}

const CUST = Array.from({ length: 12 }, (_, i) => ({ id: 1001 + i, recency: (i * 5) % 12 + 1, prev: (i * 3) % 7, group: ['Mens E-Mail', 'Womens E-Mail', 'No E-Mail'][i % 3], out: i % 4 === 0 ? 'Visited' : 'No visit' }))
export function CustomersPage() {
  const [q, setQ] = useState('')
  const [g, setG] = useState('all')
  const rows = CUST.filter((r) => (g === 'all' || r.group === g) && String(r.id).includes(q.trim()))
  return (
    <>
      <h1>Customers</h1><Note>Illustrative demo records. No predictions are shown.</Note>
      <div className="row filters"><input aria-label="Search customer ID" placeholder="Search customer ID" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filter by group" value={g} onChange={(e) => setG(e.target.value)}><option value="all">All groups</option><option>Mens E-Mail</option><option>Womens E-Mail</option><option>No E-Mail</option></select></div>
      <div className="card scroll"><table><thead><tr><th>Customer ID</th><th>Recency (months)</th><th>Previous purchases</th><th>Treatment group</th><th>Outcome</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td>{r.id}</td><td>{r.recency}</td><td>{r.prev}</td><td>{r.group}</td><td>{r.out}</td></tr>)}</tbody></table>
        {rows.length === 0 && <p className="muted pad">No customers match.</p>}</div>
    </>
  )
}

export function InsightsPage({ plan }) {
  const bars = [['$1', 20], ['$2', 35], ['$5', 60], ['$10', 25]]
  return (
    <>
      <h1>Insights</h1><Note kind="warn">Demo figures only. They are not results from a model.</Note>
      <div className="cols">
        <Card title="Budget summary"><p>Planned budget: <b>${Number(plan.budget || 0).toLocaleString('en-US')}</b></p><p>Coupon types selected: <b>{plan.types.length ? plan.types.map((t) => '$' + t).join(', ') : 'none'}</b></p></Card>
        <Card title="Coupon distribution (demo)">{bars.map(([k, v]) => <div className="bar" key={k}><span>{k}</span><i style={{ width: v + '%' }} /><em>{v}%</em></div>)}</Card>
      </div>
    </>
  )
}

export function SettingsPage({ compact, setCompact, reset }) {
  const [ask, setAsk] = useState(false)
  return (
    <>
      <h1>Settings</h1>
      <Card title="Interface"><label className="row"><input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} /> Compact spacing</label></Card>
      <Card title="Reset"><p className="muted">Clears the selected file, the discount plan and the dataset choice. Frontend only.</p><button className="btn" onClick={() => setAsk(true)}>Reset everything</button></Card>
      {ask && <Modal title="Reset everything?" onClose={() => setAsk(false)}><p>This clears your file and plan in this browser tab.</p>
        <button className="btn primary" onClick={() => { reset(); setAsk(false) }}>Yes, reset</button></Modal>}
    </>
  )
}
