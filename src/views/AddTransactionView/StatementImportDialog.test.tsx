import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from "@apollo/client";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ProfileContext } from "../../profiles/ProfileContext";
import StatementImportDialog from "./StatementImportDialog";
const edges = (nodes: object[]) => ({ edges: nodes.map(node => ({ node })) });
const cad = { id: "cad", code: "CAD" }, usd = { id: "usd", code: "USD" };
const account = { id: "nrsa", name: "Non-Registered Savings Account", code: "NRSA" };
const metadata = { accounts: edges([account]), currencies: edges([cad, usd]), platforms: edges([{ id: "ws", name: "Wealthsimple", account, currency: cad }, { id: "us", name: "USD Broker", account, currency: usd }]) } as any;
const entry = { row: 1, transactionDate: "2025-10-14", activity: "Buy", ticker: "ACWV", shares: "1.6324", price: "119.65", priceCurrency: "USD", exchangeRate: "1.4106", total: "275.54" };
const text = '"date","transaction","description","amount","balance","currency"\n"2025-10-14","BUY","ACWV - Global ETF: Bought 1.6324 shares at $119.65 per share, FX Rate: 1.4106","-275.54","100","CAD"';
const goodPreview = { parsed: { transactions: [entry], skipped: [{ row: 2, reason: "ROC is excluded" }], errors: [] }, plan: { rows: [{ entry, status: "pending" }], stocksToCreate: [{ ticker: "ACWV", name: "Global ETF" }], errors: [], summary: { transactionsToCreate: 1, existingTransactions: 0, stocksToCreate: 1, skippedRows: 1 } }, previewHash: "preview-hash" };
beforeEach(() => Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }) }));
function show(preview = goodPreview, complete = true, failPreview = false, initialPlatform: string | undefined = "ws") {
  const mutations = jest.fn(), queries = jest.fn(), refresh = jest.fn().mockResolvedValue(undefined);
  const client = new ApolloClient({ cache: new InMemoryCache({ addTypename: false }), link: new ApolloLink(operation => new Observable(observer => {
    if (operation.operationName === "PreviewStatement") {
      queries(operation.variables);
      if (failPreview) { observer.error(new Error("Preview unavailable")); return; }
      observer.next({ data: { previewStatementImport: preview } });
    } else {
      mutations(operation.variables);
      observer.next({ data: { importStatement: { report: { complete, createdTransactions: [{ id: "new", row: 1, warnings: [{ code: "TOTAL", message: "Saved the statement total" }] }], createdStocks: [{ id: "stock", ticker: "ACWV" }], existingRows: [], skipped: [], errors: complete ? [] : ["Dividends stock is not owned"] } } } });
    }
    observer.complete();
  })) });
  render(<ApolloProvider client={client}><ProfileContext.Provider value={{ profile: { id: "owner", name: "Owner" }, profiles: [], selectProfile: jest.fn(), loading: false, refetch: jest.fn() }}><StatementImportDialog data={metadata} initialPlatform={initialPlatform} onClose={jest.fn()} onImported={refresh} /></ProfileContext.Provider></ApolloProvider>);
  return { queries, mutations, refresh };
}
test("selecting an import account automatically selects its sole CAD platform", async () => {
  const { queries } = show(goodPreview, true, false, "");
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Import account" }));
  fireEvent.click(await screen.findByTitle("NRSA"));
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Import platform" }).closest(".ant-select")).toHaveTextContent("Wealthsimple"));
  expect(queries).not.toHaveBeenCalled();
});

test("preview is read-only and import forwards profile/platform/hash then refreshes data", async () => {
  const { queries, mutations, refresh } = show();
  expect(screen.getByRole("combobox", { name: "Import account" }).closest(".ant-select")).toHaveTextContent("NRSA");
  expect(screen.queryByText("Non-Registered Savings Account")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Import", exact: true })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("CSV text"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  expect(await screen.findByText(/1 transactions to import/)).toBeInTheDocument();
  expect(screen.getByText(/Stocks to create: ACWV/)).toBeInTheDocument();
  expect(screen.getByText("275.54")).toBeInTheDocument();
  expect(queries).toHaveBeenCalledWith({ profileId: "owner", platform: "ws", text });
  expect(mutations).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Import", exact: true }));
  expect(await screen.findByText("Import complete")).toBeInTheDocument();
  expect(mutations).toHaveBeenCalledWith({ profileId: "owner", platform: "ws", text, previewHash: "preview-hash" });
  await waitFor(() => expect(refresh).toHaveBeenCalled());
  expect(screen.getByText(/Row 1: Saved the statement total/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Download import results" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Import", exact: true })).toBeDisabled();
});
test("editing pasted text invalidates the previous preview", async () => {
  show();
  fireEvent.change(screen.getByLabelText("CSV text"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  await screen.findByText(/1 transactions to import/);
  fireEvent.change(screen.getByLabelText("CSV text"), { target: { value: text + " changed" } });
  expect(screen.queryByText(/1 transactions to import/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Import", exact: true })).toBeDisabled();
});
test("row errors prevent importing", async () => {
  const bad = { parsed: { transactions: [], skipped: [], errors: [{ row: 1, message: "Unsupported activity SELL" }] }, plan: null, previewHash: null };
  const { mutations } = show(bad as any);
  fireEvent.change(screen.getByLabelText("CSV text"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  expect(await screen.findByText("Row 1: Unsupported activity SELL")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Import", exact: true })).toBeDisabled();
  expect(mutations).not.toHaveBeenCalled();
});
test("partial imports report saved records and require another preview", async () => {
  show(goodPreview, false);
  fireEvent.change(screen.getByLabelText("CSV text"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  await screen.findByText(/1 transactions to import/);
  fireEvent.click(screen.getByRole("button", { name: "Import", exact: true }));
  expect(await screen.findByText("Import stopped")).toBeInTheDocument();
  expect(screen.getByText("Earlier saves remain in your account. Preview again before retrying.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Import", exact: true })).toBeDisabled();
  await waitFor(() => expect(screen.getByRole("button", { name: "Preview" })).toBeEnabled());
});

const csvText = '"date","transaction","description","amount","balance","currency"\n"2025-11-04","DIV","ZFL - Bond ETF: Distribution","21.95","100","CAD"';
test("CSV files populate the text box and automatically preview the newly read contents", async () => {
  const { queries, mutations } = show();
  const file = new File([csvText], "activity.csv", { type: "text/csv" });
  const read = jest.fn().mockResolvedValue(csvText);
  Object.defineProperty(file, "text", { value: read });
  const input = screen.getByLabelText("CSV file") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() => expect(screen.getByLabelText("CSV text")).toHaveValue(csvText));
  expect(input.value).toBe("");
  expect(read).toHaveBeenCalledTimes(1);
  expect(mutations).not.toHaveBeenCalled();
  expect(screen.getByText("activity.csv")).toBeInTheDocument();
  await screen.findByText(/1 transactions to import/);
  expect(queries).toHaveBeenCalledWith({ profileId: "owner", platform: "ws", text: csvText });
  expect(queries).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Preview" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Import", exact: true }));
  await screen.findByText("Import complete");
  expect(screen.getByLabelText("CSV text")).toHaveValue("");
  expect(screen.queryByText("activity.csv")).not.toBeInTheDocument();
});
test("pasted CSV uses the same preview flow", async () => {
  const { queries } = show();
  fireEvent.change(screen.getByLabelText("CSV text"), { target: { value: csvText } });
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  await screen.findByText(/1 transactions to import/);
  expect(queries).toHaveBeenCalledWith({ profileId: "owner", platform: "ws", text: csvText });
});
test("invalid files clear a stale preview and never access the API", async () => {
  const { queries, mutations } = show();
  fireEvent.change(screen.getByLabelText("CSV text"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  await screen.findByText(/1 transactions to import/);
  const file = new File(["bad"], "activity.pdf");
  fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [file] } });
  expect(await screen.findByText("Choose a .csv file.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Import", exact: true })).toBeDisabled();
  expect(queries).toHaveBeenCalledTimes(1);
  expect(mutations).not.toHaveBeenCalled();
});
test("file read failures and oversized contents show actionable errors", async () => {
  show();
  const file = new File(["a"], "activity.csv");
  Object.defineProperty(file, "text", { value: jest.fn().mockRejectedValue(new Error("Unable to read CSV")) });
  fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [file] } });
  expect(await screen.findByText("Unable to read CSV")).toBeInTheDocument();
  const huge = new File(["a"], "large.csv");
  Object.defineProperty(huge, "size", { value: 800001 });
  fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [huge] } });
  expect(await screen.findByText(/Choose a CSV smaller than 800 KB/)).toBeInTheDocument();
});


test("preview pagination changes rows and page size", async () => {
  const entries = Array.from({ length: 60 }, (_, index) => ({ ...entry, row: index + 1, ticker: `TICKER${index + 1}` }));
  const preview = { ...goodPreview, parsed: { ...goodPreview.parsed, transactions: entries }, plan: { ...goodPreview.plan, rows: entries.map(entry => ({ entry, status: "pending" })), summary: { ...goodPreview.plan.summary, transactionsToCreate: 60 } } };
  show(preview);
  fireEvent.change(screen.getByLabelText("CSV text"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  await screen.findByText("TICKER1");
  const table = screen.getByRole("table");
  expect(within(table).queryByText("TICKER11")).not.toBeInTheDocument();
  fireEvent.click(screen.getByTitle("2"));
  expect(await within(table).findByText("TICKER11")).toBeInTheDocument();
  expect(within(table).queryByText("TICKER1")).not.toBeInTheDocument();
  fireEvent.mouseDown(document.querySelector('.ant-pagination-options-size-changer .ant-select-selector')!);
  fireEvent.click(await screen.findByText("20 / page"));
  await waitFor(() => expect(within(table).getAllByRole("row")).toHaveLength(21));
  fireEvent.change(screen.getByLabelText("CSV text"), { target: { value: text + "\n" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  await waitFor(() => expect(within(screen.getByRole("table")).getByText("TICKER1")).toBeInTheDocument());
});


test("preview is disabled after success until input changes", async () => {
  const { queries } = show();
  fireEvent.change(screen.getByLabelText("CSV text"), { target: { value: text } });
  const button = screen.getByRole("button", { name: "Preview" });
  fireEvent.click(button);
  await screen.findByText(/1 transactions to import/);
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(queries).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText("CSV text"), { target: { value: text + "\n" } });
  expect(button).toBeEnabled();
  fireEvent.click(button);
  await screen.findByText(/1 transactions to import/);
  expect(queries).toHaveBeenCalledTimes(2);
  expect(button).toBeDisabled();
});


test("reselecting a file with identical CSV preserves the preview and avoids repeat calls", async () => {
  const { queries } = show();
  fireEvent.change(screen.getByLabelText("CSV text"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  await screen.findByText(/1 transactions to import/);
  const file = new File([text], "same.csv", { type: "text/csv" });
  Object.defineProperty(file, "text", { value: jest.fn().mockResolvedValue(text) });
  fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [file] } });
  await screen.findByText("same.csv");
  expect(screen.getByRole("button", { name: "Preview" })).toBeDisabled();
  expect(screen.getByText(/1 transactions to import/)).toBeInTheDocument();
  expect(queries).toHaveBeenCalledTimes(1);
});

test("a failed preview allows retry without editing the CSV", async () => {
  const { queries } = show(goodPreview, true, true);
  fireEvent.change(screen.getByLabelText("CSV text"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  await screen.findByText("Preview unavailable");
  await waitFor(() => expect(screen.getByRole("button", { name: "Preview" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  await waitFor(() => expect(queries).toHaveBeenCalledTimes(2));
});


test("inferred withholding stock is visible in preview", async () => {
  const inferred = { ...entry, activity: "Withholding Tax", stockInferred: true, dividendRow: 1 };
  show({ ...goodPreview, plan: { ...goodPreview.plan, rows: [{ entry: inferred, status: "pending" }] } });
  fireEvent.change(screen.getByLabelText("CSV text"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  expect(await screen.findByText("From dividend")).toBeInTheDocument();
  expect(screen.getByTitle("Stock inferred from dividend in row 1")).toBeInTheDocument();
});


test("choosing a different CSV replaces the previous preview and uses the new text", async () => {
  const { queries, mutations } = show();
  fireEvent.change(screen.getByLabelText("CSV text"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  await screen.findByText(/1 transactions to import/);
  const file = new File([csvText], "new.csv", { type: "text/csv" });
  Object.defineProperty(file, "text", { value: jest.fn().mockResolvedValue(csvText) });
  fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [file] } });
  await waitFor(() => expect(queries).toHaveBeenCalledTimes(2));
  expect(queries.mock.calls[1][0]).toEqual({ profileId: "owner", platform: "ws", text: csvText });
  expect(screen.getByLabelText("CSV text")).toHaveValue(csvText);
  expect(mutations).not.toHaveBeenCalled();
});

test("automatic preview failure keeps the CSV available for a manual retry", async () => {
  const { queries } = show(goodPreview, true, true);
  const file = new File([csvText], "retry.csv", { type: "text/csv" });
  Object.defineProperty(file, "text", { value: jest.fn().mockResolvedValue(csvText) });
  fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [file] } });
  await screen.findByText("Preview unavailable");
  expect(screen.getByLabelText("CSV text")).toHaveValue(csvText);
  await waitFor(() => expect(screen.getByRole("button", { name: "Preview" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  await waitFor(() => expect(queries).toHaveBeenCalledTimes(2));
});

test("choosing CSV before a platform is selected fills the text without querying", async () => {
  const { queries } = show(goodPreview, true, false, "");
  const file = new File([csvText], "activity.csv", { type: "text/csv" });
  Object.defineProperty(file, "text", { value: jest.fn().mockResolvedValue(csvText) });
  fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [file] } });
  await waitFor(() => expect(screen.getByLabelText("CSV text")).toHaveValue(csvText));
  expect(queries).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Preview" })).toBeDisabled();
});
