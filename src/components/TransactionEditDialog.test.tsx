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

test.each(["Dividends", "Withholding Tax", "Contribution"])("%s enables only total and preserves other amounts", async activity => {
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
