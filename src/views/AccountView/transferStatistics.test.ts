import { Transaction } from "../../models/Transaction";
import { calculateCashBalance } from "./cashBalance";
import { portfolioStatistics } from "./portfolioStatistics";
import { stockStatistics } from "../MyStocksView/statistics";

const row = (id: string, activity: string, platform: string, shares: number, total: number, date = "2026-01-01") => ({
  id, activity: { name: activity }, platform: { id: platform, name: platform, currency: { code: "CAD" } },
  account: { code: "TFSA" }, stock: { id: "stock", ticker: "EX", asset: { name: "Stock" } },
  transactionDate: date, shares, total,
} as unknown as Transaction);
const buy = row("01", "Buy", "source", 10, 1010);
const out = row("02", "Transfer Out", "source", 10, 1010, "2026-02-01");
const incoming = row("03", "Transfer In", "target", 10, 1010, "2026-02-01");

test("an in-kind transfer preserves portfolio basis and generates neither cash nor profit", () => {
  const history = [buy, out, incoming];
  expect(portfolioStatistics(history).holdings.totalBookCost).toBe(1010);
  expect(portfolioStatistics(history).realizedProfit).toBe(0);
  expect(portfolioStatistics([buy, out]).holdings.totalBookCost).toBe(0);
  expect(portfolioStatistics([incoming]).holdings.totalBookCost).toBe(1010);
  expect(calculateCashBalance([out, incoming])).toBe(0);
});

test("a sale at the receiving platform realizes gain using carried purchase cost including buy fees", () => {
  const sell = row("04", "Sell", "target", 4, 500, "2026-03-01");
  const target = portfolioStatistics([sell, incoming]);
  expect(target.holdings.realizedGain).toBeCloseTo(96);
  expect(target.realizedProfit).toBeCloseTo(96);
  expect(target.holdings.totalBookCost).toBeCloseTo(606);
  const history = [sell, incoming, out, buy];
  expect(portfolioStatistics(history).holdings.realizedGain).toBeCloseTo(96);
  expect(stockStatistics(history, "Stock", "stock").details.find(d => d.title === "Realized Profit/Loss")?.value).toBeCloseTo(96);
});

test("existing destination holdings combine with transferred shares using weighted average cost", () => {
  const existing = row("00", "Buy", "target", 10, 2000);
  const sell = row("04", "Sell", "target", 4, 700, "2026-03-01");
  expect(portfolioStatistics([incoming, sell, existing]).holdings.realizedGain).toBeCloseTo(98);
  expect(portfolioStatistics([incoming, sell, existing]).holdings.totalBookCost).toBeCloseTo(2408);
});

test("historical realized gains and dividends remain at source, transfers do not move or duplicate them", () => {
  const history = [buy, row("02", "Sell", "source", 2, 300), row("03", "Dividends", "source", 0, 20),
    row("04", "Transfer Out", "source", 8, 808, "2026-02-01"), row("05", "Transfer In", "target", 8, 808, "2026-02-01")];
  expect(portfolioStatistics(history.filter(r => r.platform.id === "source")).realizedProfit).toBeCloseTo(118);
  expect(portfolioStatistics(history.filter(r => r.platform.id === "target")).realizedProfit).toBe(0);
  expect(portfolioStatistics(history).realizedProfit).toBeCloseTo(118);
});

test("cash transfer legs change cash and deposits but not profit or contributions", () => {
  const cashOut = { ...out, stock: undefined, shares: undefined, total: 100 };
  const cashIn = { ...incoming, stock: undefined, shares: undefined, total: 100 };
  expect(calculateCashBalance([cashOut])).toBe(-100);
  expect(calculateCashBalance([cashIn])).toBe(100);
  expect(portfolioStatistics([cashOut, cashIn]).realizedProfit).toBe(0);
  expect(portfolioStatistics([cashOut, cashIn]).netDeposits).toBe(0);
  expect(portfolioStatistics([cashOut, cashIn]).contributions).toBe(0);
});

test("same-day purchase and sale use backend creation order regardless of API result order", () => {
  const sale = row("02", "Sell", "source", 4, 500);
  const result = portfolioStatistics([sale, buy]);
  expect(result.holdings.realizedGain).toBeCloseTo(96);
  expect(result.holdings.totalBookCost).toBeCloseTo(606);
  expect(result.holdings.bookCostAfterTransaction.get("02")).toBeCloseTo(606);
});
