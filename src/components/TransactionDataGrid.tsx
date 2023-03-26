import { useEffect, useState } from "react";

import { useQuery } from "@apollo/client";
import { Box } from "@mui/system";
import {
  DataGrid,
  GridColDef,
  GridToolbarColumnsButton,
  GridToolbarContainer,
  GridToolbarDensitySelector,
  GridToolbarExport,
  GridValueFormatterParams,
  GridValueGetterParams
} from "@mui/x-data-grid";

import { Account } from "../models/Account";
import { Activity } from "../models/Activity";
import { GraphQLNode } from "../models/GraphQLNode";
import { Platform } from "../models/Platform";
import { convertStringToDate, formatNumberAsCurrency } from "../utils/utils";
import { ACTIVITY_PLATFORM_ACCOUNT_NAMES } from "../views/MyStocksView/gql";

type TDGProps = {
  gridData: any;
  defaultSort: string;
  ascending: boolean;
  removeColumns: string[];
};

function CustomToolbar() {
  return (
    <GridToolbarContainer>
      <GridToolbarColumnsButton />
      <GridToolbarDensitySelector />
      <GridToolbarExport />
    </GridToolbarContainer>
  );
}

const defaultColumns: GridColDef[] = [
  {
    field: "transactionDate",
    type: "date",
    headerName: "Transaction Date",
    valueGetter: (params: GridValueGetterParams) =>
      convertStringToDate(params.row.transactionDate),
    width: 200,
  },
  {
    field: "activity",
    headerName: "Activity",
    type: "singleSelect",
    valueGetter: (params: GridValueGetterParams) => params.row.activity.name,
    width: 200,
  },
  {
    field: "account",
    headerName: "Account",
    type: "singleSelect",
    valueGetter: (params: GridValueGetterParams) => params.row.account.code,
    width: 100,
  },
  {
    field: "platform",
    headerName: "Platform",
    type: "singleSelect",
    valueGetter: (params: GridValueGetterParams) => params.row.platform.name,
    width: 200,
  },
  {
    field: "stock",
    headerName: "Stock",
    valueGetter: (params: GridValueGetterParams) =>
      params.row.stock
        ? `${params.row.stock.name} (${params.row.stock.ticker})`
        : "-",
    width: 300,
  },
  {
    field: "price",
    headerName: "Price ($)",
    type: "number",
    width: 100,
    valueFormatter: (params: GridValueFormatterParams<number>) =>
      formatNumberAsCurrency(params.value, false),
  },
  {
    field: "shares",
    headerName: "Shares",
    type: "number",
    width: 100,
    valueFormatter: (params: GridValueFormatterParams<number>) =>
      params.value ?? "-",
  },
  {
    field: "total",
    headerName: "Total ($)",
    type: "number",
    width: 100,
    valueFormatter: (params: GridValueFormatterParams<number>) =>
      formatNumberAsCurrency(params.value, false),
  },
];

export const TransactionDataGrid = (props: TDGProps) => {
  const { loading, error, data } = useQuery(ACTIVITY_PLATFORM_ACCOUNT_NAMES);
  const [columns, setColumns] = useState<GridColDef[]>(defaultColumns);
  const { gridData, defaultSort, ascending, removeColumns } = props;

  useEffect(() => {
    if (!data) {
      return;
    }
    if (data.accounts && data.activities && data.platforms) {
      let activities: string[] = data.activities.edges.map(
        (x: GraphQLNode<Activity>) => x.node.name
      );
      let accounts: string[] = data.accounts.edges.map(
        (x: GraphQLNode<Account>) => x.node.code
      );
      let platforms: string[] = data.platforms.edges.map(
        (x: GraphQLNode<Platform>) => x.node.name
      );

      setColumns((prev: any[]) => {
        let update = [...prev];
        update[1].valueOptions = activities;
        update[2].valueOptions = accounts;
        update[3].valueOptions = platforms.reduce(
          (unique: any, item: string) =>
            unique.includes(item) ? unique : [...unique, item],
          []
        );

        removeColumns.forEach((col: string) => {
          let index = update.findIndex((x: any) => x.field === col);
          if (index !== -1) {
            update.splice(index, 1);
          }
        });

        return update;
      });
    }
  }, [data]);

  return (
    <Box sx={{ marginTop: 3, width: "100%" }}>
      <DataGrid
        autoHeight
        columns={columns}
        rows={gridData}
        initialState={{
          sorting: {
            sortModel: [
              { field: defaultSort, sort: ascending ? "asc" : "desc" },
            ],
          },
          pagination: { paginationModel: { pageSize: 5 } },
        }}
        pageSizeOptions={[5, 10, 25]}
        slots={{
          toolbar: CustomToolbar,
        }}
      />
    </Box>
  );
};
