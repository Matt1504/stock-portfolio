import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from "@apollo/client";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { CREATE_TRANSACTION } from "../views/AddTransactionView/gql";
import { TRANSACTIONS_BY_STOCK } from "../views/MyStocksView/gql";
import ProfileProvider, { PROFILE_STORAGE_KEY, ProfileContent, useProfile } from "./ProfileContext";
import ProfileSelector from "./ProfileSelector";
import { useProfileMutation, useProfileQuery } from "./hooks";

const alice = { __typename: "ProfileType", id: "alice", name: "Alice" };
const bob = { __typename: "ProfileType", id: "bob", name: "Bob" };
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "matchMedia", { writable: true, value: (query: string) => ({ matches: false, media: query, addListener: jest.fn(), removeListener: jest.fn(), addEventListener: jest.fn(), removeEventListener: jest.fn() }) });
});

function Details() {
  const { profile } = useProfile();
  const [draft, setDraft] = useState("");
  const { data } = useProfileQuery(TRANSACTIONS_BY_STOCK, { variables: { stock: "shared-stock" } });
  const [create] = useProfileMutation(CREATE_TRANSACTION);
  return <>
    <output data-testid="owner">{profile?.name}</output>
    <output data-testid="shares">{data?.transactions[0]?.shares}</output>
    <input aria-label="Transaction draft" value={draft} onChange={event => setDraft(event.target.value)} />
    <button onClick={() => void create({ variables: { trans: { platform: "platform-" + profile?.id, total: 1 } } })}>Save fixture transaction</button>
  </>;
}
function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectProfile } = useProfile();
  return <>
    <output data-testid="url">{location.pathname}{location.search}</output>
    <button onClick={() => selectProfile("alice")}>Use Alice</button>
    <button onClick={() => selectProfile("bob")}>Use Bob</button>
    <button onClick={() => navigate(-1)}>Back</button>
    <ProfileSelector />
    <ProfileContent><Details /></ProfileContent>
  </>;
}
function setup(url = "/mystocks?stock=shared-stock", options: { empty?: boolean; failCreate?: boolean; delayAlice?: boolean } = {}) {
  let profiles = options.empty ? [] : [alice, bob];
  const calls: { field: string; variables: any }[] = [];
  let completeAlice: (() => void) | undefined;
  const link = new ApolloLink(operation => new Observable(observer => {
    const definition = operation.query.definitions.find(item => item.kind === "OperationDefinition");
    const selection = definition?.kind === "OperationDefinition" ? definition.selectionSet.selections[0] : undefined;
    const field = selection?.kind === "Field" ? selection.name.value : "";
    calls.push({ field, variables: { ...operation.variables } });
    const finish = () => {
      if (field === "createProfile" && options.failCreate) { observer.error(new Error("offline")); return; }
      let data: any;
      if (field === "profiles") data = { profiles: { edges: profiles.map(node => ({ node })) } };
      else if (field === "createProfile") {
        const profile = { __typename: "ProfileType", id: "new-profile", name: operation.variables.name };
        profiles = [...profiles, profile];
        data = { createProfile: { profile } };
      } else if (field === "createTransaction") data = { createTransaction: { transaction: { id: "new-transaction" } } };
      else data = { transactions: [{ __typename: "TransactionType", id: "transaction-" + operation.variables.profileId,
        shares: operation.variables.profileId === "alice" ? 2 : 7,
        account: { id: "account", code: "TFSA" }, platform: { id: "platform-" + operation.variables.profileId, name: "Broker", currency: { id: "cad", code: "CAD" } },
        activity: { name: "Buy" }, stock: { currency: null, id: "shared-stock", name: "Example", ticker: "EX", asset: { id: "asset", name: "Stock" } },
        transferBatch: null, spinoffSource: null, allocatedBookCost: null, priceCurrency: null, totalCurrency: null, exchangeRate: 1, principalReturned: null, interestEarned: null, interestCalculation: "simple", gicPurchase: null, transactionDate: "2026-10-01", price: 10, fee: 0, total: 20, rate: null, maturityDate: null }] };
      observer.next({ data: data.transactions ? { ...data, analytics: [] } : data }); observer.complete();
    };
    if (field === "transactionsByStock" && operation.variables.profileId === "alice" && options.delayAlice) completeAlice = finish;
    else Promise.resolve().then(finish);
  }));
  const client = new ApolloClient({ cache: new InMemoryCache(), link });
  const rendered = render(<ApolloProvider client={client}><MemoryRouter initialEntries={[url]}><ProfileProvider><Navigation /></ProfileProvider></MemoryRouter></ApolloProvider>);
  return { ...rendered, calls, client, completeAlice: () => completeAlice?.() };
}

test("direct links, switching, browser back and cached stock queries preserve ownership", async () => {
  const { calls } = setup("/mystocks?profile=alice&stock=shared-stock&account=alice-account&currency=cad");
  await waitFor(() => expect(screen.getByTestId("shares")).toHaveTextContent("2"));
  fireEvent.change(screen.getByLabelText("Transaction draft"), { target: { value: "Alice's draft" } });
  fireEvent.click(screen.getByText("Use Bob"));
  await waitFor(() => expect(screen.getByTestId("shares")).toHaveTextContent("7"));
  expect(screen.getByTestId("url")).toHaveTextContent("profile=bob&stock=shared-stock");
  expect(screen.getByTestId("url")).not.toHaveTextContent("account=");
  expect(screen.getByLabelText("Transaction draft")).toHaveValue("");
  expect(localStorage.getItem(PROFILE_STORAGE_KEY)).toBe("bob");
  fireEvent.click(screen.getByText("Back"));
  await waitFor(() => expect(screen.getByTestId("shares")).toHaveTextContent("2"));
  expect(calls.filter(call => call.field === "transactionsByStock").map(call => call.variables.profileId)).toEqual(["alice", "bob"]);
});

test("the remembered profile is restored when the URL omits it", async () => {
  localStorage.setItem(PROFILE_STORAGE_KEY, "bob");
  setup();
  await waitFor(() => expect(screen.getByTestId("owner")).toHaveTextContent("Bob"));
  await waitFor(() => expect(screen.getByTestId("url")).toHaveTextContent("profile=bob"));
});

test("an unknown explicit profile blocks personal queries", async () => {
  const { calls } = setup("/mystocks?profile=missing&stock=shared-stock");
  await screen.findByText("This profile could not be found");
  expect(calls.every(call => call.field === "profiles")).toBe(true);
  fireEvent.click(screen.getByText("Use Bob"));
  await waitFor(() => expect(screen.getByTestId("shares")).toHaveTextContent("7"));
});

test("a late response from the previous profile cannot replace the active holdings", async () => {
  const { completeAlice } = setup("/mystocks?profile=alice&stock=shared-stock", { delayAlice: true });
  await screen.findByTestId("owner");
  fireEvent.click(screen.getByText("Use Bob"));
  await waitFor(() => expect(screen.getByTestId("shares")).toHaveTextContent("7"));
  await act(async () => { completeAlice(); });
  expect(screen.getByTestId("owner")).toHaveTextContent("Bob");
  expect(screen.getByTestId("shares")).toHaveTextContent("7");
});

test("personal mutations carry the active profile and retire stale personal lists", async () => {
  const { calls, client } = setup("/mystocks?profile=bob&stock=shared-stock");
  await waitFor(() => expect(screen.getByTestId("shares")).toHaveTextContent("7"));
  client.cache.writeQuery({ query: TRANSACTIONS_BY_STOCK, variables: { profileId: "alice", stock: "shared-stock" }, data: { transactions: [], analytics: [] } });
  fireEvent.click(screen.getByText("Save fixture transaction"));
  await waitFor(() => expect(calls.some(call => call.field === "createTransaction")).toBe(true));
  const mutation = calls.find(call => call.field === "createTransaction")!;
  expect(mutation.variables.profileId).toBe("bob");
  await waitFor(() => expect(client.cache.readQuery({ query: TRANSACTIONS_BY_STOCK, variables: { profileId: "alice", stock: "shared-stock" } })).toBeNull());
});

test("creating a first profile validates, trims, selects it and restores the page", async () => {
  const { calls } = setup("/myaccounts", { empty: true });
  await screen.findByText("Create your first profile");
  fireEvent.click(screen.getByRole("button", { name: "Add Profile" }));
  fireEvent.click(screen.getByRole("button", { name: "Create Profile" }));
  await screen.findByText("Enter a profile name.");
  expect(calls.some(call => call.field === "createProfile")).toBe(false);
  fireEvent.change(screen.getByLabelText("Profile name"), { target: { value: "  Charlie  " } });
  fireEvent.click(screen.getByRole("button", { name: "Create Profile" }));
  await waitFor(() => expect(screen.getByTestId("owner")).toHaveTextContent("Charlie"));
  expect(screen.getByTestId("url")).toHaveTextContent("profile=new-profile");
  expect(calls.find(call => call.field === "createProfile")?.variables.name).toBe("Charlie");
});

test("a failed profile save retains the draft and can be retried", async () => {
  setup("/myaccounts?profile=alice", { failCreate: true });
  await screen.findByTestId("owner");
  fireEvent.click(screen.getByRole("button", { name: "Add Profile" }));
  fireEvent.change(screen.getByLabelText("Profile name"), { target: { value: "Charlie" } });
  fireEvent.click(screen.getByRole("button", { name: "Create Profile" }));
  await screen.findByText("Could not create the profile. Please try again.");
  expect(screen.getByLabelText("Profile name")).toHaveValue("Charlie");
  expect(screen.getByTestId("owner")).toHaveTextContent("Alice");
});
