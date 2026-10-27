import { TransactionForm } from "../models/Transaction";

// Presentation rules shared by add, edit and bulk-edit forms. Financial validation
// remains on the backend; these policies only control field visibility/payloads.
export const cashActivities: readonly string[] = ["Contribution", "Withdrawal", "Service Fee", "SEC Fee", "ETF Rebate", "Fee Reimbursement", "Transfer In", "Transfer Out", "Adjustment"];

const optionalStockActivities: readonly string[] = ["Interest", "Stock Lending", "Withholding Tax"];

export function stockFieldPolicy(activity: string): "hidden" | "optional" | "required" {
  if (cashActivities.includes(activity)) return "hidden";
  return optionalStockActivities.includes(activity) ? "optional" : "required";
}

export function clearsStockOnActivityChange(activity: string): boolean {
  return stockFieldPolicy(activity) !== "required" || activity === "GIC Maturity";
}

export function inactiveTransactionFields(activity: string, nonStock = ""): (keyof TransactionForm)[] {
  const fields: (keyof TransactionForm)[] = [];
  if (cashActivities.includes(activity)) fields.push("stock");
  if (!["Buy", "Sell"].includes(activity) || nonStock) fields.push("price", "fee", "priceCurrency", "exchangeRate");
  if (!["Buy", "Sell", "Stock Split", "Stock Spinoff"].includes(activity) || nonStock) fields.push("shares");
  if (nonStock !== "gic") fields.push("rate", "maturity", "maturityDate");
  if (activity !== "GIC Maturity") fields.push("gicPurchase");
  if (nonStock !== "gic" || activity !== "Buy") fields.push("interestCalculation");
  if (activity !== "Stock Spinoff") fields.push("spinoffSource", "allocatedBookCost");
  fields.push("description");
  return fields;
}

export function sanitizeTransactionFields(values: TransactionForm, activity: string, nonStock = ""): TransactionForm {
  const transaction = { ...values };
  delete transaction.shareEntry;
  if (activity === "Stock Spinoff") transaction.total = 0;
  for (const field of inactiveTransactionFields(activity, nonStock)) delete transaction[field];
  return transaction;
}
