jest.mock("../../components/MarketValuation", () => ({ __esModule: true, default: () => <section aria-label="Market valuation" /> }));
import { analyticsFixture } from "../../testUtils/analyticsFixture";
import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from "@apollo/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProfileContext } from "../../profiles/ProfileContext";
import PortfolioOverview from "./PortfolioOverview";
import { PORTFOLIO_OVERVIEW } from "./gql";
import { coldRefetch } from "../../utils/coldRefetch";
import { portfolioStatistics } from "../../testUtils/legacyPortfolioStatistics";
import { Transaction } from "../../models/Transaction";

function tx(id: string, activity: string, total: number, code = "CAD", shares = 0, fee = 0, stock = false) {
  return { transferBatch: null, spinoffSource: null, allocatedBookCost: null, priceCurrency: null, totalCurrency: null, exchangeRate: 1, principalReturned: null, interestEarned: null, id, activity: { name: activity }, total, shares, fee, transactionDate: "2024-01-01", account: { id: "account", code: "TFSA" }, platform: { id: code, name: "Broker", currency: { id: code, code } }, stock: stock ? { currency: null, id: "stock", name: "Example", ticker: "EX", asset: { id: "asset", name: "Stock" } } : null, price: 100 };
}
const history = [
  tx("1", "Buy", 202, "CAD", 2, 2, true), tx("2", "Sell", 60, "CAD", 0.5, 1, true),
  tx("3", "Contribution", 1000), tx("4", "Withdrawal", 100), tx("5", "Transfer In", 50), tx("6", "Transfer Out", 20),
  tx("7", "Dividends", 20, "CAD", 0, 0, true), tx("8", "Withholding Tax", 2, "CAD", 0, 0, true), tx("9", "Withholding Tax", 30),
  tx("10", "Buy", 300, "USD", 3, 0, true), tx("11", "Contribution", 500, "USD"),
];
const data = { history, currencies: { edges: ["CAD", "USD"].map(code => ({ node: { id: code, code } })) }, platforms: { edges: ["CAD", "CAD", "USD"].map((code, index) => ({ node: { id: String(index), currency: { id: code, code } } })) } };
jest.mock("recharts", () => ({ ...jest.requireActual("recharts"), ResponsiveContainer: () => null }));
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }) });
});

test("cash movements, fees, stock tax and remaining cost use the full history", () => {
  const result = portfolioStatistics(history.filter(row => row.platform.currency.code === "CAD") as unknown as Transaction[]);
  expect(result.netDeposits).toBe(930);
  expect(result.income).toBe(18);
  expect(result.realizedProfit).toBe(27.5);
  expect(result.fees).toBe(3);
  expect(result.holdings.totalShares).toBe(1.5);
  expect(result.holdings.totalBookCost).toBe(151.5);
  expect(result.holdings.realizedGain).toBe(9.5);
});

test("overview has eight flip cards, separated currencies and cold refresh", async () => {
  const overviewData = { ...data, history: [...history, tx("service-cad", "Service Fee", 5), tx("service-usd", "Service Fee", 7, "USD")] };
  const requests: any[] = [];
  const client = new ApolloClient({ cache: new InMemoryCache({ addTypename: false }), link: new ApolloLink(operation => new Observable(observer => {
    if (operation.operationName === "MarketValuation") { observer.next({ data: { marketValuation: null } }); observer.complete(); return; }
    requests.push({ variables: operation.variables, context: operation.getContext() });
    Promise.resolve().then(() => { observer.next({ data: { ...overviewData, analytics: analyticsFixture(overviewData.history as unknown as Transaction[]) } }); observer.complete(); });
  })) });
  render(<ApolloProvider client={client}><ProfileContext.Provider value={{ profile: { id: "owner", name: "Owner" }, profiles: [], loading: false, selectProfile: () => {}, refetch: async () => {} }}><PortfolioOverview /></ProfileContext.Provider></ApolloProvider>);
  await waitFor(() => expect(screen.getByRole("group", { name: "Net Deposits" })).toHaveTextContent("930.00"));
  expect(requests[0].variables).toEqual({ profileId: "owner" });
  expect(screen.getAllByRole("group")).toHaveLength(4);
  fireEvent.click(screen.getByRole("button", { name: "Show more statistics" }));
  expect(screen.getAllByRole("button", { name: /^About / })).toHaveLength(8);
  fireEvent.click(screen.getByRole("button", { name: "Show Total Book Cost" }));
  expect(screen.getByRole("group", { name: "Total Book Cost" })).toHaveTextContent("151.50");
  fireEvent.click(screen.getByRole("button", { name: "Show Realized Gain/Loss" }));
  expect(screen.getByRole("group", { name: "Realized Gain/Loss" })).toHaveTextContent("9.50");
  fireEvent.click(screen.getByRole("button", { name: "Show Realized Profit" }));
  expect(screen.getByRole("group", { name: "Realized Profit" })).toHaveTextContent("22.50");

  expect(screen.getByRole("group", { name: "Fees Paid" })).toHaveTextContent("40.00");
  fireEvent.click(screen.getByRole("tab", { name: "USD" }));
  expect(screen.getAllByRole("region", { name: "Market valuation" })).toHaveLength(1);
  expect(screen.getByRole("group", { name: "Net Deposits" })).toHaveTextContent("500.00");
  expect(screen.getByRole("group", { name: "Realized Gain/Loss" })).toHaveTextContent("0.00");
  fireEvent.click(screen.getByRole("button", { name: "Show Realized Profit" }));
  expect(screen.getByRole("group", { name: "Realized Profit" })).toHaveTextContent("-7.00");
  fireEvent.click(screen.getByRole("button", { name: "Show Total Book Cost" }));
  expect(screen.getByRole("group", { name: "Total Book Cost" })).toHaveTextContent("300.00");
  fireEvent.click(screen.getByRole("button", { name: "Show more statistics" }));
  expect(screen.getByRole("group", { name: "Largest Holding" })).toHaveTextContent("300.00");
  await coldRefetch(client, [PORTFOLIO_OVERVIEW]);
  expect(requests).toHaveLength(2);
  expect(requests[1].context.headers["X-Cache-Bypass"]).toBe("true");
  expect(screen.getAllByRole("button", { name: /^About / })).toHaveLength(8);
});


test("realized profit is unavailable when sale quantities are incomplete", () => {
  const result = portfolioStatistics([tx("sale", "Sell", 100, "CAD", 2, 0, true)] as unknown as Transaction[]);
  expect(result.realizedProfit).toBeUndefined();
});


test("ETF rebates increase realized profit without changing income, deposits, or holdings", () => {
  const cad = history.filter(row => row.platform.currency.code === "CAD");
  const before = portfolioStatistics(cad as unknown as Transaction[]);
  const after = portfolioStatistics([...cad, tx("rebate", "ETF Rebate", 1.12)] as unknown as Transaction[]);
  expect(after.realizedProfit).toBeCloseTo(28.62);
  expect(after.rebates).toBe(1.12);
  expect(after.income).toBe(before.income);
  expect(after.netDeposits).toBe(before.netDeposits);
  expect(after.contributions).toBe(before.contributions);
  expect(after.holdings.totalBookCost).toBe(before.holdings.totalBookCost);
  expect(after.holdings.realizedGain).toBe(before.holdings.realizedGain);
});


test("service fees reduce realized profit without double-counting trading fees or changing holdings", () => {
  const cad = history.filter(row => row.platform.currency.code === "CAD");
  const result = portfolioStatistics([...cad, tx("service-fee", "Service Fee", 5)] as unknown as Transaction[]);
  expect(result.realizedProfit).toBe(22.5);
  expect(result.serviceFees).toBe(5);
  expect(result.fees).toBe(8);
  expect(result.holdings.realizedGain).toBe(9.5);
  expect(result.holdings.totalBookCost).toBe(151.5);
  expect(result.netDeposits).toBe(930);
  expect(result.income).toBe(18);
});

test("account fees produce a loss even without stock trades", () => {
  const result = portfolioStatistics([tx("service-fee", "Service Fee", 5)] as unknown as Transaction[]);
  expect(result.realizedProfit).toBe(-5);
  expect(result.holdings.realizedGain).toBe(0);
});


test("smallest holding ignores sold and zero-cost positions", () => {
  const rows = [
    ["large", "Buy", 100, 2], ["small", "Buy", 20, 1],
    ["sold", "Buy", 5, 1], ["sold", "Sell", 6, 1], ["zero", "Buy", 0, 1],
  ].map(([ticker, activity, total, shares], index) => ({ ...tx(String(index), String(activity), Number(total), "CAD", Number(shares), 0, true), stock: { ...tx("", "", 0, "CAD", 0, 0, true).stock!, id: String(ticker), ticker: String(ticker) } }));
  const result = portfolioStatistics(rows as unknown as Transaction[]);
  expect(result.smallestHolding?.stock.ticker).toBe("small");
  expect(result.smallestHolding?.bookCost).toBe(20);
  expect(portfolioStatistics([]).smallestHolding).toBeUndefined();
});


test("SEC fees reduce account profit and increase fees without changing gains or holdings", () => {
  const usd = history.filter(row => row.platform.currency.code === "USD");
  const before = portfolioStatistics(usd as unknown as Transaction[]);
  const after = portfolioStatistics([...usd, tx("sec", "SEC Fee", 0.03, "USD")] as unknown as Transaction[]);
  expect(after.realizedProfit).toBeCloseTo(before.realizedProfit! - 0.03);
  expect(after.feesPaid).toBeCloseTo(before.feesPaid + 0.03);
  expect(after.holdings.realizedGain).toBe(before.holdings.realizedGain);
  expect(after.holdings.totalBookCost).toBe(before.holdings.totalBookCost);
  expect(after.netDeposits).toBe(before.netDeposits);
  expect(after.income).toBe(before.income);
});
