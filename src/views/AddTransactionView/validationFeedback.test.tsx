import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from "@apollo/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GraphQLError } from "graphql";
import AddTransactionView from "./index";

const mockNotify = jest.fn();
jest.mock("../../components/Notification", () => ({ NotificationComponent: class {
  contextHolder = null;
  openNotificationWithIcon = mockNotify;
} }));
const edges = (nodes: object[]) => ({ edges: nodes.map(node => ({ node })) });
const currency = { id: "cad", code: "CAD" };
const metadata = { accounts: edges([{ id: "account", name: "TFSA", code: "TFSA" }]), currencies: edges([currency]), assets: edges([{ id: "asset", name: "Stock" }]),
  platforms: edges([{ id: "broker", name: "Broker", account: { id: "account" }, currency }]),
  stocks: edges([{ id: "stock", name: "Example", ticker: "EX", currency, asset: { id: "asset", name: "Stock" } }]),
  activities: edges([{ id: "sell", name: "Sell" }, { id: "contribution", name: "Contribution" }]),
};
beforeEach(() => {
  mockNotify.mockClear();
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }) });
});
async function select(label: string, option: string) {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: label }));
  fireEvent.click(await screen.findByTitle(option));
}
function show(warning = false) {
  const client = new ApolloClient({ cache: new InMemoryCache({ addTypename: false }), link: new ApolloLink(operation => new Observable(observer => {
    const timer = setTimeout(() => {
      if (operation.operationName === "createTransaction") observer.next(warning
        ? { data: { createTransaction: { transaction: { id: "new" }, warnings: [{ code: "CONTRIBUTION_LIMIT_EXCEEDED", message: "Transaction saved. Contribution limit exceeded." }] } } }
        : { errors: [new GraphQLError("Cannot sell more shares than you own.")] });
      else observer.next({ data: metadata });
      observer.complete();
    }, 0);
    return () => clearTimeout(timer);
  })) });
  render(<ApolloProvider client={client}><AddTransactionView /></ApolloProvider>);
}
async function setup(activity: string) {
  fireEvent.click(await screen.findByText("TFSA"));
  fireEvent.click(screen.getByText("CAD"));
  await select("Platform", "Broker");
  await select("Activity", activity);
  const date = screen.getByLabelText("Transaction Date");
  fireEvent.mouseDown(date); fireEvent.focus(date);
  fireEvent.change(date, { target: { value: "2026-10-01" } });
  fireEvent.keyDown(date, { key: "Enter", code: "Enter", keyCode: 13, which: 13 });
}

test("failed backend validation shows its error and keeps entered transaction values", async () => {
  show(); await setup("Sell");
  await select("Stock", "Example (EX)");
  fireEvent.change(screen.getByLabelText("Price"), { target: { value: "10" } });
  fireEvent.change(screen.getByLabelText("Shares"), { target: { value: "5" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  await waitFor(() => expect(mockNotify).toHaveBeenCalledWith("error", "Error Adding Transaction", "Cannot sell more shares than you own.", 8), { timeout: 3000 });
  expect(Number((screen.getByLabelText("Shares") as HTMLInputElement).value)).toBe(5);
  expect(screen.getByRole("combobox", { name: "Stock" }).closest(".ant-select")).toHaveTextContent("Example (EX)");
  expect(mockNotify.mock.calls.some(call => call[0] === "success")).toBe(false);
}, 20000);

test("saved contribution warning uses a warning notification instead of ordinary success", async () => {
  show(true); await setup("Contribution");
  fireEvent.change(screen.getByLabelText("Total"), { target: { value: "200" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  await waitFor(() => expect(mockNotify).toHaveBeenCalledWith("warning", "Transaction Added with warning", "Transaction saved. Contribution limit exceeded.", 8), { timeout: 3000 });
  expect(mockNotify.mock.calls.some(call => call[0] === "success")).toBe(false);
  await waitFor(() => expect(screen.getByLabelText("Total")).toHaveValue(""));
}, 20000);
