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

test.each(["Buy", "Sell"])("%s recalculates all dependent changes and saves numeric amounts", async activity => {
  const save = show(activity);
  expect(screen.getByLabelText("Fee")).toHaveValue(0);
  expect(screen.queryByLabelText("Total")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Price"), { target: { value: "12.34" } });
  expect(screen.getByText("Total: $24.68")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Shares"), { target: { value: "3" } });
  expect(screen.getByText("Total: $37.02")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Fee"), { target: { value: "1.5" } });
  expect(screen.getByText("Total: $38.52")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Fee"), { target: { value: "" } });
  expect(screen.getByLabelText("Fee")).toHaveValue(0);
  expect(screen.getByText("Total: $37.02")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "OK" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ price: 12.34, shares: 3, fee: 0, total: 37.02 })));
});

test.each(["Dividends", "Withholding Tax", "Contribution", "Withdrawal"])("%s enables only total and preserves other amounts", async activity => {
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
  expect(screen.getByText("Total: $1.25")).toBeInTheDocument();
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
  expect(screen.queryByText("FHSA")).not.toBeInTheDocument();
  fireEvent.click(await screen.findByText("RRSP"));
  fireEvent.mouseDown(screen.getByLabelText("Platform"));
  expect(screen.queryByRole("option", { name: "Broker" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "OK" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ account: expect.objectContaining({ id: "rrsp" }), platform: expect.objectContaining({ id: "rrsp-platform" }) })));
});
