import { formatCurrency, formatNumber } from "./format.js";

function countLabel(value, singular, plural = `${singular}s`) {
  return `${formatNumber(value)} ${value === 1 ? singular : plural}`;
}

function formatEstimatedPurchases(value) {
  if (Math.abs(value) < 10) return value.toFixed(1);
  return formatNumber(Math.round(value));
}

export function buildPlanSummary(summary, valuePerConversion) {
  const {
    total_cost: totalCost,
    blanket_mens_cost: blanketMensCost,
    cost_saving_vs_blanket_mens: costSaving,
    mens_emails: mensEmails,
    womens_emails: womensEmails,
    n_persuadables: selected,
    n_customers: customers,
    total_expected_revenue: expectedRevenue,
  } = summary;
  const notSelected = customers - selected;
  const selectedPercent = customers > 0 ? (selected / customers) * 100 : 0;
  const sentEmails = mensEmails + womensEmails;
  const estimatedPurchases = valuePerConversion > 0 ? expectedRevenue / valuePerConversion : 0;
  const purchaseCount = formatEstimatedPurchases(estimatedPurchases);

  const costSentence = costSaving >= 0
    ? `This plan costs ${formatCurrency(totalCost)} instead of ${formatCurrency(blanketMensCost)} for sending a Mens e-mail to everyone, saving ${formatCurrency(costSaving)}.`
    : `This plan costs ${formatCurrency(totalCost)}, which is ${formatCurrency(Math.abs(costSaving))} more than the ${formatCurrency(blanketMensCost)} it would cost to send a Mens e-mail to everyone.`;
  const allocationSentence = sentEmails === 0
    ? `No customers were selected and nothing is spent; ${formatNumber(notSelected)} ${notSelected === 1 ? "customer remains" : "customers remain"} without an e-mail.`
    : `It sends ${countLabel(mensEmails, "Mens e-mail")} and ${countLabel(womensEmails, "Womens e-mail")} to ${formatNumber(selected)} of ${formatNumber(customers)} ${customers === 1 ? "customer" : "customers"} (${selectedPercent.toFixed(1)}%), and leaves the other ${formatNumber(notSelected)} without an e-mail.`;
  const purchaseSentence = `The model estimates about ${purchaseCount} extra ${Number(purchaseCount.replace(/,/g, "")) === 1 ? "purchase" : "purchases"} (about ${formatCurrency(expectedRevenue)} in extra revenue at ${formatCurrency(valuePerConversion)} per conversion).`;

  return [
    costSentence,
    allocationSentence,
    purchaseSentence,
    "These figures are model estimates based on your cost and revenue assumptions. See the Insights tab for how strongly the held-out experiment supports the model's ranking.",
  ];
}
