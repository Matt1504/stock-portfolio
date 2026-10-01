import { DatePicker, Modal } from "antd";
import dayjs from "dayjs";
import React, { ChangeEventHandler, useEffect, useState } from "react";

import {
  FormControl,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Typography
} from "@mui/material";

import { Transaction } from "../models/Transaction";

type DialogProps = {
    open: boolean,
    setOpen: Function,
    handleDialogSave: Function,
    onCancel: any,
    dataItem: Transaction | undefined,
}

type NumTextFieldProps = {
    label: string,
    adornment: string,
    value: number | undefined,
    field: string,
    step: number,
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
    const {open, onCancel, handleDialogSave, dataItem} = props;
    const [transaction, setTransaction] = useState<Transaction | undefined>(dataItem);

    const handleSave = async () => {
        if (!transaction) return;
        await handleDialogSave(transaction);
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
        setTransaction(dataItem ? { ...dataItem, fee: dataItem.fee ?? 0 } : undefined);
    }, [dataItem, open]);

    if (!transaction) return null;
    const isTrade = ["Buy", "Sell"].includes(transaction.activity.name ?? "");
    const totalOnly = ["Dividends", "Withholding Tax", "Contribution"].includes(transaction.activity.name ?? "");

    return (
        <Modal
        title="Edit Transaction"
        open={open}
        onOk={handleSave}
        onCancel={onCancel}
      >
        {transaction.stock && <DialogText gutterBottom={false} text={`${transaction.stock?.name} (${transaction.stock?.ticker})`}/>}
        <DialogText gutterBottom={false} text={`${transaction.activity.name}`} />
        <DialogText gutterBottom text={`${transaction.account.code} (${transaction.platform.currency?.code}) | ${transaction.platform.name}`} />
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
        <NumberTextField label="Shares" adornment="" field="shares" step={1} value={transaction.shares} onChange={handleInputChange}/>
        <NumberTextField label="Fee" adornment="$" field="fee" step={0.01} value={transaction.fee} onChange={handleInputChange}/>
        </>}
        {isTrade && <DialogText gutterBottom text={`Total: $${(transaction.total ?? 0).toFixed(2)}`} />}
        {!isTrade && <NumberTextField label="Total" adornment="$" field="total" step={0.01} value={transaction.total} onChange={handleInputChange}/>}
      </Modal>
    );
}

export default TransactionEditDialog
