import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ActivityEnum } from "../../models/Activity";
import { Transaction } from "../../models/Transaction";
import { portfolioStatistics } from "../AccountView/portfolioStatistics";
import { calculateStockHoldings } from "../AccountView/holdings";
import { stockStatistics } from "./statistics";
import SelectedStockInfo from "./SelectedStockInfo";
import { TRANSACTIONS_BY_STOCK } from "./gql";

jest.mock("../../components/TransactionDataGrid", () => ({ TransactionDataGrid: () => null }));
jest.mock("recharts", () => ({ ...jest.requireActual("recharts"), ResponsiveContainer: () => null }));
const currency = { id: "usd", code: "USD" };
const asset = { id: "asset", name: "Stock" };
const parent = { id: "mmm", name: "3M", ticker: "MMM", asset, currency };
const child = { id: "solv", name: "Solventum", ticker: "SOLV", asset, currency };
const base = { account: { id: "rrsp", code: "RRSP" }, platform: { id: "broker", name: "Broker", currency }, priceCurrency: currency, totalCurrency: currency, exchangeRate: 1, fee: 0, price: null, rate: null, maturityDate: null, gicPurchase: null, interestCalculation: "simple", principalReturned: null, interestEarned: null };
const buy = { ...base, id: "buy", stock: parent, activity: { name: ActivityEnum.BUY }, transactionDate: "2023-01-01", shares: 4, total: 500, spinoffSource: null, allocatedBookCost: null } as unknown as Transaction;
const event = { ...base, id: "event", stock: child, spinoffSource: parent, allocatedBookCost: 77.6, activity: { name: ActivityEnum.STOCKSPINOFF }, transactionDate: "2024-04-01", shares: 1, total: 0 } as unknown as Transaction;
const values = (rows: Transaction[], id: string) => Object.fromEntries(stockStatistics(rows, "Stock", id).details.map(detail => [detail.title, detail.value]));
beforeEach(() => Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }) }));

test("spinoff moves cost without cash, purchases, profit, or changing parent shares", () => {
  const rows = [buy, event];
  const portfolio = portfolioStatistics(rows);
  expect(portfolio.holdings.totalShares).toBe(5);
  expect(portfolio.holdings.totalBookCost).toBe(500);
  expect(portfolio.holdings.holdings).toHaveLength(2);
  expect(portfolio.netDeposits).toBe(0);
  expect(portfolio.income).toBe(0);
  expect(portfolio.realizedProfit).toBe(0);
  expect(values(rows, "mmm")).toMatchObject({ "Book Cost": 422.4, "Share(s) Owned": 4, "Average Cost per Share": 105.6, "Total Invested": 500, "Total Shares Bought": 4, "Last Buy Date": "2023-01-01" });
  expect(values([event], "solv")).toMatchObject({ "Book Cost": 77.6, "Share(s) Owned": 1, "Average Cost per Share": 77.6, "Total Invested": 0, "Total Shares Bought": 0, "Last Buy Date": "—" });
  expect(calculateStockHoldings(rows).bookCostAfterTransaction.get("event")).toBe(500);
});

test("future sales use allocated costs for each stock", () => {
  const sale = { ...event, id: "sale", spinoffSource: null, allocatedBookCost: null, activity: { name: ActivityEnum.SELL }, transactionDate: "2024-04-02", total: 100 } as unknown as Transaction;
  expect(values([event, sale], "solv")["Realized Gain/Loss"]).toBeCloseTo(22.4);
  const parentSale = { ...sale, stock: parent, shares: 1, total: 120 } as unknown as Transaction;
  expect(values([buy, event, parentSale], "mmm")["Realized Gain/Loss"]).toBeCloseTo(14.4);
  expect(portfolioStatistics([buy, event, sale]).holdings.totalBookCost).toBeCloseTo(422.4);
});

test("both stock pages explain and link the same corporate action", async () => {
  for (const [stock, rows, other, cost] of [[parent, [buy, event], child, "422.40"], [child, [event], parent, "77.60"]] as const) {
    const cache = new InMemoryCache({ addTypename: false });
    cache.writeQuery({ query: TRANSACTIONS_BY_STOCK, variables: { stock: stock.id }, data: { transactions: rows } });
    render(<MemoryRouter><ApolloProvider client={new ApolloClient({ cache })}><SelectedStockInfo stock={stock.id} name={stock.name} currency="USD" /></ApolloProvider></MemoryRouter>);
    expect(await screen.findByText("Corporate actions")).toBeVisible();
    expect(screen.getByRole("link", { name: `${other.name} (${other.ticker})` })).toHaveAttribute("href", `/mystocks?stock=${other.id}`);
    expect(screen.getByText(/USD \$77.60 of book cost/)).toBeVisible();
    await waitFor(() => expect(screen.getByRole("group", { name: "Book Cost" })).toHaveTextContent(cost));
    cleanup();
  }
});
