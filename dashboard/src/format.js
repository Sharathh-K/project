export function formatCurrency(value, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value ?? 0);
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

export function formatUplift(value) {
  return `${((value ?? 0) * 100).toFixed(2)} pp`;
}

export function defaultBudgetForCustomerCount(customerCount) {
  return (customerCount * 0.025).toFixed(2);
}
