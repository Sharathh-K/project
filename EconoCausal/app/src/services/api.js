// EconoCausal API client. Start the backend first:
//   uvicorn ml.api:app --reload   (run from the repo root)
const BASE = 'http://127.0.0.1:8000'

async function call(path, options) {
  let res
  try {
    res = await fetch(BASE + path, options)
  } catch {
    throw new Error('the API is not running. Start it with: uvicorn ml.api:app --reload')
  }
  if (!res.ok) throw new Error('server error ' + res.status)
  return res.json()
}

const money = (n) => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US')

export async function runAnalysis(plan) {
  const q = new URLSearchParams({ budget: String(plan.budget), types: plan.types.join(',') })
  if (plan.count !== 'auto') q.set('count', String(plan.count))
  const d = await call('/prescribe?' + q.toString(), { method: 'POST' })
  if (d.error) throw new Error(d.error)
  return {
    status: 'ok',
    summary: d,
    message:
      'This strategy gains ' + money(d.net_gain) + ' compared to ' + money(d.blanket_gain) +
      ' for blanket targeting. It uses ' + d.coupons.toLocaleString('en-US') + ' coupons and ' +
      money(d.spent) + ' of your ' + money(d.budget) + ' budget.',
  }
}

export async function checkDrift(file) {
  const form = new FormData()
  form.append('file', file)
  return call('/drift', { method: 'POST', body: form })
    }
