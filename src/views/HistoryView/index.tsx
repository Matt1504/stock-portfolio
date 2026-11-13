import { useApolloClient } from "@apollo/client";
import { Alert, Button, Card, Empty, Input, Modal, Select, Space, Table, Tabs, Tag, Typography } from "antd";
import { useContext, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ProfileContext } from "../../profiles/ProfileContext";
import { useProfileQuery } from "../../profiles/hooks";
import { GET_PLATFORM_INFO } from "../AddTransactionView/gql";
import { formatNumber } from "../../utils/utils";
import { AUDIT, DISMISS, SCAN } from "./gql";

type AuditEvent = { id: string; transactionId: string; occurredAt: string; action: string; source: string; operationId: string; note?: string; changes: { field: string; before: string | null; after: string | null }[] };
type Member = { id: string; platform: string; platformName: string; transactionDate: string; activity: string; ticker?: string; currency: string; total: string; price?: string; shares?: string; fee?: string };
type Group = { fingerprint: string; kind: string; reason: string; members: Member[] };
type ScanResult = { scannedCount: number; candidateCount: number; truncated: boolean; groups: Group[] };
const label = (value: string) => value.replace(/_/g, " ");
const value = (raw: string | null) => raw == null ? "—" : /^-?\d+(\.\d+)?$/.test(raw) && raw.length < 20 ? formatNumber(Number(raw), 8) : raw;

export default function HistoryView() {
  const profile = useContext(ProfileContext)?.profile;
  return <HistoryPage key={profile?.id ?? "none"} profileId={profile?.id} />;
}
function HistoryPage({ profileId }: { profileId?: string }) {
  const client = useApolloClient();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState("audit");
  const [platform, setPlatform] = useState<string | undefined>(params.get("platform") ?? undefined);
  const [transactionId, setTransactionId] = useState(params.get("transactionId") ?? "");
  const [submittedId, setSubmittedId] = useState(params.get("transactionId") ?? "");
  const [operationId, setOperationId] = useState(params.get("operationId") ?? "");
  const [submittedOperation, setSubmittedOperation] = useState(params.get("operationId") ?? "");
  const metadata = useProfileQuery(GET_PLATFORM_INFO);
  const audit = useProfileQuery<{ transactionAudit: { items: AuditEvent[]; nextCursor?: string } }>(AUDIT, { variables: { platform: platform ?? null, transactionId: submittedId || null, operationId: submittedOperation || null }, skip: tab !== "audit", fetchPolicy: "network-only", notifyOnNetworkStatusChange: true });
  const [result, setResult] = useState<ScanResult>();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState<Group>();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const generation = useRef(0);
  const scan = async () => {
    if (!profileId || scanning) return;
    const token = ++generation.current;
    setScanning(true); setError(""); setResult(undefined);
    try {
      const response = await client.query<{ duplicateCandidates: ScanResult }>({ query: SCAN, variables: { profileId, platform: platform ?? null }, fetchPolicy: "no-cache" });
      if (token === generation.current) setResult(response.data.duplicateCandidates);
    } catch (cause) { if (token === generation.current) setError(cause instanceof Error ? cause.message : "Scan failed."); }
    finally { setScanning(false); }
  };
  const dismiss = async () => {
    if (!review || !profileId || !reason.trim() || saving) return;
    setSaving(true); setError("");
    try {
      await client.mutate({ mutation: DISMISS, variables: { profileId, fingerprint: review.fingerprint, reason } });
      setResult(previous => previous ? { ...previous, candidateCount: previous.candidateCount - 1, groups: previous.groups.filter(group => group.fingerprint !== review.fingerprint) } : previous);
      setReview(undefined); setReason("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save review."); }
    finally { setSaving(false); }
  };
  const investigate = (member: Member) => `/transactions?${new URLSearchParams({ profile: profileId ?? "", platform: member.platform, startDate: result?.groups.find(group => group.members.some(row => row.id === member.id))?.members[0].transactionDate ?? member.transactionDate, endDate: result?.groups.find(group => group.members.some(row => row.id === member.id))?.members.slice(-1)[0].transactionDate ?? member.transactionDate }).toString()}`;
  const more = () => audit.fetchMore({ variables: { after: audit.data?.transactionAudit.nextCursor }, updateQuery: (previous, { fetchMoreResult }) => fetchMoreResult ? { transactionAudit: { ...fetchMoreResult.transactionAudit, items: [...previous.transactionAudit.items, ...fetchMoreResult.transactionAudit.items] } } : previous });
  return <Space direction="vertical" size={24} style={{ width: "100%" }}>
    <Typography.Paragraph type="secondary">Audit history starts with changes made through the updated API. Earlier edits and direct database/script changes cannot be reconstructed. Profiles identify whose portfolio is tracked, not the person who made a change.</Typography.Paragraph>
    <Select aria-label="History platform" placeholder="All platforms" allowClear showSearch optionFilterProp="label" value={platform} disabled={scanning || saving} style={{ width: "100%", maxWidth: 440 }} options={metadata.data?.platforms.edges.map(({ node }: any) => ({ value: node.id, label: `${metadata.data.accounts.edges.find(({ node: account }: any) => account.id === node.account.id)?.node.code} · ${node.name} · ${metadata.data.currencies.edges.find(({ node: currency }: any) => currency.id === node.currency.id)?.node.code}` })) ?? []} onChange={id => { generation.current++; setPlatform(id); setResult(undefined); setError(""); const next = new URLSearchParams(params); if (id) next.set("platform", id); else next.delete("platform"); setParams(next); }} />
    {metadata.error && <Alert type="error" message="Unable to load platform options. Reload to try again." />}
    <Tabs activeKey={tab} onChange={setTab} items={[{ key: "audit", label: "Transaction Audit", children: <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <Space wrap><Input aria-label="Audit transaction ID" placeholder="Transaction ID (optional)" value={transactionId} onChange={event => setTransactionId(event.target.value)} style={{ width: 290 }} /><Input aria-label="Audit operation ID" placeholder="Operation ID (optional)" value={operationId} onChange={event => setOperationId(event.target.value)} style={{ width: 290 }} /><Button onClick={() => { setSubmittedId(transactionId.trim()); setSubmittedOperation(operationId.trim()); if (submittedId === transactionId.trim() && submittedOperation === operationId.trim()) void audit.refetch(); }}>Filter History</Button></Space>
      {audit.error && <Alert type="error" message={audit.error.message} />}
      <Table<AuditEvent> rowKey="id" loading={audit.loading} dataSource={audit.data?.transactionAudit.items ?? []} pagination={false} scroll={{ x: 800 }} expandable={{ expandedRowRender: event => <>
        <Typography.Paragraph>Transaction: <Typography.Text copyable>{event.transactionId}</Typography.Text> · Operation: <Typography.Text copyable>{event.operationId}</Typography.Text></Typography.Paragraph>
        {event.note && <Alert type="info" message={event.note} style={{ marginBottom: 16 }} />}
        <Table rowKey="field" size="small" pagination={false} dataSource={event.changes} columns={[{ title: "Field", dataIndex: "field", render: label }, { title: "Before", dataIndex: "before", render: value }, { title: "After", dataIndex: "after", render: value }]} />
      </> }} columns={[
        { title: "When", dataIndex: "occurredAt", render: raw => new Date(raw).toLocaleString() },
        { title: "Action", dataIndex: "action", render: action => <Tag>{label(action)}</Tag> },
        { title: "Source", dataIndex: "source", render: label },
        { title: "Transaction", dataIndex: "transactionId", ellipsis: true },
        { title: "Changes", render: (_, event) => event.action === "dismiss_duplicate" ? "Review note" : event.changes.filter(change => change.field !== "id").map(change => label(change.field)).join(", ") },
      ]} />
      {audit.data?.transactionAudit.nextCursor && <Button loading={audit.loading} onClick={() => void more().catch(() => setError("Unable to load more history. Try again."))}>Load More History</Button>}
    </Space> }, { key: "duplicates", label: "Possible Duplicates", children: <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Alert type="info" showIcon message="A review tool, not an automatic cleanup" description="Scan compares financial fields within the same platform and currency. Matching dates or dates within three days are flagged. Linked account-transfer batches are excluded. Identical transactions can be legitimate; nothing is deleted or changed by scanning." />
      <Button type="primary" loading={scanning} disabled={!profileId || saving} onClick={() => void scan()}>Scan for Possible Duplicates</Button>
      {!result && !scanning && <Empty description="No scan yet. Press Scan to check existing records." />}
      {result && <Typography.Paragraph>{result.scannedCount} records checked · {result.candidateCount} candidate group(s){result.truncated ? " · Showing the first 100 groups; choose a platform to narrow the scan." : ""}</Typography.Paragraph>}
      {result?.groups.length === 0 && <Empty description="No unreviewed candidates found." />}
      {result?.groups.map(group => <Card key={group.fingerprint} title={group.kind === "exact" ? "Matching transaction fields" : "Similar records with nearby dates"} extra={<Button disabled={saving} onClick={() => { setReview(group); setReason(""); }}>Mark as Legitimate</Button>}>
        <Typography.Paragraph>{group.reason}</Typography.Paragraph>
        <Table<Member> rowKey="id" dataSource={group.members} pagination={false} scroll={{ x: 800 }} columns={[
          { title: "Date", dataIndex: "transactionDate" }, { title: "Platform", dataIndex: "platformName" }, { title: "Activity", dataIndex: "activity" }, { title: "Stock", dataIndex: "ticker", render: raw => raw ?? "—" },
          { title: "Shares", dataIndex: "shares", render: raw => value(raw) }, { title: "Total", render: (_, member) => `${formatNumber(Number(member.total), 2, 2)} ${member.currency}` },
          { title: "", render: (_, member) => <a target="_blank" rel="noreferrer" href={investigate(member)}>Investigate ↗</a> },
        ]} />
      </Card>)}
    </Space> }]} />
    {error && <Alert type="error" showIcon message={error} />}
    <Modal open={!!review} title="Mark these records as legitimate" onCancel={() => { if (!saving) setReview(undefined); }} onOk={() => void dismiss()} confirmLoading={saving} okText="Save Review" okButtonProps={{ disabled: !reason.trim() }} cancelButtonProps={{ disabled: saving }} closable={!saving} maskClosable={!saving}>
      <Typography.Paragraph>All transactions are kept. This candidate is dismissed with your note; it may return if the underlying records change. The review is recorded in audit history.</Typography.Paragraph>
      <Input.TextArea aria-label="Duplicate review reason" rows={3} maxLength={2000} placeholder="For example: verified two separate purchases on the statement." value={reason} disabled={saving} onChange={event => setReason(event.target.value)} />
    </Modal>
  </Space>;
}
