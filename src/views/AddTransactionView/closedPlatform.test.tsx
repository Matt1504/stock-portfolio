import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from "@apollo/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AddTransactionView from "./index";

const edges = (nodes: object[]) => ({ edges: nodes.map(node => ({ node })) });

test("dividend dates include a closed platform through its closure date and exclude it afterward", async () => {
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }) });
  const currency = { id: "cad", code: "CAD" };
  const account = { id: "account", name: "TFSA", code: "TFSA" };
  const client = new ApolloClient({ cache: new InMemoryCache({ addTypename: false }), link: new ApolloLink(() => new Observable(observer => {
    observer.next({ data: {
      accounts: edges([account]), currencies: edges([currency]), assets: edges([]), stocks: edges([]),
      platforms: edges([{ id: "closed", name: "Old Broker", account, currency, closedAt: "2023-04-18" }]),
      activities: edges([{ id: "dividend", name: "Dividends" }]),
    } });
    observer.complete();
  })) });
  render(<ApolloProvider client={client}><AddTransactionView /></ApolloProvider>);
  fireEvent.click(await screen.findByText("TFSA"));
  fireEvent.click(screen.getByText("CAD"));
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Activity" }));
  fireEvent.click(await screen.findByTitle("Dividends"));

  const date = screen.getByLabelText("Transaction Date");
  const setDate = (value: string) => {
    fireEvent.mouseDown(date);
    fireEvent.focus(date);
    fireEvent.change(date, { target: { value } });
    fireEvent.keyDown(date, { key: "Enter", code: "Enter", keyCode: 13, which: 13 });
  };
  setDate("2023-04-18");
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Platform" }).closest(".ant-select")).toHaveTextContent("Old Broker (closed 2023-04-18)"));
  setDate("2023-04-19");
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Platform" }).closest(".ant-select")).not.toHaveTextContent("Old Broker"));
}, 20000);
