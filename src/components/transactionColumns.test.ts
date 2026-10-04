import { Transaction } from "../models/Transaction";
import { redundantTransactionColumns } from "./transactionColumns";

const row = (extra: object = {}) => ({ platform: { currency: { code: "CAD" } }, ...extra } as Transaction);
const fields = ["fee", "priceCurrency", "totalCurrency", "exchangeRate", "rate", "maturityDate"];

test("empty, zero and null fields and constant default currency/FX columns are removed", () => {
  expect(Array.from(redundantTransactionColumns([row(), row({ fee: 0, rate: 0, maturityDate: "" }), row({ fee: null, rate: null, maturityDate: null })]))).toEqual(fields);
  expect(Array.from(redundantTransactionColumns([]))).toEqual(fields);
});

test("repeated nonzero values also provide no distinguishing information", () => {
  const constant = row({ fee: 5, rate: 3.5, maturityDate: "2027-10-01", exchangeRate: 1.4, priceCurrency: { code: "USD" }, totalCurrency: { code: "CAD" } });
  expect(Array.from(redundantTransactionColumns([constant, constant]))).toEqual(fields);
});

test("a meaningful value mixed with empty values keeps its column", () => {
  const result = redundantTransactionColumns([row(), row({ fee: 1, rate: 3.5, maturityDate: "2027-10-01", exchangeRate: 1.4, priceCurrency: { code: "USD" }, totalCurrency: { code: "USD" } })]);
  expect(result.size).toBe(0);
});

test("legacy currency and FX defaults compare as their displayed values", () => {
  expect(Array.from(redundantTransactionColumns([row(), row({ priceCurrency: { code: "CAD" }, totalCurrency: { code: "CAD" }, exchangeRate: 1 })]))).toEqual(fields);
});

test("variation anywhere in the result keeps columns, including past the first page", () => {
  const rows = Array.from({ length: 11 }, () => row());
  rows[10] = row({ fee: 2, rate: 4, maturityDate: "2027-01-01", priceCurrency: { code: "USD" }, totalCurrency: { code: "USD" }, exchangeRate: 1.35 });
  expect(redundantTransactionColumns(rows).size).toBe(0);
  expect(Array.from(redundantTransactionColumns(rows.slice(0, 10)))).toEqual(fields);
});
