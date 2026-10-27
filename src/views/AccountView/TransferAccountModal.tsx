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

type TransferAsset = {
  stockId: string;
  ticker: string;
  shares: string;
  bookCost: string;
  assetType: string;
};

type TransferPreview = {
  cash: string;
  currency: string;
  assets: TransferAsset[];
};

type TransferResult = { transferAccount: { success: boolean } };

const platformOptions = (items: Platform[]) => items.map(platform => ({
  value: platform.id,
  label: `${platform.account?.code} · ${platform.name} (${platform.currency?.code})`,
}));

export default function TransferAccountModal({ platforms = [], notification }: TAMProps) {
  const client = useApolloClient();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<string>();
  const [to, setTo] = useState<string>();
  const [date, setDate] = useState<string | undefined>(dayjs().format("YYYY-MM-DD"));
  const [closeOriginalAccount, setCloseOriginalAccount] = useState(true);
  const [transferAsCash, setTransferAsCash] = useState(false);
  const [transferFee, setTransferFee] = useState<number | null>(0);
  const [feeReimbursed, setFeeReimbursed] = useState(false);
  const [marketValues, setMarketValues] = useState<Record<string, number | null>>({});
  const available = platforms.map(edge => edge.node).filter(platform => !platform.closedAt);
  const source = available.find(platform => platform.id === from);
  const destinations = available.filter(platform => platform.id !== from && platform.account?.id === source?.account?.id && platform.currency?.id === source?.currency?.id);
  const variables = { transferFrom: from, transferTo: to, transferDate: date, closeOriginalAccount };
  const preview = useProfileQuery<{ previewAccountTransfer: TransferPreview }>(PREVIEW_ACCOUNT_TRANSFER, { variables, skip: !open || !from || !to || !date, fetchPolicy: "network-only", notifyOnNetworkStatusChange: true });
  const [transfer, { loading: saving }] = useProfileMutation<TransferResult>(TRANSFER_ACCOUNT, {
    // Refresh metadata and ledger views, but do not rerun the preview against
    // the source whose balances this mutation has just transferred.
    refetchQueries: () => Array.from(client.getObservableQueries("active").values())
      .filter(query => query.queryName !== "previewAccountTransfer")
      .map(query => ({ query: query.options.query, variables: query.variables })),
  });
  const details = from && to && date && !preview.loading && !preview.error ? preview.data?.previewAccountTransfer : undefined;
  const valuesComplete = details?.assets.every((asset) => {
    const value = marketValues[asset.stockId];
    return value != null && Number.isFinite(value) && value >= 0;
  });

  const fee = transferFee ?? 0;
  const liquidationProceeds = details?.assets.reduce((total, asset) => total + (marketValues[asset.stockId] ?? 0), 0) ?? 0;
  const cashToTransfer = Math.round((Number(details?.cash ?? 0) + (transferAsCash ? liquidationProceeds : 0) - fee) * 100) / 100;
  const validFee = Number.isFinite(fee) && fee >= 0;
  const canSubmit = Boolean(details && valuesComplete && validFee && cashToTransfer >= 0);

  useEffect(() => { setMarketValues({}); }, [from, to, date, transferAsCash]);

  useEffect(() => {
    if (open && !to && destinations.length === 1) setTo(destinations[0].id);
  }, [open, to, destinations]);

  const submit = async () => {
    if (saving || !details || !canSubmit) return;
    try {
      const result = await transfer({ variables: { ...variables, transferAsCash, transferFee: String(fee), feeReimbursed,
        marketValues: details.assets.map((asset) => ({ stockId: asset.stockId, marketValue: String(marketValues[asset.stockId]) })),
      } });
      if (!result.data?.transferAccount.success) throw new Error("The transfer could not be completed. Refresh and try again.");
      setOpen(false);
      notification.openNotificationWithIcon("success", closeOriginalAccount ? "Account transferred and closed" : "Account transferred", transferAsCash ? "Sales and linked cash transfers were saved, along with any fee and reimbursement. Historical transactions remain with the source platform." : "Linked transfer entries were saved, along with any fee and reimbursement. Historical transactions remain with the source platform.");
    } catch (error) {
      notification.openNotificationWithIcon("error", "Transfer not completed", error instanceof Error ? error.message : "Refresh and try again.");
    }
  };
  const openDialog = () => {
    setFrom(undefined);
    setTo(undefined);
    setDate(dayjs().format("YYYY-MM-DD"));
    setCloseOriginalAccount(true);
    setTransferAsCash(false);
    setTransferFee(0);
    setFeeReimbursed(false);
    setMarketValues({});
    setOpen(true);
  };
  return <>
    <Button type="primary" disabled={!available.length} onClick={openDialog}>Transfer Account</Button>
    <Modal title="Transfer Account" open={open} onCancel={() => { if (!saving) setOpen(false); }} onOk={submit}
      okText={closeOriginalAccount ? "Transfer and Close" : "Transfer"} okButtonProps={{ disabled: !canSubmit || preview.loading }} confirmLoading={saving}
      cancelButtonProps={{ disabled: saving }} closable={!saving} maskClosable={!saving} keyboard={!saving} width={760}>
      <Typography.Paragraph>Transfer all remaining assets and cash as of the transfer date to another platform of the same account type and currency.</Typography.Paragraph>
      <Typography.Paragraph>The original transactions stay with the source platform. You can keep it open to record later activity, or close it on the transfer date and allow only historical transactions. Transfers are not contributions.</Typography.Paragraph>
      <Typography.Paragraph>{transferAsCash
        ? "Transfer as cash records a full Sell for each remaining holding at the sale proceeds you enter, then transfers the cash after any transfer fee. Amount-only funds do not need shares; their remaining book cost is removed and used to calculate realized gains."
        : "An in-kind transfer records linked Transfer Out and Transfer In entries for each asset, carrying its shares (when applicable) and book cost. Enter its total market value on the transfer date for performance calculations. No sale is recorded."}</Typography.Paragraph>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Select aria-label="Source platform" style={{ width: "100%" }} placeholder="Transfer from" showSearch optionFilterProp="label" disabled={saving} value={from} options={platformOptions(available)} onChange={value => { setFrom(value); setTo(undefined); }} />
        <ArrowDownOutlined />
        <Select aria-label="Destination platform" style={{ width: "100%" }} placeholder="Transfer to" showSearch optionFilterProp="label" disabled={!source || saving} value={to} options={platformOptions(destinations)} onChange={setTo} />
        <div><Typography.Text>Transfer date</Typography.Text><br /><DatePicker aria-label="Transfer date" value={date ? dayjs(date) : null} onChange={value => setDate(value?.format("YYYY-MM-DD"))} disabled={saving} disabledDate={value => value.isAfter(dayjs(), "day")} /></div>
        <Checkbox checked={transferAsCash} disabled={saving} onChange={event => setTransferAsCash(event.target.checked)}>Transfer as cash (sell all holdings)</Checkbox>
        <div><Typography.Text>Transfer fee ({source?.currency?.code ?? "account currency"})</Typography.Text><br />
          <InputNumber aria-label="Transfer fee" min={0} precision={2} disabled={saving} value={transferFee}
            onChange={value => { setTransferFee(value); if (!value) setFeeReimbursed(false); }} />
        </div>
        <Checkbox checked={feeReimbursed} disabled={saving || fee <= 0} onChange={event => setFeeReimbursed(event.target.checked)}>Is transfer fee reimbursed</Checkbox>
        <Typography.Text type="secondary">The fee is recorded as a Service Fee on the source. Reimbursement records a Fee Reimbursement of the same amount on the destination, on the transfer date. Only select it if the reimbursement has been received.</Typography.Text>
        <Checkbox checked={closeOriginalAccount} disabled={saving} onChange={event => setCloseOriginalAccount(event.target.checked)}>Close Original Account</Checkbox>
        {preview.loading && <Typography.Text type="secondary">Calculating remaining assets and cash…</Typography.Text>}
        {preview.error && <Alert showIcon type="error" message={preview.error.message} />}
        {details && <>
          <Table<TransferAsset> size="small" pagination={false} rowKey="stockId" dataSource={details.assets} columns={[
            { title: "Asset", dataIndex: "ticker" },
            { title: "Shares", dataIndex: "shares", render: value => Number(value) ? formatNumber(Number(value), 4) : "—" },
            { title: `Book cost (${details.currency})`, dataIndex: "bookCost", render: value => formatNumberAsCurrency(Number(value)) },
            { title: `${transferAsCash ? "Sale proceeds" : "Market value"} (${details.currency})`, key: "marketValue", render: (_: unknown, asset: TransferAsset) =>
              <InputNumber aria-label={`${transferAsCash ? "Sale proceeds" : "Transfer market value"} for ${asset.ticker}`} min={0} precision={2} disabled={saving}
                value={marketValues[asset.stockId]} onChange={value => setMarketValues(previous => ({ ...previous, [asset.stockId]: value }))} /> },
          ]} />
          <Typography.Text>Existing cash: {formatNumberAsCurrency(Number(details.cash))} {details.currency}</Typography.Text>
          {transferAsCash && <Typography.Text>Sale proceeds: {valuesComplete ? formatNumberAsCurrency(liquidationProceeds) : "—"} {details.currency}</Typography.Text>}
          <Typography.Text strong>Cash to transfer: {transferAsCash && !valuesComplete ? "—" : formatNumberAsCurrency(cashToTransfer)} {details.currency}</Typography.Text>
          {feeReimbursed && <Typography.Text>Destination cash including reimbursement: {transferAsCash && !valuesComplete ? "—" : formatNumberAsCurrency(cashToTransfer + fee)} {details.currency}</Typography.Text>}
          {cashToTransfer < 0 && <Alert type="error" showIcon message="The transfer fee exceeds available cash. Enter sale proceeds or reconcile the cash balance before transferring." />}
          {details.assets.some((asset) => !Number(asset.shares)) && <Typography.Text type="secondary">Funds without shares are transferred or sold by their recorded book cost and total proceeds; no share quantity is required.</Typography.Text>}
          <Alert type="warning" showIcon message={`Submitting ${transferAsCash ? "records the sales and transfers the net cash" : "transfers these balances"}${closeOriginalAccount ? ` and closes ${source?.name}` : ` and keeps ${source?.name} open`}. Check the balances against your statement first.`} />
        </>}
      </Space>
    </Modal>
  </>;
}
