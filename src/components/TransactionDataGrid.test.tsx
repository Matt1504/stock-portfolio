import { ApolloClient, ApolloProvider, InMemoryCache, gql } from "@apollo/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Transaction } from "../models/Transaction";
import { TransactionDataGrid } from "./TransactionDataGrid";
const query = gql`query ExampleTable { transactions { id } }`;
const rows = [
  { id: "1", transactionDate: "2026-01-01", activity: { name: "Buy" }, account: { id: "a", code: "TFSA" }, stock: { id: "s", name: "Example", ticker: "EX" }, platform: { id: "b", name: "Broker" }, total: 100 },
  { id: "2", transactionDate: "2026-01-02", activity: { name: "Contribution" }, account: { id: "a", code: "TFSA" }, platform: { id: "b", name: "Broker" }, total: 200 },
] as unknown as Transaction[];
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }) });
});
function show(hiddenFilters?: ("account" | "stock")[]) {
  return render(<ApolloProvider client={new ApolloClient({ cache: new InMemoryCache() })}><TransactionDataGrid gridData={rows} hiddenFilters={hiddenFilters} defaultSort="transactionDate" ascending={false} removeColumns={[]} query={query} /></ApolloProvider>);
}
test("table groups amounts and fractional shares without changing numeric data", () => {
  const transactions = [{ ...rows[0], total: 12345.6, shares: 1234.56789, fee: 0 }];
  render(<ApolloProvider client={new ApolloClient({ cache: new InMemoryCache() })}><TransactionDataGrid gridData={transactions} defaultSort="transactionDate" ascending={false} removeColumns={["transactionDate", "activity", "account", "platform", "stock", "price"]} query={query} /></ApolloProvider>);
  expect(screen.getByText("12,345.60")).toBeInTheDocument();
  expect(screen.getByText("1,234.5679")).toBeInTheDocument();
  expect(transactions[0].total).toBe(12345.6);
  expect(transactions[0].shares).toBe(1234.56789);
});
test("activity filter changes rows and clearing restores them", async () => {
  show();
  expect(screen.getByText("2 of 2 transactions")).toBeInTheDocument();
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Filter by activity" }));
  fireEvent.click(screen.getAllByTitle("Buy").find(element => element.classList.contains("ant-select-item-option"))!);
  expect(await screen.findByText("1 of 2 transactions")).toBeInTheDocument();
  expect(screen.getAllByRole("row")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(screen.getByText("2 of 2 transactions")).toBeInTheDocument();
});
test("column width persists through a remount and reset restores defaults", async () => {
  const view = show();
  fireEvent.click(screen.getByRole("button", { name: "Table settings" }));
  fireEvent.change(await screen.findByRole("spinbutton", { name: "Column width in pixels" }), { target: { value: "340" } });
  await waitFor(() => expect(JSON.parse(localStorage.getItem("stock-portfolio-table-v1:ExampleTable:")!).widths.transactionDate).toBe(340));
  view.unmount();
  show();
  fireEvent.click(screen.getByRole("button", { name: "Table settings" }));
  expect(await screen.findByRole("spinbutton", { name: "Column width in pixels" })).toHaveValue("340");
  fireEvent.click(screen.getByRole("button", { name: "Reset table preferences" }));
  await waitFor(() => expect(screen.getByRole("spinbutton", { name: "Column width in pixels" })).toHaveValue("200"));
});

test("sorting is saved and restored", async () => {
  const view = show();
  fireEvent.click(screen.getByRole("columnheader", { name: "Activity" }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem("stock-portfolio-table-v1:ExampleTable:")!).sortModel).toEqual([{ field: "activity", sort: "asc" }]));
  view.unmount();
  show();
  expect(screen.getByRole("columnheader", { name: "Activity" })).toHaveAttribute("aria-sort", "ascending");
});


test.each(["account", "stock"] as const)("hides the redundant %s filter while retaining useful filters", hidden => {
  show([hidden]);
  expect(screen.queryByRole("combobox", { name: `Filter by ${hidden}` })).not.toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Filter by activity" })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: `Filter by ${hidden === "account" ? "stock" : "account"}` })).toBeInTheDocument();
});

test("read-only prices display two decimals without reducing stored precision", () => {
  const transactions = [{ ...rows[0], price: 10.123 }];
  render(<ApolloProvider client={new ApolloClient({ cache: new InMemoryCache() })}><TransactionDataGrid gridData={transactions} defaultSort="transactionDate" ascending={false} removeColumns={["transactionDate", "activity", "account", "platform", "stock"]} query={query} /></ApolloProvider>);
  expect(screen.getByText("10.12")).toBeInTheDocument();
  expect(transactions[0].price).toBe(10.123);
});
