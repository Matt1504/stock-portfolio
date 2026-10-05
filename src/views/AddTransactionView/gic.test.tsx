import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from "@apollo/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AddTransactionView from "./index";
import { ProfileContext } from "../../profiles/ProfileContext";

const mockNotify = jest.fn();
jest.mock("../../components/Notification", () => ({ NotificationComponent: class {
  contextHolder = null;
  openNotificationWithIcon = mockNotify;
} }));
const edges = (nodes: object[]) => ({ edges: nodes.map(node => ({ node })) });
const currency = { id: "cad", code: "CAD" };
const mockSaved = jest.fn();
const mockRequests = jest.fn();
const metadata = { accounts: edges([{ id: "account", name: "TFSA", code: "TFSA" }]), currencies: edges([currency]), assets: edges([{ id: "asset", name: "GIC" }]),
  platforms: edges([{ id: "broker", name: "Broker", account: { id: "account" }, currency }]),
  stocks: edges([{ id: "stock", name: "Example", ticker: "EX", currency, asset: { id: "asset", name: "GIC" } }]),
  activities: edges([{ id: "maturity", name: "GIC Maturity" }, { id: "buy", name: "Buy" }]),
};
beforeEach(() => {
  mockNotify.mockClear();
  mockSaved.mockClear();
  mockRequests.mockClear();
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }) });
});
async function select(label: string, option: string) {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: label }));
  fireEvent.click((await screen.findAllByTitle(option)).find(element => element.classList.contains("ant-select-item-option"))!);
}
const purchase = { id: "purchase", total: 10000, transactionDate: "2025-10-01", maturityDate: "2026-10-01", rate: 4, interestCalculation: "simple", expectedMaturityTotal: 10400 };
function show(purchases = [purchase]) {
  const client = new ApolloClient({ cache: new InMemoryCache({ addTypename: false }), link: new ApolloLink(operation => new Observable(observer => {
    mockRequests(operation.operationName, operation.variables);
    const timer = setTimeout(() => {
      if (operation.operationName === "createTransaction") {
        mockSaved(operation.variables);
        observer.next({ data: { createTransaction: { transaction: { id: "new" }, warnings: [] } } });
      } else if (operation.operationName === "OutstandingGicPurchases") observer.next({ data: { outstandingGicPurchases: purchases } });
      else observer.next({ data: metadata });
      observer.complete();
    }, 0);
    return () => clearTimeout(timer);
  })) });
  render(<ApolloProvider client={client}><ProfileContext.Provider value={{ profile: { id: "owner", name: "Owner" }, profiles: [], loading: false, selectProfile: () => {}, refetch: async () => {} }}><AddTransactionView /></ProfileContext.Provider></ApolloProvider>);
}
async function setup(activity: string) {
  fireEvent.click(await screen.findByText("TFSA"));
  fireEvent.click(screen.getByText("CAD"));
  await select("Platform", "Broker");
  await select("Activity", activity);
  enterDate("2026-10-01");
}
function enterDate(value: string) {
  const date = screen.getByLabelText("Transaction Date");
  fireEvent.mouseDown(date); fireEvent.focus(date);
  fireEvent.change(date, { target: { value } });
  fireEvent.keyDown(date, { key: "Enter", code: "Enter", keyCode: 13, which: 13 });
}


test("GIC maturity selects an outstanding purchase and submits gross payout without shares", async () => {
  show(); await setup("GIC Maturity");
  await select("Stock", "Example (EX)");
  await waitFor(() => expect(mockRequests).toHaveBeenCalledWith("OutstandingGicPurchases", expect.objectContaining({ platform: "broker", stock: "stock", profileId: "owner" })), { timeout: 5000 });
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Original GIC Purchase" })).not.toBeDisabled(), { timeout: 5000 });
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Original GIC Purchase" }).closest(".ant-select")).toHaveTextContent("2025-10-01 · $10,000.00 · matures 2026-10-01"));
  await waitFor(() => expect(screen.getByLabelText("Gross Payout")).toHaveValue("10400.00"));
  expect(screen.getByLabelText("Shares")).not.toBeVisible();
  fireEvent.change(screen.getByLabelText("Gross Payout"), { target: { value: "10420" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  await waitFor(() => expect(mockSaved).toHaveBeenCalled(), { timeout: 3000 });
  const input = mockSaved.mock.calls[0][0].trans;
  expect(input).toEqual(expect.objectContaining({ gicPurchase: "purchase", total: 10420, stock: "stock", platform: "broker" }));
  expect(input.shares).toBeUndefined();
  expect(input.price).toBeUndefined();
}, 20000);


test("changing the payout date clears a nonmatch, selects a different matching purchase and supports manual selection", async () => {
  show([purchase, { ...purchase, id: "second", maturityDate: "2026-11-01", total: 20000, expectedMaturityTotal: 20800 }]);
  await setup("GIC Maturity"); await select("Stock", "Example (EX)");
  const field = screen.getByRole("combobox", { name: "Original GIC Purchase" }).closest(".ant-select")!;
  await waitFor(() => expect(field).toHaveTextContent("matures 2026-10-01"));
  enterDate("2026-11-01");
  await waitFor(() => expect(field).toHaveTextContent("matures 2026-11-01"));
  expect(screen.getByLabelText("Gross Payout")).toHaveValue("20800.00");
  enterDate("2026-11-02");
  await waitFor(() => expect(field).not.toHaveTextContent("matures"));
  expect(screen.getByLabelText("Gross Payout")).toHaveValue("");
  await select("Original GIC Purchase", "2025-10-01 · $20,000.00 · matures 2026-11-01");
  expect(field).toHaveTextContent("matures 2026-11-01");
  fireEvent.change(screen.getByLabelText("Gross Payout"), { target: { value: "20900" } });
  expect(field).toHaveTextContent("matures 2026-11-01");
}, 20000);

test("ambiguous matching maturity dates leave the purchase blank for manual selection", async () => {
  show([purchase, { ...purchase, id: "second", total: 20000 }]);
  await setup("GIC Maturity"); await select("Stock", "Example (EX)");
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Original GIC Purchase" })).not.toBeDisabled(), { timeout: 5000 });
  expect(screen.getByRole("combobox", { name: "Original GIC Purchase" }).closest(".ant-select")).not.toHaveTextContent("matures");
  expect(screen.getByLabelText("Gross Payout")).toHaveValue("");
}, 20000);
