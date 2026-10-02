import { TransactionForm } from "../../models/Transaction";

export const cashActivities = ["Contribution", "Withdrawal", "Transfer In", "Transfer Out", "Adjustment"];

export function inactiveTransactionFields(activity: string, nonStock = ""): (keyof TransactionForm)[] {
  const fields: (keyof TransactionForm)[] = [];
  if (cashActivities.includes(activity)) fields.push("stock");
  if (!["Buy", "Sell"].includes(activity) || nonStock) fields.push("price", "fee");
  if (!["Buy", "Sell", "Stock Split"].includes(activity) || nonStock) fields.push("shares");
  if (nonStock !== "gic") fields.push("rate", "maturity", "maturityDate");
  if (activity !== "Adjustment") fields.push("description");
  return fields;
}

export function sanitizeTransactionFields(values: TransactionForm, activity: string, nonStock = ""): TransactionForm {
  const transaction = { ...values };
  for (const field of inactiveTransactionFields(activity, nonStock)) delete transaction[field];
  return transaction;
}
