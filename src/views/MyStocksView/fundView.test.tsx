import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import dayjs from "dayjs";
import { Transaction } from "../../models/Transaction";
import SelectedStockInfo from "./SelectedStockInfo";
import { TRANSACTIONS_BY_STOCK } from "./gql";

jest.mock("../../components/TransactionDataGrid", () => ({ TransactionDataGrid: () => null }));
jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children, data }: any) => <svg data-testid="history-chart" data-points={JSON.stringify(data)} data-dates={JSON.stringify(data.map((point: any) => point.name))}>{children}</svg>,
  PieChart: ({ children }: any) => <svg>{children}</svg>,
  Bar: ({ children, dataKey, fill, name }: any) => <g data-testid={`bar-${name}`} data-key={dataKey} data-fill={fill} data-name={name}>{children}</g>,
  Pie: ({ children }: any) => <g>{children}</g>,
  LabelList: () => <text>share-quantity-label</text>,
  CartesianGrid: () => null, XAxis: () => null, YAxis: () => null, Tooltip: () => null,
  Legend: () => null, ReferenceLine: () => null, Cell: () => null,
}));
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }) });
});
function show(assetType: string, rows?: object[]) {
  const cache = new InMemoryCache({ addTypename: false });
  const transactions = (rows ?? [
    { id: "buy", activity: { name: "Buy" }, total: 100, shares: 0, transactionDate: "2026-01-01" },
    { id: "income", activity: { name: "Dividends" }, total: 5, shares: 0, transactionDate: "2026-01-02" },
  ]).map(row => ({ ...row, transferBatch: null, spinoffSource: null, allocatedBookCost: null, priceCurrency: null, totalCurrency: null, exchangeRate: 1, principalReturned: null, interestEarned: null, interestCalculation: "simple", gicPurchase: null, stock: { currency: null, id: "fund", name: "Fund", ticker: "FUND", asset: { id: "asset", name: assetType } }, account: { id: "account", code: "TFSA" }, platform: { id: "platform", name: "Broker", currency: { id: "cad", code: "CAD" } }, price: 0, fee: 0, rate: null, maturityDate: null })) as unknown as Transaction[];
  transactions.forEach((transaction, index) => { const row = rows?.[index] as Partial<Transaction> | undefined; if (row?.totalCurrency) transaction.totalCurrency = row.totalCurrency; if (row?.platform) transaction.platform = row.platform; if (row?.shares !== undefined) transaction.shares = row.shares; });
  cache.writeQuery({ query: TRANSACTIONS_BY_STOCK, variables: { stock: "fund" }, data: { transactions } });
  render(<ApolloProvider client={new ApolloClient({ cache })}><SelectedStockInfo stock="fund" name="Fund" currency="CAD" assetType={assetType} /></ApolloProvider>);
}

test.each(["Index Fund", "Mutual Fund"])("%s omits irrelevant cards, dividend history and share labels", async assetType => {
  show(assetType);
  expect(await screen.findByText("Transaction History")).toBeVisible();
  await waitFor(() => expect(screen.getByRole("group", { name: "Book Cost" })).toHaveTextContent("100.00"));
  for (const title of ["Share(s) Owned", "Total Shares Bought", "Total Shares Sold", "Average Cost per Share", "Dividends/Interest Earned", "Total Invested"]) {
    expect(screen.queryByRole("group", { name: title, hidden: true })).not.toBeInTheDocument();
  }
  expect(screen.queryByText("share-quantity-label")).not.toBeInTheDocument();
  expect(screen.queryByText("Dividend History")).not.toBeInTheDocument();
  if (assetType === "Index Fund") {
    expect(screen.queryByRole("button", { name: "Show more statistics" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("group").map(card => card.getAttribute("aria-label"))).toEqual(["Book Cost", "Realized Gain/Loss", "Sale Proceeds", "Last Buy Date"]);
    expect(screen.getByRole("group", { name: "Book Cost" }).parentElement).toHaveClass("portfolio-statistics-grid");
  } else {
    fireEvent.click(screen.getByRole("button", { name: "Show more statistics" }));
    expect(screen.getAllByRole("group")).toHaveLength(6);
  }
  fireEvent.click(screen.getByRole("button", { name: "About Book Cost" }));
  expect(await screen.findByRole("tooltip")).toHaveTextContent("For amount-only funds, the sum of recorded Buy totals");
});

test("stock transaction bars retain share labels", async () => {
  show("Stock");
  expect(await screen.findByText("share-quantity-label")).toBeVisible();
  expect(screen.getByText("Dividend History")).toBeVisible();
});


test("bar histories filter independently and do not alter lifetime statistics", async () => {
  const now = dayjs();
  const rows = [36, 18, 6, 1].map((months, index) => ({ id: `buy-${index}`, activity: { name: "Buy" }, total: 100, shares: 0, transactionDate: now.subtract(months, "month").format("YYYY-MM-DD") }));
  rows.push(...[36, 6, 1].map((months, index) => ({ id: `income-${index}`, activity: { name: "Dividends" }, total: 10, shares: 0, transactionDate: now.subtract(months, "month").format("YYYY-MM-DD") })));
  show("Stock", rows);
  const controls = await screen.findByLabelText("Transaction history time range");
  const incomeControls = screen.getByLabelText("Income history time range");
  expect(within(controls).getByRole("radio", { name: "2 years" })).toBeInTheDocument();
  const charts = screen.getAllByTestId("history-chart");
  const allIncome = charts[1].getAttribute("data-dates");
  fireEvent.click(within(controls).getByRole("radio", { name: "3 months" }));
  expect(JSON.parse(charts[0].getAttribute("data-dates")!)).toEqual([rows[3].transactionDate]);
  expect(charts[1]).toHaveAttribute("data-dates", allIncome);
  fireEvent.click(within(incomeControls).getByRole("radio", { name: "1 year" }));
  expect(JSON.parse(charts[1].getAttribute("data-dates")!)).toHaveLength(2);
  expect(within(controls).getByRole("radio", { name: "3 months" })).toBeChecked();
  expect(screen.getByRole("group", { name: "Book Cost" })).toHaveTextContent("0.00");
  fireEvent.click(within(controls).getByRole("radio", { name: "All time" }));
  expect(JSON.parse(charts[0].getAttribute("data-dates")!)).toHaveLength(4);
}, 20000);

test("old histories do not show time range controls", async () => {
  show("Stock", [{ id: "old", activity: { name: "Buy" }, shares: 0, total: 100, transactionDate: dayjs().subtract(3, "year").format("YYYY-MM-DD") }]);
  expect(await screen.findByText("Transaction History")).toBeVisible();
  expect(screen.queryByLabelText("Transaction history time range")).not.toBeInTheDocument();
});


test("stock summaries separate recorded CAD and USD costs and chart entries", async () => {
  const rows = ["CAD", "USD"].map((code, index) => ({ id: code, activity: { name: "Buy" }, shares: 1, total: index ? 200 : 100, transactionDate: "2026-01-01", totalCurrency: { id: code, code }, platform: { id: code, name: "Broker", currency: { id: code, code } } }));
  show("Stock", rows);
  await waitFor(() => expect(screen.getByRole("group", { name: "Book Cost" })).toHaveTextContent("100.00"));
  fireEvent.click(screen.getByRole("tab", { name: "USD" }));
  await waitFor(() => expect(screen.getByRole("group", { name: "Book Cost" })).toHaveTextContent("200.00"));
  expect(screen.getByText(/Recorded amounts in USD/)).toBeVisible();
  expect(JSON.parse(screen.getByTestId("history-chart").getAttribute("data-dates")!)).toHaveLength(1);
});


test("buys and sales aggregate upward with separate quantities and cash-flow colours", async () => {
  show("Stock", [
    { id: "buy1", activity: { name: "Buy" }, total: 100, shares: 3, transactionDate: "2026-01-01" },
    { id: "buy2", activity: { name: "Buy" }, total: 50, shares: 1.234567, transactionDate: "2026-01-01" },
    { id: "sell1", activity: { name: "Sell" }, total: 40, shares: 1, transactionDate: "2026-01-01" },
    { id: "sell2", activity: { name: "Sell" }, total: 20, shares: 0.5, transactionDate: "2026-01-01" },
    { id: "sell3", activity: { name: "Sell" }, total: 10, shares: 0.25, transactionDate: "2026-01-02" },
  ]);
  const chart = await screen.findByTestId("history-chart");
  expect(JSON.parse(chart.getAttribute("data-points")!)).toEqual([
    { name: "2026-01-01", value: 150, value_1: 60, label: "4.2346 Share(s)", sellLabel: "1.5 Share(s)" },
    { name: "2026-01-02", value: 0, value_1: 10, sellLabel: "0.25 Share(s)" },
  ]);
  expect(within(chart).getByTestId("bar-Buy Total")).toHaveAttribute("data-fill", "#FF6961");
  expect(within(chart).getByTestId("bar-Sale Proceeds")).toHaveAttribute("data-fill", "#ACE1AF");
});
