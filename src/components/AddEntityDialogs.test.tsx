import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from "@apollo/client";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AccountsAddDropdown from "../views/AccountView/AccountsAddDropdown";
import StocksAddDropdown from "../views/MyStocksView/StocksAddDropdown";

jest.mock("../views/AccountView/TransferAccountModal", () => () => <button>Transfer account</button>);
const usd = { id: "usd", code: "USD" };
const account = { id: "tfsa", code: "TFSA", name: "Savings" };
const metadata = { accounts: { edges: [{ node: account }] }, currencies: { edges: [{ node: usd }] }, platforms: { edges: [] }, stocks: { edges: [] } };
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }) });
});
function show(entity: "Stock" | "Platform", fail = false) {
  const requests: any[] = [];
  const client = new ApolloClient({ cache: new InMemoryCache({ addTypename: false }), link: new ApolloLink(operation => new Observable(observer => {
    requests.push(operation.variables);
    const timer = setTimeout(() => {
      if (fail) observer.error(new Error("Unavailable"));
      else observer.next({ data: entity === "Stock" ? { createStock: { stock: { id: "new", name: "Example", ticker: "EX", currency: usd } } } : { createPlatform: { platform: { id: "new", name: "Example", account, currency: usd } } } });
      observer.complete();
    }, 0);
    return () => clearTimeout(timer);
  })) });
  render(<ApolloProvider client={client}>{entity === "Stock"
    ? <StocksAddDropdown data={metadata as any} loading={false} selectedStockId={undefined} onStockChange={() => {}} />
    : <AccountsAddDropdown data={metadata as any} loading={false} options={[]} onAccountChange={() => {}} />}</ApolloProvider>);
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
  expect(requests[0]).toEqual(entity === "Stock" ? { stock: { name: "Example", ticker: "EX", currency: "usd" } } : { platform: { name: "Example", account: "tfsa", currency: "usd" } });
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
