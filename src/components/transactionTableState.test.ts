import { Transaction } from "../models/Transaction";
import { filterTransactions, readTablePreferences, saveTablePreferences, TablePreferences } from "./transactionTableState";
const defaults: TablePreferences = { sortModel: [{ field: "transactionDate", sort: "desc" }], pageSize: 10, visibility: {}, widths: {}, density: "standard" };
const rows = [
  { id: "1", transactionDate: "2026-01-01", activity: { name: "Buy" }, account: { id: "a", code: "TFSA" }, stock: { id: "s" } },
  { id: "2", transactionDate: "2026-01-31", activity: { name: "Sell" }, account: { id: "a", code: "TFSA" }, stock: { id: "s" } },
  { id: "3", transactionDate: "2026-02-01", activity: { name: "Contribution" }, account: { id: "b", code: "RRSP" } },
] as unknown as Transaction[];
beforeEach(() => localStorage.clear());
test("date boundaries are inclusive and activity, account, and stock filters combine", () => {
  expect(filterTransactions(rows, { start: "2026-01-01", end: "2026-01-31" }).map(row => row.id)).toEqual(["1", "2"]);
  expect(filterTransactions(rows, { activity: "Sell", account: "a", stock: "s" }).map(row => row.id)).toEqual(["2"]);
  expect(filterTransactions(rows, { stock: "__no_stock__" }).map(row => row.id)).toEqual(["3"]);
  expect(filterTransactions(rows, { account: "b", stock: "s" })).toEqual([]);
  expect(filterTransactions(rows, {})).toHaveLength(3);
});
test("all preferences persist per view without storing transaction data", () => {
  const preferences: TablePreferences = { sortModel: [{ field: "total", sort: "asc" }], pageSize: 50, visibility: { description: false }, widths: { stock: 410 }, density: "compact" };
  saveTablePreferences("stocks", preferences);
  expect(readTablePreferences("stocks", defaults)).toEqual(preferences);
  expect(readTablePreferences("accounts", defaults)).toEqual(defaults);
});
test("invalid saved preferences fall back safely", () => {
  localStorage.setItem("test", "broken JSON");
  expect(readTablePreferences("test", defaults)).toEqual(defaults);
  localStorage.setItem("test", JSON.stringify({ pageSize: 999, density: "bad", sortModel: [{ field: "stock", sort: "bad" }], visibility: { total: false, fee: "invalid" }, widths: { stock: -1, total: 120 } }));
  expect(readTablePreferences("test", defaults)).toEqual({ ...defaults, visibility: { total: false }, widths: { total: 120 } });
});
