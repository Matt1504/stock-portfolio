import { TransactionForm } from "../../models/Transaction";

export const cashActivities = ["Contribution", "Withdrawal", "Service Fee", "SEC Fee", "ETF Rebate", "Transfer In", "Transfer Out", "Adjustment"];

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
