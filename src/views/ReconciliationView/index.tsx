import "./reconciliation.css";
import { useApolloClient } from "@apollo/client";
import { Alert, Button, Card, Checkbox, DatePicker, Empty, Input, InputNumber, Select, Space, Table, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { useContext, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ProfileContext } from "../../profiles/ProfileContext";
import { useProfileQuery } from "../../profiles/hooks";
import { GET_PLATFORM_INFO } from "../AddTransactionView/gql";
import { HISTORY, PREVIEW, SAVE } from "./gql";
import { Comparison, HoldingInput, Saved, ValueCheck } from "./types";
import { formatNumber } from "../../utils/utils";

const number = (value: string | null, precision = 2) => value == null ? "—" : formatNumber(Number(value), precision, precision === 2 ? 2 : 0);
const outcome = (value: string) => ({ exact: "Matched", within_tolerance: "Within tolerance", different: "Difference", not_checked: "Not checked" }[value] ?? value);
export default function ReconciliationView() {
  const profile = useContext(ProfileContext)?.profile;
  return <ReconciliationPage key={profile?.id ?? "none"} profileId={profile?.id} />;
}
export function ReconciliationPage({ profileId }: { profileId?: string }) {
  const client = useApolloClient();
  const [params, setParams] = useSearchParams();
  const platform = params.get("platform") ?? undefined;
  const metadata = useProfileQuery(GET_PLATFORM_INFO);
  const platforms = (metadata.data?.platforms?.edges ?? []).map(({ node }: any) => node);
  const validPlatform = platforms.some((item: any) => item.id === platform);
  const [end, setEnd] = useState(dayjs().subtract(1, "month").endOf("month").format("YYYY-MM-DD"));
  const [start, setStart] = useState<string>();
  const [basis, setBasis] = useState("recorded");
  const [cash, setCash] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<HoldingInput[]>([]);
  const [complete, setComplete] = useState(false);
  const [moneyTolerance, setMoneyTolerance] = useState<string | null>("0.01");
  const [shareTolerance, setShareTolerance] = useState<string | null>("0.0001");
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<Saved>();
  const [result, setResult] = useState<Comparison>();
  const [viewingSaved, setViewingSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const history = useProfileQuery<{ reconciliations: { items: Saved[]; nextCursor?: string } }>(HISTORY, { variables: { platform }, skip: !validPlatform, fetchPolicy: "network-only" });
  const stocks = (metadata.data?.stocks?.edges ?? []).map(({ node }: any) => node);
  const currency = metadata.data?.currencies?.edges.find(({ node }: any) => node.id === platforms.find((item: any) => item.id === platform)?.currency?.id)?.node.code;
  const resetComparison = () => { generation.current++; setResult(undefined); setViewingSaved(false); setError(""); };
  useEffect(() => {
    generation.current++; setResult(undefined); setSelected(undefined); setViewingSaved(false); setCash(null); setHoldings([]); setNote(""); setError(""); setComplete(false);
  }, [platform]);
  const change = (action: () => void) => { resetComparison(); action(); };
  const input = { platform, statementEnd: end, periodStart: start ?? null, dateBasis: basis, cash,
    completeHoldings: complete, moneyTolerance, shareTolerance,
    holdings: holdings.map(({ stock, shares, bookCost }) => ({ stock, shares, bookCost })) };
  const valid = !!profileId && validPlatform && !!end && (!start || start <= end) && moneyTolerance !== null && shareTolerance !== null && holdings.every(row => row.stock) && new Set(holdings.map(row => row.stock)).size === holdings.length;
  const compare = async () => {
    if (!valid || busy) return;
    const token = ++generation.current;
    setBusy(true); setError(""); setResult(undefined); setViewingSaved(false);
    try {
      const response = await client.query<{ previewReconciliation: Comparison }>({ query: PREVIEW, variables: { profileId, input }, fetchPolicy: "no-cache" });
      if (token === generation.current) setResult(response.data.previewReconciliation);
    } catch (cause) { if (token === generation.current) setError(cause instanceof Error ? cause.message : "Unable to compare."); }
    finally { setBusy(false); }
  };
  const save = async (state: string) => {
    if (!valid || busy || (state !== "draft" && (!result || viewingSaved))) return;
    setBusy(true); setError("");
    try {
      const response = await client.mutate<{ saveReconciliation: { reconciliation: Saved } }>({ mutation: SAVE, variables: {
        profileId, input, previewFingerprint: result?.fingerprint, state, note, id: selected?.id,
      } });
      const saved = response.data?.saveReconciliation.reconciliation;
      if (saved) { setSelected(saved); setResult(saved.snapshot); setViewingSaved(true); }
      void message.success(state === "draft" ? "Draft saved" : "Reconciliation saved for the checked scope");
      void history.refetch().catch(() => message.warning("Review saved. Reload saved reviews to see the latest history."));
    } catch (cause) { resetComparison(); setError(cause instanceof Error ? cause.message : "Unable to save."); }
    finally { setBusy(false); }
  };
  const open = (saved: Saved) => {
    generation.current++; setSelected(saved); setEnd(saved.statementEnd); setStart(saved.periodStart ?? undefined); setBasis(saved.dateBasis);
    setCash(saved.statementCash); setComplete(saved.completeHoldings); setMoneyTolerance(saved.moneyTolerance); setShareTolerance(saved.shareTolerance);
    setNote(saved.note); setHoldings(saved.snapshot.holdings.map(row => ({ key: row.stockId, stock: row.stockId, shares: row.shares?.statement ?? null, bookCost: row.bookCost.statement })));
    setResult(saved.snapshot); setViewingSaved(true); setError("");
  };
  const updateHolding = (key: string, field: keyof HoldingInput, value: string | null) => change(() => setHoldings(rows => rows.map(row => row.key === key ? { ...row, [field]: value } : row)));
  const searchLink = (stock?: string) => `/transactions?${new URLSearchParams({ profile: profileId ?? "", platform: platform ?? "", ...(stock ? { stock } : {}), endDate: end }).toString()}`;
  const checks: { key: string; label: string; precision: number; check: ValueCheck; stock?: string }[] = result ? [
    { key: "cash", label: `Cash (${result.currency})`, precision: 2, check: result.cash },
    ...result.holdings.flatMap(row => [
      ...(row.shares ? [{ key: `${row.stockId}-shares`, label: `${row.ticker} shares`, precision: 4, check: row.shares, stock: row.stockId }] : []),
      { key: `${row.stockId}-cost`, label: `${row.ticker} book cost (${result.currency})`, precision: 2, check: row.bookCost, stock: row.stockId },
    ]),
  ] : [];
  return <Space className="reconciliation-page" direction="vertical" size={32} style={{ width: "100%" }}>
    <Typography.Paragraph type="secondary">Compare a statement against recorded cash and holdings through its end date. No transactions or balances are changed by comparing or saving a review.</Typography.Paragraph>
    {metadata.error && <Alert type="error" message="Unable to load accounts. Reload to try again." />}
    <Card title="Statement details">
      <div className="reconciliation-fields">
        <label>Platform<Select aria-label="Reconciliation platform" placeholder="Select platform" showSearch optionFilterProp="label" value={platform} disabled={busy} loading={metadata.loading} style={{ width: "100%" }} options={platforms.map((item: any) => ({ value: item.id, label: `${metadata.data?.accounts?.edges.find(({ node }: any) => node.id === item.account?.id)?.node.code} · ${item.name} · ${metadata.data?.currencies?.edges.find(({ node }: any) => node.id === item.currency?.id)?.node.code}${item.closedAt ? " (closed)" : ""}` }))} onChange={value => { const next = new URLSearchParams(params); next.set("platform", value); setParams(next); }} /></label>
        <label>Statement end <DatePicker aria-label="Statement end" allowClear={false} value={dayjs(end)} disabled={busy} onChange={value => value && change(() => setEnd(value.format("YYYY-MM-DD")))} /></label>
        <label>Period start (optional) <DatePicker aria-label="Period start" value={start ? dayjs(start) : null} disabled={busy} onChange={value => change(() => setStart(value?.format("YYYY-MM-DD")))} /></label>
        <label>Date basis<Select aria-label="Date basis" value={basis} disabled={busy} style={{ width: "100%" }} options={[{ value: "recorded", label: "Recorded transaction dates" }, { value: "settlement", label: "Settlement dates" }]} onChange={value => change(() => setBasis(value))} /></label>
      </div>
      <Typography.Paragraph className="reconciliation-help" type="secondary">Recorded mode uses transaction dates. Settlement mode uses explicit Buy/Sell settlement dates; missing dates make the comparison provisional. All earlier account history is included, regardless of period start.</Typography.Paragraph>
      <div className="reconciliation-fields reconciliation-amounts">
        <label>Closing cash {currency ? `(${currency})` : ""} <InputNumber<string> aria-label="Statement cash" stringMode value={cash} disabled={busy} onChange={value => change(() => setCash(value))} /></label>
        <label>Money tolerance <InputNumber<string> aria-label="Money tolerance" stringMode min="0" value={moneyTolerance} disabled={busy} onChange={value => change(() => setMoneyTolerance(value))} /></label>
        <label>Share tolerance <InputNumber<string> aria-label="Share tolerance" stringMode min="0" value={shareTolerance} disabled={busy} onChange={value => change(() => setShareTolerance(value))} /></label>
      </div>
    </Card>
    <Card title="Statement holdings" extra={<Button disabled={busy || !validPlatform} onClick={() => change(() => setHoldings(rows => [...rows, { key: String(Date.now()) + Math.random(), shares: null, bookCost: null }]))}>Add Holding</Button>}>
      <Typography.Paragraph className="reconciliation-help" type="secondary">Enter statement values independently. Blank means not checked; zero means zero. Funds without units and GICs only need book cost/principal.</Typography.Paragraph>
      <Table<HoldingInput> rowKey="key" dataSource={holdings} pagination={false} scroll={{ x: 700 }} locale={{ emptyText: "Cash-only check, or add statement holdings." }} columns={[
        { title: "Stock", render: (_, row) => <Select aria-label={`Statement stock ${row.key}`} showSearch optionFilterProp="label" value={row.stock} disabled={busy} style={{ width: 290 }} options={stocks.map((stock: any) => ({ value: stock.id, label: `${stock.ticker} · ${stock.name}` }))} onChange={value => updateHolding(row.key, "stock", value)} /> },
        { title: "Shares (optional)", render: (_, row) => <InputNumber<string> aria-label={`Statement shares ${row.key}`} stringMode min="0" value={row.shares} disabled={busy || stocks.find((stock: any) => stock.id === row.stock)?.asset?.name === "GIC"} onChange={value => updateHolding(row.key, "shares", value)} /> },
        { title: "Book cost (optional)", render: (_, row) => <InputNumber<string> aria-label={`Statement book cost ${row.key}`} stringMode min="0" value={row.bookCost} disabled={busy} onChange={value => updateHolding(row.key, "bookCost", value)} /> },
        { title: "", render: (_, row) => <Button disabled={busy} onClick={() => change(() => setHoldings(rows => rows.filter(item => item.key !== row.key)))}>Remove</Button> },
      ]} />
      <Checkbox style={{ marginTop: 24 }} checked={complete} disabled={busy} onChange={event => change(() => setComplete(event.target.checked))}>This is the complete holdings list (unlisted app holdings should be zero)</Checkbox>
    </Card>
    <Space wrap size={16}>
      <Button disabled={busy} onClick={() => { resetComparison(); setSelected(undefined); setCash(null); setHoldings([]); setNote(""); setComplete(false); }}>New Review</Button>
      <Button type="primary" disabled={!valid || busy} loading={busy} onClick={() => void compare()}>Compare{selected ? " Again" : ""}</Button>
      <Button disabled={!valid || busy} onClick={() => void save("draft")}>Save Draft</Button>
      {platform && <Link target="_blank" rel="noreferrer" to={searchLink()}>Investigate Transactions ↗</Link>}
    </Space>
    {error && <Alert type="error" showIcon message={error} />}
    {result && <Card title={viewingSaved ? "Saved comparison snapshot" : "Comparison"}>
      {viewingSaved && <Alert style={{ marginBottom: 16 }} type={selected?.needsRecheck ? "warning" : "info"} message={selected?.needsRecheck ? "Needs recheck — records or calculation rules have changed" : "Saved evidence — compare again to review current records"} description={`State: ${selected?.state.replace(/_/g, " ")} · Saved ${selected ? new Date(selected.createdAt).toLocaleString() : ""}`} />}
      <Typography.Paragraph>Difference = statement minus app. Checked scope: {result.scope.join(", ") || "None yet"}. {result.dateBasis === "recorded" ? "Using recorded transaction dates." : "Using settlement dates."}</Typography.Paragraph>
      {result.issues.length > 0 && <Alert type="warning" showIcon message="Unresolved information" description={<ul>{result.issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul>} />}
      <Table rowKey="key" dataSource={checks} pagination={false} scroll={{ x: 700 }} columns={[
        { title: "Item", dataIndex: "label" },
        { title: "Statement", render: (_, row) => number(row.check.statement, row.precision) },
        { title: "App", render: (_, row) => number(row.check.calculated, row.precision) },
        { title: "Difference", render: (_, row) => number(row.check.difference, row.precision) },
        { title: "Result", render: (_, row) => <Tag color={row.check.outcome === "exact" ? "success" : undefined}>{outcome(row.check.outcome)}</Tag> },
        { title: "", render: (_, row) => <Link target="_blank" rel="noreferrer" to={searchLink(row.stock)}>Investigate ↗</Link> },
      ]} />
      {result.pendingTrades.length > 0 && <Alert style={{ marginTop: 16 }} type="info" message="Known trades pending at statement end" description={<ul>{result.pendingTrades.map(trade => <li key={trade.id}>{trade.ticker}: {trade.transactionDate}, settles {trade.settlementDate}; cash effect {number(trade.cashEffect)} {result.currency}.</li>)}</ul>} />}
    </Card>}
    <Card title="Review notes">
      <Input.TextArea aria-label="Reconciliation notes" placeholder="Explain accepted differences or information still needed." rows={3} maxLength={5000} value={note} disabled={busy} onChange={event => setNote(event.target.value)} />
      <Space wrap size={16} style={{ marginTop: 24 }}>
        <Button type="primary" disabled={busy || viewingSaved || !result?.canFinish} onClick={() => void save("matched")}>Finish Reconciliation</Button>
        <Button disabled={busy || viewingSaved || !result?.scope.length || !note.trim()} onClick={() => void save("reviewed_with_exceptions")}>Finish with Exceptions</Button>
      </Space>
      <Typography.Paragraph type="secondary" style={{ marginTop: 20, marginBottom: 0 }}>Finishing verifies only the values listed in the checked scope. Rechecking a completed review creates a new saved revision.</Typography.Paragraph>
    </Card>
    <Card title="Saved reconciliations">
      {history.error && <Alert type="error" message="Unable to load saved reviews." />}
      {!validPlatform ? <Empty description="Select a platform to see saved reviews." /> : <>
        <Table<Saved> rowKey="id" loading={history.loading} dataSource={history.data?.reconciliations.items ?? []} pagination={false} columns={[
          { title: "Statement end", dataIndex: "statementEnd" },
          { title: "State", render: (_, row) => row.state.replace(/_/g, " ") },
          { title: "Checked scope", render: (_, row) => row.snapshot.scope.join(", ") || "Draft" },
          { title: "Freshness", render: (_, row) => row.needsRecheck ? "Needs recheck" : "Unchanged since saved" },
          { title: "", render: (_, row) => <Button disabled={busy} onClick={() => open(row)}>Open</Button> },
        ]} />
        {history.data?.reconciliations.nextCursor && <Button style={{ marginTop: 16 }} loading={history.loading} onClick={() => void history.fetchMore({ variables: { after: history.data?.reconciliations.nextCursor }, updateQuery: (previous, { fetchMoreResult }) => fetchMoreResult ? { reconciliations: { ...fetchMoreResult.reconciliations, items: [...previous.reconciliations.items, ...fetchMoreResult.reconciliations.items] } } : previous })}>Load More Reviews</Button>}
      </>}
    </Card>
  </Space>;
}
