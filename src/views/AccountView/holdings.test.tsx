import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Transaction } from "../../models/Transaction";
import SelectedAccountInfo from "./SelectedAccountInfo";
import { TRANSACTIONS_BY_PLATFORM } from "./gql";
import { LineChart } from "recharts";
import { calculateStockHoldings } from "./holdings";

jest.mock("../../components/TransactionDataGrid", () => ({ TransactionDataGrid: () => null }));
jest.mock("recharts", () => {
  const React = jest.requireActual("react");
  const charts = jest.requireActual("recharts");
  return { ...charts, LineChart: jest.fn((props: any) => React.createElement(charts.LineChart, props)), ResponsiveContainer: ({ children }: any) => React.cloneElement(children, { width: 800, height: 450 }) };
});

const currency = { __typename: "CurrencyType", id: "usd", code: "USD", name: "Dollar" };
let sequence = 0;
function tx(stock: string, activity: string, shares: number, total = 100, platform = "broker"): Transaction {
  sequence += 1;
  return {
    id: `tx-${sequence}`, account: { id: "account", name: "Savings", code: "TFSA" },
    platform: { id: platform, name: platform, currency },
    activity: { name: activity }, stock: { id: stock, ticker: stock, name: stock },
    transactionDate: `2026-01-${String(sequence).padStart(2, "0")}`,
    shares, total, price: 10, fee: 0, description: "", rate: null, maturityDate: null,
  } as unknown as Transaction;
}
beforeEach(() => {
  sequence = 0;
  Object.defineProperty(window, "matchMedia", { writable: true, value: (query: string) => ({
    matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  }) });
});

test("partial sales retain average purchase cost rather than subtracting proceeds", () => {
  const result = calculateStockHoldings([tx("EX", "Buy", 2, 20), tx("EX", "Buy", 2, 40), tx("EX", "Sell", 1, 1000)]);
  expect(result.totalShares).toBe(3);
  expect(result.totalBookCost).toBe(45);
  expect(result.holdings).toHaveLength(1);
});

test("sold-out stocks and split-adjusted positions are excluded", () => {
  const result = calculateStockHoldings([tx("EX", "Buy", 1), tx("EX", "Stock Split", 19, 0), tx("EX", "Sell", 20, 200), tx("OTHER", "Buy", 2), tx("OTHER", "Sell", 2)]);
  expect(result.holdings).toEqual([]);
  expect(result.totalShares).toBe(0);
  expect(result.totalBookCost).toBe(0);
  expect(result.issues).toEqual([]);
});

test("negative records are flagged instead of cancelling unrelated holdings", () => {
  const result = calculateStockHoldings([tx("DIS", "Buy", 5, 777.19), tx("EOG", "Buy", 3), tx("EOG", "Sell", 4), tx("MSFT", "Buy", 2), tx("MSFT", "Sell", 6)]);
  expect(result.totalShares).toBe(5);
  expect(result.totalBookCost).toBeCloseTo(777.19);
  expect(result.holdings).toHaveLength(1);
  expect(result.issues.map(issue => [issue.stock.ticker, issue.missingShares])).toEqual([["EOG", 1], ["MSFT", 4]]);
});

test("broker cost bases stay separate while stock IDs aggregate across objects", () => {
  const result = calculateStockHoldings([tx("EX", "Buy", 1, 10, "a"), tx("EX", "Buy", 1, 20, "b"), tx("EX", "Sell", 1, 100, "a"), tx("EX", "Buy", 1, 30, "b")]);
  expect(result.holdings).toHaveLength(1);
  expect(result.totalShares).toBe(2);
  expect(result.totalBookCost).toBe(50);
});

test("share transfers affect positions, cash transfers do not", () => {
  const result = calculateStockHoldings([tx("EX", "Transfer In", 3, 90), tx("EX", "Transfer Out", 2, 200), tx("EX", "Transfer In", 0, 1000)]);
  expect(result.totalShares).toBe(1);
  expect(result.totalBookCost).toBe(30);
});

test("one remaining Disney share renders one full pie sector and correct statistics", async () => {
  const transactions = [tx("DIS", "Buy", 5, 777.19), tx("DIS", "Sell", 4, 1000), tx("EX", "Buy", 1), tx("EX", "Sell", 1)];
  const cache = new InMemoryCache({ addTypename: false });
  cache.writeQuery({ query: TRANSACTIONS_BY_PLATFORM, variables: { platform_one: "broker" }, data: { transactions } });
  const client = new ApolloClient({ cache });
  const { container } = render(<ApolloProvider client={client}><SelectedAccountInfo name="broker" platform="broker" account="account" accountName="Savings" currencies={[{ __typename: "CurrencyEdge", node: currency }]} currency={currency} availableCurrencyIds={["usd"]} onCurrencyChange={() => {}} /></ApolloProvider>);
  await waitFor(() => expect(screen.getByText("100.00%")).toBeInTheDocument());
  expect(screen.getAllByRole("button", { name: /^About / })).toHaveLength(4);
  fireEvent.click(screen.getByRole("button", { name: "Show more statistics" }));
  expect(screen.getAllByRole("button", { name: /^About / })).toHaveLength(12);
  expect(screen.getAllByRole("group").map(group => group.getAttribute("aria-label"))).toEqual([
    "Total Book Cost", "Net Deposits", "Realized Profit", "Realized Gain/Loss",
    "Total Share(s) Owned", "Unique Share(s) Owned", "Largest Holding", "Dividends/Interest Earned",
    "Amount Transferred In", "Amount Transferred Out", "Amount Contributed", "Amount Withdrawn",
  ]);
  expect(screen.getByText("DIS | $155.44")).toBeInTheDocument();
  for (const title of ["Total Share(s) Owned", "Unique Share(s) Owned"]) {
    expect(screen.getByText(title).closest(".ant-statistic")?.querySelector(".ant-statistic-content-value")?.textContent).toBe("1");
  }
  expect(container.querySelectorAll(".recharts-pie-sector")).toHaveLength(1);
  await waitFor(() => expect(container.querySelectorAll(".recharts-sector")).toHaveLength(2), { timeout: 3000 });
});


test("fractional purchases and partial sales retain proportional cost", () => {
  const result = calculateStockHoldings([tx("EX", "Buy", 0.75, 75), tx("EX", "Sell", 0.125, 15)]);
  expect(result.totalShares).toBe(0.625);
  expect(result.totalBookCost).toBeCloseTo(62.5);
  expect(result.realizedGain).toBeCloseTo(2.5);
});


test("net deposit history includes only contributions and net transfers", async () => {
  const transactions = [
    tx("EX", "Contribution", 0, 1000), tx("EX", "Transfer In", 0, 500), tx("EX", "Transfer Out", 0, 200),
    tx("EX", "Dividends", 0, 50), tx("EX", "Interest", 0, 10), tx("EX", "Withholding Tax", 0, 5), tx("EX", "Buy", 1, 100), tx("EX", "Withdrawal", 0, 100),
  ];
  const cache = new InMemoryCache({ addTypename: false });
  cache.writeQuery({ query: TRANSACTIONS_BY_PLATFORM, variables: { platform_one: "broker" }, data: { transactions } });
  (LineChart as unknown as jest.Mock).mockClear();
  render(<ApolloProvider client={new ApolloClient({ cache })}><SelectedAccountInfo name="broker" platform="broker" account="account" accountName="Savings" currencies={[{ __typename: "CurrencyEdge", node: currency }]} currency={currency} availableCurrencyIds={["usd"]} onCurrencyChange={() => {}} /></ApolloProvider>);
  await waitFor(() => expect(LineChart).toHaveBeenCalledWith(expect.objectContaining({ data: expect.arrayContaining([
    expect.objectContaining({ name: transactions[7].transactionDate, value: 100, value_1: 1200 }),
  ]) }), expect.anything()));
  const calls = (LineChart as unknown as jest.Mock).mock.calls;
  const points = calls[calls.length - 1][0].data;
  expect(points.map((point: { value_1: number }) => point.value_1)).toEqual([1000, 1500, 1300, 1300, 1300, 1300, 1300, 1200]);
});


test("account dividends and interest subtract only stock-associated withholding tax", async () => {
  const accountTax = tx("EX", "Withholding Tax", 0, 300);
  accountTax.stock = null as unknown as Transaction["stock"];
  const transactions = [tx("EX", "Dividends", 0, 50), tx("EX", "Interest", 0, 10), tx("EX", "Withholding Tax", 0, 5), accountTax];
  const cache = new InMemoryCache({ addTypename: false });
  cache.writeQuery({ query: TRANSACTIONS_BY_PLATFORM, variables: { platform_one: "broker" }, data: { transactions } });
  render(<ApolloProvider client={new ApolloClient({ cache })}><SelectedAccountInfo name="broker" platform="broker" account="account" accountName="Savings" currencies={[{ __typename: "CurrencyEdge", node: currency }]} currency={currency} availableCurrencyIds={["usd"]} onCurrencyChange={() => {}} /></ApolloProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Show more statistics" }));
  expect(await within(screen.getByRole("group", { name: "Dividends/Interest Earned" })).findByText("55")).toBeInTheDocument();
});
