import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from "@apollo/client";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AccountsAddDropdown from "../views/AccountView/AccountsAddDropdown";
import StocksAddDropdown from "../views/MyStocksView/StocksAddDropdown";

jest.mock("../views/AccountView/TransferAccountModal", () => () => <button>Transfer account</button>);
const usd = { id: "usd", code: "USD" };
const account = { id: "tfsa", code: "TFSA", name: "Savings" };
const metadata = { assets: { edges: [{ node: { id: "asset-stock", name: "Stock" } }, { node: { id: "asset-gic", name: "GIC" } }] }, accounts: { edges: [{ node: account }] }, currencies: { edges: [{ node: usd }] }, platforms: { edges: [] }, stocks: { edges: [] } };
jest.setTimeout(20000);
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }) });
});
function show(entity: "Stock" | "Platform", fail = false, compact = false) {
  const requests: any[] = [];
  const client = new ApolloClient({ cache: new InMemoryCache({ addTypename: false }), link: new ApolloLink(operation => new Observable(observer => {
    requests.push(operation.variables);
    const timer = setTimeout(() => {
      if (fail) observer.error(new Error("Unavailable"));
      else observer.next({ data: entity === "Stock" ? { createStock: { stock: { id: "new", name: "Example", ticker: "EX", asset: { id: "asset-stock", name: "Stock" }, currency: usd } } } : { createPlatform: { platform: { id: "new", name: "Example", account, currency: usd } } } });
      observer.complete();
    }, 0);
    return () => clearTimeout(timer);
  })) });
  render(<ApolloProvider client={client}>{entity === "Stock"
    ? <StocksAddDropdown compact={compact} data={metadata as any} loading={false} selectedStockId={undefined} onStockChange={() => {}} />
    : <AccountsAddDropdown compact={compact} data={metadata as any} loading={false} options={[]} onAccountChange={() => {}} />}</ApolloProvider>);
  return requests;
}

test.each(["Stock", "Platform"] as const)("Add %s dialog validates, submits, and closes on success", async entity => {
  const requests = show(entity);
  expect(screen.queryByRole("textbox", { name: "Name" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: `Add ${entity}` }));
  const dialog = within(await screen.findByRole("dialog"));
  fireEvent.click(dialog.getByRole("button", { name: `Add ${entity}` }));
  expect(await dialog.findByText("Please enter a name.")).toBeInTheDocument();
  expect(requests).toHaveLength(0);
  fireEvent.change(dialog.getByRole("textbox", { name: "Name" }), { target: { value: "Example" } });
  if (entity === "Stock") fireEvent.change(dialog.getByRole("textbox", { name: "Ticker" }), { target: { value: "ex" } });
  else fireEvent.click(dialog.getByRole("radio", { name: "TFSA" }));
  fireEvent.click(dialog.getByRole("radio", { name: "USD" }));
  fireEvent.click(dialog.getByRole("button", { name: `Add ${entity}` }));
  await waitFor(() => expect(requests).toHaveLength(1));
  expect(requests[0]).toEqual(entity === "Stock" ? { stock: { name: "Example", ticker: "EX", currency: "usd", assetId: "asset-stock" } } : { platform: { name: "Example", account: "tfsa", currency: "usd" } });
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

test.each(["Stock", "Platform"] as const)("cancel Add %s discards draft fields", async entity => {
  show(entity);
  fireEvent.click(screen.getByRole("button", { name: `Add ${entity}` }));
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Draft" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: `Add ${entity}` }));
  expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("");
});

test("failed stock save preserves entered fields and keeps dialog open", async () => {
  show("Stock", true);
  fireEvent.click(screen.getByRole("button", { name: "Add Stock" }));
  const dialog = within(await screen.findByRole("dialog"));
  fireEvent.change(dialog.getByRole("textbox", { name: "Name" }), { target: { value: "Example" } });
  fireEvent.change(dialog.getByRole("textbox", { name: "Ticker" }), { target: { value: "ex" } });
  fireEvent.click(dialog.getByRole("radio", { name: "USD" }));
  fireEvent.click(dialog.getByRole("button", { name: "Add Stock" }));
  await screen.findByText("Could not save the stock. Please try again.");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(dialog.getByRole("textbox", { name: "Name" })).toHaveValue("Example");
});


test("Add Stock allows choosing a GIC asset type", async () => {
  const requests = show("Stock");
  fireEvent.click(screen.getByRole("button", { name: "Add Stock" }));
  const dialog = within(await screen.findByRole("dialog"));
  fireEvent.change(dialog.getByRole("textbox", { name: "Name" }), { target: { value: "Deposit" } });
  fireEvent.change(dialog.getByRole("textbox", { name: "Ticker" }), { target: { value: "gic" } });
  fireEvent.mouseDown(dialog.getByRole("combobox", { name: "Asset Type" }));
  fireEvent.click(await screen.findByTitle("GIC"));
  fireEvent.click(dialog.getByRole("radio", { name: "USD" }));
  fireEvent.click(dialog.getByRole("button", { name: "Add Stock" }));
  await waitFor(() => expect(requests).toHaveLength(1));
  expect(requests[0].stock).toMatchObject({ assetId: "asset-gic" });
});


test.each(["Stock", "Platform"] as const)("compact Add %s button opens its shared dialog", async entity => {
  show(entity, false, true);
  expect(screen.queryByRole("combobox", { name: /^Select / })).not.toBeInTheDocument();
  const button = screen.getByRole("button", { name: `Add ${entity}` });
  expect(button).not.toHaveTextContent(`Add ${entity}`);
  fireEvent.mouseOver(button);
  expect(await screen.findByRole("tooltip")).toHaveTextContent(`Add ${entity}`);
  fireEvent.click(button);
  expect(await screen.findByRole("dialog")).toHaveTextContent(`Add ${entity}`);
});
