export function StatusBadge({ online }) {
  return (
    <span className={`api-badge ${online ? "is-online" : "is-offline"}`}>
      <span className="status-dot" />
      {online ? "API connected" : "API unavailable"}
    </span>
  );
}

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "planner", label: "Campaign planner", icon: "◫" },
  { id: "insights", label: "Insights", icon: "⌁" },
  { id: "methodology", label: "Methodology", icon: "◉" },
];

export default function Sidebar({ activeTab, onTabChange, apiOnline }) {
  return (
    <aside className="sidebar">
      <button
        type="button"
        className="brand"
        aria-label="EconoCausal home"
        onClick={() => onTabChange("overview")}
      >
        <span className="brand-mark">E</span>
        <span className="brand-name">Econo<span>Causal</span></span>
      </button>

      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-link ${activeTab === item.id ? "nav-link-active" : ""}`}
            aria-current={activeTab === item.id ? "page" : undefined}
            onClick={() => onTabChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-note">
          <span className="note-icon">i</span>
          <p>Recommendations are estimates from an experimental campaign model.</p>
        </div>
        <StatusBadge online={apiOnline} />
      </div>
    </aside>
  );
}
