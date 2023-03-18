import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  Radio,
  Row,
  Select,
  Table,
  Typography
} from "antd";
import { useEffect, useState } from "react";

import { useMutation, useQuery } from "@apollo/client";
import {
  DataGrid,
  GridColDef,
  GridToolbar,
  GridValueFormatterParams,
  GridValueGetterParams
} from "@mui/x-data-grid";

import { NotificationComponent } from "../../components/Notification";
import { Activity } from "../../interfaces/Activity";
import { Currency } from "../../interfaces/Currency";
import { GraphQLNode } from "../../interfaces/GraphQLNode";
import { Stock } from "../../interfaces/Stock";
import { Transaction } from "../../interfaces/Transaction";
import { formatNumberAsCurrency } from "../../utils/utils";
import {
  ALL_STOCKS_CURRENCY,
  CREATE_STOCK,
  TRANSACTIONS_BY_STOCK
} from "./gql";

const { Title } = Typography;

type SSProps = {
  stock: string | undefined;
  name: string | undefined;
  ticker: string | undefined;
};

const SelectedStockInfo = (props: SSProps) => {
  const { stock, name, ticker } = props;
  const { loading, error, data } = useQuery(TRANSACTIONS_BY_STOCK, {
    variables: { stock },
  });

  const columns: GridColDef[] = [
    { field: "transactionDate", headerName: "Transaction Date", width: 150 },
    {
      field: "activity",
      headerName: "Activity",
      valueGetter: (params: GridValueGetterParams) => params.row.activity.name,
      width: 150,
    },
    {
      field: "account",
      headerName: "Account",
      valueGetter: (params: GridValueGetterParams) => params.row.account.code,
      width: 100,
    },
    {
      field: "platform",
      headerName: "Platform",
      valueGetter: (params: GridValueGetterParams) => params.row.platform.name,
      width: 200,
    },
    {
      field: "price",
      headerName: "Price",
      width: 100,
      valueFormatter: (params: GridValueFormatterParams<number>) =>
        formatNumberAsCurrency(params.value),
    },
    { field: "shares", headerName: "Shares", width: 100 },
    {
      field: "total",
      headerName: "Total",
      width: 100,
      valueFormatter: (params: GridValueFormatterParams<number>) =>
        formatNumberAsCurrency(params.value),
    },
    { field: "description", headerName: "Description" },
  ];

  return (
    <>
      <Title level={4}>
        {name} ({ticker})
      </Title>
      {data && (
        <DataGrid
          columns={columns}
          rows={data?.transactionsByStock ?? []}
          slots={{
            toolbar: GridToolbar,
          }}
        />
      )}
    </>
  );
};

export default SelectedStockInfo;
