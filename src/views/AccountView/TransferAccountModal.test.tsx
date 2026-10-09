import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TransferAccountModal from "./TransferAccountModal";
import { useProfileMutation, useProfileQuery } from "../../profiles/hooks";

jest.mock("@apollo/client", () => ({ ...jest.requireActual("@apollo/client"), useApolloClient: () => ({ getObservableQueries: () => new Map() }) }));
jest.mock("../../profiles/hooks", () => ({ useProfileMutation: jest.fn(), useProfileQuery: jest.fn() }));
const transfer = jest.fn();
const notify = jest.fn();
const platform = (id: string, name: string, closedAt?: string) => ({ node: { id, name, closedAt, account: { id: "tfsa", code: "TFSA" }, currency: { id: "cad", code: "CAD" } } });
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener: jest.fn(), removeListener: jest.fn() }) });
  (useProfileMutation as jest.Mock).mockReturnValue([transfer, { loading: false }]);
  (useProfileQuery as jest.Mock).mockReturnValue({ loading: false, data: { previewAccountTransfer: { cash: "53.25", currency: "CAD", assets: [{ stockId: "EX", ticker: "EX", shares: "3", bookCost: "300" }] } } });
});
function show() {
  render(<TransferAccountModal platforms={[platform("source", "Old Broker"), platform("dest", "New Broker"), platform("closed", "Closed Broker", "2023-04-18")] as any} accounts={[]} notification={{ openNotificationWithIcon: notify } as any} />);
  fireEvent.click(screen.getByRole("button", { name: "Transfer Account" }));
}
test("explains retained history, previews balances and submits the closing date", async () => {
  transfer.mockResolvedValue({ data: { transferAccount: { success: true } } });
  show();
  expect(screen.getByText(/original transactions stay/)).toBeInTheDocument();
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Source platform" }));
  fireEvent.click(screen.getByText("TFSA · Old Broker (CAD)"));
  await waitFor(() => expect(useProfileQuery).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ variables: expect.objectContaining({ transferFrom: "source", transferTo: "dest" }) })));
  expect(screen.getByText(/Cash to transfer: \$53.25 CAD/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Transfer and Close" })).toBeDisabled();
  fireEvent.change(screen.getByRole("spinbutton", { name: "Transfer market value for EX" }), { target: { value: "450" } });
  fireEvent.click(screen.getByRole("button", { name: "Transfer and Close" }));
  await waitFor(() => expect(transfer).toHaveBeenCalledWith({ variables: { transferFrom: "source", transferTo: "dest", transferDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), closeOriginalAccount: true, marketValues: [{ stockId: "EX", marketValue: "450" }] } }));
  await waitFor(() => expect(notify).toHaveBeenCalledWith("success", "Account transferred and closed", expect.any(String)));
});
test("a preview error prevents transfer and reports the reason", () => {
  (useProfileQuery as jest.Mock).mockReturnValue({ loading: false, error: new Error("Open GICs cannot be transferred yet.") });
  show();
  expect(screen.getByText("Open GICs cannot be transferred yet.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Transfer and Close" })).toBeDisabled();
});

test("initial metadata loading leaves a disabled transfer button and does not crash", () => {
  render(<TransferAccountModal accounts={[]} notification={{ openNotificationWithIcon: notify } as any} />);
  expect(screen.getByRole("button", { name: "Transfer Account" })).toBeDisabled();
});

test("unchecking closure previews dated balances and submits an open-source transfer", async () => {
  transfer.mockResolvedValue({ data: { transferAccount: { success: true } } });
  show();
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Source platform" }));
  fireEvent.click(screen.getByText("TFSA · Old Broker (CAD)"));
  await waitFor(() => expect(useProfileQuery).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ variables: expect.objectContaining({ transferTo: "dest" }) })));
  fireEvent.click(screen.getByRole("checkbox", { name: "Close Original Account" }));
  await waitFor(() => expect(useProfileQuery).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ variables: expect.objectContaining({ closeOriginalAccount: false }) })));
  expect(screen.getByText(/keeps Old Broker open/)).toBeInTheDocument();
  fireEvent.change(screen.getByRole("spinbutton", { name: "Transfer market value for EX" }), { target: { value: "450" } });
  fireEvent.click(screen.getByRole("button", { name: "Transfer", exact: true }));
  await waitFor(() => expect(transfer).toHaveBeenCalledWith({ variables: expect.objectContaining({ closeOriginalAccount: false }) }));
  await waitFor(() => expect(notify).toHaveBeenCalledWith("success", "Account transferred", expect.any(String)));
});
