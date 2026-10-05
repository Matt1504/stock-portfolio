import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AddTransactionView from "./index";
import { sanitizeTransactionFields } from "./transactionFields";

const mockCreate = jest.fn().mockResolvedValue({ data: { createTransaction: { transaction: { id: "new" } } } });
const edges = (nodes: object[]) => ({ edges: nodes.map(node => ({ node })) });
jest.mock("../../profiles/hooks", () => ({
  useProfileQuery: () => ({ loading: false, data: {
    assets: edges([{ id: "stock-type", name: "Stock" }]),
    accounts: edges([{ id: "account", name: "TFSA" }]), currencies: edges([{ id: "cad", code: "CAD" }]),
    platforms: edges([{ id: "broker", name: "Broker", account: { id: "account" }, currency: { id: "cad" } }]),
    stocks: edges([{ id: "parent", name: "3M", ticker: "MMM", currency: { id: "cad" }, asset: { id: "stock-type", name: "Stock" } }, { id: "stock", name: "Disney", ticker: "DIS", currency: { id: "cad" }, asset: { id: "stock-type", name: "Stock" } }, { id: "gic", name: "Deposit", ticker: "GIC", currency: { id: "cad" }, asset: { id: "gic-type", name: "GIC" } }, { id: "fund", name: "Fund", ticker: "FUND", currency: { id: "cad" }, asset: { id: "fund-type", name: "Index Fund" } }, { id: "mutual", name: "Mutual", ticker: "MF", currency: { id: "cad" }, asset: { id: "mutual-type", name: "Mutual Fund" } }]),
    activities: edges([{ id: "buy", name: "Buy" }, { id: "contribution", name: "Contribution" }, { id: "tax", name: "Withholding Tax" }, { id: "interest", name: "Interest" }, { id: "withdrawal", name: "Withdrawal" }, { id: "service-fee", name: "Service Fee" }, { id: "etf-rebate", name: "ETF Rebate" }, { id: "spinoff", name: "Stock Spinoff" }]),
  } }),
  useProfileMutation: () => [mockCreate, { loading: false }],
}));
beforeEach(() => {
  mockCreate.mockClear();
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }) });
});
async function select(label: string, option: string) {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: label }));
  fireEvent.click((await screen.findAllByTitle(option)).find(element => element.classList.contains("ant-select-item-option") && !element.closest(".ant-select-dropdown-hidden"))!);
}

test.each(["Contribution", "Service Fee", "ETF Rebate"])("switching a populated Buy to %s clears the stock and excludes hidden fields when saved", async (activity) => {
  render(<ApolloProvider client={new ApolloClient({ cache: new InMemoryCache() })}><AddTransactionView /></ApolloProvider>);
  fireEvent.click(screen.getByText("TFSA"));
  fireEvent.click(screen.getByText("CAD"));
  await select("Platform", "Broker");
  await select("Activity", "Buy");
  await select("Stock", "Disney (DIS)");
  fireEvent.change(screen.getByLabelText("Price"), { target: { value: "10" } });
  fireEvent.change(screen.getByLabelText("Shares"), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText("Fee"), { target: { value: "1" } });
  const date = screen.getByLabelText("Transaction Date");
  fireEvent.mouseDown(date);
  fireEvent.focus(date);
  fireEvent.change(date, { target: { value: "2026-10-01" } });
  fireEvent.keyDown(date, { key: "Enter", code: "Enter", keyCode: 13, which: 13 });
  await select("Activity", activity);
  await select("Activity", "Buy");
  expect(screen.getByText("Disney (DIS)")).not.toBeVisible();
  expect(screen.getByLabelText("Price")).toHaveValue("");
  await select("Activity", activity);
  fireEvent.change(screen.getByLabelText("Total"), { target: { value: "50" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  const payload = mockCreate.mock.calls[0][0].variables.trans;
  expect(payload).toEqual(expect.objectContaining({ activity: activity === "Service Fee" ? "service-fee" : activity === "ETF Rebate" ? "etf-rebate" : "contribution", total: 50, account: "account", platform: "broker" }));
  for (const field of ["stock", "price", "shares", "fee", "rate", "maturityDate"]) expect(payload).not.toHaveProperty(field);
});

test("submission sanitation also removes stale stock values from cash activity payloads", () => {
  const stale = { account: "account", platform: "broker", activity: "contribution", transactionDate: "2026-10-01", total: 50, stock: "stock", shares: 2, price: 10, fee: 1 };
  for (const activity of ["Contribution", "Withdrawal", "Service Fee", "SEC Fee", "Transfer In", "Transfer Out", "Adjustment"]) {
    expect(sanitizeTransactionFields(stale, activity)).not.toHaveProperty("stock");
  }
  expect(sanitizeTransactionFields(stale, "Buy")).toHaveProperty("stock", "stock");
});


test.each([["Withholding Tax", "tax", false], ["Withholding Tax", "tax", true], ["Interest", "interest", false], ["Interest", "interest", true]])("%s (%s) can be saved with a stock selected: %s", async (activity, activityId, withStock) => {
  render(<ApolloProvider client={new ApolloClient({ cache: new InMemoryCache() })}><AddTransactionView /></ApolloProvider>);
  fireEvent.click(screen.getByText("TFSA"));
  fireEvent.click(screen.getByText("CAD"));
  await select("Platform", "Broker");
  await select("Activity", "Buy");
  await select("Stock", "Disney (DIS)");
  await select("Activity", activity as string);
  expect(screen.getByText("Disney (DIS)")).not.toBeVisible();
  if (withStock) await select("Stock", "Disney (DIS)");
  const date = screen.getByLabelText("Transaction Date");
  fireEvent.mouseDown(date);
  fireEvent.focus(date);
  fireEvent.change(date, { target: { value: "2026-10-01" } });
  fireEvent.keyDown(date, { key: "Enter", code: "Enter", keyCode: 13, which: 13 });
  fireEvent.change(screen.getByLabelText("Total"), { target: { value: "25" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  const payload = mockCreate.mock.calls[0][0].variables.trans;
  expect(payload.activity).toBe(activityId);
  expect(payload.stock ?? null).toBe(withStock ? "stock" : null);
});


test("withdrawal can be submitted with only its cash amount and no stock", async () => {
  render(<ApolloProvider client={new ApolloClient({ cache: new InMemoryCache() })}><AddTransactionView /></ApolloProvider>);
  fireEvent.click(screen.getByText("TFSA"));
  fireEvent.click(screen.getByText("CAD"));
  await select("Platform", "Broker");
  await select("Activity", "Withdrawal");
  expect(screen.queryByRole("combobox", { name: "Stock" })).not.toBeInTheDocument();
  const date = screen.getByLabelText("Transaction Date");
  fireEvent.mouseDown(date);
  fireEvent.focus(date);
  fireEvent.change(date, { target: { value: "2026-10-01" } });
  fireEvent.keyDown(date, { key: "Enter", code: "Enter", keyCode: 13, which: 13 });
  fireEvent.change(screen.getByLabelText("Total"), { target: { value: "25" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0].variables.trans).toEqual(expect.objectContaining({ activity: "withdrawal", total: 25 }));
  expect(mockCreate.mock.calls[0][0].variables.trans).not.toHaveProperty("stock");
});


test("selected stock asset type controls transaction fields without an asset radio selector", async () => {
  render(<ApolloProvider client={new ApolloClient({ cache: new InMemoryCache() })}><AddTransactionView /></ApolloProvider>);
  fireEvent.click(screen.getByText("TFSA"));
  fireEvent.click(screen.getByText("CAD"));
  await select("Platform", "Broker");
  await select("Activity", "Buy");
  await select("Stock", "Deposit (GIC)");
  expect(screen.queryByRole("radio", { name: "Stock" })).not.toBeInTheDocument();
  expect(screen.getByText("Asset Type: GIC")).toBeVisible();
  expect(screen.getByLabelText("Interest Rate")).toBeVisible();
  expect(screen.getByLabelText("Price")).not.toBeVisible();
  await select("Stock", "Disney (DIS)");
  expect(screen.getByLabelText("Price")).toBeVisible();
  expect(screen.getByLabelText("Shares")).toBeVisible();
  expect(screen.getByLabelText("Interest Rate")).not.toBeVisible();
  await select("Stock", "Fund (FUND)");
  expect(screen.getByText("Asset Type: Index Fund")).toBeVisible();
  expect(screen.getByLabelText("Total")).toBeVisible();
  expect(screen.getByLabelText("Interest Rate")).not.toBeVisible();
  await select("Stock", "Mutual (MF)");
  expect(screen.getByText("Asset Type: Mutual Fund")).toBeVisible();
  expect(screen.getByLabelText("Total")).toBeVisible();
  expect(screen.getByLabelText("Price")).not.toBeVisible();
  await select("Activity", "Interest");
  expect(screen.getByLabelText("Interest Rate")).not.toBeVisible();
});


test.each(["Buy", "Adjustment", "Contribution"])("%s never sends a stale description", activity => {
  expect(sanitizeTransactionFields({ account: "account", activity: "activity", platform: "platform", total: 1, transactionDate: "2026-10-02", description: "Unused text" }, activity)).not.toHaveProperty("description");
});


test("spinoff submits received shares and allocated cost with no cash or trade fields", async () => {
  render(<ApolloProvider client={new ApolloClient({ cache: new InMemoryCache() })}><AddTransactionView /></ApolloProvider>);
  fireEvent.click(screen.getByText("TFSA"));
  fireEvent.click(screen.getByText("CAD"));
  await select("Platform", "Broker");
  await select("Activity", "Stock Spinoff");
  await select("Stock", "Disney (DIS)");
  await select("Original Stock", "3M (MMM)");
  const date = screen.getByLabelText("Transaction Date");
  fireEvent.mouseDown(date); fireEvent.focus(date);
  fireEvent.change(date, { target: { value: "2024-04-01" } });
  fireEvent.keyDown(date, { key: "Enter", code: "Enter", keyCode: 13, which: 13 });
  fireEvent.change(screen.getByLabelText("Shares Received"), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText("Allocated Book Cost"), { target: { value: "77.60" } });
  expect(screen.getByLabelText("Total")).not.toBeVisible();
  expect(screen.getByLabelText("Price")).not.toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0].variables.trans).toMatchObject({ activity: "spinoff", stock: "stock", spinoffSource: "parent", shares: 1, allocatedBookCost: 77.6, total: 0, transactionDate: "2024-04-01" });
  expect(mockCreate.mock.calls[0][0].variables.trans).not.toHaveProperty("price");
  await select("Activity", "Contribution");
  expect(screen.queryByLabelText("Original Stock")).not.toBeInTheDocument();
});
