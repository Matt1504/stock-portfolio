import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from "@apollo/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import MyStocksView from "./index";

jest.mock("./SelectedStockInfo", () => ({ __esModule: true, default: ({ stock, name, currency }: any) => <output data-testid="stock-info">{stock}:{name}:{currency}</output> }));
const metadata = {
  stocks: { edges: [
    { node: { id: "dis", name: "Disney", ticker: "DIS", currency: { id: "usd", code: "USD" } } },
    { node: { id: "ex", name: "Example", ticker: "EX", currency: { id: "cad", code: "CAD" } } },
  ] },
  currencies: { edges: [{ node: { id: "usd", code: "USD" } }, { node: { id: "cad", code: "CAD" } }] },
};
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", { writable: true, value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }) });
});
function Page() {
  const location = useLocation(); const navigate = useNavigate();
  return <><output data-testid="url">{location.pathname}{location.search}</output><button onClick={() => navigate(-1)}>Back</button><button onClick={() => navigate(1)}>Forward</button><MyStocksView /></>;
}
function show(url: string) {
  const client = new ApolloClient({ cache: new InMemoryCache({ addTypename: false }), link: new ApolloLink(() => new Observable(observer => {
    const timer = setTimeout(() => { observer.next({ data: metadata }); observer.complete(); }, 0);
    return () => clearTimeout(timer);
  })) });
  return render(<ApolloProvider client={client}><MemoryRouter initialEntries={[url]}><Page /></MemoryRouter></ApolloProvider>);
}

test("cold stock link loads and removes legacy currency while preserving other parameters", async () => {
  show("/mystocks?stock=dis&currency=cad&keep=yes");
  expect(await screen.findByTestId("stock-info")).toHaveTextContent("dis:Disney:USD");
  await waitFor(() => expect(screen.getByTestId("url")).toHaveTextContent("stock=dis&keep=yes"));
  expect(screen.getByRole("combobox", { name: "Select a Stock" }).closest(".ant-select")).toHaveTextContent("Disney (DIS)");
});

test("selection updates URL and Back/Forward restore the selected stock", async () => {
  show("/mystocks?stock=dis");
  await screen.findByTestId("stock-info");
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Select a Stock" }));
  const options = await screen.findAllByText("Example (EX)");
  fireEvent.click(options[options.length - 1]);
  await waitFor(() => expect(screen.getByTestId("stock-info")).toHaveTextContent("ex:Example:CAD"));
  expect(screen.getByTestId("url")).toHaveTextContent("stock=ex");
  expect(screen.getByTestId("url")).not.toHaveTextContent("currency=");
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  await waitFor(() => expect(screen.getByTestId("stock-info")).toHaveTextContent("dis:Disney:USD"));
  fireEvent.click(screen.getByRole("button", { name: "Forward" }));
  await waitFor(() => expect(screen.getByTestId("stock-info")).toHaveTextContent("ex:Example:CAD"));
});

test("invalid IDs show recovery guidance without loading a stock", async () => {
  show("/mystocks?stock=missing");
  expect(await screen.findByText("This stock could not be found. Select a stock above.")).toBeInTheDocument();
  expect(screen.queryByTestId("stock-info")).not.toBeInTheDocument();
});

test("bare page leaves selection empty", async () => {
  show("/mystocks");
  await screen.findByRole("combobox", { name: "Select a Stock" });
  expect(screen.queryByTestId("stock-info")).not.toBeInTheDocument();
  expect(screen.getByTestId("url")).toHaveTextContent("/mystocks");
});
