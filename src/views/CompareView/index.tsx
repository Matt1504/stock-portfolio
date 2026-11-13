import LastUpdated from "../../components/LastUpdated";
import { SwapOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Empty, Radio, Select, Skeleton, Space, Table, Tabs, Tag, Typography } from "antd";
import { useContext } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useApolloClient } from "@apollo/client";
import { ProfileContext } from "../../profiles/ProfileContext";
import { useProfileQuery } from "../../profiles/hooks";
import ReloadButton from "../../components/ReloadButton";
import StatisticTitle, { accountStatisticDescriptions } from "../../components/StatisticTitle";
import { coldRefetch } from "../../utils/coldRefetch";
import { formatNumber } from "../../utils/utils";
import { COMPARE, COMPARE_METADATA } from "./gql";
import { Comparison, Holding, Metadata, Side, Stat, StatRow } from "./types";
import ComparisonCharts from "./ComparisonCharts";
import "./compare.css";

const numeric = (raw: string | null, monetary = false) => raw == null ? "—" : `${monetary ? "$" : ""}${formatNumber(Number(raw), monetary ? 2 : 4, monetary ? 2 : 0)}`;
export function displayStatistic(stat: Stat | null) {
  if (!stat) return "—";
  if (stat.holding) return stat.value == null ? "—" : `${stat.text} · ${numeric(stat.value, true)}`;
  return stat.text ?? numeric(stat.value, stat.monetary);
}
export function comparedStatistic(stat: Stat | null, other: Stat | null) {
  const value = stat?.value == null ? NaN : Number(stat.value);
  const otherValue = other?.value == null ? NaN : Number(other.value);
  const larger = Number.isFinite(value) && Number.isFinite(otherValue) && value > otherValue;
  return <span className="compare-stat-value">{larger ? <strong>{displayStatistic(stat)}</strong> : displayStatistic(stat)}</span>;
}
const marketDescriptions: Record<string, string> = {
  "Account Value": "Current market value of holdings plus recorded cash. A dash means valuation is incomplete.",
  "Market Value": "Current shares multiplied by cached market prices, with current FX conversion where needed. Excludes cash.",
  "Unrealized Gain/Loss": "Current market value minus remaining recorded book cost. Requires complete valuation on each side.",
  "Unrealized Return (%)": "Unrealized gain divided by remaining book cost. Differences are percentage points, not relative percentage changes.",
  "Annualized Return (%)": "Money-weighted annual return (XIRR), calculated using each side's own dated cash flows and current ending value. Start dates can differ. Differences are percentage points.",
};
function SideNotes({ side, prefix }: { side: Side; prefix: string }) {
  const valuation = side.valuation;
  if (valuation.complete && !side.analytics.issues.length && !valuation.warnings.length && !valuation.annualizedReturnNote) return null;
  return <Space direction="vertical" size={12} style={{ width: "100%" }}>
    {!valuation.complete && <Alert type="warning" showIcon message={`${prefix}: valuation incomplete`} description={valuation.missingTickers.length ? `Price, FX or supported valuation unavailable for ${valuation.missingTickers.join(", ")}. Unavailable values remain blank.` : "Review the valuation and ledger notes below."} />}
    {Array.from(new Set([...side.analytics.issues, ...valuation.warnings])).map(note => <Alert key={note} type="warning" message={`${prefix}: ${note}`} />)}
    {valuation.annualizedReturnNote && <Typography.Text type="secondary">{prefix}: {valuation.annualizedReturnNote}</Typography.Text>}
  </Space>;
}
export default function CompareView() {
  const profile = useContext(ProfileContext)?.profile;
  return <ComparePage key={profile?.id ?? "none"} profileId={profile?.id} />;
}
function ComparePage({ profileId }: { profileId?: string }) {
  const [params, setParams] = useSearchParams();
  const client = useApolloClient();
  const mode = params.get("mode") === "account" ? "account" : "platform";
  const currency = params.get("currency") ?? "CAD";
  const left = params.get("left") ?? undefined, right = params.get("right") ?? undefined;
  const metadata = useProfileQuery<Metadata>(COMPARE_METADATA);
  const platforms = metadata.data?.platforms.edges.map(edge => edge.node) ?? [];
  const matching = platforms.filter(platform => platform.currency.code === currency);
  const options = mode === "platform" ? matching.map(platform => ({ value: platform.id, label: `${platform.account.code} · ${platform.name}${platform.closedAt ? " (closed)" : ""}` }))
    : (metadata.data?.accounts.edges ?? []).filter(({ node }) => matching.some(platform => platform.account.id === node.id)).map(({ node }) => ({ value: node.id, label: `${node.code} · ${node.name}` }));
  const valid = !!left && !!right && left !== right && options.some(item => item.value === left) && options.some(item => item.value === right);
  const query = useProfileQuery<{ portfolioComparison: Comparison }>(COMPARE, { variables: { kind: mode.toUpperCase(), currency, left, right }, skip: !valid, notifyOnNetworkStatusChange: true, fetchPolicy: "network-only" });
  const result = valid && !query.loading && !query.error ? query.data?.portfolioComparison : undefined;
  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([name, value]) => value ? next.set(name, value) : next.delete(name));
    setParams(next);
  };
  const statistics = (rows: StatRow[], market = false) => <Table<StatRow> rowKey="title" dataSource={rows} pagination={false} scroll={{ x: 740 }} columns={[
    { title: "Statistic", dataIndex: "title", width: 260, render: title => <StatisticTitle title={title} description={(market ? marketDescriptions : accountStatisticDescriptions)[title]} /> },
    { title: <Tag color="purple">A</Tag>, align: "right", render: (_, row) => comparedStatistic(row.left, row.right) },
    { title: <Tag color="cyan">B</Tag>, align: "right", render: (_, row) => comparedStatistic(row.right, row.left) },
    { title: "B − A", align: "right", render: (_, row) => row.difference == null ? "—" : `${numeric(row.difference, row.left?.monetary)}${market && !row.left?.monetary ? " pp" : ""}` },
  ]} />;
  const transactionsLink = (id: string) => `/transactions?${new URLSearchParams({ profile: profileId ?? "", [mode === "platform" ? "platform" : "account"]: id, currency: platforms.find(platform => platform.currency.code === currency)?.currency.id ?? "" }).toString()}`;
  return <Space className="compare-page" direction="vertical" size={28} style={{ width: "100%" }}>
    <Typography.Paragraph type="secondary">Compare two platforms or two account types for the active profile. Each account type includes all its platforms in the selected currency, including closed platforms' history. CAD and USD are never added together.</Typography.Paragraph>
    <Card title="Choose a comparison">
      <div className="compare-controls">
        <div className="compare-field"><span>Compare</span><Radio.Group aria-label="Comparison mode" value={mode} onChange={event => update({ mode: event.target.value, left: undefined, right: undefined })}><Radio.Button value="platform">Platforms</Radio.Button><Radio.Button value="account">Account types</Radio.Button></Radio.Group></div>
        <label>Currency<Select aria-label="Comparison currency" value={currency} options={[{ value: "CAD", label: "CAD" }, { value: "USD", label: "USD" }]} onChange={value => update({ currency: value, left: undefined, right: undefined })} /></label>
        <label>A<Select aria-label="Compare A" placeholder="Select first item" loading={metadata.loading} showSearch optionFilterProp="label" value={left} options={options.filter(item => item.value !== right)} onChange={value => update({ left: value })} /></label>
        <label>B<Select aria-label="Compare B" placeholder="Select second item" loading={metadata.loading} showSearch optionFilterProp="label" value={right} options={options.filter(item => item.value !== left)} onChange={value => update({ right: value })} /></label>
      </div>
      <Space wrap style={{ marginTop: 24 }}><Button aria-label="Swap A / B" icon={<SwapOutlined />} disabled={!valid} onClick={() => update({ left: right, right: left })}>Swap A / B</Button><LastUpdated queries={[COMPARE]} /><ReloadButton onReload={() => coldRefetch(client, [COMPARE])} loading={query.loading} disabled={!valid} /></Space>
    </Card>
    {metadata.error && <Alert type="error" message="Unable to load comparison options. Reload to try again." />}
    {!metadata.loading && (!valid || options.length < 2) && <Empty description={options.length < 2 ? "At least two platforms or account types in this currency are needed." : "Choose two different items to compare. Saved links must refer to this profile and currency."} />}
    {query.error && valid && <Alert type="error" message={query.error.message} />}
    {valid && query.loading && <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>}
    {result && <>
      <div className="compare-headings">{([result.left, result.right] as const).map((side, index) => <Card key={`${index}:${side.selectionId}`}><Tag color={index ? "cyan" : "purple"}>{index ? "B" : "A"}</Tag><Typography.Text strong>{side.label}</Typography.Text><div style={{ marginTop: 12 }}><Link to={transactionsLink(side.selectionId)} target="_blank" rel="noreferrer">View transactions ↗</Link></div></Card>)}</div>
      <Typography.Paragraph type="secondary">Differences are B minus A; percentage differences use percentage points. Recorded analytics and holdings use all entered transactions. Market valuation uses holdings through today and each side's own cash flows. The larger A/B value in each Analytics row is bold; equal or unavailable values are not highlighted. Larger amounts are not automatically better performance.</Typography.Paragraph>
      <SideNotes side={result.left} prefix="A" /><SideNotes side={result.right} prefix="B" />
      <div className="compare-metadata">
        {([result.left, result.right] as const).map((side, index) => <Typography.Text key={`quote-${index}`} type="secondary"><Tag color={index ? "cyan" : "purple"}>{index ? "B" : "A"}</Tag>Prices as of {side.valuation.quoteTime ? new Date(side.valuation.quoteTime).toLocaleString() : "—"}{side.valuation.refreshOverdue ? " · Quote refresh overdue" : ""}</Typography.Text>)}
        {([result.left, result.right] as const).map((side, index) => <Typography.Text key={`start-${index}`} type="secondary"><Tag color={index ? "cyan" : "purple"}>{index ? "B" : "A"}</Tag>Annualized-return start: {side.valuation.annualizedStartDate ?? "—"}</Typography.Text>)}
      </div>
      <Tabs items={[
        { key: "analytics", label: "Analytics", children: <Space direction="vertical" size={24} style={{ width: "100%" }}><Card title={`Market Valuation (${result.currency})`}>{statistics(result.marketStatistics, true)}</Card><Card title={`Portfolio Analytics (${result.currency})`}>{statistics(result.statistics)}</Card></Space> },
        { key: "holdings", label: "Holdings & Allocation", children: <Card title={`Recorded Holdings (${result.currency})`}><Typography.Paragraph type="secondary">Allocation is based on remaining book cost, including amount-only funds. Missing holdings show zero; amount-only assets have no share count. A dash for allocation means total book cost is zero.</Typography.Paragraph><Table<Holding> rowKey="stockId" dataSource={result.holdings} pagination={{ defaultPageSize: 25, pageSizeOptions: [25, 50, 100], showSizeChanger: true }} scroll={{ x: 1200 }} columns={[
          { title: "Asset", render: (_, row) => <Link to={`/mystocks?${new URLSearchParams({ profile: profileId ?? "", stock: row.stockId }).toString()}`}>{row.ticker} · {row.name}</Link> },
          { title: "Type", dataIndex: "assetType" },
          { title: "Held in", key: "presence", filters: [{ text: "Both", value: "both" }, { text: "A only", value: "a" }, { text: "B only", value: "b" }], onFilter: (value, row) => (row.leftHeld && row.rightHeld ? "both" : row.leftHeld ? "a" : "b") === value, render: (_, row) => <Tag>{row.leftHeld && row.rightHeld ? "Both" : row.leftHeld ? "A only" : "B only"}</Tag> },
          { title: "A shares", dataIndex: "leftShares", render: raw => numeric(raw) }, { title: "B shares", dataIndex: "rightShares", render: raw => numeric(raw) },
          { title: "A book cost", dataIndex: "leftBookCost", render: raw => numeric(raw, true), sorter: (a, b) => Number(a.leftBookCost) - Number(b.leftBookCost) },
          { title: "B book cost", dataIndex: "rightBookCost", render: raw => numeric(raw, true), sorter: (a, b) => Number(a.rightBookCost) - Number(b.rightBookCost) },
          { title: "Cost B − A", dataIndex: "bookCostDifference", render: raw => numeric(raw, true) },
          { title: "A allocation", dataIndex: "leftWeight", render: raw => raw == null ? "—" : `${numeric(raw)}%` }, { title: "B allocation", dataIndex: "rightWeight", render: raw => raw == null ? "—" : `${numeric(raw)}%` },
        ]} /></Card> },
        { key: "history", label: "History", children: <ComparisonCharts history={result.history} currency={result.currency} /> },
      ]} />
    </>}
  </Space>;
}
