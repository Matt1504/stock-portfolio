import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { fireEvent, render, screen } from "@testing-library/react";
import { Transaction } from "../../models/Transaction";
import SelectedStockInfo from "./SelectedStockInfo";
import { TRANSACTIONS_BY_STOCK } from "./gql";
import { stockStatistics } from "./statistics";

jest.mock("../../components/TransactionDataGrid", () => ({ TransactionDataGrid: () => null }));
jest.mock("recharts", () => ({ ...jest.requireActual("recharts"), ResponsiveContainer: () => null }));
function tx(id: string, name: string, shares: number, total: number, date: string, fee = 0): Transaction {
  return { id, activity: { name }, shares, total, fee, price: 10, transactionDate: date,
    stock: { id: "stock", name: "Example", ticker: "EX" }, account: { id: "account", code: "TFSA" },
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
    "Sale Proceeds": 50, "Realized Profit/Loss": 69.5, "Total Shares Bought": 10, "Total Shares Sold": 5, "Total Fees Paid": 3, "Last Buy Date": "2025-01-01" });
});
test("empty positions have no average cost or last buy, oversold positions have no realized gain", () => {
  expect(stockStatistics([]).details[1].value).toBe("—");
  expect(stockStatistics([]).details[11].value).toBe("—");
  expect(stockStatistics([tx("1", "Sell", 1, 20, "2026-01-01")]).details[3].value).toBe("—");
});
test("four primary cards remain visible while arrow reveals and hides eight additional cards", async () => {
  const cache = new InMemoryCache({ addTypename: false });
  cache.writeQuery({ query: TRANSACTIONS_BY_STOCK, variables: { stock: "stock" }, data: { transactions } });
  render(<ApolloProvider client={new ApolloClient({ cache })}><SelectedStockInfo stock="stock" name="Example" currency="USD" /></ApolloProvider>);
  expect(await screen.findByText("Average Cost per Share")).toBeVisible();
  expect(screen.getByText("Realized Gain/Loss")).toBeVisible();
  expect(screen.getByText("Total Invested")).not.toBeVisible();
  expect(screen.getAllByRole("button", { name: /^About / })).toHaveLength(4);
  const toggle = screen.getByRole("button", { name: "Show more statistics" });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(toggle);
  expect(screen.getByText("Total Invested")).toBeVisible();
  expect(screen.getByText("Last Buy Date")).toBeVisible();
  expect(screen.getAllByRole("button", { name: /^About / })).toHaveLength(12);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  fireEvent.click(toggle);
  expect(screen.getByText("Total Invested")).not.toBeVisible();
  expect(screen.getByText("Share(s) Owned")).not.toBeVisible();
  expect(screen.getByText("Realized Profit/Loss")).toBeVisible();
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

test("stock cards follow the agreed three-row order", () => {
  expect(stockStatistics([]).details.map(detail => detail.title)).toEqual([
    "Book Cost", "Average Cost per Share", "Realized Profit/Loss", "Realized Gain/Loss",
    "Share(s) Owned", "Total Shares Bought", "Total Shares Sold", "Dividends/Interest Earned",
    "Total Invested", "Sale Proceeds", "Total Fees Paid", "Last Buy Date",
  ]);
});
