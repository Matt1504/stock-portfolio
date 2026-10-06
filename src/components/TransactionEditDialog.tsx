import { formatNumber } from "../utils/utils";
import { Alert, Checkbox, DatePicker, Modal, Select } from "antd";
import dayjs from "dayjs";
import React, { ChangeEventHandler, useEffect, useState } from "react";

import {
  FormControl,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Typography
} from "@mui/material";

import { tradeTotal } from "../utils/transactionAmounts";
import { transactionErrorMessage } from "../utils/transactionFeedback";
import { Platform } from "../models/Platform";
import { Transaction } from "../models/Transaction";

type DialogProps = {
    open: boolean,
    setOpen: Function,
    handleDialogSave: Function,
    onCancel: any,
    dataItem: Transaction | undefined,
    platforms?: Platform[],
    platformsLoading?: boolean,
    platformsError?: boolean,
}

type NumTextFieldProps = {
    label: string,
    adornment: string,
    value: number | null | undefined,
    field: string,
    step: number | "any",
    onChange: ChangeEventHandler<HTMLInputElement>
}

const NumberTextField = (props: NumTextFieldProps) => {
    const {label, adornment, value, field, step, onChange} = props;
    return (
        <FormControl fullWidth sx={{ my: 1.5 }}>
          <InputLabel htmlFor={`transaction-edit-${field}`}>{label}</InputLabel>
          <OutlinedInput
            id={`transaction-edit-${field}`}
            name={field}
            startAdornment={<InputAdornment position="start">{adornment}</InputAdornment>}
            label={label}
            value={value ?? ""}
            type="number"
            onChange={onChange}
            inputProps={{step}}
          />
        </FormControl>
    );
}

type DialogTextProps = {
  text: string;
  gutterBottom: boolean;
};

const DialogText = (props: DialogTextProps) => (
  <Typography variant="subtitle1" gutterBottom={props.gutterBottom}>{props.text}</Typography>
)

const TransactionEditDialog = (props: DialogProps) => {
    const {open, onCancel, handleDialogSave, dataItem, platforms = [], platformsLoading = false, platformsError = false} = props;
    const [transaction, setTransaction] = useState<Transaction | undefined>(dataItem);

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | undefined>();
    const handleSave = async () => {
        if (!transaction || saving) return;
        if (!["Stock Split", "Stock Spinoff"].includes(transaction.activity.name ?? "") && transaction.total == null) {
          setSaveError("Enter the total in the selected platform currency. For converted trades, enter the exchange rate first.");
          return;
        }
        setSaving(true);
        setSaveError(undefined);
        try {
            await handleDialogSave(transaction);
        } catch (error) {
            setSaveError(transactionErrorMessage(error));
        } finally {
            setSaving(false);
        }
    }

    const [shareEntry, setShareEntry] = useState(false);
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setTransaction((prev) => {
            if (!prev) return prev;
            const numericValue = name === "shares" ? Number(Number(value).toFixed(4)) : Number(value);
            const updated = { ...prev, [name]: value === "" ? (name === "fee" ? null : undefined) : numericValue };
            if (updated.stock?.asset?.name !== "GIC" && ["Buy", "Sell"].includes(updated.activity.name ?? "") && ["price", "shares", "fee", "exchangeRate"].includes(name)) {
                updated.total = updated.priceCurrency?.code !== updated.totalCurrency?.code && !updated.exchangeRate
                  ? undefined
                  : tradeTotal(updated.price, updated.shares, updated.exchangeRate ?? 1, updated.fee, updated.activity.name);
            }
            return updated;
        });
    }

    useEffect(() => {
        setSaveError(undefined);
        setTransaction(dataItem ? { ...dataItem, fee: dataItem.fee || null, priceCurrency: dataItem.priceCurrency ?? dataItem.platform.currency, totalCurrency: dataItem.totalCurrency ?? dataItem.platform.currency, exchangeRate: dataItem.exchangeRate ?? 1 } : undefined);
        setShareEntry(Boolean(dataItem?.shares));
    }, [dataItem, open]);

    if (!transaction) return null;
    const allPlatforms = Array.from(new Map([...(dataItem ? [{ ...dataItem.platform, account: dataItem.account }] : []), ...platforms].map(platform => [platform.id, platform])).values());
    const accountOptions = Array.from(new Map([
        [transaction.account.id, transaction.account],
        ...allPlatforms.filter(platform => platform.account?.id).map(platform => [platform.account!.id, platform.account!] as const),
    ]).values());
    const accountPlatforms = allPlatforms.filter(platform => platform.account?.id === transaction.account.id && (!platform.closedAt || String(transaction.transactionDate).slice(0, 10) <= platform.closedAt));
    const currencyOptions = Array.from(new Map([transaction.platform.currency, ...accountPlatforms.map(platform => platform.currency)].filter(Boolean).map(currency => [currency!.id ?? currency!.code, currency!])).values());
    const eligiblePlatforms = accountPlatforms.filter(platform => (platform.currency?.id ?? platform.currency?.code) === (transaction.platform.currency?.id ?? transaction.platform.currency?.code));
    const isGic = transaction.stock?.asset?.name === "GIC" || transaction.activity.name === "GIC Maturity";
    const isGicBuy = isGic && transaction.activity.name === "Buy";
    const isFund = ["Index Fund", "Mutual Fund"].includes(transaction.stock?.asset?.name ?? "");
    const isTrade = (!isFund || shareEntry) && !isGic && ["Buy", "Sell"].includes(transaction.activity.name ?? "");
    const totalOnly = (isFund && !shareEntry) || isGic || ["Dividends", "Withholding Tax", "Contribution", "Withdrawal", "Service Fee", "SEC Fee", "ETF Rebate", "Stock Spinoff"].includes(transaction.activity.name ?? "");

    const changePlatform = (platform: Platform) => {
      setSaveError(undefined);
      setTransaction(prev => {
        if (!prev || !platform.account) return prev;
        const currencyChanged = (prev.platform.currency?.id ?? prev.platform.currency?.code) !== (platform.currency?.id ?? platform.currency?.code);
        if (!currencyChanged) return { ...prev, account: platform.account, platform };
        const priceCurrency = isTrade ? prev.priceCurrency ?? prev.stock?.currency ?? prev.platform.currency : platform.currency;
        const sameCurrency = (priceCurrency?.id ?? priceCurrency?.code) === (platform.currency?.id ?? platform.currency?.code);
        return { ...prev, account: platform.account, platform, totalCurrency: platform.currency, priceCurrency,
          exchangeRate: sameCurrency ? 1 : undefined, fee: null,
          total: prev.activity.name === "Stock Spinoff" ? 0 : isTrade && sameCurrency ? tradeTotal(prev.price, prev.shares, 1, 0, prev.activity.name) : undefined,
          ...(prev.activity.name === "Stock Spinoff" ? { allocatedBookCost: undefined } : {}),
        };
      });
    };
    const platformCurrencyChanged = (transaction.platform.currency?.id ?? transaction.platform.currency?.code) !== (dataItem?.platform.currency?.id ?? dataItem?.platform.currency?.code);

    return (
        <Modal
        title="Edit Transaction"
        open={open}
        onOk={handleSave}
        onCancel={saving ? undefined : onCancel}
        confirmLoading={saving}
        cancelButtonProps={{ disabled: saving }}
        closable={!saving}
        maskClosable={!saving}
        keyboard={!saving}
      >
        {transaction.stock && <DialogText gutterBottom={false} text={`${transaction.stock?.name} (${transaction.stock?.ticker})`}/>}
        <DialogText gutterBottom={false} text={`${transaction.activity.name}`} />
        <DialogText gutterBottom text={`${transaction.account.code} (${transaction.platform.currency?.code}) | ${transaction.platform.name}`} />
        {saveError && <Alert type="error" showIcon message={saveError} />}
        <div style={{ margin: "24px 0 12px" }}>
          <label htmlFor="transaction-edit-account" style={{ display: "block", marginBottom: 8 }}>Account Type</label>
          <Select
            id="transaction-edit-account"
            style={{ width: "100%" }}
            value={transaction.account.id}
            loading={platformsLoading}
            disabled={saving || platformsLoading || platformsError}
            options={accountOptions.map(account => ({ value: account.id, label: account.code }))}
            onChange={id => {
              const matching = allPlatforms.filter(platform => platform.account?.id === id);
              const platform = matching.find(platform => platform.name === transaction.platform.name && platform.currency?.id === transaction.platform.currency?.id)
                ?? matching.find(platform => platform.currency?.id === transaction.platform.currency?.id)
                ?? matching[0];
              if (platform) changePlatform(platform);
            }}
          />
        </div>
        <div style={{ margin: "24px 0 12px" }}>
          <label htmlFor="transaction-edit-platform-currency" style={{ display: "block", marginBottom: 8 }}>Platform Currency</label>
          <Select id="transaction-edit-platform-currency" style={{ width: "100%" }}
            value={transaction.platform.currency?.id ?? transaction.platform.currency?.code}
            loading={platformsLoading} disabled={saving || platformsLoading || platformsError}
            options={currencyOptions.map(currency => ({ value: currency.id ?? currency.code, label: currency.code }))}
            onChange={id => {
              const matching = accountPlatforms.filter(platform => (platform.currency?.id ?? platform.currency?.code) === id);
              const platform = matching.find(platform => platform.name === transaction.platform.name) ?? matching[0];
              if (platform) changePlatform(platform);
            }} />
          {platformCurrencyChanged && <Alert type="info" showIcon style={{ marginTop: 12 }} message={`Amounts are now recorded in ${transaction.platform.currency?.code}. Fees were cleared; verify the total, fees, exchange rate, and any allocated book cost before saving.`} />}
        </div>
        <div style={{ margin: "24px 0 12px" }}>
          <label htmlFor="transaction-edit-platform" style={{ display: "block", marginBottom: 8 }}>Platform</label>
          <Select
            id="transaction-edit-platform"
            style={{ width: "100%" }}
            value={transaction.platform.id}
            loading={platformsLoading}
            disabled={saving || platformsLoading || platformsError}
            options={eligiblePlatforms.map(platform => ({ value: platform.id, label: platform.name }))}
            onChange={id => {
              const platform = eligiblePlatforms.find(platform => platform.id === id);
              if (platform) changePlatform(platform);
            }}
          />
          {platformsError && <Alert type="error" showIcon message="Unable to load platforms. Close and reopen the dialog to try again." style={{ marginTop: 8 }} />}
        </div>
        <div style={{ margin: "24px 0 12px" }}>
          <label htmlFor="transaction-edit-date" style={{ display: "block", marginBottom: 8 }}>Transaction Date</label>
          <DatePicker
            id="transaction-edit-date"
            value={dayjs(transaction.transactionDate)}
            allowClear={false}
            onChange={(date) => {
              if (date) setTransaction((prev) => prev ? { ...prev, transactionDate: date.format("YYYY-MM-DD") as unknown as Date } : prev);
            }}
          />
        </div>
        {transaction.activity.name === "Stock Spinoff" && <>
          <Alert type="info" showIcon message={`Spinoff from ${transaction.spinoffSource?.name} (${transaction.spinoffSource?.ticker}) to ${transaction.stock?.ticker}. Original shares are unchanged; book cost is moved between the holdings.`} />
          <NumberTextField label="Shares Received" adornment="" field="shares" step={0.0001} value={transaction.shares} onChange={handleInputChange} />
          <NumberTextField label="Allocated Book Cost" adornment="$" field="allocatedBookCost" step={0.01} value={transaction.allocatedBookCost} onChange={handleInputChange} />
        </>}
        {isGicBuy && <>
          <NumberTextField label="Annual Interest Rate" adornment="%" field="rate" step={0.01} value={transaction.rate} onChange={handleInputChange}/>
          <label htmlFor="transaction-edit-maturity">Maturity Date</label>
          <DatePicker allowClear={false} id="transaction-edit-maturity" value={transaction.maturityDate ? dayjs(transaction.maturityDate) : null} onChange={date => setTransaction(prev => prev ? { ...prev, maturityDate: date?.format("YYYY-MM-DD") } : prev)} />
          <Select aria-label="Interest Calculation" value={transaction.interestCalculation ?? "simple"} style={{ width: "100%", margin: "16px 0" }} options={[{ value: "simple", label: "Simple interest (actual days / 365)" }, { value: "annual_compound", label: "Annual compounding (actual days / 365)" }]} onChange={interestCalculation => setTransaction(prev => prev ? { ...prev, interestCalculation } : prev)} />
        </>}
        {transaction.activity.name === "GIC Maturity" && <Alert type="info" showIcon message={`Original principal: $${formatNumber(transaction.gicPurchase?.total ?? transaction.principalReturned ?? 0, 2, 2)}. Enter the gross payout before tax and fees.`} />}
        {isFund && ["Buy", "Sell"].includes(transaction.activity.name ?? "") && <Checkbox checked={shareEntry} onChange={event => {
          setShareEntry(event.target.checked);
          if (!event.target.checked) setTransaction(prev => prev ? { ...prev, price: undefined, shares: 0, fee: null, priceCurrency: prev.totalCurrency ?? prev.platform.currency, exchangeRate: 1 } : prev);
        }}>Enter price and shares</Checkbox>}
        {isTrade && <>
          <label htmlFor="transaction-edit-price-currency">Price Currency</label>
          <Select id="transaction-edit-price-currency" style={{ width: "100%", marginBottom: 16 }} value={transaction.priceCurrency?.id ?? transaction.priceCurrency?.code} options={Array.from(new Map([transaction.platform.currency, transaction.stock?.currency, transaction.priceCurrency, ...platforms.map(platform => platform.currency)].filter(Boolean).map(currency => [currency!.id ?? currency!.code, currency!])).values()).map(currency => ({ value: currency.id ?? currency.code, label: currency.code }))} onChange={id => {
            const currency = [transaction.platform.currency, transaction.stock?.currency, transaction.priceCurrency, ...platforms.map(platform => platform.currency)].find(currency => (currency?.id ?? currency?.code) === id);
            if (currency) setTransaction(prev => {
              if (!prev) return prev;
              const sameCurrency = currency.code === prev.totalCurrency?.code;
              return { ...prev, priceCurrency: currency, exchangeRate: sameCurrency ? 1 : undefined, total: sameCurrency ? tradeTotal(prev.price, prev.shares, 1, prev.fee, prev.activity.name) : undefined };
            });
          }} />
          {transaction.priceCurrency?.code !== transaction.totalCurrency?.code && <NumberTextField label="Exchange Rate" adornment="" field="exchangeRate" step={0.00000001} value={transaction.exchangeRate} onChange={handleInputChange}/>}
        </>}
        {!totalOnly && <>
        <NumberTextField label="Price" adornment="$" field="price" step={0.001} value={transaction.price} onChange={handleInputChange}/>
        <NumberTextField label="Shares" adornment="" field="shares" step={0.0001} value={transaction.shares} onChange={handleInputChange}/>
        <NumberTextField label="Fee" adornment="$" field="fee" step={0.01} value={transaction.fee} onChange={handleInputChange}/>
        </>}
        {isTrade && <NumberTextField label="Total" adornment="$" field="total" step={0.01} value={transaction.total} onChange={handleInputChange}/>}
        {!isTrade && transaction.activity.name !== "Stock Spinoff" && <NumberTextField label={transaction.activity.name === "GIC Maturity" ? "Gross Payout" : "Total"} adornment="$" field="total" step={0.01} value={transaction.total} onChange={handleInputChange}/>}
      </Modal>
    );
}

export default TransactionEditDialog
