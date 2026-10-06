import LastUpdated from "../../components/LastUpdated";
import { useContext, useRef, useState } from "react";
import { Alert, Button, DatePicker, Empty, Select, Space, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useProfileQuery } from "../../profiles/hooks";
import { ProfileContext } from "../../profiles/ProfileContext";
import { GET_PLATFORM_INFO } from "../AddTransactionView/gql";
import { TransactionDataGrid } from "../../components/TransactionDataGrid";
import { SEARCH_TRANSACTIONS } from "./gql";

type Filters = { account?: string; platform?: string; stock?: string; activity?: string; currency?: string; startDate?: string; endDate?: string; after?: string | null };
export default function TransactionsView() {
  const profile = useContext(ProfileContext)?.profile;
  return <SearchPage key={profile?.id ?? "none"} />;
}
function SearchPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [submitted, setSubmitted] = useState<Filters>();
  const [editing, setEditing] = useState(false);
  const morePending = useRef(false);
  const metadata = useProfileQuery(GET_PLATFORM_INFO);
  const variables = Object.fromEntries(['account', 'platform', 'stock', 'activity', 'currency', 'startDate', 'endDate', 'after'].map(name => [name, (submitted as any)?.[name] ?? null]));
  const [loadError, setLoadError] = useState(false);
  const query = useProfileQuery(SEARCH_TRANSACTIONS, { variables, skip: !submitted, notifyOnNetworkStatusChange: true, fetchPolicy: "network-only" });
  const options = (name: string) => (metadata.data?.[name]?.edges ?? []).map(({ node }: any) => ({ value: node.id, label: node.code ?? (node.ticker ? `${node.ticker} · ${node.name}` : node.name) }));
  const platforms = (metadata.data?.platforms?.edges ?? []).filter(({ node }: any) => (!filters.account || node.account?.id === filters.account) && (!filters.currency || node.currency?.id === filters.currency));
  const set = (key: keyof Filters, value: string | undefined) => setFilters(previous => ({ ...previous, [key]: value, ...(["account", "currency"].includes(key) ? { platform: undefined } : {}) }));
  const result = query.data?.searchTransactions;
  const loadMore = async () => {
    if (!result?.nextCursor || query.loading || editing || morePending.current) return;
    morePending.current = true;
    setLoadError(false);
    try {
      await query.fetchMore({ variables: { after: result.nextCursor }, updateQuery: (previous: any, { fetchMoreResult }: any) => {
        if (!fetchMoreResult) return previous;
        const rows = new Map(previous.searchTransactions.transactions.map((row: any) => [row.id, row]));
        fetchMoreResult.searchTransactions.transactions.forEach((row: any) => rows.set(row.id, row));
        return { ...fetchMoreResult, searchTransactions: { ...fetchMoreResult.searchTransactions, transactions: Array.from(rows.values()) } };
      } });
    } catch { setLoadError(true); }
    finally { morePending.current = false; }
  };
  const invalidDates = !!(filters.startDate && filters.endDate && filters.startDate > filters.endDate);
  return <section>
    <Typography.Paragraph type="secondary">Choose filters and press Search. Leave fields empty to search all transactions for this profile. Changing a filter does not send a request until you press Search.</Typography.Paragraph>
    <Space wrap size="middle" style={{ marginBottom: 24 }}>
      {([['account', 'Account', 'accounts'], ['currency', 'Currency', 'currencies'], ['stock', 'Stock', 'stocks'], ['activity', 'Activity', 'activities']] as const).map(([key, label, source]) => <Select key={key} aria-label={`Search ${label}`} placeholder={key === "currency" ? "All currencies" : key === "activity" ? "All activities" : `All ${label.toLowerCase()}s`} value={filters[key]} options={options(source)} onChange={value => set(key, value)} allowClear showSearch optionFilterProp="label" disabled={editing} style={{ width: key === 'stock' ? 260 : 170 }} />)}
      <Select aria-label="Search Platform" placeholder="All platforms" value={filters.platform} options={platforms.map(({ node }: any) => ({ value: node.id, label: `${node.name} · ${node.account.id === filters.account ? '' : metadata.data?.accounts.edges.find((x: any) => x.node.id === node.account.id)?.node.code + ' · '}${metadata.data?.currencies.edges.find((x: any) => x.node.id === node.currency.id)?.node.code}` }))} allowClear showSearch optionFilterProp="label" onChange={value => set('platform', value)} disabled={editing} style={{ width: 250 }} />
      <DatePicker.RangePicker aria-label="Search dates" allowEmpty={[true, true]} disabled={editing} onChange={dates => setFilters(previous => ({ ...previous, startDate: dates?.[0]?.format('YYYY-MM-DD'), endDate: dates?.[1]?.format('YYYY-MM-DD') }))} />
      <Button type="primary" icon={<SearchOutlined aria-hidden />} loading={query.loading} disabled={editing || invalidDates || metadata.loading} onClick={() => {
        if (submitted && JSON.stringify(submitted) === JSON.stringify(filters)) void query.refetch(Object.fromEntries(['account', 'platform', 'stock', 'activity', 'currency', 'startDate', 'endDate', 'after'].map(name => [name, (filters as any)[name] ?? null])));
        else setSubmitted({ ...filters });
      }}>Search</Button>
    </Space>
    {submitted && <div style={{ display: "flex", justifyContent: "flex-end" }}><LastUpdated queries={[SEARCH_TRANSACTIONS]} /></div>}
    {invalidDates && <Alert type="error" message="Start date must be on or before end date." />}
    {(query.error || metadata.error || loadError) && <Alert type="error" showIcon message="Unable to load transactions. Please try again." />}
    {!submitted ? <Empty description="No search yet. Choose filters and press Search." /> : <TransactionDataGrid searchMode onLoadMore={() => void loadMore()} hasMore={!!result?.nextCursor} gridData={query.loading && query.networkStatus !== 3 ? [] : result?.transactions ?? []} loading={query.loading} defaultSort="transactionDate" ascending={false} removeColumns={[]} query={SEARCH_TRANSACTIONS} onBulkEditChange={setEditing} />}
  </section>;
}
