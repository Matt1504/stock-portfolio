import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Transaction } from "../../models/Transaction";
import SelectedAccountInfo from "./SelectedAccountInfo";
import { TRANSACTIONS_BY_PLATFORM } from "./gql";
import { LineChart } from "recharts";
import { calculateStockHoldings } from "./holdings";
import { portfolioStatistics } from "./portfolioStatistics";

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
    transferBatch: null, spinoffSource: null, allocatedBookCost: null, priceCurrency: null, totalCurrency: null, exchangeRate: 1, principalReturned: null, interestEarned: null, interestCalculation: "simple", gicPurchase: null, id: `tx-${sequence}`, account: { id: "account", name: "Savings", code: "TFSA" },
    platform: { id: platform, name: platform, currency },
    activity: { name: activity }, stock: { currency: null, id: stock, ticker: stock, name: stock, asset: { id: "stock-asset", name: "Stock" } },
    transactionDate: `2026-01-${String(sequence).padStart(2, "0")}`,
    shares, total, price: 10, fee: 0, description: "", rate: null, maturityDate: null,
  } as unknown as Transaction;
}
jest.setTimeout(20000);
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
  expect(screen.getAllByRole("group")).toHaveLength(4);
  fireEvent.click(screen.getByRole("button", { name: "Show more statistics" }));
  expect(screen.getAllByRole("button", { name: /^About / })).toHaveLength(12);
  expect(screen.getAllByRole("group").map(group => group.getAttribute("aria-label"))).toEqual([
    "Cash Balance", "Total Book Cost", "Realized Profit", "Amount Contributed",
    "Amount Transferred In", "Dividends/Interest Earned", "Total Share(s) Owned", "Largest Holding",
  ]);
  expect(screen.getByRole("group", { name: "Largest Holding" })).toHaveTextContent("DIS | $155.44");
  fireEvent.click(screen.getByRole("button", { name: "Show Smallest Holding" }));
  expect(screen.getByRole("group", { name: "Smallest Holding" })).toHaveTextContent("DIS | $155.44");
  expect(screen.getByRole("group", { name: "Cash Balance" })).toHaveClass("flip-statistic--default");
  expect(screen.getByRole("group", { name: "Cash Balance" })).toHaveTextContent("222.81");
  for (const title of ["Total Share(s) Owned", "Unique Share(s) Owned"]) {
    if (title === "Unique Share(s) Owned") fireEvent.click(screen.getByRole("button", { name: "Show Unique Share(s) Owned" }));
    expect(screen.getByRole("group", { name: title }).querySelector(".ant-statistic")?.querySelector(".ant-statistic-content-value")?.textContent).toBe("1");
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
  fireEvent.click(screen.getByRole("button", { name: "Show Dividends/Interest Earned" }));
  expect(await within(screen.getByRole("group", { name: "Dividends/Interest Earned" })).findByText("55")).toBeInTheDocument();
});

test("GIC maturity removes principal from holdings without creating shares", () => {
  const purchase = tx("GIC", "Buy", 0, 10000);
  purchase.stock = { ...purchase.stock!, asset: { id: "gic", name: "GIC" } };
  const maturity = { ...purchase, id: "maturity", transactionDate: "2027-01-01", activity: { name: "GIC Maturity" }, total: 10400, principalReturned: 10000, interestEarned: 400 } as unknown as Transaction;
  expect(calculateStockHoldings([purchase]).totalBookCost).toBe(10000);
  const settled = calculateStockHoldings([purchase, maturity]);
  expect(settled.totalBookCost).toBe(0);
  expect(settled.totalShares).toBe(0);
  expect(settled.holdings).toHaveLength(0);
  const overview = portfolioStatistics([purchase, maturity]);
  expect(overview.income).toBe(400);
  expect(overview.realizedProfit).toBe(400);
  expect(overview.netDeposits).toBe(0);
});

test.each(["Index Fund", "Mutual Fund"])("amount-only %s purchases contribute cost without inventing shares", asset => {
  const first = tx("TDB2440", "Buy", 0, 3000);
  first.stock = { ...first.stock!, asset: { id: "fund", name: asset } };
  const second = { ...first, id: "second", transactionDate: new Date("2026-01-02"), shares: undefined, total: 105.47 };
  const summary = portfolioStatistics([first, second]);
  expect(summary.holdings.totalBookCost).toBeCloseTo(3105.47);
  expect(summary.holdings.totalShares).toBe(0);
  expect(summary.holdings.holdings).toHaveLength(1);
  expect(summary.holdings.bookCostAfterTransaction.get("second")).toBeCloseTo(3105.47);
  expect(summary.largestHolding?.stock.ticker).toBe("TDB2440");
  expect(summary.smallestHolding?.bookCost).toBeCloseTo(3105.47);
  expect(summary.realizedProfit).toBe(0);
});

test("reinvesting matured GIC proceeds into an amount-only fund renders current book cost and history", async () => {
  const purchase = tx("GIC", "Buy", 0, 2988.23);
  purchase.stock = { ...purchase.stock!, asset: { id: "gic", name: "GIC" } };
  const maturity = { ...tx("GIC", "GIC Maturity", 0, 3105.34), stock: purchase.stock, principalReturned: 2988.23, interestEarned: 117.11 };
  const fund = tx("TDB2440", "Buy", 0, 3105.47);
  fund.stock = { ...fund.stock!, asset: { id: "fund", name: "Mutual Fund" } };
  const transactions = [purchase, maturity, fund];
  const cache = new InMemoryCache({ addTypename: false });
  cache.writeQuery({ query: TRANSACTIONS_BY_PLATFORM, variables: { platform_one: "broker" }, data: { transactions } });
  render(<ApolloProvider client={new ApolloClient({ cache })}><SelectedAccountInfo name="broker" platform="broker" account="account" accountName="FHSA" currencies={[{ __typename: "CurrencyEdge", node: currency }]} currency={currency} availableCurrencyIds={["usd"]} onCurrencyChange={() => {}} /></ApolloProvider>);
  expect(await screen.findByRole("group", { name: "Total Book Cost" })).toHaveTextContent("3,105.47");
  expect(screen.getByText("$3,105.47")).toBeInTheDocument();
  expect(screen.queryByText(/0 Share\(s\)/)).not.toBeInTheDocument();
  const history = (LineChart as unknown as jest.Mock).mock.calls.slice(-1)[0][0].data;
  expect(history.map((point: { value: number }) => point.value)).toEqual([2988.23, 0, 3105.47]);
});

test("amount-only sale proceeds do not invent a realized gain or disposal cost", () => {
  const buy = tx("FUND", "Buy", 0, 100);
  buy.stock = { ...buy.stock!, asset: { id: "fund", name: "Index Fund" } };
  const sell = { ...tx("FUND", "Sell", 0, 120), stock: buy.stock };
  const result = portfolioStatistics([buy, sell]);
  expect(result.holdings.totalBookCost).toBe(100);
  expect(result.holdings.realizedGain).toBeUndefined();
  expect(result.realizedProfit).toBeUndefined();
});


test("largest and smallest holdings rank remaining cost after partial and full sales", () => {
  const transactions = [tx("A", "Buy", 10, 1000), tx("B", "Buy", 3, 300), tx("A", "Sell", 9, 1200)];
  const partial = portfolioStatistics(transactions);
  expect(partial.largestHolding?.stock.ticker).toBe("B");
  expect(partial.smallestHolding?.stock.ticker).toBe("A");
  expect(partial.smallestHolding?.bookCost).toBeCloseTo(100);
  const soldA = portfolioStatistics([...transactions, tx("A", "Sell", 1, 100)]);
  expect(soldA.largestHolding?.stock.ticker).toBe("B");
  expect(soldA.smallestHolding?.stock.ticker).toBe("B");
  expect(soldA.holdings.holdings.some(holding => holding.stock.ticker === "A")).toBe(false);
});

test("a stock bought for 1000 and fully sold for 1000 cannot be a holding", () => {
  const summary = portfolioStatistics([tx("A", "Buy", 10, 1000), tx("A", "Sell", 10, 1000)]);
  expect(summary.holdings.totalBookCost).toBe(0);
  expect(summary.largestHolding).toBeUndefined();
  expect(summary.smallestHolding).toBeUndefined();
});

test("zero-cost positions are excluded consistently from both holding rankings", () => {
  const summary = portfolioStatistics([tx("FREE", "Buy", 1, 0)]);
  expect(summary.holdings.totalShares).toBe(1);
  expect(summary.largestHolding).toBeUndefined();
  expect(summary.smallestHolding).toBeUndefined();
});

test("amount-only funds move remaining book cost between platforms", () => {
  const stock = { id: "FUND", ticker: "FUND", asset: { name: "Mutual Fund" } };
  const purchase = { ...tx("FUND", "Buy", 0, 1000, "old"), stock } as Transaction;
  const outgoing = { ...tx("FUND", "Transfer Out", 0, 1000, "old"), stock } as Transaction;
  const incoming = { ...tx("FUND", "Transfer In", 0, 1000, "new"), stock } as Transaction;
  expect(calculateStockHoldings([purchase, outgoing]).totalBookCost).toBe(0);
  expect(calculateStockHoldings([incoming]).totalBookCost).toBe(1000);
  expect(calculateStockHoldings([purchase, outgoing, incoming]).totalBookCost).toBe(1000);
});
