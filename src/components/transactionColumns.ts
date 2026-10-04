import { Transaction } from "../models/Transaction";

const optionalColumnValues: Record<string, (row: Transaction) => unknown> = {
  fee: row => row.fee,
  priceCurrency: row => row.priceCurrency?.code ?? row.platform.currency?.code,
  totalCurrency: row => row.totalCurrency?.code ?? row.platform.currency?.code,
  exchangeRate: row => row.exchangeRate ?? 1,
  rate: row => row.rate,
  maturityDate: row => row.maturityDate,
};

/** Compare effective cell values across the whole filtered result, not one page. */
export function redundantTransactionColumns(rows: Transaction[]): Set<string> {
  return new Set(Object.entries(optionalColumnValues).flatMap(([field, getValue]) => {
    const values = new Set(rows.map(row => {
      const value = getValue(row);
      if (value == null || value === 0 || value === "") return "";
      if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
      return String(value).trim();
    }));
    return values.size <= 1 ? [field] : [];
  }));
}
