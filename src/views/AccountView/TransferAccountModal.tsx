import { useApolloClient } from "@apollo/client";
import { useProfileMutation, useProfileQuery } from "../../profiles/hooks";
import { Alert, Button, Checkbox, DatePicker, InputNumber, Modal, Select, Space, Table, Typography } from "antd";
import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import { ArrowDownOutlined } from "@ant-design/icons";
import { NotificationComponent } from "../../components/Notification";
import { Account } from "../../models/Account";
import { GraphQLNode } from "../../models/GraphQLNode";
import { Platform } from "../../models/Platform";
import { PREVIEW_ACCOUNT_TRANSFER, TRANSFER_ACCOUNT } from "./gql";
import { formatNumberAsCurrency, formatNumber } from "../../utils/utils";

type TAMProps = { platforms?: GraphQLNode<Platform>[]; accounts: GraphQLNode<Account>[]; notification: NotificationComponent };

export default function TransferAccountModal({ platforms = [], notification }: TAMProps) {
  const client = useApolloClient();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<string>();
  const [to, setTo] = useState<string>();
  const [date, setDate] = useState<string | undefined>(dayjs().format("YYYY-MM-DD"));
  const [closeOriginalAccount, setCloseOriginalAccount] = useState(true);
  const [marketValues, setMarketValues] = useState<Record<string, number | null>>({});
  const available = platforms.map(edge => edge.node).filter(platform => !platform.closedAt);
  const source = available.find(platform => platform.id === from);
  const destinations = available.filter(platform => platform.id !== from && platform.account?.id === source?.account?.id && platform.currency?.id === source?.currency?.id);
  const variables = { transferFrom: from, transferTo: to, transferDate: date, closeOriginalAccount };
  const preview = useProfileQuery(PREVIEW_ACCOUNT_TRANSFER, { variables, skip: !open || !from || !to || !date, fetchPolicy: "network-only", notifyOnNetworkStatusChange: true });
  const [transfer, { loading: saving }] = useProfileMutation(TRANSFER_ACCOUNT, {
    // Refresh metadata and ledger views, but do not rerun the preview against
    // the source whose balances this mutation has just transferred.
    refetchQueries: () => Array.from(client.getObservableQueries("active").values())
      .filter(query => query.queryName !== "previewAccountTransfer")
      .map(query => ({ query: query.options.query, variables: query.variables })),
  });
  const details = from && to && date && !preview.loading && !preview.error ? preview.data?.previewAccountTransfer : undefined;
  const valuesComplete = details?.assets.every((asset: { stockId: string }) => {
    const value = marketValues[asset.stockId];
    return value != null && Number.isFinite(value) && value >= 0;
  });

  useEffect(() => { setMarketValues({}); }, [from, to, date]);

  useEffect(() => {
    if (open && !to && destinations.length === 1) setTo(destinations[0].id);
  }, [open, to, destinations]);

  const submit = async () => {
    if (saving || !details || !valuesComplete) return;
    try {
      const result = await transfer({ variables: { ...variables,
        marketValues: details.assets.map((asset: { stockId: string }) => ({ stockId: asset.stockId, marketValue: String(marketValues[asset.stockId]) })),
      } });
      if (!result.data?.transferAccount.success) throw new Error("The transfer could not be completed. Refresh and try again.");
      if (result.data.transferAccount.success) {
        setOpen(false);
        notification.openNotificationWithIcon("success", closeOriginalAccount ? "Account transferred and closed" : "Account transferred", "Linked transfer entries were saved. Historical transactions remain with the source platform.");
      }
    } catch (error) {
      notification.openNotificationWithIcon("error", "Transfer not completed", error instanceof Error ? error.message : "Refresh and try again.");
    }
  };
  const options = (items: Platform[]) => items.map(platform => ({ value: platform.id, label: `${platform.account?.code} · ${platform.name} (${platform.currency?.code})` }));
  return <>
    <Button type="primary" disabled={!available.length} onClick={() => { setFrom(undefined); setTo(undefined); setDate(dayjs().format("YYYY-MM-DD")); setCloseOriginalAccount(true); setOpen(true); }}>Transfer Account</Button>
    <Modal title="Transfer Account" open={open} onCancel={() => { if (!saving) setOpen(false); }} onOk={submit}
      okText={closeOriginalAccount ? "Transfer and Close" : "Transfer"} okButtonProps={{ disabled: !details || !valuesComplete || preview.loading }} confirmLoading={saving}
      cancelButtonProps={{ disabled: saving }} closable={!saving} maskClosable={!saving} keyboard={!saving} width={620}>
      <Typography.Paragraph>Transfer all remaining assets and cash as of the transfer date to another platform of the same account type and currency. Each asset receives linked Transfer Out and Transfer In entries carrying its shares and book cost; cash receives a separate pair.</Typography.Paragraph>
      <Typography.Paragraph>The original transactions stay with the source platform. You can keep it open to record later activity, or close it on the transfer date and allow only historical transactions. No sale or contribution is recorded.</Typography.Paragraph>
      <Typography.Paragraph>Enter each asset’s total market value on the transfer date, in the account currency. This records the value moved between accounts for performance calculations; its original book cost still carries over.</Typography.Paragraph>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Select aria-label="Source platform" style={{ width: "100%" }} placeholder="Transfer from" showSearch optionFilterProp="label" disabled={saving} value={from} options={options(available)} onChange={value => { setFrom(value); setTo(undefined); }} />
        <ArrowDownOutlined />
        <Select aria-label="Destination platform" style={{ width: "100%" }} placeholder="Transfer to" showSearch optionFilterProp="label" disabled={!source || saving} value={to} options={options(destinations)} onChange={setTo} />
        <div><Typography.Text>Transfer date</Typography.Text><br /><DatePicker aria-label="Transfer date" value={date ? dayjs(date) : null} onChange={value => setDate(value?.format("YYYY-MM-DD"))} disabled={saving} disabledDate={value => value.isAfter(dayjs(), "day")} /></div>
        <Checkbox checked={closeOriginalAccount} disabled={saving} onChange={event => setCloseOriginalAccount(event.target.checked)}>Close Original Account</Checkbox>
        {preview.loading && <Typography.Text type="secondary">Calculating remaining assets and cash…</Typography.Text>}
        {preview.error && <Alert showIcon type="error" message={preview.error.message} />}
        {details && <>
          <Table size="small" pagination={false} rowKey="stockId" dataSource={details.assets} columns={[
            { title: "Asset", dataIndex: "ticker" },
            { title: "Shares", dataIndex: "shares", render: value => Number(value) ? formatNumber(Number(value), 4) : "—" },
            { title: `Book cost (${details.currency})`, dataIndex: "bookCost", render: value => formatNumberAsCurrency(Number(value)) },
            { title: `Market value (${details.currency})`, key: "marketValue", render: (_: unknown, asset: { stockId: string; ticker: string }) =>
              <InputNumber aria-label={`Transfer market value for ${asset.ticker}`} min={0} precision={2} disabled={saving}
                value={marketValues[asset.stockId]} onChange={value => setMarketValues(previous => ({ ...previous, [asset.stockId]: value }))} /> },
          ]} />
          <Typography.Text strong>Cash to transfer: {formatNumberAsCurrency(Number(details.cash))} {details.currency}</Typography.Text>
          <Alert type="warning" showIcon message={`Submitting transfers these balances${closeOriginalAccount ? ` and closes ${source?.name}` : ` and keeps ${source?.name} open`}. Check the balances against your statement first.`} />
        </>}
      </Space>
    </Modal>
  </>;
}
