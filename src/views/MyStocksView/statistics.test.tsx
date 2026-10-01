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
test("remaining cost, realized gain, lifetime and annual income reflect sales and splits", () => {
  const { details } = stockStatistics(transactions, 2026);
  const values = Object.fromEntries(details.map(detail => [detail.title, detail.value]));
  expect(values).toEqual({ "Share(s) Owned": 15, "Book Cost": 76.5, "Average Cost per Share": 5.1,
    "Realized Gain/Loss": 24.5, "Dividends/Interest Earned": 45, "Total Invested": 102,
    "Sale Proceeds": 50, "Dividends/Interest (2026)": 25, "Total Fees Paid": 3, "Last Buy Date": "2025-01-01" });
});
test("empty positions have no average cost or last buy, oversold positions have no realized gain", () => {
  expect(stockStatistics([]).details[2].value).toBe("—");
  expect(stockStatistics([]).details[9].value).toBe("—");
  expect(stockStatistics([tx("1", "Sell", 1, 20, "2026-01-01")]).details[3].value).toBe("—");
});
test("five primary cards remain visible while arrow reveals and hides five additional cards", async () => {
  const cache = new InMemoryCache({ addTypename: false });
  cache.writeQuery({ query: TRANSACTIONS_BY_STOCK, variables: { stock: "stock" }, data: { transactions } });
  render(<ApolloProvider client={new ApolloClient({ cache })}><SelectedStockInfo stock="stock" name="Example" currency="USD" /></ApolloProvider>);
  expect(await screen.findByText("Average Cost per Share")).toBeVisible();
  expect(screen.getByText("Realized Gain/Loss")).toBeVisible();
  expect(screen.getByText("Total Invested")).not.toBeVisible();
  expect(screen.getAllByRole("button", { name: /^About / })).toHaveLength(5);
  const toggle = screen.getByRole("button", { name: "Show more statistics" });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(toggle);
  expect(screen.getByText("Total Invested")).toBeVisible();
  expect(screen.getByText("Last Buy Date")).toBeVisible();
  expect(screen.getAllByRole("button", { name: /^About / })).toHaveLength(10);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  fireEvent.click(toggle);
  expect(screen.getByText("Total Invested")).not.toBeVisible();
  expect(screen.getByText("Share(s) Owned")).toBeVisible();
});
