import { Transaction } from "../../models/Transaction";
import { calculateCashBalance } from "./cashBalance";

const tx = (activity: string, total: number, extra: Partial<Transaction> = {}) => ({
  activity: { name: activity }, total, ...extra,
} as Transaction);

test("reinvesting sale proceeds changes cash without treating principal as profit", () => {
  expect(calculateCashBalance([tx("Contribution", 100), tx("Buy", 100), tx("Sell", 150), tx("Buy", 120)])).toBe(30);
});

test("all income, expenses, withdrawals and cash transfers affect cash once", () => {
  expect(calculateCashBalance([
    tx("Contribution", 1000), tx("Transfer In", 500), tx("Sell", 150, { fee: 1 }),
    tx("Dividends", 20), tx("Interest", 5), tx("ETF Rebate", 2),
    tx("Buy", 202, { fee: 2 }), tx("Transfer Out", 200), tx("Withdrawal", 100),
    tx("Withholding Tax", 3, { stock: { __typename: "StockType", id: "stock" } }), tx("Withholding Tax", 30),
    tx("Service Fee", 4),
  ])).toBe(1138);
});

test("GICs use gross payouts and deduct separately recorded fees", () => {
  const stock = { __typename: "StockType", id: "gic", asset: { id: "gic-asset", name: "GIC" } };
  expect(calculateCashBalance([
    tx("Contribution", 10000), tx("Buy", 10000, { stock, fee: 5 }),
    tx("GIC Maturity", 10400, { stock, principalReturned: 10000, interestEarned: 400, fee: 10 }),
    tx("Withholding Tax", 60, { stock }),
  ])).toBe(10325);
});

test("share transfers, splits and spinoffs do not move cash", () => {
  expect(calculateCashBalance([
    tx("Contribution", 100), tx("Stock Split", 0, { shares: 4 }),
    tx("Stock Spinoff", 0, { shares: 1, allocatedBookCost: 77.60 }),
    tx("Transfer In", 500, { shares: 2 }), tx("Transfer Out", 300, { shares: 1 }),
  ])).toBe(100);
});

test("settlement totals already include FX and trading fees", () => {
  expect(calculateCashBalance([
    tx("Contribution", 5000),
    tx("Buy", 4978.49, { price: 116.56, shares: 30.7698, exchangeRate: 1.390618, fee: 1 }),
  ])).toBe(21.51);
});

test("empty history starts at zero and missing cash history can be negative", () => {
  expect(calculateCashBalance([])).toBe(0);
  expect(calculateCashBalance([tx("Buy", 100)])).toBe(-100);
  expect(calculateCashBalance([tx("Interest", 0.1), tx("Interest", 0.2)])).toBe(0.3);
});

test("SEC fees are account cash expenses deducted once", () => {
  expect(calculateCashBalance([tx("Contribution", 100), tx("Service Fee", 2), tx("SEC Fee", 0.03)])).toBe(97.97);
});
