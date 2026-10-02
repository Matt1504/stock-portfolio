import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AddTransactionView from "./index";
import { sanitizeTransactionFields } from "./transactionFields";

const mockCreate = jest.fn().mockResolvedValue({ data: { createTransaction: { transaction: { id: "new" } } } });
const edges = (nodes: object[]) => ({ edges: nodes.map(node => ({ node })) });
jest.mock("../../profiles/hooks", () => ({
  useProfileQuery: () => ({ loading: false, data: {
    accounts: edges([{ id: "account", name: "TFSA" }]), currencies: edges([{ id: "cad", code: "CAD" }]),
    platforms: edges([{ id: "broker", name: "Broker", account: { id: "account" }, currency: { id: "cad" } }]),
    stocks: edges([{ id: "stock", name: "Disney", ticker: "DIS", currency: { id: "cad" } }]),
    activities: edges([{ id: "buy", name: "Buy" }, { id: "contribution", name: "Contribution" }, { id: "tax", name: "Withholding Tax" }, { id: "withdrawal", name: "Withdrawal" }]),
  } }),
  useProfileMutation: () => [mockCreate],
}));
beforeEach(() => {
  mockCreate.mockClear();
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }) });
});
async function select(label: string, option: string) {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: label }));
  fireEvent.click(await screen.findByTitle(option));
}

test("switching a populated Buy to Contribution clears the stock and excludes hidden fields when saved", async () => {
  render(<AddTransactionView />);
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
  await select("Activity", "Contribution");
  await select("Activity", "Buy");
  expect(screen.getByText("Disney (DIS)")).not.toBeVisible();
  expect(screen.getByLabelText("Price")).toHaveValue("");
  await select("Activity", "Contribution");
  fireEvent.change(screen.getByLabelText("Total"), { target: { value: "50" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  const payload = mockCreate.mock.calls[0][0].variables.trans;
  expect(payload).toEqual(expect.objectContaining({ activity: "contribution", total: 50, account: "account", platform: "broker" }));
  for (const field of ["stock", "price", "shares", "fee", "rate", "maturityDate"]) expect(payload).not.toHaveProperty(field);
});

test("submission sanitation also removes stale stock values from cash activity payloads", () => {
  const stale = { account: "account", platform: "broker", activity: "contribution", transactionDate: "2026-10-01", total: 50, stock: "stock", shares: 2, price: 10, fee: 1 };
  for (const activity of ["Contribution", "Withdrawal", "Transfer In", "Transfer Out", "Adjustment"]) {
    expect(sanitizeTransactionFields(stale, activity)).not.toHaveProperty("stock");
  }
  expect(sanitizeTransactionFields(stale, "Buy")).toHaveProperty("stock", "stock");
});


test.each([false, true])("withholding tax can be saved with a stock selected: %s", async withStock => {
  render(<AddTransactionView />);
  fireEvent.click(screen.getByText("TFSA"));
  fireEvent.click(screen.getByText("CAD"));
  await select("Platform", "Broker");
  await select("Activity", "Buy");
  await select("Stock", "Disney (DIS)");
  await select("Activity", "Withholding Tax");
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
  expect(payload.activity).toBe("tax");
  expect(payload.stock ?? null).toBe(withStock ? "stock" : null);
});


test("withdrawal can be submitted with only its cash amount and no stock", async () => {
  render(<AddTransactionView />);
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
