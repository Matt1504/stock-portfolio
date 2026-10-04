import { useState } from "react";
import ReloadButton from "./ReloadButton";
import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable, gql } from "@apollo/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Transaction } from "../models/Transaction";
import { ProfileContext } from "../profiles/ProfileContext";
import { useProfileQuery } from "../profiles/hooks";
import { TransactionDataGrid } from "./TransactionDataGrid";
import BulkTransactionEditor from "./BulkTransactionEditor";
import { changedDraft, transactionDraft, updateDraft } from "./bulkTransactionDrafts";

const currency = { id: "cad", code: "CAD" };
const rows = [1, 2].map(id => ({ id: String(id), transactionDate: "2026-01-01", activity: { name: "Buy" }, account: { id: "a", code: "TFSA" }, platform: { id: "p", name: "Broker", currency }, stock: { id: "s", ticker: "EX", name: "Example", currency, asset: { id: "asset", name: "Stock" } }, price: 10.123, shares: 2, fee: null, total: 20.25 })) as unknown as Transaction[];
const connection = (nodes: any[]) => ({ edges: nodes.map(node => ({ node })) });
const options = {
  accounts: connection([{ id: "a", code: "TFSA" }]), currencies: connection([currency]),
  platforms: connection([{ id: "p", name: "Broker", account: { id: "a", code: "TFSA" }, currency }]),
  stocks: connection([rows[0].stock]), activities: connection([{ id: "buy", name: "Buy" }, { id: "contribution", name: "Contribution" }]),
};
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }) });
});
function show(fail: boolean | "mixed" = false, tableRows = rows, hiddenColumns: string[] = []) {
  const requests: any[] = [];
  const cancel = jest.fn();
  const link = new ApolloLink(operation => new Observable(observer => {
    if (operation.operationName === "BulkUpdateTransactions") {
      requests.push(operation.variables);
      observer.next({ data: { bulkUpdateTransactions: { results: operation.variables.transactions.map((row: any) => ({ id: row.id, success: !fail || (fail === "mixed" && row.id === "1"), error: fail ? "Cannot sell more than owned." : null, code: null, warnings: [] })) } } });
    } else observer.next({ data: options });
    observer.complete();
  }));
  render(<ApolloProvider client={new ApolloClient({ link, cache: new InMemoryCache({ addTypename: false }) })}><ProfileContext.Provider value={{ profiles: [], profile: { id: "profile", name: "Demo" }, loading: false, selectProfile() {}, refetch: async () => {} }}><BulkTransactionEditor hiddenColumns={hiddenColumns} rows={tableRows} defaultSort="transactionDate" ascending onCancel={cancel} /></ProfileContext.Provider></ApolloProvider>);
  return { requests, cancel };
}

test("drafts preserve precise prices, recalculate totals, and detect reverted changes", () => {
  const original = transactionDraft(rows[0]);
  expect(original.price).toBe(10.123);
  const edited = updateDraft(original, "shares", 100);
  expect(edited.total).toBe(1012.3);
  expect(changedDraft(original, edited)).toBe(true);
  expect(changedDraft(original, updateDraft(edited, "shares", 2))).toBe(false);
  expect(rows[0].shares).toBe(2);
});

test("sends one request containing only changed rows and their full price precision", async () => {
  const { requests, cancel } = show();
  const price = await screen.findByRole("spinbutton", { name: "Price 1" });
  await waitFor(() => expect(price).toBeEnabled());
  expect(price).toHaveValue("10.123");
  expect(screen.getByRole("spinbutton", { name: "Fee 1" })).toHaveValue("");
  fireEvent.change(price, { target: { value: "10.127" } });
  fireEvent.blur(price);
  expect(screen.getByRole("spinbutton", { name: "Total 1" })).toHaveValue("20.25");
  fireEvent.click(screen.getByRole("button", { name: /Submit \(1\)/ }));
  expect(await screen.findByText(/1 transaction\(s\) saved/)).toBeInTheDocument();
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(requests).toHaveLength(1);
  expect(requests[0].profileId).toBe("profile");
  expect(requests[0].transactions).toHaveLength(1);
  expect(requests[0].transactions[0]).toEqual(expect.objectContaining({ id: "1", price: 10.127, activity: "buy", fee: null }));
  await waitFor(() => expect(screen.getByRole("button", { name: /Submit \(0\)/ })).toBeDisabled());
});

test("cancel discards drafts without sending an update", async () => {
  const { requests, cancel } = show();
  const total = await screen.findByRole("spinbutton", { name: "Total 1" });
  await waitFor(() => expect(total).toBeEnabled());
  fireEvent.change(total, { target: { value: "30" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(requests).toHaveLength(0);
  expect(rows[0].total).toBe(20.25);
});

test("failed rows retain drafts and show the backend error", async () => {
  const { cancel } = show(true);
  const total = await screen.findByRole("spinbutton", { name: "Total 1" });
  await waitFor(() => expect(total).toBeEnabled());
  fireEvent.change(total, { target: { value: "30" } });
  fireEvent.blur(total);
  fireEvent.click(screen.getByRole("button", { name: /Submit \(1\)/ }));
  expect(await screen.findByText("Cannot sell more than owned.")).toBeInTheDocument();
  expect(cancel).not.toHaveBeenCalled();
  expect(total).toHaveValue("30");
  await waitFor(() => expect(screen.getByRole("button", { name: /Submit \(1\)/ })).toBeEnabled());
});


test("partial success keeps only rejected rows pending for the next submission", async () => {
  const { requests } = show("mixed");
  const first = await screen.findByRole("spinbutton", { name: "Total 1" });
  await waitFor(() => expect(first).toBeEnabled());
  fireEvent.change(first, { target: { value: "30" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Total 2" }), { target: { value: "40" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit (2)" }));
  expect(await screen.findByText(/1 transaction\(s\) saved/)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("button", { name: /Submit \(1\)/ })).toBeEnabled());
  fireEvent.click(await screen.findByRole("button", { name: "Submit (1)" }));
  await waitFor(() => expect(requests).toHaveLength(2));
  expect(requests[1].transactions.map((row: any) => row.id)).toEqual(["2"]);
  expect(await screen.findByText(/0 transaction\(s\) saved/)).toBeInTheDocument();
});

test("pagination preserves drafts when returning to a previous page", async () => {
  show(false, Array.from({ length: 12 }, (_, index) => ({ ...rows[0], id: String(index + 1) })));
  const first = await screen.findByRole("spinbutton", { name: "Total 1" });
  await waitFor(() => expect(first).toBeEnabled());
  fireEvent.change(first, { target: { value: "30" } });
  fireEvent.click(screen.getByRole("button", { name: "right" }));
  expect(await screen.findByRole("spinbutton", { name: "Total 11" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "left" }));
  expect(await screen.findByRole("spinbutton", { name: "Total 1" })).toHaveValue("30");
  expect(screen.getByRole("button", { name: /Submit \(1\)/ })).toBeEnabled();
});


const watchedTransactions = gql`query TransactionsForBulk($profileId: ID!) { transactionsByAccount(profileId: $profileId, account: "a") { id transactionDate total price shares fee activity { name } account { id code } platform { id name currency { id code } } stock { id ticker name currency { id code } asset { id name } } } }`;
function WatchedTable() {
  const [editing, setEditing] = useState(false);
  const { data, loading } = useProfileQuery(watchedTransactions, { notifyOnNetworkStatusChange: true });
  return <><ReloadButton onReload={async () => {}} disabled={editing} /><TransactionDataGrid onBulkEditChange={setEditing} gridData={data?.transactionsByAccount ?? []} loading={loading} defaultSort="transactionDate" ascending removeColumns={["account", "platform"]} query={watchedTransactions} /></>;
}
test.each(["failure", "success", "warning"])("%s submission refreshes data and retains drafts only for failures", async outcome => {
  localStorage.setItem("stock-portfolio-table-v1:TransactionsForBulk:account,platform", JSON.stringify({ sortModel: [{ field: "transactionDate", sort: "asc" }], pageSize: 10, visibility: { price: false }, widths: {}, density: "standard" }));
  let queryCount = 0;
  const link = new ApolloLink(operation => new Observable(observer => {
    const timer = setTimeout(() => {
      if (operation.operationName === "TransactionsForBulk") {
        queryCount++;
        observer.next({ data: { transactionsByAccount: rows } });
      } else if (operation.operationName === "BulkUpdateTransactions") {
        observer.next({ data: { bulkUpdateTransactions: { results: [{ id: "1", success: outcome !== "failure", error: outcome === "failure" ? "Review this row." : null, code: null, warnings: outcome === "warning" ? [{ code: "LIMIT", message: "Contribution limit exceeded." }] : [] }] } } });
      } else observer.next({ data: options });
      observer.complete();
    }, 5);
    return () => clearTimeout(timer);
  }));
  render(<ApolloProvider client={new ApolloClient({ link, cache: new InMemoryCache({ addTypename: false }) })}><ProfileContext.Provider value={{ profiles: [], profile: { id: "profile", name: "Demo" }, loading: false, selectProfile() {}, refetch: async () => {} }}><WatchedTable /></ProfileContext.Provider></ApolloProvider>);
  const bulkButton = await screen.findByRole("button", { name: "Bulk Edit" });
  await waitFor(() => expect(bulkButton).toBeEnabled());
  fireEvent.click(bulkButton);
  for (const name of ["Status", "Account", "Platform / currency", "Fee", "Price currency", "FX rate", "Price"]) expect(screen.queryByRole("columnheader", { name, exact: true })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reload data" })).toBeDisabled();
  const total = await screen.findByRole("spinbutton", { name: "Total 1" });
  await waitFor(() => expect(total).toBeEnabled());
  fireEvent.change(total, { target: { value: "30" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit (1)" }));
  expect(await screen.findByText(outcome === "failure" ? "Review this row." : "Transactions Updated")).toBeInTheDocument();
  expect(Boolean(screen.queryByRole("spinbutton", { name: "Total 1" }))).toBe(outcome === "failure");
  expect(Boolean(screen.queryByRole("button", { name: "Bulk Edit" }))).toBe(outcome !== "failure");
  expect(Boolean(screen.queryByText(/Contribution limit exceeded/))).toBe(outcome === "warning");
  if (outcome === "failure") fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(queryCount).toBeGreaterThan(1);
  expect(screen.getByRole("button", { name: "Reload data" })).toBeEnabled();
});


test("bulk editing hides excluded columns and leaves Total unpinned", async () => {
  show(false, rows, ["account", "platform", "fee", "priceCurrency", "exchangeRate"]);
  const price = await screen.findByRole("spinbutton", { name: "Price 1" });
  await waitFor(() => expect(price).toBeEnabled());
  for (const name of ["Status", "Account", "Platform / currency", "Fee", "Price currency", "FX rate"]) expect(screen.queryByRole("columnheader", { name, exact: true })).not.toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Total", exact: true })).not.toHaveClass("ant-table-cell-fix-right");
  fireEvent.change(screen.getByRole("spinbutton", { name: "Total 1" }), { target: { value: "30" } });
  expect(screen.getByRole("button", { name: "Submit (1)" })).toBeEnabled();
});
