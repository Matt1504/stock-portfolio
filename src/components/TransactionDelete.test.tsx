import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable, gql, useQuery } from "@apollo/client";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Transaction } from "../models/Transaction";
import { ProfileContext } from "../profiles/ProfileContext";
import { TransactionDataGrid } from "./TransactionDataGrid";

const query = gql`
  query DeleteTable($profileId: ID!) {
    transactionsByAccount(profileId: $profileId, account: "account") {
      id transactionDate total transferBatch
      activity { name }
      account { id code }
      platform { id name }
      stock { id name ticker }
    }
  }
`;
const fixture = ["1", "2"].map(id => ({
  id, transactionDate: "2026-10-01", total: 100,
  activity: { name: "Buy" }, account: { id: "account", code: "TFSA" },
  platform: { id: "broker", name: "Broker" }, stock: { id: "stock", name: "Example", ticker: "EX" },
}));
function Table() {
  const { data, loading } = useQuery(query, { variables: { profileId: "profile" }, notifyOnNetworkStatusChange: true });
  return <TransactionDataGrid loading={loading} gridData={(data?.transactionsByAccount ?? []) as Transaction[]} defaultSort="transactionDate" ascending={false} removeColumns={["priceCurrency", "totalCurrency", "exchangeRate", "activity", "account", "platform", "stock", "price", "shares", "fee", "rate", "maturityDate", "total", "description"]} query={query} />;
}
function show(outcome: "success" | "failure" | "network" = "success", holdRefetch = false, linked = false) {
  let records = fixture.map((row, index) => ({ ...row, transferBatch: linked && index === 0 ? "transfer-batch" : null }));
  const deletes: Record<string, unknown>[] = [];
  let queryCount = 0;
  const pendingRefetches: (() => void)[] = [];
  const link = new ApolloLink(operation => new Observable(observer => {
    const isDelete = operation.operationName === "DeleteTransaction";
    if (!isDelete) queryCount++;
    const respond = () => {
      if (operation.operationName === "DeleteTransaction") {
        deletes.push(operation.variables);
        if (outcome === "network") { observer.error(new Error("Offline")); return; }
        if (outcome === "success") records = records.filter(row => row.id !== operation.variables.id);
        observer.next({ data: { deleteTransaction: { success: outcome === "success" } } });
      } else {
        observer.next({ data: { transactionsByAccount: records } });
      }
      observer.complete();
    };
    if (!isDelete && queryCount > 1 && holdRefetch) {
      pendingRefetches.push(respond);
      return () => {
        const index = pendingRefetches.indexOf(respond);
        if (index >= 0) pendingRefetches.splice(index, 1);
      };
    }
    const timer = setTimeout(respond, 10);
    return () => clearTimeout(timer);
  }));
  render(<ApolloProvider client={new ApolloClient({ cache: new InMemoryCache({ addTypename: false }), link })}>
    <ProfileContext.Provider value={{ profiles: [{ id: "profile", name: "Demo" }], profile: { id: "profile", name: "Demo" }, loading: false, selectProfile: () => {}, refetch: async () => {} }}>
      <Table />
    </ProfileContext.Provider>
  </ApolloProvider>);
  return { deletes, queryCount: () => queryCount, releaseRefetch: () => pendingRefetches.splice(0).forEach(respond => respond()) };
}
beforeEach(() => localStorage.clear());

test("deleting requires confirmation, includes the profile, and refreshes the table", async () => {
  const transport = show();
  await screen.findByText("2 of 2 transactions");
  fireEvent.click((await screen.findAllByRole("button", { name: "Delete transaction" }))[0]);
  let dialog = within(await screen.findByRole("dialog", { name: "Delete transaction?" }));
  expect(dialog.getByText(/TFSA · Broker/)).toBeInTheDocument();
  expect(transport.deletes).toEqual([]);
  fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(transport.deletes).toEqual([]);
  fireEvent.click((await screen.findAllByRole("button", { name: "Delete transaction" }))[0]);
  dialog = within(await screen.findByRole("dialog"));
  fireEvent.click(dialog.getByRole("button", { name: "Delete Transaction" }));
  await screen.findByText("1 of 1 transactions");
  expect(transport.deletes).toEqual([{ id: "1", profileId: "profile" }]);
  expect(transport.queryCount()).toBeGreaterThan(1);
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

test("confirmation closes after deletion while the table refresh is still pending", async () => {
  const transport = show("success", true);
  await screen.findByText("2 of 2 transactions");
  fireEvent.click((await screen.findAllByRole("button", { name: "Delete transaction" }))[0]);
  const dialog = within(await screen.findByRole("dialog"));
  fireEvent.click(dialog.getByRole("button", { name: "Delete Transaction" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(transport.deletes).toEqual([{ id: "1", profileId: "profile" }]);
  expect(transport.queryCount()).toBeGreaterThan(1);
  expect(screen.getByRole("button", { name: "Bulk Edit" })).toBeDisabled();
  transport.releaseRefetch();
  await screen.findByText("1 of 1 transactions");
  await waitFor(() => expect(screen.getByRole("button", { name: "Bulk Edit" })).toBeEnabled());
});

test.each(["failure", "network"] as const)("%s leaves the record visible and shows a retry error", async outcome => {
  show(outcome);
  await screen.findByText("2 of 2 transactions");
  fireEvent.click((await screen.findAllByRole("button", { name: "Delete transaction" }))[0]);
  const dialog = within(await screen.findByRole("dialog"));
  fireEvent.click(dialog.getByRole("button", { name: "Delete Transaction" }));
  expect(await dialog.findByText("Could not delete the transaction. Please try again.")).toBeInTheDocument();
  expect(screen.getByText("2 of 2 transactions")).toBeInTheDocument();
});

test("search results render dates, retain edit/delete controls, and load the next batch on scroll", async () => {
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }) });
  const loadMore = jest.fn();
  const client = new ApolloClient({ cache: new InMemoryCache(), link: ApolloLink.empty() });
  render(<ApolloProvider client={client}><TransactionDataGrid searchMode hasMore onLoadMore={loadMore} gridData={fixture as unknown as Transaction[]} defaultSort="transactionDate" ascending={false} removeColumns={["priceCurrency", "totalCurrency", "exchangeRate", "activity", "account", "platform", "stock", "price", "shares", "fee", "rate", "maturityDate", "total"]} query={query} /></ApolloProvider>);
  expect(await screen.findByText('2 transactions loaded · more results available')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Delete transaction' })).toHaveLength(2);
  expect(screen.getAllByRole('button', { name: 'Edit transaction' })).toHaveLength(2);
  expect(screen.getAllByText('10/1/2026')).toHaveLength(2);
  expect(document.querySelector('.ant-table-body')).toBeNull();
  expect(screen.getByRole('columnheader', { name: /Transaction Date/ })).toHaveAttribute('aria-sort', 'descending');
  fireEvent.click(screen.getByRole('columnheader', { name: /Transaction Date/ }));
  fireEvent.click(screen.getByRole('columnheader', { name: /Transaction Date/ }));
  expect(screen.getByRole('columnheader', { name: /Transaction Date/ })).toHaveAttribute('aria-sort', 'ascending');
  fireEvent.scroll(window);
  expect(loadMore).toHaveBeenCalledTimes(1);
});


test("linked account-transfer rows cannot be edited or deleted individually", async () => {
  show("success", false, true);
  await screen.findByText("2 of 2 transactions");
  const edits = await screen.findAllByRole("button", { name: "Edit transaction" });
  const deletes = screen.getAllByRole("button", { name: "Delete transaction" });
  expect(edits[0]).toBeDisabled();
  expect(deletes[0]).toBeDisabled();
  expect(edits[1]).toBeEnabled();
  expect(deletes[1]).toBeEnabled();
});
