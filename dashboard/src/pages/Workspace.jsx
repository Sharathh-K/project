import BudgetScenarios from "../components/BudgetScenarios.jsx";
import CustomerLookup from "../components/CustomerLookup.jsx";
import SegmentSummary from "../components/SegmentSummary.jsx";

export default function Workspace({ customers, settings, result, apiOnline, onOpenPlanner }) {
  return (
    <section className="workspace-page">
      <CustomerLookup apiOnline={apiOnline} />
      <BudgetScenarios
        customers={customers}
        settings={settings}
        result={result}
        apiOnline={apiOnline}
      />
      <SegmentSummary result={result} onOpenPlanner={onOpenPlanner} />
    </section>
  );
}
