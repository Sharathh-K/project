import { useRef, useState } from 'react'
import './App.css'

const REQUIRED = ['recency', 'history', 'mens', 'womens', 'zip_code', 'newbie', 'channel', 'segment', 'visit', 'conversion', 'spend']
const COUPONS = [1, 2, 5, 10]
const MAX_MB = 20

// Sample output until the model/API is connected
const MOCK = [
  { id: 101, orders: 5, total: 1000, type: 'Sure thing', discount: 0 },
  { id: 102, orders: 2, total: 500, type: 'Persuadable', discount: 5 },
  { id: 103, orders: 9, total: 1200, type: 'Persuadable', discount: 10 },
  { id: 104, orders: 0, total: 0, type: 'Lost cause', discount: 0 },
]

const money = (n) => '$' + Number(n).toLocaleString('en-US')

function splitLine(line) {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length < 2) return { columns: [], rows: [] }
  const columns = splitLine(lines[0]).map((c) => c.trim())
  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line)
    const row = {}
    columns.forEach((c, i) => {
      row[c] = (cells[i] ?? '').trim()
    })
    return row
  })
  return { columns, rows }
}

function Dag() {
  return (
    <svg viewBox="0 0 440 230" width="100%" role="img" aria-label="Causal graph: customer features affect the email offer and the visit; the email offer affects the visit">
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#4a5b73" />
        </marker>
      </defs>
      <line x1="190" y1="68" x2="105" y2="148" stroke="#4a5b73" strokeWidth="2" markerEnd="url(#arrow)" />
      <line x1="250" y1="68" x2="335" y2="148" stroke="#4a5b73" strokeWidth="2" markerEnd="url(#arrow)" />
      <line x1="160" y1="182" x2="278" y2="182" stroke="#0e9f8e" strokeWidth="3" markerEnd="url(#arrow)" />
      <rect x="130" y="22" width="180" height="46" rx="10" fill="#e8eef7" stroke="#9fb3cc" />
      <text x="220" y="43" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0b1f3a">Customer features</text>
      <text x="220" y="59" textAnchor="middle" fontSize="11" fill="#4a5b73">recency, history, channel</text>
      <rect x="20" y="150" width="140" height="64" rx="10" fill="#fff3d6" stroke="#e3b341" />
      <text x="90" y="178" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0b1f3a">Email offer</text>
      <text x="90" y="196" textAnchor="middle" fontSize="11" fill="#4a5b73">treatment</text>
      <rect x="280" y="150" width="140" height="64" rx="10" fill="#d9f2ee" stroke="#0e9f8e" />
      <text x="350" y="178" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0b1f3a">Visit / purchase</text>
      <text x="350" y="196" textAnchor="middle" fontSize="11" fill="#4a5b73">outcome</text>
    </svg>
  )
}

export default function App() {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [data, setData] = useState(null)
  const [fileError, setFileError] = useState('')
  const [budget, setBudget] = useState('5000')
  const [couponCount, setCouponCount] = useState('auto')
  const [couponTypes, setCouponTypes] = useState([5, 10])
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)

  const budgetNum = Number(budget)
  const budgetOk = budget !== '' && Number.isFinite(budgetNum) && budgetNum > 0

  async function handleFile(file) {
    setFileError('')
    setResults(null)
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setData(null)
      setFileError('Please choose a .csv file.')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setData(null)
      setFileError('File is larger than ' + MAX_MB + ' MB.')
      return
    }
    try {
      const text = await file.text()
      const { columns, rows } = parseCSV(text)
      if (rows.length === 0) {
        setData(null)
        setFileError('The file has no data rows.')
        return
      }
      const missing = REQUIRED.filter((c) => !columns.includes(c))
      if (missing.length > 0) {
        setData(null)
        setFileError('Missing columns: ' + missing.join(', '))
        return
      }
      const groups = {}
      rows.forEach((r) => {
        groups[r.segment] = (groups[r.segment] || 0) + 1
      })
      setData({ name: file.name, total: rows.length, columns, groups, preview: rows.slice(0, 5) })
    } catch (e) {
      setData(null)
      setFileError('Could not read this file.')
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  function toggleCoupon(v) {
    setCouponTypes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v].sort((a, b) => a - b)))
  }

  function onSearch(e) {
    e.preventDefault()
    if (!data || !budgetOk) return
    setLoading(true)
    setTimeout(() => {
      setResults(MOCK)
      setLoading(false)
    }, 700)
  }

  function downloadCSV() {
    const header = 'customer_id,order_count,total_spend,customer_type,discount'
    const lines = results.map((r) => [r.id, r.orders, r.total, r.type, r.discount].join(','))
    const blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'econocausal_results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page">
      <header className="top">
        <div>
          <h1 className="brand">Econo<span>Causal</span></h1>
          <p className="tag">Find the customers who buy only because of the offer, and spend your discount budget on them.</p>
        </div>
        <div className="pill">Dataset: Hillstrom email test</div>
      </header>

      <div className="grid">
        <div className="col">
          <section className="card">
            <h2>1. Upload your data</h2>
            <p className="sub">CSV with customer details, the offer sent, and the outcome.</p>
            <div
              className={'drop' + (dragOver ? ' over' : '')}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <div className="big">Drop your file here</div>
              <div className="small">or</div>
              <button type="button" className="btn-outline" onClick={() => inputRef.current.click()}>Browse files</button>
              <input ref={inputRef} type="file" accept=".csv" hidden onChange={(e) => handleFile(e.target.files[0])} />
              <div className="small">CSV only, up to {MAX_MB} MB</div>
            </div>
            {fileError && <p className="error" role="alert">{fileError}</p>}
            {data && <p className="ok">Loaded {data.name}: {data.total.toLocaleString('en-US')} rows</p>}
          </section>

          <section className="card">
            <h2>Causal graph (DAG)</h2>
            <p className="sub">How the factors affect each other. Arrows show cause and effect.</p>
            <Dag />
          </section>
        </div>

        <form className="card" onSubmit={onSearch}>
          <h2>2. Set your discount plan</h2>
          <p className="sub">The model decides who gets which coupon within your budget.</p>

          <div className="field">
            <label htmlFor="budget">Total discount budget ($)</label>
            <input id="budget" type="number" min="1" step="1" value={budget} onChange={(e) => setBudget(e.target.value)} />
            {!budgetOk && <span className="error">Enter a budget greater than 0.</span>}
          </div>

          <div className="field">
            <label htmlFor="coupons">Number of coupons <span className="opt">(optional)</span></label>
            <select id="coupons" value={couponCount} onChange={(e) => setCouponCount(e.target.value)}>
              <option value="auto">Let the model decide</option>
              <option value="500">500</option>
              <option value="1000">1,000</option>
              <option value="2000">2,000</option>
            </select>
          </div>

          <div className="field">
            <span className="lab">Coupon types <span className="opt">(optional, pick any)</span></span>
            <div className="chips">
              {COUPONS.map((v) => (
                <button type="button" key={v} aria-pressed={couponTypes.includes(v)} className={'chip' + (couponTypes.includes(v) ? ' on' : '')} onClick={() => toggleCoupon(v)}>
                  ${v}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-main" disabled={!data || !budgetOk || loading}>
            {loading ? 'Searching...' : 'Search best customers'}
          </button>
          {!data && <p className="note">Upload a CSV first to enable the search.</p>}
          <p className="note">Coupon values are cost assumptions. The effect is learned from the email test data, not from coupons.</p>
        </form>
      </div>

      {data && (
        <section className="card">
          <h2>Your data</h2>
          <p className="sub">Quick check of the uploaded file.</p>
          <div className="stats">
            <div className="stat"><b>{data.total.toLocaleString('en-US')}</b>rows</div>
            <div className="stat"><b>{data.columns.length}</b>columns</div>
            {Object.entries(data.groups).map(([k, v]) => (
              <div className="stat" key={k}><b>{v.toLocaleString('en-US')}</b>{k}</div>
            ))}
          </div>
          <div className="scroll">
            <table>
              <thead>
                <tr>{data.columns.map((c) => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {data.preview.map((r, i) => (
                  <tr key={i}>{data.columns.map((c) => <td key={c}>{r[c]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {results && (
        <section className="card">
          <div className="res-head">
            <div>
              <h2>Result</h2>
              <p className="sub" style={{ margin: 0 }}>Budget entered: {money(budgetNum)}. Coupon types: {couponTypes.length ? couponTypes.map((c) => '$' + c).join(', ') : 'none selected'}.</p>
            </div>
            <button type="button" className="btn-outline" onClick={downloadCSV}>Download CSV</button>
          </div>
          <div className="banner">Sample rows only. These become real results once the DML model and API are connected.</div>
          <div className="scroll">
            <table>
              <thead>
                <tr><th>Customer ID</th><th>Order count</th><th>Total spend</th><th>Customer type</th><th>Discount</th></tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.orders}</td>
                    <td>{money(r.total)}</td>
                    <td><span className={'badge' + (r.type === 'Persuadable' ? ' p' : '')}>{r.type}</span></td>
                    <td><b>{money(r.discount)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
