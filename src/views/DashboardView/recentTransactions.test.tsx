import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from "@apollo/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import dayjs from "dayjs";
import DashboardView from "./index";
import { ProfileContext } from "../../profiles/ProfileContext";

jest.mock("./PortfolioOverview", () => () => null);
jest.mock("./AddContributionLimit", () => () => null);
jest.mock("./ContributionLimits", () => () => null);

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) });
});

function setup() {
  const requests: any[] = [];
  const profile = { id: "profile-1", name: "Owner" };
  const client = new ApolloClient({ cache: new InMemoryCache(), link: new ApolloLink(operation => new Observable(observer => {
    requests.push({ ...operation.variables });
    const recent = { id: "recent", transactionDate: dayjs().format("YYYY-MM-DD"), description: "Recent fixture" };
    const old = { id: "old", transactionDate: "2024-01-01", description: "Older fixture" };
    const rows = [recent, old].filter(row => (!operation.variables.startDate || row.transactionDate >= operation.variables.startDate) && (!operation.variables.endDate || row.transactionDate <= operation.variables.endDate))
      .map(row => ({ ...row, __typename: "TransactionType", account: { id: "a", code: "TFSA" }, platform: { id: "p", name: "Broker", currency: { id: "cad", code: "CAD" } }, activity: { name: "Contribution" }, stock: null, price: null, shares: null, fee: 0, rate: null, maturityDate: null, total: 100 }));
    Promise.resolve().then(() => { observer.next({ data: { accounts: { edges: [] }, recentTransactions: rows } }); observer.complete(); });
  })) });
  render(<ApolloProvider client={client}><ProfileContext.Provider value={{ profile, profiles: [profile], loading: false, selectProfile: () => {}, refetch: async () => {} }}><DashboardView /></ProfileContext.Provider></ApolloProvider>);
  return requests;
}
function editDate(placeholder: string, value: string) {
  const input = screen.getByPlaceholderText(placeholder);
  fireEvent.mouseDown(input);
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter", keyCode: 13, which: 13 });
}

test("recent transactions preload a 30-day inclusive range and clearing fetches older history", async () => {
  const requests = setup();
  expect(screen.getByRole("heading", { name: "Recent Transactions" })).toBeInTheDocument();
  await screen.findByText("1 of 1 transactions");
  expect(screen.getByPlaceholderText("Start date")).toHaveValue(dayjs().subtract(29, "day").format("YYYY-MM-DD"));
  expect(screen.getByPlaceholderText("End date")).toHaveValue(dayjs().format("YYYY-MM-DD"));
  expect(requests[0]).toEqual({ profileId: "profile-1", startDate: dayjs().subtract(29, "day").format("YYYY-MM-DD"), endDate: dayjs().format("YYYY-MM-DD") });
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  await screen.findByText("2 of 2 transactions");
  expect(requests[1]).toEqual({ profileId: "profile-1", startDate: null, endDate: null });
  expect(screen.getByPlaceholderText("Start date")).toHaveValue("");
  expect(screen.getByPlaceholderText("End date")).toHaveValue("");
});

test("an older date range fetches the API and reload retains the chosen bounds", async () => {
  const requests = setup();
  await screen.findByText("1 of 1 transactions");
  editDate("Start date", "2024-01-01");
  editDate("End date", "2024-01-01");
  fireEvent.blur(screen.getByPlaceholderText("End date"));
  await waitFor(() => expect(requests.some(request => request.startDate === "2024-01-01" && request.endDate === "2024-01-01")).toBe(true));
  await screen.findByText("1 of 1 transactions");
  // Inspect real grid rows: the older row replaces the recent record.
  expect(await screen.findByText("1/1/2024")).toBeInTheDocument();
  const beforeReload = requests.length;
  fireEvent.click(screen.getByRole("button", { name: "Reload data" }));
  await waitFor(() => expect(requests.length).toBeGreaterThan(beforeReload));
  expect(requests[requests.length - 1]).toEqual({ profileId: "profile-1", startDate: "2024-01-01", endDate: "2024-01-01" });
});
