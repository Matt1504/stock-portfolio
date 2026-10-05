import { GridColumnVisibilityModel, GridDensity, GridSortModel } from "@mui/x-data-grid";
import { Transaction } from "../models/Transaction";

export const transactionPageSizes = [25, 50, 100];
export type TransactionPagination = { page: number; pageSize: number };

export type TablePreferences = {
  sortModel: GridSortModel;
  pageSize: number;
  visibility: GridColumnVisibilityModel;
  widths: Record<string, number>;
  density: GridDensity;
};
export type TransactionFilters = { activity?: string; account?: string; stock?: string; start?: string; end?: string };
export function filterTransactions(rows: Transaction[], filters: TransactionFilters) {
  return rows.filter(row => {
    const date = row.transactionDate.toString().slice(0, 10);
    return (!filters.start || date >= filters.start) && (!filters.end || date <= filters.end)
      && (!filters.activity || row.activity.name === filters.activity)
      && (!filters.account || (row.account.id ?? row.account.code) === filters.account)
      && (!filters.stock || (row.stock ? (row.stock.id ?? row.stock.ticker) : "__no_stock__") === filters.stock);
  });
}
export function readTablePreferences(key: string, defaults: TablePreferences): TablePreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null");
    if (!saved || typeof saved !== "object") return defaults;
    return {
      sortModel: Array.isArray(saved.sortModel) && saved.sortModel.every((item: any) => typeof item?.field === "string" && ["asc", "desc"].includes(item.sort)) ? saved.sortModel : defaults.sortModel,
      pageSize: transactionPageSizes.includes(saved.pageSize) ? saved.pageSize : defaults.pageSize,
      density: ["compact", "standard", "comfortable"].includes(saved.density) ? saved.density : defaults.density,
      visibility: saved.visibility && typeof saved.visibility === "object" ? Object.fromEntries(Object.entries(saved.visibility).filter(([, value]) => typeof value === "boolean")) as GridColumnVisibilityModel : {},
      widths: saved.widths && typeof saved.widths === "object" ? Object.fromEntries(Object.entries(saved.widths).filter(([, value]) => typeof value === "number" && value >= 50 && value <= 2000)) as Record<string, number> : {},
    };
  } catch { return defaults; }
}
export function saveTablePreferences(key: string, preferences: TablePreferences) {
  try { localStorage.setItem(key, JSON.stringify(preferences)); } catch {}
}
