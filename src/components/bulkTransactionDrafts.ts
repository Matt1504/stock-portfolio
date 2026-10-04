import { Transaction } from "../models/Transaction";
import { tradeTotal } from "../utils/transactionAmounts";

export type TransactionDraft = Record<string, any> & { id: string; activityName: string };
const numberFields = ["price", "shares", "fee", "total", "exchangeRate", "rate", "allocatedBookCost"];
export function transactionDraft(row: Transaction): TransactionDraft {
  const draft: TransactionDraft = {
    id: row.id!, activityName: row.activity.name ?? "", account: row.account.id,
    platform: row.platform.id, stock: row.stock?.id ?? null,
    transactionDate: String(row.transactionDate).slice(0, 10),
    priceCurrency: row.priceCurrency?.id ?? row.platform.currency?.id,
    totalCurrency: row.totalCurrency?.id ?? row.platform.currency?.id,
    maturityDate: row.maturityDate ?? null, spinoffSource: row.spinoffSource?.id ?? null,
    gicPurchase: row.gicPurchase?.id ?? null, interestCalculation: row.interestCalculation ?? "simple",
  };
  numberFields.forEach(field => { draft[field] = (row as any)[field] == null ? null : Number((row as any)[field]); });
  if (!draft.fee) draft.fee = null;
  if (draft.exchangeRate == null) draft.exchangeRate = 1;
  return draft;
}
export function changedDraft(original: TransactionDraft, draft: TransactionDraft) {
  return Object.keys(original).some(field => original[field] !== draft[field]);
}
export function updateDraft(draft: TransactionDraft, field: string, value: any): TransactionDraft {
  const next = { ...draft, [field]: value };
  if (["price", "shares", "fee", "exchangeRate"].includes(field) && ["Buy", "Sell"].includes(next.activityName) && next.shares && next.price != null && next.exchangeRate != null) {
    next.total = tradeTotal(next.price, next.shares, next.exchangeRate, next.fee, next.activityName);
  }
  return next;
}
