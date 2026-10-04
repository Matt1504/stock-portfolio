import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from "@apollo/client";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AddTransactionView from "./index";

const edges = (nodes: object[]) => ({ edges: nodes.map(node => ({ node })) });
const currency = { id: "cad", code: "CAD" };
const account = { id: "account", name: "TFSA", code: "TFSA" };
const asset = { id: "asset", name: "Stock" };
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }) });
});
async function select(label: string, option: string) {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: label }));
  fireEvent.click(await screen.findByTitle(option));
}

test("inline creation refreshes and selects new items while preserving the transaction draft", async () => {
  const platforms: object[] = [];
  const stocks: object[] = [];
  const requests: any[] = [];
  const client = new ApolloClient({ cache: new InMemoryCache({ addTypename: false }), link: new ApolloLink(operation => new Observable(observer => {
    const timer = setTimeout(() => {
      let data;
      if (operation.operationName === "createPlatform") {
        requests.push(operation.variables);
        const platform = { id: "new-platform", name: "New Broker", currency, account };
        platforms.push(platform);
        data = { createPlatform: { platform } };
      } else if (operation.operationName === "creatStock") {
        requests.push(operation.variables);
        const stock = { id: "new-stock", name: "New Stock", ticker: "NEW", currency, asset };
        stocks.push(stock);
        data = { createStock: { stock } };
      } else {
        data = { accounts: edges([account]), currencies: edges([currency]), assets: edges([asset]), platforms: edges(platforms), stocks: edges(stocks), activities: edges([{ id: "buy", name: "Buy" }]) };
      }
      observer.next({ data }); observer.complete();
    }, 0);
    return () => clearTimeout(timer);
  })) });
  render(<ApolloProvider client={client}><AddTransactionView /></ApolloProvider>);
  fireEvent.click(await screen.findByText("TFSA"));
  fireEvent.click(screen.getByText("CAD"));
  await select("Activity", "Buy");
  fireEvent.change(screen.getByLabelText("Price"), { target: { value: "10" } });
  fireEvent.change(screen.getByLabelText("Shares"), { target: { value: "2" } });
  const date = screen.getByLabelText("Transaction Date");
  fireEvent.mouseDown(date);
  fireEvent.focus(date);
  fireEvent.change(date, { target: { value: "2026-10-01" } });
  fireEvent.keyDown(date, { key: "Enter", code: "Enter", keyCode: 13, which: 13 });

  expect(date).toHaveValue("2026-10-01");
  fireEvent.click(screen.getByRole("button", { name: "Add Platform" }));
  let dialog = within(await screen.findByRole("dialog"));
  expect(dialog.getByRole("radio", { name: "TFSA" })).toBeChecked();
  expect(dialog.getByRole("radio", { name: "CAD" })).toBeChecked();
  fireEvent.change(dialog.getByRole("textbox", { name: "Name" }), { target: { value: "New Broker" } });
  fireEvent.click(dialog.getByRole("button", { name: "Add Platform" }));
  await waitFor(() => expect(requests).toHaveLength(1), { timeout: 3000 });
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Platform" }).closest(".ant-select")).toHaveTextContent("New Broker"), { timeout: 3000 });
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

  fireEvent.click(screen.getByRole("button", { name: "Add Stock" }));
  dialog = within(await screen.findByRole("dialog"));
  expect(dialog.getByRole("radio", { name: "CAD" })).toBeChecked();
  expect(dialog.getByRole("combobox", { name: "Asset Type" }).closest(".ant-select")).toHaveTextContent("Stock");
  fireEvent.change(dialog.getByRole("textbox", { name: "Name" }), { target: { value: "New Stock" } });
  fireEvent.change(dialog.getByRole("textbox", { name: "Ticker" }), { target: { value: "new" } });
  fireEvent.click(dialog.getByRole("button", { name: "Add Stock" }));
  await waitFor(() => expect(requests).toHaveLength(2), { timeout: 3000 });
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Stock" }).closest(".ant-select")).toHaveTextContent("New Stock (NEW)"), { timeout: 3000 });
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(requests).toEqual([{ platform: { name: "New Broker", account: "account", currency: "cad" } }, { stock: { name: "New Stock", ticker: "NEW", currency: "cad", assetId: "asset" } }]);
  expect(Number((screen.getByLabelText("Price") as HTMLInputElement).value)).toBe(10);
  expect(Number((screen.getByLabelText("Shares") as HTMLInputElement).value)).toBe(2);
  expect(Number((screen.getByLabelText("Total") as HTMLInputElement).value)).toBe(20);
  expect(screen.getByLabelText("Transaction Date")).toHaveValue("2026-10-01");
}, 20000);
