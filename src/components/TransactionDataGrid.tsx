import { useEffect, useState } from "react";

import { DocumentNode, useMutation, useQuery } from "@apollo/client";
import EditIcon from "@mui/icons-material/Edit";
import { IconButton } from "@mui/material";
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
import { Transaction } from "../models/Transaction";
import { convertStringToDate, formatNumberAsCurrency } from "../utils/utils";
import {
  ACTIVITY_PLATFORM_ACCOUNT_NAMES,
  UPDATE_TRANSACTION
} from "../views/MyStocksView/gql";
import { NotificationComponent } from "./Notification";
import TransactionEditDialog from "./TransactionEditDialog";

type TDGProps = {
  gridData: [Transaction];
  defaultSort: string;
  ascending: boolean;
  removeColumns: string[];
  query: DocumentNode;
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
    width: 150,
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
    field: "fee",
    headerName: "Fee",
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
  {
    field: "description",
    width: 200,
    headerName: "Description",
  }
];

export const TransactionDataGrid = (props: TDGProps) => {
  const { loading, error, data } = useQuery(ACTIVITY_PLATFORM_ACCOUNT_NAMES);
  const [columns, setColumns] = useState<GridColDef[]>(defaultColumns);
  const { gridData, defaultSort, ascending, removeColumns, query}  = props;
  const [selectedItem, setSelectedItem] = useState<Transaction>();
  const [open, setOpen] = useState(false);
  const notification = new NotificationComponent();
  const [updateTransaction] = useMutation(UPDATE_TRANSACTION, {
    update: (cache: any, mutationResult: any) => {
      if (!mutationResult.data.updateTransaction) {
        notification.openNotificationWithIcon(
          "error",
          "Error Updating Transaction",
          "There was an error updating the transaction. Please check the logs."
        );
      } else {
        notification.openNotificationWithIcon(
          "success",
          "Transaction Updated",
          "The transaction was successfully updated."
        );
        const updatedTrans: Transaction = mutationResult.data.updateTransaction.trans;
        cache.writeQuery({
          query: query,
          data: {
            transactions: gridData.map((x: any) => {
              if (x.id === updatedTrans?.id) {
                return {
                  ...x, 
                  price: updatedTrans?.price, 
                  shares: updatedTrans?.shares,
                  fee: updatedTrans?.fee,
                  total: updatedTrans?.total,
                };
              }
              return {...x};
            })
          }
        })
      }
    }
  })

  const handleEditClick = (dataItem: any) => {
    setSelectedItem(dataItem);
    setOpen(true);
  }

  const handleDialogClose = () => {
    setOpen(false);
    setSelectedItem(undefined);
  }

  const handleDialogUpdate = async (transaction: Transaction) => {
    await updateTransaction({
      variables: {
        trans: {
          id: transaction.id,
          price: transaction.price,
          shares: transaction.shares,
          fee: transaction.fee,
          total: transaction.total,
        },
      }
    });
    handleDialogClose();
  }

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

        if (update[update.length - 1].field !== "actions") {
          update.push({
            field: "actions",
            headerName: "Edit",
            disableColumnMenu: true,
            disableReorder: true,
            renderCell: (params: any) => <IconButton onClick={() => handleEditClick(params.row)}><EditIcon /></IconButton>
          });
        }
        return update;
      });
    }
  }, [data]);

  return (
    <Box sx={{ marginTop: 3, width: "100%" }}>
      {notification.contextHolder}
      {selectedItem && <TransactionEditDialog open={open} setOpen={setOpen} handleDialogSave={handleDialogUpdate} onCancel={handleDialogClose} dataItem={selectedItem} />}
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
          pagination: { paginationModel: { pageSize: 10 } },
        }}
        pageSizeOptions={[10, 25, 50]}
        slots={{
          toolbar: CustomToolbar,
        }}
      />
    </Box>
  );
};
