import { useState } from 'react'
import './App.css'
import { Icon } from './Icon'
import { Home, DataPage, ModelPage, CustomersPage, AllocationPage, InsightsPage, SettingsPage } from './Pages'

const I = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  data: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6',
  model: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
  customers: 'M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 20v-1a3 3 0 0 0-2-2.8',
  prescription: 'M4 6h16M4 12h16M4 18h10',
  insights: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  settings: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M6 15v4',
}
const NAV = [['home', 'Home'], ['data', 'Data'], ['model', 'Model'], ['customers', 'Customers'], ['prescription', 'Prescription'], ['insights', 'Insights'], ['settings', 'Settings']]
const DATASETS = ['Hillstrom Email Test', 'Retail Promo (demo)', 'Subscription Offer (demo)']
const DEFAULT_PLAN = { budget: '5000', count: 'auto', types: [5, 10] }

export default function App() {
  const [page, setPage] = useState('home')
  const [menu, setMenu] = useState(false)
  const [dataset, setDataset] = useState(DATASETS[0])
  const [file, setFile] = useState(null)
  const [plan, setPlan] = useState(DEFAULT_PLAN)
  const [compact, setCompact] = useState(false)
  const go = (p) => { setPage(p); setMenu(false) }
  const reset = () => { setFile(null); setPlan(DEFAULT_PLAN); setDataset(DATASETS[0]); setCompact(false) }
  const shared = { file, setFile, plan, setPlan, dataset, go }

  return (
    <div className={'shell' + (compact ? ' compact' : '')}>
      <header className="topbar">
        <button className="menu-btn" aria-label="Toggle menu" aria-expanded={menu} onClick={() => setMenu(!menu)}><Icon d="M4 6h16M4 12h16M4 18h10" /></button>
        <div className="brand"><span className="logo-i"><Icon d="M5 19c0-8 5-14 14-14 0 9-6 14-14 14zM5 19l7-7" size={20} /></span>
          <div><b>EconoCausal</b><small>Better decisions. Higher impact.</small></div></div>
        <div className="top-right">
          <label className="ds"><span>Dataset:</span>
            <select value={dataset} onChange={(e) => setDataset(e.target.value)}>{DATASETS.map((d) => <option key={d}>{d}</option>)}</select></label>
          <span className="avatar" title="Profile">AC</span>
        </div>
      </header>
      <div className="body">
        <nav className={'side' + (menu ? ' open' : '')} aria-label="Main">
          {NAV.map(([k, label]) => (
            <button key={k} className={page === k ? 'active' : ''} aria-current={page === k ? 'page' : undefined} onClick={() => go(k)}><Icon d={I[k]} />{label}</button>
          ))}
          <p className="side-note">Smarter marketing with causal AI.</p>
        </nav>
        <main className="main">
          {page === 'home' && <Home {...shared} />}
          {page === 'data' && <DataPage {...shared} />}
          {page === 'model' && <ModelPage />}
          {page === 'customers' && <CustomersPage />}
          {page === 'prescription' && <AllocationPage />}
          {page === 'insights' && <InsightsPage plan={plan} />}
          {page === 'settings' && <SettingsPage compact={compact} setCompact={setCompact} reset={reset} />}
        </main>
      </div>
    </div>
  )
}
