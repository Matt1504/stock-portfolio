import { Button, DatePicker, InputNumber, Popover, Select, Space, Typography } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

import { DocumentNode, useMutation } from "@apollo/client";
import EditIcon from "@mui/icons-material/Edit";
import { IconButton } from "@mui/material";
import { Box } from "@mui/system";
import {
  DataGrid,
  GridColDef,
  GridToolbarColumnsButton,
  GridToolbarContainer,
  GridToolbarExport,
  GridValueFormatterParams,
  GridValueGetterParams
} from "@mui/x-data-grid";

import { Transaction } from "../models/Transaction";
import { convertStringToDate, formatNumberAsCurrency } from "../utils/utils";
import {
  UPDATE_TRANSACTION
} from "../views/MyStocksView/gql";
import { NotificationComponent } from "./Notification";
import TransactionEditDialog from "./TransactionEditDialog";
import { filterTransactions, readTablePreferences, saveTablePreferences, TablePreferences, TransactionFilters } from "./transactionTableState";

type TDGProps = {
  gridData: Transaction[];
  defaultSort: string;
  ascending: boolean;
  removeColumns: string[];
  query: DocumentNode;
};

function CustomToolbar() {
  return (
    <GridToolbarContainer>
      <GridToolbarColumnsButton />
      <GridToolbarExport />
    </GridToolbarContainer>
  );
}

const emptyRows: Transaction[] = [];

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
    field: "rate",
    headerName: "Rate (%)",
    type: "number",
    width: 100,
    valueFormatter: (params: GridValueFormatterParams<number>) => 
      params.value ?? "-",
  },
  {
    field: "maturityDate",
    headerName: "Maturity Date",
    type: "date",
    valueGetter: (params: GridValueGetterParams) =>
      convertStringToDate(params.row.maturityDate),
    width: 200,
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

const TransactionDataGridContent = (props: TDGProps) => {
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
        // Apollo updates each normalized transaction from the mutation result.
        // Avoid writing a filtered table back into an unfiltered query cache.
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
          transactionDate: transaction.transactionDate,
          price: transaction.price,
          shares: transaction.shares,
          fee: transaction.fee,
          total: transaction.total,
        },
      }
    });
    handleDialogClose();
  }

  const operation = query.definitions.find(definition => definition.kind === "OperationDefinition");
  const viewName = operation?.kind === "OperationDefinition" ? operation.name?.value ?? "transactions" : "transactions";
  const preferenceKey = `stock-portfolio-table-v1:${viewName}:${[...removeColumns].sort().join(",")}`;
  const defaults: TablePreferences = { sortModel: [{ field: defaultSort, sort: ascending ? "asc" : "desc" }], pageSize: 10, visibility: {}, widths: {}, density: "standard" };
  const [preferences, setPreferences] = useState(() => readTablePreferences(preferenceKey, defaults));
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [page, setPage] = useState(0);
  useEffect(() => { saveTablePreferences(preferenceKey, preferences); }, [preferenceKey, preferences]);
  const rows = gridData ?? emptyRows;
  const filteredRows = useMemo(() => filterTransactions(rows, filters), [rows, filters]);
  const setFilter = (update: Partial<TransactionFilters>) => { setFilters(value => ({ ...value, ...update })); setPage(0); };
  const options = (getValue: (row: Transaction) => string | undefined, getLabel: (row: Transaction) => string | undefined) =>
    Array.from(new Map(rows.map(row => [getValue(row), { value: getValue(row), label: getLabel(row) }])).values())
      .filter(option => option.value).sort((a, b) => (a.label ?? "").localeCompare(b.label ?? ""));
  const activityOptions = options(row => row.activity.name, row => row.activity.name);
  const accountOptions = options(row => row.account.id ?? row.account.code, row => row.account.code);
  const stockOptions = options(row => row.stock ? row.stock.id ?? row.stock.ticker : "__no_stock__", row => row.stock ? `${row.stock.name} (${row.stock.ticker})` : "No stock / cash transaction");
  const columns: GridColDef[] = defaultColumns.filter(column => !removeColumns.includes(column.field)).map(column => ({
    ...column, width: preferences.widths[column.field] ?? column.width,
    ...(column.field === "activity" ? { valueOptions: activityOptions.map(option => option.value) } : {}),
    ...(column.field === "account" ? { valueOptions: Array.from(new Set(rows.map(row => row.account.code))) } : {}),
    ...(column.field === "platform" ? { valueOptions: Array.from(new Set(rows.map(row => row.platform.name))) } : {}),
  }));
  columns.push({ field: "actions", headerName: "Edit", sortable: false, filterable: false, disableColumnMenu: true, disableReorder: true,
    renderCell: params => <IconButton aria-label="Edit transaction" onClick={() => handleEditClick(params.row)}><EditIcon /></IconButton> });
  const [widthField, setWidthField] = useState("transactionDate");
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <Box sx={{ marginTop: 3, width: "100%" }}>
      {notification.contextHolder}
      {selectedItem && <TransactionEditDialog open={open} setOpen={setOpen} handleDialogSave={handleDialogUpdate} onCancel={handleDialogClose} dataItem={selectedItem} />}
      <Space wrap size={[16, 16]} style={{ marginBottom: 24, width: "100%" }}>
        <DatePicker.RangePicker aria-label="Transaction date range" placeholder={["Start date", "End date"]}
          value={filters.start && filters.end ? [dayjs(filters.start), dayjs(filters.end)] : null}
          onChange={dates => setFilter({ start: dates?.[0]?.format("YYYY-MM-DD"), end: dates?.[1]?.format("YYYY-MM-DD") })} />
        <Select aria-label="Filter by activity" placeholder="All activities" allowClear showSearch optionFilterProp="label" style={{ width: 180 }} value={filters.activity} options={activityOptions} onChange={activity => setFilter({ activity })} />
        <Select aria-label="Filter by account" placeholder="All accounts" allowClear showSearch optionFilterProp="label" style={{ width: 160 }} value={filters.account} options={accountOptions} onChange={account => setFilter({ account })} />
        <Select aria-label="Filter by stock" placeholder="All stocks" allowClear showSearch optionFilterProp="label" style={{ width: 240 }} value={filters.stock} options={stockOptions} onChange={stock => setFilter({ stock })} />
        <Button disabled={!hasFilters} onClick={() => { setFilters({}); setPage(0); }}>Clear filters</Button>
        <Popover trigger="click" title="Table settings" content={<Space direction="vertical" style={{ width: 250 }}>
          <Typography.Text>Row density</Typography.Text>
          <Select aria-label="Row density" style={{ width: "100%" }} value={preferences.density} options={[{ value: "compact", label: "Compact" }, { value: "standard", label: "Standard" }, { value: "comfortable", label: "Comfortable" }]} onChange={density => setPreferences(value => ({ ...value, density }))} />
          <Typography.Text>Column width</Typography.Text>
          <Select aria-label="Column to resize" style={{ width: "100%" }} value={widthField} options={columns.filter(column => column.field !== "actions").map(column => ({ value: column.field, label: column.headerName }))} onChange={setWidthField} />
          <InputNumber aria-label="Column width in pixels" min={50} max={2000} step={10} value={preferences.widths[widthField] ?? columns.find(column => column.field === widthField)?.width ?? 100} addonAfter="px" onChange={width => { if (width) setPreferences(value => ({ ...value, widths: { ...value.widths, [widthField]: width } })); }} />
          <Button onClick={() => { setPreferences(defaults); setPage(0); }}>Reset table preferences</Button>
        </Space>}><Button>Table settings</Button></Popover>
        <Typography.Text type="secondary" aria-live="polite">{filteredRows.length} of {rows.length} transactions</Typography.Text>
      </Space>
      <DataGrid
        autoHeight
        columns={columns}
        rows={filteredRows}
        sortModel={preferences.sortModel.filter(item => columns.some(column => column.field === item.field))}
        onSortModelChange={sortModel => setPreferences(value => ({ ...value, sortModel }))}
        paginationModel={{ page: Math.min(page, Math.max(0, Math.ceil(filteredRows.length / preferences.pageSize) - 1)), pageSize: preferences.pageSize }}
        onPaginationModelChange={model => { setPage(model.page); setPreferences(value => ({ ...value, pageSize: model.pageSize })); }}
        columnVisibilityModel={preferences.visibility}
        onColumnVisibilityModelChange={visibility => setPreferences(value => ({ ...value, visibility }))}
        density={preferences.density}
        pageSizeOptions={[10, 25, 50]}
        slots={{
          toolbar: CustomToolbar,
          noRowsOverlay: () => <Box sx={{ p: 3, textAlign: "center" }}>{hasFilters ? "No transactions match these filters. Try changing or clearing them." : "No transactions to display."}</Box>,
        }}
      />
    </Box>
  );
};

export const TransactionDataGrid = (props: TDGProps) => {
  const operation = props.query.definitions.find(definition => definition.kind === "OperationDefinition");
  const name = operation?.kind === "OperationDefinition" ? operation.name?.value ?? "transactions" : "transactions";
  return <TransactionDataGridContent key={`${name}:${[...props.removeColumns].sort().join(",")}`} {...props} />;
};
