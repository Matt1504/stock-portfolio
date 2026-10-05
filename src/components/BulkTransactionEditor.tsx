import { gql } from "@apollo/client";
import { Alert, Button, DatePicker, InputNumber, Select, Space, Table, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { Transaction } from "../models/Transaction";
import { useProfileMutation, useProfileQuery } from "../profiles/hooks";
import { transactionErrorMessage } from "../utils/transactionFeedback";
import { cashActivities, inactiveTransactionFields } from "../views/AddTransactionView/transactionFields";
import { OUTSTANDING_GIC_PURCHASES } from "../views/AddTransactionView/gql";
import { changedDraft, transactionDraft, TransactionDraft, updateDraft } from "./bulkTransactionDrafts";
import { transactionPageSizes, TransactionPagination } from "./transactionTableState";

export const BULK_EDIT_OPTIONS = gql`
  query BulkEditOptions($profileId: ID!) {
    accounts { edges { node { id code } } }
    activities { edges { node { id name } } }
    currencies { edges { node { id code } } }
    stocks { edges { node { id ticker name asset { id name } currency { id code } } } }
    platforms(profileId: $profileId) { edges { node { id name account { id code } currency { id code } } } }
  }
`;
export const BULK_UPDATE_TRANSACTIONS = gql`
  mutation BulkUpdateTransactions($profileId: ID!, $transactions: [TransactionInput!]!) {
    bulkUpdateTransactions(profileId: $profileId, transactions: $transactions) {
      results { id success error code warnings { code message } }
    }
  }
`;

function GicPurchaseSelect({ draft, original, onChange, disabled }: { draft: TransactionDraft; original: Transaction; onChange: (value: string | null) => void; disabled: boolean }) {
  const { data, loading, error } = useProfileQuery(OUTSTANDING_GIC_PURCHASES, { variables: { platform: draft.platform, stock: draft.stock }, skip: !draft.platform || !draft.stock });
  const purchases = [...(data?.outstandingGicPurchases ?? [])];
  if (original.gicPurchase && !purchases.some(row => row.id === original.gicPurchase?.id)) purchases.push(original.gicPurchase);
  return <Select aria-label={`Original GIC Purchase ${draft.id}`} allowClear loading={loading} disabled={disabled || !!error} style={{ width: 220 }} value={draft.gicPurchase} options={purchases.map(row => ({ value: row.id, label: `${row.transactionDate} · $${row.total}` }))} onChange={value => onChange(value ?? null)} />;
}

export default function BulkTransactionEditor({ rows, onCancel, onComplete, defaultSort, ascending, hiddenColumns = [], paginationModel, onPaginationModelChange }: { rows: Transaction[]; onCancel: () => void; onComplete?: (saved: number, warnings: string[]) => void; defaultSort: string; ascending: boolean; hiddenColumns?: string[]; paginationModel?: TransactionPagination; onPaginationModelChange?: (model: TransactionPagination) => void }) {
  const [localPagination, setLocalPagination] = useState<TransactionPagination>({ page: 0, pageSize: 25 });
  const pagination = paginationModel ?? localPagination;
  // Keep the snapshot stable while Apollo refreshes successfully saved rows.
  const [originals, setOriginals] = useState<Record<string, TransactionDraft>>(() => Object.fromEntries(rows.map(row => [row.id, transactionDraft(row)])));
  const [drafts, setDrafts] = useState<TransactionDraft[]>(() => rows.map(transactionDraft).sort((a, b) => String(a[defaultSort] ?? "").localeCompare(String(b[defaultSort] ?? ""), undefined, { numeric: true }) * (ascending ? 1 : -1)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "error" | "warning" | "success"; text: string }>();
  const optionsQuery = useProfileQuery(BULK_EDIT_OPTIONS);
  const [submit, { loading: saving }] = useProfileMutation(BULK_UPDATE_TRANSACTIONS, { awaitRefetchQueries: true });
  const nodes = (field: string): any[] => optionsQuery.data?.[field]?.edges.map((edge: any) => edge.node) ?? [];
  const platforms = nodes("platforms"), stocks = nodes("stocks"), activities = nodes("activities");
  const changed = drafts.filter(draft => changedDraft(originals[draft.id], draft));
  const change = (id: string, field: string, value: any) => {
    setErrors(current => { const next = { ...current }; delete next[id]; return next; });
    setDrafts(current => current.map(draft => {
      if (draft.id !== id) return draft;
      let next = updateDraft(draft, field, value);
      if (field === "account") {
        const platform = platforms.find(p => p.account.id === value && p.currency.id === draft.totalCurrency) ?? platforms.find(p => p.account.id === value);
        next.platform = platform?.id ?? null;
      }
      if (field === "account" || field === "platform") {
        const platform = platforms.find(p => p.id === next.platform);
        next.account = platform?.account.id ?? next.account;
        next.totalCurrency = platform?.currency.id ?? null;
        next.exchangeRate = next.priceCurrency === next.totalCurrency ? 1 : null;
      }
      if (field === "priceCurrency") next.exchangeRate = value === next.totalCurrency ? 1 : null;
      if (field === "stock") {
        const stock = stocks.find(stock => stock.id === value);
        next.priceCurrency = stock?.currency.id ?? next.totalCurrency;
        next.exchangeRate = next.priceCurrency === next.totalCurrency ? 1 : null;
        next.gicPurchase = null;
      }
      if (["stock", "activityName"].includes(field)) {
        const asset = stocks.find(stock => stock.id === next.stock)?.asset?.name;
        const nonStock = asset === "GIC" ? "gic" : ["Index Fund", "Mutual Fund"].includes(asset) && !next.shares ? "fund" : "";
        inactiveTransactionFields(next.activityName, nonStock).forEach(key => { if (key in next) next[key] = null; });
        if (cashActivities.includes(next.activityName)) next.stock = null;
        if (next.activityName === "Stock Spinoff") next.total = 0;
      }
      return next;
    }));
  };
  const save = async () => {
    setMessage(undefined);
    const submitted = changed.slice();
    try {
      const transactions = submitted.map(({ activityName, ...draft }) => ({ ...draft, activity: activities.find(activity => activity.name === activityName)?.id }));
      const response = await submit({ variables: { transactions } });
      const results = response.data?.bulkUpdateTransactions?.results;
      if (!results) throw new Error("No update results returned. Refresh before retrying.");
      const succeeded = results.filter((result: any) => result.success);
      setOriginals(current => {
        const next = { ...current };
        succeeded.forEach((result: any) => { next[result.id] = submitted.find(draft => draft.id === result.id)!; });
        return next;
      });
      const failed = results.filter((result: any) => !result.success);
      setErrors(Object.fromEntries(failed.map((result: any) => [result.id, result.error])));
      const warnings = results.flatMap((result: any) => result.warnings.map((warning: any) => `${result.id}: ${warning.message}`));
      setMessage({ type: failed.length ? "error" : warnings.length ? "warning" : "success", text: `${succeeded.length} transaction(s) saved. ${failed.length ? `${failed.length} could not be saved; correct their errors and submit again.` : ""} ${warnings.join(" ")}` });
      if (!failed.length) {
        onComplete?.(succeeded.length, warnings);
        onCancel();
      }
    } catch (error) {
      setMessage({ type: "error", text: transactionErrorMessage(error) });
    }
  };
  const disabled = saving || optionsQuery.loading || !!optionsQuery.error;
  const stockFor = (draft: TransactionDraft) => stocks.find(stock => stock.id === draft.stock);
  const hasShares = (draft: TransactionDraft) => ["Buy", "Sell", "Stock Split", "Stock Spinoff"].includes(draft.activityName) && stockFor(draft)?.asset?.name !== "GIC";
  const trade = (draft: TransactionDraft) => ["Buy", "Sell"].includes(draft.activityName) && stockFor(draft)?.asset?.name !== "GIC" && (stockFor(draft)?.asset?.name === "Stock" || !!draft.shares);
  const select = (draft: TransactionDraft, field: string, label: string, options: { value: string; label: string }[], allowClear = false, extraDisabled = false) => <Select aria-label={`${label} ${draft.id}`} value={draft[field]} options={options} showSearch optionFilterProp="label" allowClear={allowClear} disabled={disabled || extraDisabled} style={{ width: "100%", minWidth: 110 }} onChange={value => change(draft.id, field, value ?? null)} />;
  const num = (draft: TransactionDraft, field: string, label: string, precision = 2) => <InputNumber aria-label={`${label} ${draft.id}`} value={draft[field]} precision={precision} formatter={(value, info) => info.userTyping ? info.input : value == null || value === "" ? "" : String(Number(value))} step={precision === 8 ? 0.001 : precision === 4 ? 0.0001 : 0.01} style={{ width: "100%" }} disabled={disabled} onChange={value => change(draft.id, field, value)} />;
  const date = (draft: TransactionDraft, field: string, label: string) => <DatePicker aria-label={`${label} ${draft.id}`} value={draft[field] ? dayjs(draft[field]) : null} disabled={disabled} onChange={value => change(draft.id, field, value?.format("YYYY-MM-DD") ?? null)} />;
  const columns: any[] = [
    { title: "Date", key: "date", width: 150, render: (_: any, d: TransactionDraft) => date(d, "transactionDate", "Date") },
    { title: "Activity", key: "activity", width: 170, render: (_: any, d: TransactionDraft) => select(d, "activityName", "Activity", activities.map(a => ({ value: a.name, label: a.name }))) },
    { title: "Account", key: "account", width: 125, render: (_: any, d: TransactionDraft) => select(d, "account", "Account", nodes("accounts").map(a => ({ value: a.id, label: a.code }))) },
    { title: "Platform / currency", key: "platform", width: 240, render: (_: any, d: TransactionDraft) => select(d, "platform", "Platform", platforms.filter(p => p.account.id === d.account).map(p => ({ value: p.id, label: `${p.name} · ${p.currency.code}` }))) },
    { title: "Stock", key: "stock", width: 240, render: (_: any, d: TransactionDraft) => cashActivities.includes(d.activityName) ? "—" : select(d, "stock", "Stock", stocks.map(s => ({ value: s.id, label: `${s.ticker} · ${s.name}` })), true) },
    { title: "Price", key: "price", width: 130, render: (_: any, d: TransactionDraft) => trade(d) ? num(d, "price", "Price", 8) : "—" },
    { title: "Shares", key: "shares", width: 130, render: (_: any, d: TransactionDraft) => hasShares(d) ? num(d, "shares", "Shares", 4) : "—" },
    { title: "Fee", key: "fee", width: 110, render: (_: any, d: TransactionDraft) => trade(d) ? num(d, "fee", "Fee") : "—" },
    { title: "Price currency", key: "priceCurrency", width: 140, render: (_: any, d: TransactionDraft) => trade(d) ? select(d, "priceCurrency", "Price currency", nodes("currencies").map(c => ({ value: c.id, label: c.code })), false, stockFor(d)?.currency.id === d.totalCurrency) : "—" },
    { title: "FX rate", key: "exchangeRate", width: 130, render: (_: any, d: TransactionDraft) => trade(d) && d.priceCurrency !== d.totalCurrency ? num(d, "exchangeRate", "FX rate", 8) : "—" },
    { title: "Total", key: "total", width: 140, render: (_: any, d: TransactionDraft) => d.activityName === "Stock Spinoff" ? "0.00" : num(d, "total", "Total") },
  ];
  if (drafts.some(d => stockFor(d)?.asset?.name === "GIC")) columns.push(
    { title: "Rate (%)", key: "rate", width: 120, render: (_: any, d: TransactionDraft) => stockFor(d)?.asset?.name === "GIC" && d.activityName === "Buy" ? num(d, "rate", "Rate") : "—" },
    { title: "Maturity date", key: "maturity", width: 150, render: (_: any, d: TransactionDraft) => stockFor(d)?.asset?.name === "GIC" && d.activityName === "Buy" ? date(d, "maturityDate", "Maturity date") : "—" },
    { title: "Interest calculation", key: "interestCalculation", width: 180, render: (_: any, d: TransactionDraft) => stockFor(d)?.asset?.name === "GIC" && d.activityName === "Buy" ? select(d, "interestCalculation", "Interest calculation", [{ value: "simple", label: "Simple" }, { value: "annual_compound", label: "Annual compound" }]) : "—" },
    { title: "Original GIC Purchase", key: "gicPurchase", width: 230, render: (_: any, d: TransactionDraft) => d.activityName === "GIC Maturity" ? <GicPurchaseSelect draft={d} original={rows.find(row => row.id === d.id)!} disabled={disabled} onChange={value => change(d.id, "gicPurchase", value)} /> : "—" },
  );
  if (drafts.some(d => d.activityName === "Stock Spinoff")) columns.push(
    { title: "Original stock", key: "spinoffSource", width: 230, render: (_: any, d: TransactionDraft) => d.activityName === "Stock Spinoff" ? select(d, "spinoffSource", "Original stock", stocks.map(s => ({ value: s.id, label: s.ticker }))) : "—" },
    { title: "Allocated book cost", key: "allocatedBookCost", width: 160, render: (_: any, d: TransactionDraft) => d.activityName === "Stock Spinoff" ? num(d, "allocatedBookCost", "Allocated book cost") : "—" },
  );
  const columnFields: Record<string, string> = { date: "transactionDate", maturity: "maturityDate" };
  const visibleColumns = columns.filter(column => !hiddenColumns.includes(columnFields[column.key] ?? column.key));
  return <Space direction="vertical" size="middle" style={{ width: "100%" }}>
    <Space wrap><Button onClick={onCancel} disabled={saving}>{changed.length ? "Cancel" : "Done"}</Button><Button type="primary" onClick={save} loading={saving} disabled={disabled || !changed.length || changed.length > 200}>Submit ({changed.length})</Button><Typography.Text type="secondary">Only changed rows are submitted. Valid rows save; rejected rows remain editable.</Typography.Text></Space>
    {optionsQuery.error && <Alert type="error" message="Could not load edit options. Close bulk edit and try again." />}
    {changed.length > 200 && <Alert type="warning" message="Submit at most 200 changed rows at a time." />}
    {message && <Alert type={message.type} showIcon message={message.text} />}
    {Object.entries(errors).map(([id, error]) => {
      const draft = drafts.find(row => row.id === id);
      const stock = draft && stockFor(draft);
      return <Alert key={id} type="error" showIcon message={`${draft?.transactionDate} · ${draft?.activityName}${stock ? ` · ${stock.ticker}` : ""}`} description={error} />;
    })}
    <Table rowKey="id" dataSource={drafts} columns={visibleColumns} loading={optionsQuery.loading} scroll={{ x: "max-content" }} pagination={{ current: pagination.page + 1, pageSize: pagination.pageSize, showSizeChanger: true, pageSizeOptions: transactionPageSizes, onChange: (current, pageSize) => {
      const model = { page: current - 1, pageSize };
      setLocalPagination(model);
      onPaginationModelChange?.(model);
    } }} size="small" />
  </Space>;
}
