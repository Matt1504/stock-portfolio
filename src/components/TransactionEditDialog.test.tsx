import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Transaction } from "../models/Transaction";
import TransactionEditDialog from "./TransactionEditDialog";

function transaction(activity: string): Transaction {
  return { id: "example", activity: { name: activity }, account: { code: "TFSA" },
    platform: { name: "Broker", currency: { code: "CAD" } },
    transactionDate: "2026-10-01", price: 10, shares: 2, total: 20,
  } as unknown as Transaction;
}
function show(activity: string) {
  const save = jest.fn();
  render(<TransactionEditDialog open setOpen={() => {}} onCancel={() => {}} handleDialogSave={save} dataItem={transaction(activity)} />);
  return save;
}

test.each([0, 2.5])("existing fees can be cleared and saved as null: %s", async fee => {
  const save = jest.fn();
  render(<TransactionEditDialog open setOpen={() => {}} onCancel={() => {}} handleDialogSave={save} dataItem={{ ...transaction("Buy"), fee }} />);
  expect(screen.getByLabelText("Fee")).toHaveValue(fee || null);
  fireEvent.change(screen.getByLabelText("Fee"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "OK" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ fee: null, total: 20 })));
});

test.each(["Buy", "Sell"])("%s recalculates all dependent changes and saves numeric amounts", async activity => {
  const save = show(activity);
  expect(screen.getByLabelText("Fee")).toHaveValue(null);
  expect(screen.queryByText(/^Total:/)).not.toBeInTheDocument();
  expect(screen.getByLabelText("Total")).toBeEnabled();
  fireEvent.change(screen.getByLabelText("Price"), { target: { value: "12.34" } });
  expect(screen.getByLabelText("Total")).toHaveValue(24.68);
  fireEvent.change(screen.getByLabelText("Shares"), { target: { value: "3" } });
  expect(screen.getByLabelText("Total")).toHaveValue(37.02);
  fireEvent.change(screen.getByLabelText("Fee"), { target: { value: "1.5" } });
  expect(screen.getByLabelText("Total")).toHaveValue(activity === "Sell" ? 35.52 : 38.52);
  fireEvent.change(screen.getByLabelText("Fee"), { target: { value: "" } });
  expect(screen.getByLabelText("Fee")).toHaveValue(null);
  expect(screen.getByLabelText("Total")).toHaveValue(37.02);
  fireEvent.click(screen.getByRole("button", { name: "OK" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ price: 12.34, shares: 3, fee: null, total: 37.02 })));
});

test.each(["Dividends", "Withholding Tax", "Contribution", "Withdrawal", "Service Fee", "SEC Fee", "ETF Rebate"])("%s enables only total and preserves other amounts", async activity => {
  const save = show(activity);
  for (const label of ["Price", "Shares", "Fee"]) expect(screen.queryByLabelText(label)).not.toBeInTheDocument();
  expect(screen.getByLabelText("Total")).toBeEnabled();
  fireEvent.change(screen.getByLabelText("Total"), { target: { value: "42.75" } });
  fireEvent.click(screen.getByRole("button", { name: "OK" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ price: 10, shares: 2, total: 42.75 })));
});

 test("calendar date is editable and saved without timezone conversion", async () => {
  const save = show("Contribution");
  const input = screen.getByLabelText("Transaction Date");
  expect(input).toHaveValue("2026-10-01");
  fireEvent.mouseDown(input);
  fireEvent.click(input);
  fireEvent.click(await screen.findByTitle("2026-09-30"));
  fireEvent.click(screen.getByRole("button", { name: "OK" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ transactionDate: "2026-09-30" })));
});


test("platform options stay within the account and currency, and fractional shares are saved", async () => {
  const save = jest.fn();
  const item = transaction("Buy");
  item.account.id = "tfsa";
  item.platform = { __typename: "PlatformType", id: "original", name: "Broker", account: item.account, currency: { __typename: "CurrencyType", id: "cad", code: "CAD" } };
  render(<TransactionEditDialog open setOpen={() => {}} onCancel={() => {}} handleDialogSave={save} dataItem={item} platforms={[
    item.platform,
    { __typename: "PlatformType", id: "eligible", name: "Other Broker", account: { __typename: "AccountType", id: "tfsa" }, currency: { __typename: "CurrencyType", id: "cad" } },
    { __typename: "PlatformType", id: "wrong-account", name: "RRSP Broker", account: { __typename: "AccountType", id: "rrsp", code: "RRSP" }, currency: { __typename: "CurrencyType", id: "cad" } },
    { __typename: "PlatformType", id: "wrong-currency", name: "USD Broker", account: { __typename: "AccountType", id: "tfsa" }, currency: { __typename: "CurrencyType", id: "usd" } },
  ]} />);
  fireEvent.mouseDown(screen.getByLabelText("Platform"));
  fireEvent.click(await screen.findByText("Other Broker"));
  expect(screen.queryByText("RRSP Broker")).not.toBeInTheDocument();
  expect(screen.queryByText("USD Broker")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Shares"), { target: { value: "0.125" } });
  expect(screen.getByLabelText("Total")).toHaveValue(1.25);
  fireEvent.click(screen.getByRole("button", { name: "OK" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ platform: expect.objectContaining({ id: "eligible" }), shares: 0.125, total: 1.25 })));
});


test("changing the account selects a matching platform and excludes the original account's platforms", async () => {
  const save = jest.fn();
  const item = transaction("Buy");
  item.account.id = "tfsa";
  item.platform = { __typename: "PlatformType", id: "original", name: "Broker", account: item.account, currency: { __typename: "CurrencyType", id: "cad", code: "CAD" } };
  render(<TransactionEditDialog open setOpen={() => {}} onCancel={() => {}} handleDialogSave={save} dataItem={item} platforms={[
    item.platform,
    { __typename: "PlatformType", id: "rrsp-platform", name: "RRSP Broker", account: { __typename: "AccountType", id: "rrsp", code: "RRSP" }, currency: { __typename: "CurrencyType", id: "cad" } },
    { __typename: "PlatformType", id: "usd-only", name: "USD Broker", account: { __typename: "AccountType", id: "fhsa", code: "FHSA" }, currency: { __typename: "CurrencyType", id: "usd" } },
  ]} />);
  fireEvent.mouseDown(screen.getByLabelText("Account Type"));
  expect(await screen.findByText("FHSA")).toBeInTheDocument();
  fireEvent.click(await screen.findByText("RRSP"));
  fireEvent.mouseDown(screen.getByLabelText("Platform"));
  expect(screen.queryByRole("option", { name: "Broker" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "OK" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ account: expect.objectContaining({ id: "rrsp" }), platform: expect.objectContaining({ id: "rrsp-platform" }) })));
});


test("backend validation errors remain visible and preserve the edit draft", async () => {
  const message = "Cannot sell more shares than you own in the selected platform.";
  const save = jest.fn().mockRejectedValue({ graphQLErrors: [{ message }] });
  render(<TransactionEditDialog open setOpen={() => {}} onCancel={() => {}} handleDialogSave={save} dataItem={transaction("Sell")} />);
  fireEvent.change(screen.getByLabelText("Shares"), { target: { value: "5" } });
  fireEvent.click(screen.getByRole("button", { name: "OK" }));
  expect(await screen.findByText(message)).toBeVisible();
  expect(screen.getByLabelText("Shares")).toHaveValue(5);
  expect(screen.getByRole("dialog")).toBeVisible();
});


test("editing converted prices recalculates CAD amounts and permits a recorded-total override", async () => {
  const save = jest.fn();
  const cad = { id: "cad", code: "CAD" }, usd = { id: "usd", code: "USD" };
  const value = { ...transaction("Buy"), stock: { id: "acwv", currency: usd }, platform: { id: "ws", name: "Wealthsimple", currency: cad }, price: 116.56, shares: 30.7698, priceCurrency: usd, totalCurrency: cad, exchangeRate: 1.390618, total: 4978.49 } as unknown as Transaction;
  render(<TransactionEditDialog open setOpen={() => {}} onCancel={() => {}} handleDialogSave={save} dataItem={value} />);
  fireEvent.change(screen.getByLabelText("Exchange Rate"), { target: { value: "1.4" } });
  expect(screen.getByLabelText("Total")).toHaveValue(5021.14);
  fireEvent.change(screen.getByLabelText("Total"), { target: { value: "4978.49" } });
  fireEvent.click(screen.getByRole("button", { name: "OK" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ total: 4978.49, exchangeRate: 1.4 })));
});


test("changing platform currency selects an existing matching platform and recalculates a converted trade", async () => {
  const save = jest.fn();
  const cad = { __typename: "CurrencyType", id: "cad", code: "CAD" };
  const usd = { __typename: "CurrencyType", id: "usd", code: "USD" };
  const account = { __typename: "AccountType", id: "tfsa", code: "TFSA" };
  const caPlatform = { __typename: "PlatformType", id: "ca", name: "Broker", currency: cad, account };
  const usPlatform = { ...caPlatform, id: "us", currency: usd };
  const item = { ...transaction("Buy"), account, platform: caPlatform, stock: { id: "us-stock", currency: usd }, priceCurrency: usd, totalCurrency: cad, exchangeRate: 1.4, fee: 2, price: 100, shares: 2, total: 282 } as unknown as Transaction;
  render(<TransactionEditDialog open setOpen={() => {}} onCancel={() => {}} handleDialogSave={save} dataItem={item} platforms={[caPlatform, usPlatform]} />);
  fireEvent.mouseDown(screen.getByLabelText("Platform Currency"));
  fireEvent.click((await screen.findAllByTitle("USD")).find(element => element.classList.contains("ant-select-item-option"))!);
  expect(screen.queryByLabelText("Exchange Rate")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Total")).toHaveValue(200);
  expect(screen.getByLabelText("Fee")).toHaveValue(null);
  fireEvent.click(screen.getByRole("button", { name: "OK" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ platform: expect.objectContaining({ id: "us" }), totalCurrency: usd, priceCurrency: usd, exchangeRate: 1, total: 200, fee: null })));
});

test("an account available only in another currency can be selected and cash totals must be re-entered", async () => {
  const save = jest.fn();
  const cad = { __typename: "CurrencyType", id: "cad", code: "CAD" };
  const usd = { __typename: "CurrencyType", id: "usd", code: "USD" };
  const account = { __typename: "AccountType", id: "tfsa", code: "TFSA" };
  const platform = { __typename: "PlatformType", id: "ca", name: "Broker", currency: cad, account };
  const other = { ...platform, id: "us-fhsa", currency: usd, account: { ...account, id: "fhsa", code: "FHSA" } };
  const item = { ...transaction("Contribution"), account, platform };
  render(<TransactionEditDialog open setOpen={() => {}} onCancel={() => {}} handleDialogSave={save} dataItem={item} platforms={[platform, other]} />);
  fireEvent.mouseDown(screen.getByLabelText("Account Type"));
  fireEvent.click(await screen.findByText("FHSA"));
  expect(screen.getByLabelText("Total")).toHaveValue(null);
  fireEvent.click(screen.getByRole("button", { name: "OK" }));
  expect(save).not.toHaveBeenCalled();
  expect(await screen.findByText(/Enter the total in the selected platform currency/)).toBeVisible();
  fireEvent.change(screen.getByLabelText("Total"), { target: { value: "25" } });
  fireEvent.click(screen.getByRole("button", { name: "OK" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ account: other.account, platform: other, totalCurrency: usd, priceCurrency: usd, exchangeRate: 1, total: 25 })));
});

test("moving a trade to a different settlement currency requires a fresh exchange rate", async () => {
  const save = jest.fn();
  const cad = { __typename: "CurrencyType", id: "cad", code: "CAD" };
  const usd = { __typename: "CurrencyType", id: "usd", code: "USD" };
  const account = { __typename: "AccountType", id: "tfsa", code: "TFSA" };
  const platform = { __typename: "PlatformType", id: "ca", name: "Broker", currency: cad, account };
  const other = { ...platform, id: "us", currency: usd };
  const item = { ...transaction("Buy"), account, platform, stock: { id: "ca-stock", currency: cad }, priceCurrency: cad, totalCurrency: cad, exchangeRate: 1 } as unknown as Transaction;
  render(<TransactionEditDialog open setOpen={() => {}} onCancel={() => {}} handleDialogSave={save} dataItem={item} platforms={[platform, other]} />);
  fireEvent.mouseDown(screen.getByLabelText("Platform Currency"));
  fireEvent.click(await screen.findByTitle("USD"));
  expect(screen.getByLabelText("Exchange Rate")).toHaveValue(null);
  expect(screen.getByLabelText("Total")).toHaveValue(null);
  fireEvent.change(screen.getByLabelText("Exchange Rate"), { target: { value: "0.72" } });
  expect(screen.getByLabelText("Total")).toHaveValue(14.4);
  fireEvent.click(screen.getByRole("button", { name: "OK" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ platform: other, priceCurrency: cad, totalCurrency: usd, exchangeRate: 0.72, total: 14.4 })));
});
