import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from "@apollo/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AddTransactionView from "./index";
import { ProfileContext } from "../../profiles/ProfileContext";
const mockNotify = jest.fn();
jest.mock("../../components/Notification", () => ({ NotificationComponent: class { contextHolder = null; openNotificationWithIcon = (...args: any[]) => mockNotify(...args); } }));
const edges = (nodes: object[]) => ({ edges: nodes.map(node => ({ node })) });
const cad = { id: "cad", code: "CAD" }, usd = { id: "usd", code: "USD" };
const account = { id: "nrsa", name: "Non-Registered Savings Account", code: "NRSA" };
beforeEach(() => {
  mockNotify.mockClear();
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }) });
});
async function select(label: string, option: string) {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: label }));
  fireEvent.click(await screen.findByTitle(option));
}
test.each(["Stock", "Index Fund"])("%s records a USD price in a CAD platform, recalculates FX and preserves the actual charge", async assetType => {
  const saved = jest.fn();
  const asset = { id: "asset", name: assetType };
  const metadata = { accounts: edges([account]), currencies: edges([cad, usd]), assets: edges([asset]), stocks: edges([{ id: "acwv", name: "ACWV", ticker: "ACWV", currency: usd, asset }]), platforms: edges([{ id: "ws", name: "Wealthsimple", account, currency: cad }]), activities: edges([{ id: "buy", name: "Buy" }]) };
  const client = new ApolloClient({ cache: new InMemoryCache({ addTypename: false }), link: new ApolloLink(operation => new Observable(observer => {
    if (operation.operationName === "createTransaction") {
      saved(operation.variables.trans);
      observer.next({ data: { createTransaction: { transaction: { id: "new" }, warnings: [{ code: "TRANSACTION_TOTAL_DIFFERENCE", message: "Recorded total differs from calculated total." }] } } });
    } else observer.next({ data: metadata });
    observer.complete();
  })) });
  render(<ApolloProvider client={client}><ProfileContext.Provider value={{ profile: { id: "owner", name: "Owner" }, profiles: [], loading: false, selectProfile: () => {}, refetch: async () => {} }}><AddTransactionView /></ProfileContext.Provider></ApolloProvider>);
  fireEvent.click(await screen.findByRole("radio", { name: account.code }));
  expect(screen.queryByText(account.name)).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("CAD"));
  await select("Platform", "Wealthsimple"); await select("Activity", "Buy"); await select("Stock", "ACWV (ACWV)");
  if (assetType === "Index Fund") fireEvent.click(screen.getByRole("checkbox", { name: "Enter price and shares" }));
  expect(screen.getByRole("combobox", { name: "Price Currency" }).closest(".ant-select")).toHaveTextContent("USD");
  expect(screen.getByRole("combobox", { name: "Price Currency" })).toBeEnabled();
  expect(screen.queryByRole("combobox", { name: "Total Currency" })).not.toBeInTheDocument();
  const date = screen.getByLabelText("Transaction Date");
  fireEvent.mouseDown(date); fireEvent.focus(date); fireEvent.change(date, { target: { value: "2026-10-01" } }); fireEvent.keyDown(date, { key: "Enter", code: "Enter", keyCode: 13, which: 13 });
  fireEvent.change(screen.getByLabelText("Price"), { target: { value: "116.56" } });
  fireEvent.change(screen.getByLabelText("Shares"), { target: { value: "30.7698" } });
  fireEvent.change(screen.getByLabelText("Exchange Rate"), { target: { value: "1.390618" } });
  await waitFor(() => expect(screen.getByLabelText("Total")).toHaveValue("4987.49"));
  fireEvent.change(screen.getByLabelText("Exchange Rate"), { target: { value: "1.4" } });
  expect(screen.getByLabelText("Total")).toHaveValue("5021.14");
  fireEvent.change(screen.getByLabelText("Exchange Rate"), { target: { value: "1.390618" } });
  fireEvent.change(screen.getByLabelText("Total"), { target: { value: "4978.49" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  await waitFor(() => expect(saved).toHaveBeenCalled(), { timeout: 5000 });
  expect(saved.mock.calls[0][0]).toEqual(expect.objectContaining({ price: 116.56, shares: 30.7698, total: 4978.49, priceCurrency: "usd", totalCurrency: "cad", exchangeRate: 1.390618 }));
  expect(saved.mock.calls[0][0].shareEntry).toBeUndefined();
  expect(mockNotify).toHaveBeenCalledWith("warning", "Transaction Added with warning", "Recorded total differs from calculated total.", 8);
}, 20000);


test("price currency is editable only for a stock/platform currency mismatch", async () => {
  const asset = { id: "stock", name: "Stock" };
  const metadata = {
    accounts: edges([account]), currencies: edges([cad, usd]), assets: edges([asset]),
    stocks: edges([{ id: "ca-stock", name: "Canadian", ticker: "CA", currency: cad, asset }, { id: "us-stock", name: "US", ticker: "US", currency: usd, asset }]),
    platforms: edges([{ id: "ca-platform", name: "CAD Broker", account, currency: cad }, { id: "us-platform", name: "USD Broker", account, currency: usd }]),
    activities: edges([{ id: "buy", name: "Buy" }]),
  };
  const client = new ApolloClient({ cache: new InMemoryCache({ addTypename: false }), link: new ApolloLink(() => new Observable(observer => {
    observer.next({ data: metadata }); observer.complete();
  })) });
  render(<ApolloProvider client={client}><AddTransactionView /></ApolloProvider>);
  fireEvent.click(await screen.findByRole("radio", { name: "NRSA" }));
  fireEvent.click(screen.getByRole("radio", { name: "CAD" }));
  await select("Activity", "Buy");
  const priceCurrency = () => screen.getByRole("combobox", { name: "Price Currency" });
  expect(priceCurrency()).toBeDisabled();
  await select("Platform", "CAD Broker");
  await select("Stock", "Canadian (CA)");
  expect(priceCurrency()).toBeDisabled();
  expect(priceCurrency().closest(".ant-select")).toHaveTextContent("CAD");
  await select("Stock", "US (US)");
  expect(priceCurrency()).toBeEnabled();
  fireEvent.mouseDown(priceCurrency());
  fireEvent.click((await screen.findAllByTitle("CAD")).find(element => element.classList.contains("ant-select-item-option"))!);
  expect(priceCurrency()).toBeEnabled(); // Governed by stock/platform, not the chosen price currency.
  await select("Stock", "Canadian (CA)");
  expect(priceCurrency()).toBeDisabled();
  expect(screen.queryByRole("spinbutton", { name: "Exchange Rate" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("radio", { name: "USD" }));
  expect(priceCurrency()).toBeDisabled(); // No platform selected yet.
  await select("Platform", "USD Broker");
  await select("Stock", "Canadian (CA)");
  expect(priceCurrency()).toBeEnabled();
  await select("Stock", "US (US)");
  expect(priceCurrency()).toBeDisabled();
  expect(priceCurrency().closest(".ant-select")).toHaveTextContent("USD");
}, 20000);
