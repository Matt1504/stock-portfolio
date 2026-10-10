import { analyticsFixture } from "../testUtils/analyticsFixture";
import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from "@apollo/client";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DocumentNode, print } from "graphql";

import ReloadButton from "../components/ReloadButton";
import SelectedAccountInfo from "./AccountView/SelectedAccountInfo";
import { TRANSACTIONS_BY_ACCOUNT, TRANSACTIONS_BY_PLATFORM } from "./AccountView/gql";
import DashboardView from "./DashboardView";
import { DASHBOARD_METADATA, CONTRIBUTION_ANALYTICS } from "./DashboardView/gql";
import SelectedStockInfo from "./MyStocksView/SelectedStockInfo";
import { TRANSACTIONS_BY_STOCK } from "./MyStocksView/gql";

// Keep real Apollo hooks and cache behavior; replace only unrelated rendering.
jest.mock("./DashboardView/PortfolioOverview", () => () => null);
jest.mock("../components/TransactionDataGrid", () => ({
  TransactionDataGrid: ({ gridData }: { gridData: unknown }) => (
    <div data-testid="transactions">{JSON.stringify(gridData)}</div>
  ),
}));
jest.mock("./DashboardView/AddContributionLimit", () => () => null);
jest.mock("./DashboardView/ContributionGraph", () => () => null);
jest.mock("recharts", () => ({
  ...jest.requireActual("recharts"),
  ResponsiveContainer: () => null,
}));

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

const account = { __typename: "AccountType", hasContributionLimit: true, id: "account-1", name: "Tax-Free Savings", code: "TFSA" };
const accounts = { edges: [{ node: account }] };
const currencies = [
  { __typename: "CurrencyEdge", node: { __typename: "CurrencyType", id: "currency-cad", code: "CAD" } },
  { __typename: "CurrencyEdge", node: { __typename: "CurrencyType", id: "currency-usd", code: "USD" } },
];
const transaction = {
  id: "transaction-1",
  account,
  platform: { id: "platform-cad", name: "Broker", currency: { id: "currency-cad", code: "CAD" } },
  activity: { name: "Buy" },
  stock: { currency: null, id: "stock-1", name: "Example", ticker: "EX", asset: { id: "asset", name: "Stock" } },
  transferBatch: null, spinoffSource: null, allocatedBookCost: null, priceCurrency: null, totalCurrency: null, exchangeRate: 1, principalReturned: null, interestEarned: null, interestCalculation: "simple", gicPurchase: null, transactionDate: "2026-09-20",
  description: "Purchase",
  price: 10,
  shares: 1,
  fee: 0,
  rate: null,
  maturityDate: null,
  total: 10,
};

function metadata(amount: number, contribution = 100) {
  return { contributionAnalytics: [{ accountId: account.id, contribution, limit: amount, percentage: contribution / amount * 100, history: [] }] };
}

test("both broker currencies load concurrently and switching pending tabs preserves requests", async () => {
  const requests: { platform: string; observer: any; context: any }[] = [];
  const cancelled = jest.fn();
  const client = new ApolloClient({
    cache: new InMemoryCache({ addTypename: false }),
    link: new ApolloLink(operation => new Observable(observer => {
      if (operation.operationName === "MarketValuation") {
        observer.next({ data: { marketValuation: null } });
        observer.complete();
        return;
      }
      requests.push({ platform: operation.variables.platform_one, observer, context: operation.getContext() });
      return cancelled;
    })),
  });
  const platforms = currencies.map(({ node }) => ({ __typename: "PlatformType", id: node.code === "CAD" ? "platform-cad" : "platform-usd", name: "Broker", currency: node, account }));
  const viewFor = (index: number) => <ApolloProvider client={client}><SelectedAccountInfo name="Broker" platform={platforms[index].id} platformGroup={platforms} account={account.id} accountName="TFSA" currencies={currencies} currency={currencies[index].node} availableCurrencyIds={currencies.map(({ node }) => node.id)} onCurrencyChange={() => {}} /></ApolloProvider>;
  const view = render(viewFor(0));
  await waitFor(() => expect(requests).toHaveLength(2));
  expect(requests.map(request => request.platform).sort()).toEqual(["platform-cad", "platform-usd"]);
  view.rerender(viewFor(1));
  expect(requests).toHaveLength(2);
  expect(cancelled).not.toHaveBeenCalled();
  await act(async () => {
    for (const request of requests) {
      const platform = platforms.find(platform => platform.id === request.platform)!;
      request.observer.next({ data: { transactions: [{ ...transaction, id: request.platform, platform, total: request.platform === "platform-usd" ? 25 : 10 }], analytics: [] } });
      request.observer.complete();
    }
  });
  expect(await screen.findByTestId("transactions")).toHaveTextContent('"total":25');
  view.rerender(viewFor(0));
  await waitFor(() => expect(screen.getByTestId("transactions")).toHaveTextContent('"total":10'));
  expect(requests).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Reload data" }));
  await waitFor(() => expect(requests).toHaveLength(4));
  expect(requests.slice(2).map(request => request.platform).sort()).toEqual(["platform-cad", "platform-usd"]);
  expect(requests.slice(2).every(request => request.context.headers["X-Cache-Bypass"] === "true")).toBe(true);
  await act(async () => {
    for (const request of requests.slice(2)) {
      const platform = platforms.find(platform => platform.id === request.platform)!;
      request.observer.next({ data: { transactions: [{ ...transaction, id: request.platform, platform, total: 30 }], analytics: [] } });
      request.observer.complete();
    }
  });
});

function createClient(responses: Map<string, object>) {
  const requests: { query: string; variables: Record<string, unknown>; context: Record<string, any> }[] = [];
  const valuationRequests: { context: Record<string, any> }[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache({ addTypename: false }),
    link: new ApolloLink((operation) => new Observable((observer) => {
      if (operation.operationName === "MarketValuation") {
        valuationRequests.push({ context: operation.getContext() });
        observer.next({ data: { marketValuation: null } });
        observer.complete();
        return;
      }
      const query = print(operation.query);
      requests.push({ query, variables: operation.variables, context: operation.getContext() });
      const timeout = setTimeout(() => {
        const data = responses.get(query);
        if (!data) {
          observer.error(new Error("Unexpected test request"));
        } else {
          observer.next({ data: (data as any).transactions ? { ...data, analytics: analyticsFixture((data as any).transactions) } : data });
          observer.complete();
        }
      }, 0);
      return () => clearTimeout(timeout);
    })),
  });
  return { client, requests, valuationRequests };
}

function seed(client: ApolloClient<object>, query: DocumentNode, data: object, variables?: object) {
  client.cache.writeQuery({ query, data: (data as any).transactions ? { ...data, analytics: analyticsFixture((data as any).transactions) } : data, variables });
}

test("dashboard reload requests metadata and contribution summaries even when Apollo already has them cached", async () => {
  const responses = new Map<string, object>([
    [print(DASHBOARD_METADATA), { accounts, recentTransactions: [{ ...transaction, total: 20 }] }],
    [print(CONTRIBUTION_ANALYTICS), metadata(2000,250)],
  ]);
  const { client, requests } = createClient(responses);
  seed(client, DASHBOARD_METADATA, { accounts, recentTransactions: [transaction] }, {});
  seed(client, CONTRIBUTION_ANALYTICS, metadata(1000));

  render(<ApolloProvider client={client}><DashboardView /></ApolloProvider>);
  await screen.findByText("$100.00 / $1,000.00");
  expect(requests).toHaveLength(0);

  const reload = screen.getByRole("button", { name: "Reload data" });
  fireEvent.click(reload);
  expect(reload).toBeDisabled();
  await screen.findByText("$250.00 / $2,000.00");
  await waitFor(() => expect(reload).toBeEnabled());
  expect(requests.every(request => request.context.headers["X-Cache-Bypass"] === "true")).toBe(true);
  expect(requests.map((request) => request.query).sort()).toEqual(Array.from(responses.keys()).sort());
  expect(screen.queryByTestId("transactions")).not.toBeInTheDocument();

  fireEvent.click(reload);
  await waitFor(() => expect(requests).toHaveLength(4));
  await waitFor(() => expect(reload).toBeEnabled());
});

test("dashboard recalculates contribution limits when contributions are unchanged", async () => {
  const responses = new Map<string, object>([
    [print(DASHBOARD_METADATA), { accounts, recentTransactions: [transaction] }],
    [print(CONTRIBUTION_ANALYTICS), metadata(2000)],
  ]);
  const { client } = createClient(responses);
  seed(client, DASHBOARD_METADATA, responses.get(print(DASHBOARD_METADATA))!, {});
  seed(client, CONTRIBUTION_ANALYTICS, metadata(1000));
  render(<ApolloProvider client={client}><DashboardView /></ApolloProvider>);
  await screen.findByText("$100.00 / $1,000.00");
  fireEvent.click(screen.getByRole("button", { name: "Reload data" }));
  await screen.findByText("$100.00 / $2,000.00");
});

test.each([
  ["account overview", TRANSACTIONS_BY_ACCOUNT, undefined, { account: account.id }],
  ["broker account", TRANSACTIONS_BY_PLATFORM, "platform-cad", { platform_one: "platform-cad" }],
])("%s reload sends a fresh request with the selected variables", async (_label, query, platform, variables) => {
  const responses = new Map([[print(query), { transactions: [{ ...transaction, total: 20 }] }]]);
  const { client, requests } = createClient(responses);
  seed(client, query, { transactions: [transaction] }, variables);
  render(
    <ApolloProvider client={client}>
      <SelectedAccountInfo name="Overview" platform={platform} account={account.id} accountName="TFSA" currencies={currencies} currency={currencies[0].node} availableCurrencyIds={currencies.map(({ node }) => node.id)} onCurrencyChange={() => {}} />
    </ApolloProvider>
  );
  const reload = await screen.findByRole("button", { name: "Reload data" });
  await screen.findByTestId("transactions");
  expect(requests).toHaveLength(0);
  fireEvent.click(reload);
  await waitFor(() => expect(requests).toHaveLength(1));
  expect(requests[0].query).toBe(print(query));
  expect(requests[0].context.headers["X-Cache-Bypass"]).toBe("true");
  expect(requests[0].context.fetchOptions.cache).toBe("no-store");
  expect(requests[0].variables).toEqual(expect.objectContaining(variables));
  await waitFor(() => expect(screen.getByTestId("transactions")).toHaveTextContent('"total":20'));
});

test("stock reload continues to request the API even with cached transactions", async () => {
  const responses = new Map([[print(TRANSACTIONS_BY_STOCK), { transactions: [{ ...transaction, total: 20 }] }]]);
  const { client, requests, valuationRequests } = createClient(responses);
  seed(client, TRANSACTIONS_BY_STOCK, { transactions: [transaction] }, { stock: "stock-1" });
  render(<ApolloProvider client={client}><SelectedStockInfo stock="stock-1" name="Example" currency="CAD" /></ApolloProvider>);
  await screen.findByTestId("transactions");
  expect(requests).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Reload data" }));
  await waitFor(() => expect(requests).toHaveLength(1));
  expect(requests[0].context.headers["X-Cache-Bypass"]).toBe("true");
  expect(requests[0].context.fetchOptions.cache).toBe("no-store");
  expect(requests[0].variables).toEqual({ stock: "stock-1" });
  await waitFor(() => expect(valuationRequests).toHaveLength(2));
  expect(valuationRequests[1].context.headers["X-Cache-Bypass"]).toBe("true");
  await waitFor(() => expect(screen.getByTestId("transactions")).toHaveTextContent('"total":20'));
});

test("reload prevents duplicate clicks, reports errors, and allows a retry", async () => {
  let rejectReload: (error: Error) => void = () => {};
  const onReload = jest.fn()
    .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectReload = reject; }))
    .mockResolvedValueOnce(undefined);
  render(<ReloadButton onReload={onReload} />);
  const reload = screen.getByRole("button", { name: "Reload data" });
  fireEvent.click(reload);
  fireEvent.click(reload);
  expect(onReload).toHaveBeenCalledTimes(1);
  expect(reload).toBeDisabled();
  await act(async () => { rejectReload(new Error("Offline")); });
  await screen.findByText("Unable to reload data");
  expect(reload).toBeEnabled();
  fireEvent.click(reload);
  await waitFor(() => expect(reload).toBeEnabled());
  expect(onReload).toHaveBeenCalledTimes(2);
});
