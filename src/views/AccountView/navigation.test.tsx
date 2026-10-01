import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from "@apollo/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { print } from "graphql";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";

import AccountView from "./index";
import { ALL_ACCOUNT_PLATFORMS, TRANSACTIONS_BY_ACCOUNT, TRANSACTIONS_BY_PLATFORM } from "./gql";

jest.mock("../../components/TransactionDataGrid", () => ({
  TransactionDataGrid: ({ gridData }: { gridData: unknown }) => (
    <div data-testid="transactions">{JSON.stringify(gridData)}</div>
  ),
}));
jest.mock("./TransferAccountModal", () => () => null);
jest.mock("recharts", () => ({ ...jest.requireActual("recharts"), ResponsiveContainer: () => null }));

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false, media: query, onchange: null,
      addListener: jest.fn(), removeListener: jest.fn(),
      addEventListener: jest.fn(), removeEventListener: jest.fn(), dispatchEvent: jest.fn(),
    }),
  });
});

const rrsp = { id: "rrsp-id", name: "Retirement", code: "RRSP" };
const tfsa = { id: "tfsa-id", name: "Tax-Free Savings", code: "TFSA" };
const usd = { id: "usd-id", name: "United States Dollar", code: "USD" };
const cad = { id: "cad-id", name: "Canadian Dollar", code: "CAD" };
const brokerUsd = { id: "ws-rrsp-usd", name: "Wealthsimple", account: rrsp, currency: usd };
const brokerCad = { id: "ws-rrsp-cad", name: "Wealthsimple", account: rrsp, currency: cad };
const singleCurrencyBroker = { id: "tfsa-usd", name: "Other Broker", account: tfsa, currency: usd };
const metadata = {
  accounts: { edges: [{ node: rrsp }, { node: tfsa }] },
  // USD first intentionally: tab routing must not depend on database order.
  platforms: { edges: [{ node: brokerUsd }, { node: brokerCad }, { node: singleCurrencyBroker }] },
  currencies: { edges: [{ node: usd }, { node: cad }] },
};
const transactions = [brokerCad, brokerUsd].map((platform, index) => ({
  id: `transaction-${platform.currency.code}`,
  account: rrsp,
  platform,
  activity: { name: "Buy" },
  stock: { id: "stock-1", ticker: "EX", name: "Example" },
  description: "Purchase",
  transactionDate: "2026-09-20",
  price: 10,
  shares: index + 2,
  fee: 0,
  total: (index + 1) * 110,
  rate: null,
  maturityDate: null,
}));

function NavigationControls() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="url">{location.pathname}{location.search}</output>
      <button onClick={() => navigate(-1)}>Back</button>
      <button onClick={() => navigate(1)}>Forward</button>
      <AccountView />
    </>
  );
}

function renderPage(url = "/myaccounts") {
  const requests: { query: string; variables: Record<string, unknown> }[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache({ addTypename: false }),
    link: new ApolloLink((operation) => new Observable((observer) => {
      const query = print(operation.query);
      requests.push({ query, variables: operation.variables });
      const timeout = setTimeout(() => {
        let data;
        if (query === print(ALL_ACCOUNT_PLATFORMS)) data = metadata;
        else if (query === print(TRANSACTIONS_BY_PLATFORM)) {
          data = { transactions: transactions.filter((transaction) => transaction.platform.id === operation.variables.platform_one) };
        } else if (query === print(TRANSACTIONS_BY_ACCOUNT)) {
          data = { transactions: transactions.filter((transaction) => transaction.account.id === operation.variables.account) };
        } else {
          observer.error(new Error("Unexpected request"));
          return;
        }
        observer.next({ data });
        observer.complete();
      }, 0);
      return () => clearTimeout(timeout);
    })),
  });
  const view = render(
    <ApolloProvider client={client}>
      <MemoryRouter initialEntries={[url]}><NavigationControls /></MemoryRouter>
    </ApolloProvider>
  );
  return { ...view, requests };
}

function params() {
  return new URLSearchParams(screen.getByTestId("url").textContent!.split("?")[1]);
}

async function chooseAccount(label: string) {
  fireEvent.mouseDown(await screen.findByRole("combobox", { name: "Select an account" }));
  fireEvent.click(await screen.findByText(label, { selector: ".ant-select-item-option-content" }));
}

test("a cold deep link loads the requested broker and currency, including after a remount", async () => {
  const url = "/myaccounts?account=ws-rrsp-cad&currency=usd-id";
  const first = renderPage(url);
  await screen.findByRole("heading", { name: "RRSP Wealthsimple" });
  await waitFor(() => expect(screen.getByTestId("transactions")).toHaveTextContent("transaction-USD"));
  expect(screen.getByRole("tab", { name: "USD" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByTestId("transactions")).not.toHaveTextContent("transaction-CAD");
  expect(first.requests.filter((request) => request.query === print(TRANSACTIONS_BY_PLATFORM))).toEqual([
    { query: print(TRANSACTIONS_BY_PLATFORM), variables: { platform_one: "ws-rrsp-usd" } },
  ]);
  first.unmount();
  renderPage(url);
  await waitFor(() => expect(screen.getByTestId("transactions")).toHaveTextContent("transaction-USD"));
  expect(screen.getByRole("tab", { name: "USD" })).toHaveAttribute("aria-selected", "true");
});

test("currency clicks update the URL and browser back/forward restores both tabs and data", async () => {
  renderPage("/myaccounts?account=ws-rrsp-cad&currency=usd-id&source=bookmark");
  await waitFor(() => expect(screen.getByTestId("transactions")).toHaveTextContent("transaction-USD"));
  fireEvent.click(screen.getByRole("tab", { name: "CAD" }));
  await waitFor(() => expect(screen.getByTestId("transactions")).toHaveTextContent("transaction-CAD"));
  expect(params().get("currency")).toBe("cad-id");
  expect(params().get("account")).toBe("ws-rrsp-cad");
  expect(params().get("source")).toBe("bookmark");
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  await waitFor(() => expect(screen.getByTestId("transactions")).toHaveTextContent("transaction-USD"));
  expect(params().get("currency")).toBe("usd-id");
  expect(screen.getByRole("tab", { name: "USD" })).toHaveAttribute("aria-selected", "true");
  fireEvent.click(screen.getByRole("button", { name: "Forward" }));
  await waitFor(() => expect(screen.getByTestId("transactions")).toHaveTextContent("transaction-CAD"));
  expect(params().get("currency")).toBe("cad-id");
});

test("the selector writes real IDs and back navigation restores the prior account", async () => {
  renderPage();
  await chooseAccount("RRSP Wealthsimple");
  await waitFor(() => expect(screen.getByTestId("transactions")).toHaveTextContent("transaction-CAD"));
  expect(params().get("account")).toBe("ws-rrsp-cad");
  expect(params().get("currency")).toBe("cad-id");
  await chooseAccount("TFSA Overview");
  await screen.findByRole("heading", { name: "TFSA Overview" });
  await waitFor(() => expect(screen.getByTestId("transactions")).toHaveTextContent("[]"));
  expect(params().get("account")).toBe("tfsa-id");
  await waitFor(() => expect(screen.getByText("Total Share(s) Owned").closest(".ant-statistic")).toHaveTextContent("0"));
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  await screen.findByRole("heading", { name: "RRSP Wealthsimple" });
  await waitFor(() => expect(screen.getByTestId("transactions")).toHaveTextContent("transaction-CAD"));
});

test("overview links use the account type ID and filter the table when switching currencies", async () => {
  const { requests } = renderPage("/myaccounts?account=rrsp-id&currency=usd-id");
  await screen.findByRole("heading", { name: "RRSP Overview" });
  await waitFor(() => expect(screen.getByTestId("transactions")).toHaveTextContent("transaction-USD"));
  expect(screen.getByTestId("transactions")).not.toHaveTextContent("transaction-CAD");
  fireEvent.click(screen.getByRole("tab", { name: "CAD" }));
  await waitFor(() => expect(screen.getByTestId("transactions")).toHaveTextContent("transaction-CAD"));
  expect(screen.getByTestId("transactions")).not.toHaveTextContent("transaction-USD");
  expect(requests.filter((request) => request.query === print(TRANSACTIONS_BY_ACCOUNT))).toHaveLength(1);
});

test("an account link without currency selects its platform currency and makes it explicit in the URL", async () => {
  renderPage("/myaccounts?account=ws-rrsp-usd");
  await waitFor(() => expect(screen.getByTestId("transactions")).toHaveTextContent("transaction-USD"));
  expect(params().get("currency")).toBe("usd-id");
  expect(screen.getByRole("tab", { name: "USD" })).toHaveAttribute("aria-selected", "true");
});

test("an unavailable currency falls back safely and unavailable broker tabs are disabled", async () => {
  const { requests } = renderPage("/myaccounts?account=tfsa-usd&currency=cad-id");
  await screen.findByRole("heading", { name: "TFSA Other Broker" });
  await waitFor(() => expect(params().get("currency")).toBe("usd-id"));
  expect(screen.getByRole("tab", { name: "USD" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tab", { name: "CAD" })).toHaveAttribute("aria-disabled", "true");
  expect(requests.filter((request) => request.query === print(TRANSACTIONS_BY_PLATFORM))).toEqual([
    { query: print(TRANSACTIONS_BY_PLATFORM), variables: { platform_one: "tfsa-usd" } },
  ]);
});

test("an invalid account link shows a recoverable message without querying transactions", async () => {
  const { requests } = renderPage("/myaccounts?account=missing&currency=usd-id");
  await screen.findByText("This account could not be found. Select an account above.");
  expect(screen.queryByTestId("transactions")).not.toBeInTheDocument();
  expect(requests).toHaveLength(1);
  await chooseAccount("RRSP Wealthsimple");
  await waitFor(() => expect(screen.getByTestId("transactions")).toHaveTextContent("transaction-USD"));
  expect(screen.queryByText("This account could not be found. Select an account above.")).not.toBeInTheDocument();
});

test("the bare accounts URL loads the selector without selecting or querying an account", async () => {
  const { requests } = renderPage();
  await screen.findByRole("combobox", { name: "Select an account" });
  expect(screen.queryByTestId("transactions")).not.toBeInTheDocument();
  expect(screen.getByTestId("url")).toHaveTextContent(/^\/myaccounts$/);
  expect(requests).toHaveLength(1);
});
