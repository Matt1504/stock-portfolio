import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from "@apollo/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProfileContext } from "../../profiles/ProfileContext";
import PortfolioOverview from "./PortfolioOverview";
import { PORTFOLIO_OVERVIEW } from "./gql";
import { coldRefetch } from "../../utils/coldRefetch";
import { portfolioStatistics } from "../AccountView/portfolioStatistics";
import { Transaction } from "../../models/Transaction";

function tx(id: string, activity: string, total: number, code = "CAD", shares = 0, fee = 0, stock = false) {
  return { id, activity: { name: activity }, total, shares, fee, transactionDate: "2024-01-01", account: { id: "account", code: "TFSA" }, platform: { id: code, name: "Broker", currency: { id: code, code } }, stock: stock ? { id: "stock", name: "Example", ticker: "EX" } : null, price: 100 };
}
const history = [
  tx("1", "Buy", 202, "CAD", 2, 2, true), tx("2", "Sell", 60, "CAD", 0.5, 1, true),
  tx("3", "Contribution", 1000), tx("4", "Withdrawal", 100), tx("5", "Transfer In", 50), tx("6", "Transfer Out", 20),
  tx("7", "Dividends", 20, "CAD", 0, 0, true), tx("8", "Withholding Tax", 2, "CAD", 0, 0, true), tx("9", "Withholding Tax", 30),
  tx("10", "Buy", 300, "USD", 3, 0, true), tx("11", "Contribution", 500, "USD"),
];
const data = { history, currencies: { edges: ["CAD", "USD"].map(code => ({ node: { id: code, code } })) }, platforms: { edges: ["CAD", "CAD", "USD"].map((code, index) => ({ node: { id: String(index), currency: { id: code, code } } })) } };
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

test("overview has four primary cards, eight additional cards, separated currencies and cold refresh", async () => {
  const requests: any[] = [];
  const client = new ApolloClient({ cache: new InMemoryCache({ addTypename: false }), link: new ApolloLink(operation => new Observable(observer => {
    requests.push({ variables: operation.variables, context: operation.getContext() });
    Promise.resolve().then(() => { observer.next({ data }); observer.complete(); });
  })) });
  render(<ApolloProvider client={client}><ProfileContext.Provider value={{ profile: { id: "owner", name: "Owner" }, profiles: [], loading: false, selectProfile: () => {}, refetch: async () => {} }}><PortfolioOverview /></ProfileContext.Provider></ApolloProvider>);
  await waitFor(() => expect(screen.getByRole("group", { name: "Net Deposits" })).toHaveTextContent("930.00"));
  expect(requests[0].variables).toEqual({ profileId: "owner" });
  expect(screen.getAllByRole("button", { name: /^About / })).toHaveLength(4);
  expect(screen.getByRole("group", { name: "Total Book Cost" })).toHaveTextContent("151.50");
  expect(screen.getByRole("group", { name: "Realized Gain/Loss" })).toHaveTextContent("9.50");
  expect(screen.getByRole("group", { name: "Realized Profit" })).toHaveTextContent("27.50");
  fireEvent.click(screen.getByRole("button", { name: "Show more statistics" }));
  expect(screen.getAllByRole("button", { name: /^About / })).toHaveLength(12);
  expect(screen.getByRole("group", { name: "Active Trading Accounts" })).toHaveTextContent("2");
  fireEvent.click(screen.getByRole("tab", { name: "USD" }));
  expect(screen.getByRole("group", { name: "Net Deposits" })).toHaveTextContent("500.00");
  expect(screen.getByRole("group", { name: "Total Book Cost" })).toHaveTextContent("300.00");
  expect(screen.getByRole("group", { name: "Active Trading Accounts" })).toHaveTextContent("1");
  await coldRefetch(client, [PORTFOLIO_OVERVIEW]);
  expect(requests).toHaveLength(2);
  expect(requests[1].context.headers["X-Cache-Bypass"]).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Show fewer statistics" }));
  expect(screen.getAllByRole("button", { name: /^About / })).toHaveLength(4);
});


test("realized profit is unavailable when sale quantities are incomplete", () => {
  const result = portfolioStatistics([tx("sale", "Sell", 100, "CAD", 2, 0, true)] as unknown as Transaction[]);
  expect(result.realizedProfit).toBeUndefined();
});
