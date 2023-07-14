import { Modal } from "antd";
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
        <FormControl fullWidth sx={{ m: 1 }}>
          <InputLabel htmlFor="outlined-adornment-amount">{label}</InputLabel>
          <OutlinedInput
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
    const [transaction, setTransaction] = useState<Transaction>(dataItem as Transaction);

    const handleSave = async () => {
        await handleDialogSave(transaction);
    }

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTransaction((prev: Transaction) => ({...prev, [event.target.name]: event.target.value}));
    }

    useEffect(() => {
        setTransaction(dataItem as Transaction);
    }, [dataItem]);

    return (
        <Modal
        title="Edit Transaction"
        open={open}
        onOk={handleSave}
        onCancel={onCancel}
      >
        {transaction.stock && <DialogText gutterBottom={false} text={`${transaction.stock?.name} (${transaction.stock?.ticker})`}/>}
        <DialogText gutterBottom={false} text={`${transaction.activity.name} on ${transaction.transactionDate?.toString()}`} />
        <DialogText gutterBottom text={`${transaction.account.code} (${transaction.platform.currency?.code}) | ${transaction.platform.name}`} />
        <NumberTextField label="Price" adornment="$" field="price" step={0.01} value={transaction.price} onChange={handleInputChange}/>
        <NumberTextField label="Shares" adornment="" field="shares" step={1} value={transaction.shares} onChange={handleInputChange}/>
        <NumberTextField label="Fee" adornment="$" field="fee" step={0.01} value={transaction.fee} onChange={handleInputChange}/>
        <NumberTextField label="Total" adornment="$" field="total" step={0.01} value={transaction.total} onChange={handleInputChange}/>
      </Modal>
    );
}

export default TransactionEditDialog