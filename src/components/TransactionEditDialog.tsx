import { Alert, DatePicker, Modal, Select } from "antd";
import dayjs from "dayjs";
import React, { ChangeEventHandler, useEffect, useState } from "react";

import {
  FormControl,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Typography
} from "@mui/material";

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
    value: number | undefined,
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
    const [saveError, setSaveError] = useState(false);
    const handleSave = async () => {
        if (!transaction || saving) return;
        setSaving(true);
        setSaveError(false);
        try {
            await handleDialogSave(transaction);
        } catch {
            setSaveError(true);
        } finally {
            setSaving(false);
        }
    }

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setTransaction((prev) => {
            if (!prev) return prev;
            const updated = { ...prev, [name]: value === "" ? (name === "fee" ? 0 : undefined) : Number(value) };
            if (["Buy", "Sell"].includes(updated.activity.name ?? "") && ["price", "shares", "fee"].includes(name)) {
                updated.total = Number(((updated.price ?? 0) * (updated.shares ?? 0) + (updated.fee ?? 0)).toFixed(2));
            }
            return updated;
        });
    }

    useEffect(() => {
        setSaveError(false);
        setTransaction(dataItem ? { ...dataItem, fee: dataItem.fee ?? 0 } : undefined);
    }, [dataItem, open]);

    if (!transaction) return null;
    const currencyPlatforms = platforms.filter(platform =>
        platform.currency?.id === dataItem?.platform.currency?.id
    );
    const accountOptions = Array.from(new Map([
        [transaction.account.id, transaction.account],
        ...currencyPlatforms.filter(platform => platform.account?.id).map(platform => [platform.account!.id, platform.account!] as const),
    ]).values());
    const eligiblePlatforms = currencyPlatforms.filter(platform => platform.account?.id === transaction.account.id);
    const isTrade = ["Buy", "Sell"].includes(transaction.activity.name ?? "");
    const totalOnly = ["Dividends", "Withholding Tax", "Contribution", "Withdrawal"].includes(transaction.activity.name ?? "");

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
        {saveError && <Alert type="error" showIcon message="Could not save the transaction. Please try again." />}
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
              const platform = currencyPlatforms.find(platform => platform.account?.id === id);
              if (platform?.account) setTransaction(prev => prev ? { ...prev, account: platform.account!, platform } : prev);
            }}
          />
        </div>
        <div style={{ margin: "24px 0 12px" }}>
          <label htmlFor="transaction-edit-platform" style={{ display: "block", marginBottom: 8 }}>Platform</label>
          <Select
            id="transaction-edit-platform"
            style={{ width: "100%" }}
            value={transaction.platform.id}
            loading={platformsLoading}
            disabled={saving || platformsLoading || platformsError}
            options={[
              ...(!eligiblePlatforms.some(platform => platform.id === dataItem?.platform.id) && dataItem && transaction.account.id === dataItem.account.id ? [dataItem.platform] : []),
              ...eligiblePlatforms,
            ].map(platform => ({ value: platform.id, label: platform.name }))}
            onChange={id => {
              const platform = eligiblePlatforms.find(platform => platform.id === id);
              if (platform) setTransaction(prev => prev ? { ...prev, platform } : prev);
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
        {!totalOnly && <>
        <NumberTextField label="Price" adornment="$" field="price" step={0.01} value={transaction.price} onChange={handleInputChange}/>
        <NumberTextField label="Shares" adornment="" field="shares" step="any" value={transaction.shares} onChange={handleInputChange}/>
        <NumberTextField label="Fee" adornment="$" field="fee" step={0.01} value={transaction.fee} onChange={handleInputChange}/>
        </>}
        {isTrade && <DialogText gutterBottom text={`Total: $${(transaction.total ?? 0).toFixed(2)}`} />}
        {!isTrade && <NumberTextField label="Total" adornment="$" field="total" step={0.01} value={transaction.total} onChange={handleInputChange}/>}
      </Modal>
    );
}

export default TransactionEditDialog
