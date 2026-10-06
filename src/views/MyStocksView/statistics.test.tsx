import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { fireEvent, render, screen } from "@testing-library/react";
import { Transaction } from "../../models/Transaction";
import SelectedStockInfo from "./SelectedStockInfo";
import { TRANSACTIONS_BY_STOCK } from "./gql";
import { stockStatistics } from "./statistics";

jest.mock("../../components/TransactionDataGrid", () => ({ TransactionDataGrid: () => null }));
jest.mock("recharts", () => ({ ...jest.requireActual("recharts"), ResponsiveContainer: () => null }));
function tx(id: string, name: string, shares: number, total: number, date: string, fee = 0): Transaction {
  return { transferBatch: null, spinoffSource: null, allocatedBookCost: null, priceCurrency: null, totalCurrency: null, exchangeRate: 1, principalReturned: null, interestEarned: null, interestCalculation: "simple", gicPurchase: null, id, activity: { name }, shares, total, fee, price: 10, transactionDate: date,
    stock: { currency: null, id: "stock", name: "Example", ticker: "EX", asset: { id: "asset", name: "Stock" } }, account: { id: "account", code: "TFSA" },
    platform: { id: "broker", name: "Broker", currency: { id: "usd", code: "USD" } }, rate: null, maturityDate: null,
  } as unknown as Transaction;
}
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", { writable: true, value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }) });
});
const transactions = [
  tx("1", "Buy", 10, 102, "2025-01-01", 2),
  tx("2", "Stock Split", 10, 0, "2025-02-01"),
  tx("3", "Sell", 5, 50, "2026-01-01", 1),
  tx("4", "Dividends", 0, 20, "2025-01-02"),
  tx("5", "Dividends", 0, 30, "2026-02-01"),
  tx("6", "Withholding Tax", 0, 5, "2026-02-01"),
];
test("remaining cost, realized profit and lifetime quantities reflect sales and splits", () => {
  const { details } = stockStatistics(transactions);
  const values = Object.fromEntries(details.map(detail => [detail.title, detail.value]));
  expect(values).toEqual({ "Share(s) Owned": 15, "Book Cost": 76.5, "Average Cost per Share": 5.1,
    "Realized Gain/Loss": 24.5, "Dividends/Interest Earned": 45, "Total Invested": 102,
    "Sale Proceeds": 50, "Realized Profit/Loss": 69.5, "Total Shares Bought": 10, "Total Shares Sold": 5, "Total Fees Paid": 3, "Last Buy Date": "2025-01-01", "Last Sell Date": "2026-01-01" });
});
test("empty positions have no average cost or last buy, oversold positions have no realized gain", () => {
  expect(stockStatistics([]).details[1].value).toBe("—");
  expect(stockStatistics([]).details[11].value).toBe("—");
  expect(stockStatistics([]).details.find(detail => detail.title === "Last Sell Date")?.value).toBe("—");
  expect(stockStatistics([tx("1", "Sell", 1, 20, "2026-01-01")]).details[3].value).toBe("—");
});
test("eight stock cards display green incoming faces and flip to red outgoing faces", async () => {
  const cache = new InMemoryCache({ addTypename: false });
  cache.writeQuery({ query: TRANSACTIONS_BY_STOCK, variables: { stock: "stock" }, data: { transactions } });
  render(<ApolloProvider client={new ApolloClient({ cache })}><SelectedStockInfo stock="stock" name="Example" currency="USD" /></ApolloProvider>);
  expect(await screen.findByRole("group", { name: "Average Cost per Share" })).toHaveClass("flip-statistic--default");
  expect(screen.getAllByRole("group")).toHaveLength(4);
  fireEvent.click(screen.getByRole("button", { name: "Show more statistics" }));
  expect(screen.getAllByRole("group")).toHaveLength(8);
  for (const [front, back] of [["Total Shares Bought", "Total Shares Sold"], ["Dividends/Interest Earned", "Total Fees Paid"], ["Last Sell Date", "Last Buy Date"], ["Total Invested", "Sale Proceeds"], ["Realized Profit/Loss", "Realized Gain/Loss"]]) {
    expect(screen.getByRole("group", { name: front })).toHaveClass(["Total Shares Bought", "Total Invested"].includes(front) ? "flip-statistic--red" : "flip-statistic--green");
    fireEvent.click(screen.getByRole("button", { name: `Show ${back}` }));
    expect(screen.getByRole("group", { name: back })).toHaveClass(["Realized Gain/Loss", "Total Shares Sold", "Sale Proceeds"].includes(back) ? "flip-statistic--green" : "flip-statistic--red");
    fireEvent.click(screen.getByRole("button", { name: `Show ${front}` }));
  }
});


test("income and realized profit exclude withholding tax without a stock", () => {
  const accountTax = tx("account-tax", "Withholding Tax", 0, 500, "2026-03-01");
  accountTax.stock = undefined;
  const values = Object.fromEntries(stockStatistics([...transactions, accountTax]).details.map(detail => [detail.title, detail.value]));
  expect(values["Dividends/Interest Earned"]).toBe(45);
  expect(values["Realized Profit/Loss"]).toBe(69.5);
});


test("fractional lifetime buy/sell quantities exclude share transfers and splits", () => {
  const { details } = stockStatistics([
    tx("1", "Buy", 1.23456, 100, "2026-01-01"),
    tx("2", "Transfer In", 3, 150, "2026-01-02"),
    tx("3", "Stock Split", 4, 0, "2026-01-03"),
    tx("4", "Sell", 0.12345, 20, "2026-01-04"),
    tx("5", "Transfer Out", 1, 50, "2026-01-05"),
  ]);
  expect(details.find(detail => detail.title === "Total Shares Bought")).toMatchObject({ value: 1.23456, precision: 4 });
  expect(details.find(detail => detail.title === "Total Shares Sold")).toMatchObject({ value: 0.12345, precision: 4 });
  expect(stockStatistics([tx("1", "Sell", 1, 20, "2026-01-01")]).details.find(detail => detail.title === "Realized Profit/Loss")?.value).toBe("—");
});

test("stock data includes all paired faces and the last sell date", () => {
  expect(stockStatistics([]).details.map(detail => detail.title)).toEqual([
    "Book Cost", "Average Cost per Share", "Realized Profit/Loss", "Realized Gain/Loss",
    "Share(s) Owned", "Total Shares Bought", "Total Shares Sold", "Dividends/Interest Earned",
    "Total Invested", "Sale Proceeds", "Total Fees Paid", "Last Buy Date", "Last Sell Date",
  ]);
});


test.each(["Index Fund", "Mutual Fund"])("%s book cost matches invested buy totals and hides share/income cards", assetType => {
  const { details } = stockStatistics([
    tx("1", "Buy", 0, 102, "2026-01-01", 2),
    tx("2", "Buy", 0, 50, "2026-01-02"),
    tx("3", "Sell", 0, 70, "2026-01-03", 1),
    tx("4", "Interest", 0, 9, "2026-01-04"),
  ], assetType);
  expect(Object.fromEntries(details.map(detail => [detail.title, detail.value]))).toEqual({
    "Book Cost": 152, ...(assetType === "Mutual Fund" ? { "Realized Profit/Loss": "—", "Total Fees Paid": 3 } : {}), "Realized Gain/Loss": "—",
    "Sale Proceeds": 70, "Last Buy Date": "2026-01-02",
  });
  expect(stockStatistics([], assetType).details.find(detail => detail.title === "Book Cost")?.value).toBe(0);
});

test("Stock summaries expose the same metrics with the default asset type", () => {
  expect(stockStatistics(transactions, "Stock").details).toEqual(stockStatistics(transactions).details);
});


test("GIC summary separates principal, interest, tax and fees", () => {
  const gic = { id: "asset", name: "GIC" };
  const purchase = { ...tx("buy", "Buy", 0, 10000, "2026-01-01"), stock: { ...tx("buy", "Buy", 0, 0, "2026-01-01").stock!, asset: gic } };
  const maturity = { ...purchase, id: "maturity", activity: { name: "GIC Maturity" }, total: 10400, transactionDate: "2027-01-01", principalReturned: 10000, interestEarned: 400 } as unknown as Transaction;
  const tax = { ...purchase, id: "tax", activity: { name: "Withholding Tax" }, total: 20, fee: 5 } as unknown as Transaction;
  const values = Object.fromEntries(stockStatistics([purchase, maturity, tax], "GIC").details.map(detail => [detail.title, detail.value]));
  expect(values).toEqual({ "Book Cost": 0, "Interest Earned": 380, "Realized Profit/Loss": 375, "Total Invested": 10000, "Principal Returned": 10000, "Last Buy Date": "2026-01-01" });
  expect(stockStatistics([purchase], "GIC").details[0].value).toBe(10000);
});


test("last sell date uses the latest sale and ignores later transfers", () => {
  const summary = stockStatistics([
    tx("sale-new", "Sell", 1, 20, "2026-05-01"),
    tx("sale-old", "Sell", 1, 20, "2026-01-01"),
    tx("transfer", "Transfer Out", 1, 20, "2026-09-01"),
  ]);
  expect(summary.details.find(detail => detail.title === "Last Sell Date")?.value).toBe("2026-05-01");
});
