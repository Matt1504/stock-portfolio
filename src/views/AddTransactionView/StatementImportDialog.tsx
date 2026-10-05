import { formatNumber } from "../../utils/utils";
import { UploadOutlined } from "@ant-design/icons";
import { gql, useLazyQuery } from "@apollo/client";
import { Alert, Button, Input, Modal, Select, Space, Table, Tag, Typography } from "antd";
import { useContext, useEffect, useRef, useState } from "react";
import { ProfileContext } from "../../profiles/ProfileContext";
import { useProfileMutation } from "../../profiles/hooks";
import { GraphQLNode } from "../../models/GraphQLNode";
import { Platform } from "../../models/Platform";
import { Account } from "../../models/Account";
import { Currency } from "../../models/Currency";
import { transactionErrorMessage } from "../../utils/transactionFeedback";

export const PREVIEW_STATEMENT = gql`
  query PreviewStatement($profileId: ID!, $platform: ID!, $text: String!) {
    previewStatementImport(profileId: $profileId, platform: $platform, text: $text) { parsed plan previewHash }
  }
`;
export const IMPORT_STATEMENT = gql`
  mutation ImportStatement($profileId: ID!, $platform: ID!, $text: String!, $previewHash: String!) {
    importStatement(profileId: $profileId, platform: $platform, text: $text, previewHash: $previewHash) { report }
  }
`;
type Entry = { stockInferred?: boolean; dividendRow?: number; row: number; transactionDate: string; activity: string; ticker?: string; shares?: string; price?: string; priceCurrency?: string; exchangeRate?: string; total: string };
type Issue = { row: number; message?: string; reason?: string };
type Plan = { rows: { entry: Entry; status: string }[]; stocksToCreate: { ticker: string; name: string }[]; errors: Issue[]; summary: { transactionsToCreate: number; existingTransactions: number; stocksToCreate: number; skippedRows: number } };
type Preview = { parsed: { transactions: Entry[]; skipped: Issue[]; errors: Issue[] }; plan?: Plan; previewHash?: string };
type Report = { complete: boolean; createdTransactions: { row: number; id: string; warnings: { code: string; message: string }[] }[]; createdStocks: { id: string; ticker: string }[]; existingRows: number[]; skipped: Issue[]; errors: string[]; inFlight?: { row?: number; ticker?: string } };
type Metadata = { accounts: { edges: GraphQLNode<Account>[] }; currencies: { edges: GraphQLNode<Currency>[] }; platforms: { edges: GraphQLNode<Platform>[] } };

export default function StatementImportDialog({ data, initialPlatform, onClose, onImported }: { data: Metadata; initialPlatform?: string; onClose: () => void; onImported: () => Promise<unknown> }) {
  const scope = useContext(ProfileContext);
  const platforms = data.platforms.edges.map(({ node }) => node).filter(p => data.currencies.edges.some(({ node }) => node.id === p.currency?.id && node.code === "CAD"));
  const initial = platforms.find(p => p.id === initialPlatform);
  const [account, setAccount] = useState(initial?.account?.id ?? "");
  const [platform, setPlatform] = useState(initial?.id ?? "");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [readingFile, setReadingFile] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const [preview, setPreview] = useState<Preview>();
  const [report, setReport] = useState<Report>();
  const [error, setError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const [loadPreview, { loading: previewLoading }] = useLazyQuery(PREVIEW_STATEMENT, { fetchPolicy: "no-cache" });
  const [importStatement, { loading: importLoading }] = useProfileMutation(IMPORT_STATEMENT, {
    refetchQueries: [],
    update: cache => { cache.evict({ id: "ROOT_QUERY", fieldName: "stocks" }); },
  });
  const busy = previewLoading || importLoading || refreshing || readingFile;
  const invalidate = () => { setHasPreviewed(false); setPagination(previous => ({ ...previous, current: 1 })); setPreview(undefined); setReport(undefined); setError(undefined); };
  const eligiblePlatforms = platforms.filter(p => p.account?.id === account);
  const solePlatformId = eligiblePlatforms.length === 1 ? eligiblePlatforms[0].id : undefined;
  useEffect(() => {
    if (!busy && solePlatformId && platform !== solePlatformId) {
      setPlatform(solePlatformId);
      setHasPreviewed(false);
      setPagination(previous => ({ ...previous, current: 1 }));
      setPreview(undefined);
      setReport(undefined);
      setError(undefined);
    }
  }, [busy, solePlatformId, platform]);
  const readCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = ""; // Release the input's file reference; allow reselecting it.
    if (!file) return;
    const rejectFile = (message: string) => { invalidate(); setText(""); setFileName(""); setError(message); };
    setError(undefined);
    if (!file.name.toLowerCase().endsWith(".csv")) { rejectFile("Choose a .csv file."); return; }
    if (file.size > 800000) { rejectFile("Choose a CSV smaller than 800 KB (up to 200,000 text characters)."); return; }
    setReadingFile(true);
    try {
      const contents = await file.text();
      if (!contents.trim()) throw new Error("CSV file is empty.");
      if (contents.length > 200000) throw new Error("CSV text exceeds the 200,000-character limit.");
      if (contents !== text) { invalidate(); setText(contents); }
      setFileName(file.name);
      if (scope?.profile && platform && (contents !== text || !hasPreviewed)) await makePreview(contents);
    } catch (error) { rejectFile(transactionErrorMessage(error)); }
    finally { setReadingFile(false); }
    // No File object is retained in state or uploaded; only text is previewed.
  };
  const makePreview = async (csv = text) => {
    setHasPreviewed(true);
    setPagination(previous => ({ ...previous, current: 1 }));
    setError(undefined);
    setReport(undefined);
    setPreview(undefined);
    try {
      const response = await loadPreview({ variables: { profileId: scope?.profile?.id, platform, text: csv } });
      if (response.error) throw response.error;
      setPreview(response.data?.previewStatementImport);
    } catch (error) { setError(transactionErrorMessage(error)); setHasPreviewed(false); }
  };
  const apply = async () => {
    if (!preview?.previewHash) return;
    setError(undefined);
    try {
      const response = await importStatement({ variables: { profileId: scope?.profile?.id, platform, text, previewHash: preview.previewHash } });
      const result: Report = response.data.importStatement.report;
      setReport(result);
      if (result.complete) { setText(""); setFileName(""); }
      setPreview(undefined); // A fresh preview is required for every import/retry.
      setRefreshing(true);
      try { await onImported(); } catch { setError("Records were saved, but refreshing the page data failed. Refresh the page before continuing."); }
      finally { setRefreshing(false); }
    } catch (error) { setError(transactionErrorMessage(error)); setPreview(undefined); }
    finally { setHasPreviewed(false); }
  };
  const issues = [...(preview?.parsed.errors ?? []), ...(preview?.plan?.errors ?? [])];
  const rows = preview?.plan?.rows ?? preview?.parsed.transactions.map(entry => ({ entry, status: "Parsed" })) ?? [];
  const warnings = report?.createdTransactions.flatMap(row => row.warnings.map(warning => ({ row: row.row, ...warning }))) ?? [];
  return <Modal open title="Import Transactions" width={1050} onCancel={onClose} closable={!busy} maskClosable={!busy} keyboard={!busy} footer={<Space>
    <Button disabled={busy} onClick={onClose}>Close</Button>
    <Button aria-label="Preview" loading={previewLoading} disabled={busy || hasPreviewed || !scope?.profile || !platform || !text.trim()} onClick={() => void makePreview()}>Preview</Button>
    <Button aria-label="Import" icon={<UploadOutlined />} type="primary" loading={importLoading || refreshing} disabled={busy || !preview?.previewHash || issues.length > 0 || !preview?.plan?.summary.transactionsToCreate} onClick={() => void apply()}>Import</Button>
  </Space>}>
    <Typography.Paragraph>Paste Wealthsimple CSV and click Preview, or choose a CSV file to preview it automatically once an account and platform are selected. Files are read temporarily in your browser; the file itself is not uploaded or stored. Expected columns: date, transaction, description, amount, balance, currency. This format uses CAD accounts and supports Buy, Contribution, Dividends, Withholding Tax, Service Fee, and ETF Rebate. ROC and NCDIS entries are shown as skipped ACB adjustments.</Typography.Paragraph>
    <Space wrap style={{ display: "flex", marginBottom: 20 }}>
      <div><label htmlFor="import-account" style={{ display: "block", marginBottom: 8 }}>Account</label><Select id="import-account" aria-label="Import account" style={{ minWidth: 140 }} disabled={busy} value={account || undefined} options={data.accounts.edges.filter(({ node }) => platforms.some(p => p.account?.id === node.id)).map(({ node }) => ({ value: node.id, label: node.code ?? node.name }))} onChange={id => { setAccount(id); setPlatform(""); invalidate(); }} /></div>
      <div><label htmlFor="import-platform" style={{ display: "block", marginBottom: 8 }}>Platform (CAD)</label><Select id="import-platform" aria-label="Import platform" style={{ minWidth: 240 }} disabled={busy || !account} value={platform || undefined} options={platforms.filter(p => p.account?.id === account).map(p => ({ value: p.id, label: p.name }))} onChange={id => { setPlatform(id); invalidate(); }} /></div>
    </Space>
    {!platforms.length && <Alert type="info" message="Add a CAD platform to this profile before importing." style={{ marginBottom: 16 }} />}
    <Space wrap style={{ display: "flex", marginBottom: 16 }}>
      <input ref={fileInput} type="file" accept=".csv,text/csv" aria-label="CSV file" hidden disabled={busy} onChange={event => void readCsv(event)} />
      <Button disabled={busy} loading={readingFile} onClick={() => fileInput.current?.click()}>Choose CSV</Button>
      {fileName && <Typography.Text>{fileName}</Typography.Text>}
      {!!text && <Button disabled={busy} onClick={() => { setText(""); setFileName(""); invalidate(); }}>Clear text</Button>}
    </Space>
    <label htmlFor="csv-text" style={{ display: "block", marginBottom: 8 }}>CSV text</label>
    <Input.TextArea id="csv-text" rows={9} value={text} disabled={busy} maxLength={200000} placeholder="Paste CSV including the date,transaction,description,amount,balance,currency header" onChange={event => { setText(event.target.value); setFileName(""); invalidate(); }} style={{ marginBottom: 24 }} />
    {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
    {issues.length > 0 && <Alert type="error" showIcon message="Fix these rows before importing" description={issues.map((issue, i) => <div key={i}>Row {issue.row}: {issue.message}</div>)} style={{ marginBottom: 16 }} />}
    {preview?.plan && <Alert type="info" showIcon message={`${preview.plan.summary.transactionsToCreate} transactions to import · ${preview.plan.summary.existingTransactions} already saved · ${preview.plan.summary.stocksToCreate} new stocks · ${preview.plan.summary.skippedRows} skipped rows`} style={{ marginBottom: 16 }} />}
    {!!preview?.plan?.stocksToCreate.length && <Typography.Paragraph>Stocks to create: {preview.plan.stocksToCreate.map(stock => `${stock.ticker} (${stock.name})`).join(", ")}</Typography.Paragraph>}
    {!!preview?.parsed.skipped.length && <Typography.Paragraph>{preview.parsed.skipped.map(row => `Row ${row.row}: ${row.reason}`).join(" ")}</Typography.Paragraph>}
    {!!rows.length && <Table size="small" rowKey={row => String(row.entry.row)} dataSource={rows} pagination={{ ...pagination, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100], onChange: (current, pageSize) => setPagination(previous => ({ current: pageSize === previous.pageSize ? current : 1, pageSize })) }} scroll={{ x: 900 }} columns={[
      { title: "Row", render: (_, row) => row.entry.row }, { title: "Date", render: (_, row) => row.entry.transactionDate },
      { title: "Activity", render: (_, row) => row.entry.activity }, { title: "Stock", render: (_, row) => <Space>{row.entry.ticker ?? "—"}{row.entry.stockInferred && <Tag color="gold" title={`Stock inferred from dividend in row ${row.entry.dividendRow}`}>From dividend</Tag>}</Space> },
      { title: "Shares", render: (_, row) => row.entry.shares ? formatNumber(Number(row.entry.shares)) : "—" },
      { title: "Price", render: (_, row) => row.entry.price ? `${formatNumber(Number(row.entry.price), 2, 2)} ${row.entry.priceCurrency}` : "—" },
      { title: "FX", render: (_, row) => row.entry.exchangeRate == null ? "—" : formatNumber(Number(row.entry.exchangeRate), 8) }, { title: "Total (CAD)", render: (_, row) => formatNumber(Number(row.entry.total), 2, 2) },
      { title: "Status", render: (_, row) => <Tag color={row.status === "existing" ? "default" : "blue"}>{row.status === "existing" ? "Already saved" : "New"}</Tag> },
    ]} />}
    {report && <Space direction="vertical" style={{ width: "100%", marginTop: 16 }}>
      <Alert showIcon type={report.complete ? "success" : "error"} message={report.complete ? "Import complete" : "Import stopped"} description={`${report.createdTransactions.length} transactions and ${report.createdStocks.length} stocks created. ${report.existingRows.length} existing transactions skipped.`} />
      {report.errors.map((message, i) => <Alert key={`error-${i}`} type="error" message={message} description="Earlier saves remain in your account. Preview again before retrying." />)}
      {warnings.map((warning, i) => <Alert key={`warning-${i}`} type="warning" message={`Row ${warning.row}: ${warning.message}`} />)}
      <Button onClick={() => { const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = "statement-import-result.json"; link.click(); URL.revokeObjectURL(url); }}>Download import results</Button>
    </Space>}
  </Modal>;
}
