import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable, gql, useQuery } from "@apollo/client";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Transaction } from "../models/Transaction";
import { ProfileContext } from "../profiles/ProfileContext";
import { TransactionDataGrid } from "./TransactionDataGrid";

const query = gql`
  query DeleteTable($profileId: ID!) {
    transactionsByAccount(profileId: $profileId, account: "account") {
      id transactionDate total
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
  const { data } = useQuery(query, { variables: { profileId: "profile" } });
  return <TransactionDataGrid gridData={(data?.transactionsByAccount ?? []) as Transaction[]} defaultSort="transactionDate" ascending={false} removeColumns={["priceCurrency", "totalCurrency", "exchangeRate", "activity", "account", "platform", "stock", "price", "shares", "fee", "rate", "maturityDate", "total", "description"]} query={query} />;
}
function show(outcome: "success" | "failure" | "network" = "success") {
  let records = [...fixture];
  const deletes: Record<string, unknown>[] = [];
  let queryCount = 0;
  const link = new ApolloLink(operation => new Observable(observer => {
    const timer = setTimeout(() => {
      if (operation.operationName === "DeleteTransaction") {
        deletes.push(operation.variables);
        if (outcome === "network") { observer.error(new Error("Offline")); return; }
        if (outcome === "success") records = records.filter(row => row.id !== operation.variables.id);
        observer.next({ data: { deleteTransaction: { success: outcome === "success" } } });
      } else {
        queryCount++;
        observer.next({ data: { transactionsByAccount: records } });
      }
      observer.complete();
    }, 10);
    return () => clearTimeout(timer);
  }));
  render(<ApolloProvider client={new ApolloClient({ cache: new InMemoryCache({ addTypename: false }), link })}>
    <ProfileContext.Provider value={{ profiles: [{ id: "profile", name: "Demo" }], profile: { id: "profile", name: "Demo" }, loading: false, selectProfile: () => {}, refetch: async () => {} }}>
      <Table />
    </ProfileContext.Provider>
  </ApolloProvider>);
  return { deletes, queryCount: () => queryCount };
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

test.each(["failure", "network"] as const)("%s leaves the record visible and shows a retry error", async outcome => {
  show(outcome);
  await screen.findByText("2 of 2 transactions");
  fireEvent.click((await screen.findAllByRole("button", { name: "Delete transaction" }))[0]);
  const dialog = within(await screen.findByRole("dialog"));
  fireEvent.click(dialog.getByRole("button", { name: "Delete Transaction" }));
  expect(await dialog.findByText("Could not delete the transaction. Please try again.")).toBeInTheDocument();
  expect(screen.getByText("2 of 2 transactions")).toBeInTheDocument();
});
