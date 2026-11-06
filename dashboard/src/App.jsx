import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { getHealth } from "./api.js";
import Planner from "./pages/Planner.jsx";
import Sidebar, { StatusBadge } from "./components/Sidebar.jsx";
import { formatCurrency, formatNumber } from "./format.js";
import DataQualityReport from "./components/DataQualityReport.jsx";
import WorkflowStatus from "./components/WorkflowStatus.jsx";
import PlanSnapshot from "./components/PlanSnapshot.jsx";
import Workspace from "./pages/Workspace.jsx";

const EvaluationCurves = lazy(() => import("./components/EvaluationCurves.jsx"));

const INITIAL_SETTINGS = {
  budget: "1600",
  costMens: "0.10",
  costWomens: "0.15",
  valuePerConversion: "113.83",
};

const PAGE_DETAILS = {
  overview: {
    breadcrumb: "Data overview",
    eyebrow: "CUSTOMER DATA OVERVIEW",
    title: "Review your customer data and latest plan.",
    description: "Check upload quality, workflow status, drift, and a snapshot of your most recent campaign plan.",
  },
  planner: {
    breadcrumb: "Campaign planner",
    eyebrow: "CAMPAIGN WORKSPACE",
    title: "Make every campaign dollar count.",
    description: "Upload your customer data, set your budget, and build an e-mail plan from estimated incremental impact.",
  },
  workspace: {
    breadcrumb: "Campaign tools",
    eyebrow: "CAMPAIGN DECISION WORKSPACE",
    title: "Explore customers, budgets, and segments.",
    description: "Compare model estimates for an individual customer, test budget limits, and review descriptive segment summaries.",
  },
  insights: {
    breadcrumb: "Insights",
    eyebrow: "EXPERIMENTAL EVALUATION",
    title: "See how uplift ranking performs.",
    description: "Compare treatment-effect rankings with observed outcomes in the held-out randomized experiment.",
  },
  methodology: {
    breadcrumb: "Methodology",
    eyebrow: "HOW TO INTERPRET RESULTS",
    title: "Understand the estimates behind your plan.",
    description: "The dashboard combines a causal model with a budget-constrained optimizer to support campaign planning.",
  },
};

function PageIntro({ activeTab }) {
  const details = PAGE_DETAILS[activeTab];
  return (
    <section className="page-intro">
      <div>
        <p className="eyebrow">{details.eyebrow}</p>
        <h1>{details.title}</h1>
        <p className="intro-copy">{details.description}</p>
      </div>
      {activeTab === "planner" && (
        <div className="intro-stat">
          <span className="stat-icon">↗</span>
          <div>
            <span className="stat-label">Optimization objective</span>
            <strong>Maximize expected revenue</strong>
          </div>
        </div>
      )}
    </section>
  );
}

function Overview({ customers, result, drift, quality, exported, onOpenPlanner, onOpenInsights }) {
  const summary = result?.data?.summary;
  const driftLabel = drift.status === "checking"
    ? "Checking..."
    : drift.status === "unavailable"
      ? "Unavailable"
      : drift.status === "done"
        ? drift.data.status.replaceAll("_", " ")
        : customers.length
          ? "Not checked"
          : "—";
  const driftDescription = drift.status === "done"
    ? `${formatNumber(drift.data.n_rows)} rows compared with training data`
    : drift.status === "unavailable"
      ? drift.error
      : "Runs after a customer CSV is uploaded";
  return (
    <section className="overview-page">
      <div className="overview-card-grid">
        <article className="overview-card">
          <span className="result-label">Customer upload</span>
          <strong>{formatNumber(customers.length)}</strong>
          <span>validated customer rows</span>
        </article>
        <article className="overview-card">
          <span className="result-label">Latest plan</span>
          <strong>{summary ? formatNumber(summary.n_persuadables) : "—"}</strong>
          <span>{summary ? "customers selected for an e-mail" : "Run an optimization to see results"}</span>
        </article>
        <article className="overview-card">
          <span className="result-label">Latest estimated extra revenue</span>
          <strong>{summary ? formatCurrency(summary.total_expected_revenue) : "—"}</strong>
          <span>Model estimate, not a guarantee</span>
        </article>
        <article className="overview-card">
          <span className="result-label">Data drift check</span>
          <strong>{driftLabel}</strong>
          <span>{driftDescription}</span>
        </article>
      </div>
      <DataQualityReport quality={quality} onOpenPlanner={onOpenPlanner} />
      <WorkflowStatus
        customers={customers}
        quality={quality}
        drift={drift}
        result={result}
        exported={exported}
      />
      <PlanSnapshot
        result={result}
        onOpenPlanner={onOpenPlanner}
        onOpenInsights={onOpenInsights}
      />
      <div className="overview-callout">
        <div>
          <h2>Ready to plan a campaign?</h2>
          <p>Upload a CSV and set the budget and unit-cost assumptions for your campaign.</p>
        </div>
        <button type="button" className="button button-primary" onClick={onOpenPlanner}>
          Open campaign planner <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}

function Methodology() {
  return (
    <section className="methodology-page">
      <article className="methodology-card">
        <span className="method-icon">↗</span>
        <div>
          <h2>How the campaign optimizer works</h2>
          <p>
            The API estimates each customer’s incremental response to Mens and Womens e-mail.
            It then assigns at most one e-mail per customer to maximize estimated extra revenue
            while keeping total cost within the budget.
          </p>
        </div>
      </article>
      <div className="methodology-grid">
        <article className="aside-card">
          <p className="eyebrow">01 · CAUSAL ESTIMATES</p>
          <h3>Incremental, not just predictive</h3>
          <p className="methodology-copy">
            Uplift estimates describe how a treatment is expected to change purchase probability
            compared with no e-mail. They are model estimates, not guaranteed individual outcomes.
          </p>
        </article>
        <article className="aside-card">
          <p className="eyebrow">02 · BUDGET CONSTRAINT</p>
          <h3>One arm or no e-mail</h3>
          <p className="methodology-copy">
            The linear optimizer chooses a Mens e-mail, a Womens e-mail, or no e-mail for each
            customer, subject to your total budget and the per-arm costs you provide.
          </p>
        </article>
        <article className="aside-card">
          <p className="eyebrow">03 · RESPONSIBLE INTERPRETATION</p>
          <h3>Assumptions are not findings</h3>
          <p className="methodology-copy">
            Revenue per conversion and e-mail costs are user-provided assumptions. Predicted
            revenue is not proof that uplift targeting outperforms random targeting.
          </p>
        </article>
      </div>
      <a className="methodology-api-link" href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer">
        Open API documentation <span aria-hidden="true">↗</span>
      </a>
    </section>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("planner");
  const [theme, setTheme] = useState("dark");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [result, setResult] = useState(null);
  const [drift, setDrift] = useState({ status: "idle", data: null, error: "" });
  const [quality, setQuality] = useState(null);
  const [exported, setExported] = useState(false);
  const budgetEditedRef = useRef(false);
  const [apiOnline, setApiOnline] = useState(false);
  const [apiError, setApiError] = useState("");
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  async function refreshApi() {
    setHealthLoading(true);
    try {
      const data = await getHealth();
      setHealth(data);
      setApiOnline(true);
      setApiError("");
    } catch (error) {
      setApiOnline(false);
      setApiError(error.message);
    } finally {
      setHealthLoading(false);
    }
  }

  useEffect(() => {
    refreshApi();
  }, []);

  function changeTab(tab) {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openDataQuality() {
    changeTab("overview");
    window.setTimeout(() => {
      document.getElementById("data-quality-report")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  const pageDetails = PAGE_DETAILS[activeTab];
  const isDark = theme === "dark";
  const shellClassName = `app-shell theme-${theme}${sidebarCollapsed ? " sidebar-collapsed" : ""}`;

  return (
    <div className={shellClassName}>
      <Sidebar
        activeTab={activeTab}
        onTabChange={changeTab}
        apiOnline={apiOnline}
        collapsed={sidebarCollapsed}
      />

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">EconoCausal <span>/</span> {pageDetails.breadcrumb}</div>
          <div className="topbar-right">
            <button
              type="button"
              className="menu-toggle"
              onClick={() => setSidebarCollapsed((current) => !current)}
              aria-controls="primary-sidebar"
              aria-expanded={!sidebarCollapsed}
              aria-label={sidebarCollapsed ? "Show navigation menu" : "Hide navigation menu"}
              title={sidebarCollapsed ? "Show navigation menu" : "Hide navigation menu"}
            >
              <span aria-hidden="true">{sidebarCollapsed ? "☰" : "×"}</span>
              <span className="menu-toggle-label">{sidebarCollapsed ? "Show menu" : "Hide menu"}</span>
            </button>
            <span className="environment-label">Hillstrom experiment</span>
            <StatusBadge online={apiOnline} />
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
              aria-pressed={isDark}
            >
              <span aria-hidden="true">{isDark ? "☼" : "☾"}</span>
              {isDark ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </header>

        <div className="page-content">
          <PageIntro activeTab={activeTab} />

          <div hidden={activeTab !== "overview"}>
            <Overview
              customers={customers}
              result={result}
              drift={drift}
              quality={quality}
              exported={exported}
              onOpenPlanner={() => changeTab("planner")}
              onOpenInsights={() => changeTab("insights")}
            />
          </div>

          <div hidden={activeTab !== "planner"}>
            <Planner
              customers={customers}
              setCustomers={setCustomers}
              settings={settings}
              setSettings={setSettings}
              budgetEditedRef={budgetEditedRef}
              result={result}
              setResult={setResult}
              drift={drift}
              setDrift={setDrift}
              setQuality={setQuality}
              onExported={setExported}
              apiOnline={apiOnline}
              apiError={apiError}
              health={health}
              healthLoading={healthLoading}
              onRetry={refreshApi}
              onOpenDataOverview={openDataQuality}
            />
          </div>

          <div hidden={activeTab !== "workspace"}>
            <Workspace
              customers={customers}
              settings={settings}
              result={result}
              apiOnline={apiOnline}
              isDark={isDark}
              onOpenPlanner={() => changeTab("planner")}
            />
          </div>

          <div hidden={activeTab !== "methodology"}>
            <Methodology />
          </div>

          <div hidden={activeTab !== "insights"}>
            <Suspense fallback={<div className="evaluation-message">Loading chart tools…</div>}>
              <EvaluationCurves active={activeTab === "insights"} isDark={isDark} />
            </Suspense>
          </div>

          <footer className="page-footer">
            EconoCausal <span>·</span> Decision support from causal estimates, not a guarantee of individual outcomes.
          </footer>
        </div>
      </main>
    </div>
  );
}
