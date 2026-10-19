// All future backend calls live here. Nothing is sent anywhere until VITE_API_URL is set.
const API_URL = import.meta.env.VITE_API_URL || ''

export async function runAnalysis(plan, file) {
  if (!API_URL) return { status: 'pending', message: 'Backend integration pending. No model was run and no data left your browser.' }
  const form = new FormData()
  form.append('file', file)
  form.append('budget', String(plan.budget))
  form.append('coupon_count', plan.count)
  form.append('coupon_types', plan.types.join(','))
  const res = await fetch(API_URL + '/recommend', { method: 'POST', body: form })
  if (!res.ok) throw new Error('Server answered ' + res.status)
  return { status: 'done', data: await res.json() }
}
