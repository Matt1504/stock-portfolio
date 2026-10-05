import BulkTransactionEditor from "./BulkTransactionEditor";
import { useProfileMutation as useMutation, useProfileQuery } from "../profiles/hooks";
import { Alert, Button, DatePicker, InputNumber, Modal, Popover, Select, Space, Typography } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

import { DocumentNode, gql } from "@apollo/client";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
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

import { redundantTransactionColumns } from "./transactionColumns";
import { Transaction } from "../models/Transaction";
import { convertStringToDate, formatNumber, formatNumberAsCurrency } from "../utils/utils";
import {
  UPDATE_TRANSACTION
} from "../views/MyStocksView/gql";
import { notifyTransactionSaved, transactionErrorMessage } from "../utils/transactionFeedback";
import { NotificationComponent } from "./Notification";
import TransactionEditDialog from "./TransactionEditDialog";
import { filterTransactions, readTablePreferences, saveTablePreferences, TablePreferences, TransactionFilters, transactionPageSizes, TransactionPagination } from "./transactionTableState";

export const EDIT_TRANSACTION_PLATFORMS = gql`
  query EditTransactionPlatforms($profileId: ID!) {
    platforms(profileId: $profileId) {
      edges { node { id name account { id code } currency { id code } } }
    }
  }
`;

export const DELETE_TRANSACTION = gql`
  mutation DeleteTransaction($profileId: ID!, $id: ID!) {
    deleteTransaction(profileId: $profileId, id: $id) { success }
  }
`;

export type TransactionDateRange = { start?: string; end?: string };

type TDGProps = {
  gridData: Transaction[];
  defaultSort: string;
  ascending: boolean;
  removeColumns: string[];
  query: DocumentNode;
  dateRange?: TransactionDateRange;
  onDateRangeChange?: (range: TransactionDateRange) => void;
  loading?: boolean;
  onBulkEditChange?: (active: boolean) => void;
  hiddenFilters?: ("account" | "stock")[];
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
      params.value == null ? "-" : formatNumber(params.value),
  },
  {
    field: "fee",
    headerName: "Fee",
    type: "number",
    width: 100,
    valueFormatter: (params: GridValueFormatterParams<number>) =>
      params.value === 0 ? "" : params.value == null ? "-" : formatNumber(params.value),
  },
  {
    field: "priceCurrency", headerName: "Price Currency", width: 130,
    valueGetter: (params: GridValueGetterParams) => params.row.priceCurrency?.code ?? params.row.platform.currency?.code ?? "-",
  },
  {
    field: "totalCurrency", headerName: "Total Currency", width: 130,
    valueGetter: (params: GridValueGetterParams) => params.row.totalCurrency?.code ?? params.row.platform.currency?.code ?? "-",
  },
  {
    field: "exchangeRate", headerName: "FX Rate", width: 120, type: "number",
    valueGetter: (params: GridValueGetterParams) => params.row.exchangeRate ?? 1,
    valueFormatter: (params: GridValueFormatterParams<number>) => formatNumber(params.value, 8),
  },
  {
    field: "rate",
    headerName: "Rate (%)",
    type: "number",
    width: 100,
    valueFormatter: (params: GridValueFormatterParams<number>) => 
      params.value == null ? "-" : formatNumber(params.value),
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
  }
];

const TransactionDataGridContent = (props: TDGProps) => {
  const { gridData, defaultSort, ascending, removeColumns, query, dateRange, onDateRangeChange, loading, onBulkEditChange, hiddenFilters = []}  = props;
  const [selectedItem, setSelectedItem] = useState<Transaction>();
  const [open, setOpen] = useState(false);
  const notification = new NotificationComponent();
  const [deleteItem, setDeleteItem] = useState<Transaction>();
  const [deleteError, setDeleteError] = useState<string>();
  const [deleteTransaction, { loading: deleting }] = useMutation(DELETE_TRANSACTION, {
    // Close confirmation after the mutation succeeds; page queries show their
    // own loading state while the portfolio refresh continues.
    awaitRefetchQueries: false,
    update: (cache, result, options) => {
      if (result.data?.deleteTransaction?.success) {
        const entityId = cache.identify({ __typename: "TransactionType", id: options.variables?.id });
        if (entityId) cache.evict({ id: entityId });
      }
    },
  });
  const handleDelete = async () => {
    if (!deleteItem || deleting) return;
    setDeleteError(undefined);
    try {
      const result = await deleteTransaction({ variables: { id: deleteItem.id } });
      if (!result.data?.deleteTransaction?.success) {
        setDeleteError("Could not delete the transaction. Please try again.");
        return;
      }
      setDeleteItem(undefined);
      notification.openNotificationWithIcon("success", "Transaction Deleted", "The transaction was successfully deleted.");
    } catch (error) {
      setDeleteError((error as { graphQLErrors?: unknown[] }).graphQLErrors?.length ? transactionErrorMessage(error) : "Could not delete the transaction. Please try again.");
    }
  };
  const platformQuery = useProfileQuery(EDIT_TRANSACTION_PLATFORMS, { skip: !open });
  const [updateTransaction] = useMutation(UPDATE_TRANSACTION, {
    update: (cache: any, mutationResult: any) => {
      if (!mutationResult.data.updateTransaction) {
        notification.openNotificationWithIcon(
          "error",
          "Error Updating Transaction",
          "There was an error updating the transaction. Please check the logs."
        );
      } else {
        notifyTransactionSaved(notification, "Transaction Updated", "The transaction was successfully updated.", mutationResult.data.updateTransaction.warnings);
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
          platform: transaction.platform.id,
          account: transaction.account.id,
          transactionDate: transaction.transactionDate,
          price: transaction.price,
          priceCurrency: transaction.priceCurrency?.id,
          totalCurrency: transaction.totalCurrency?.id,
          exchangeRate: transaction.exchangeRate,
          shares: transaction.shares,
          fee: transaction.fee,
          total: transaction.total,
          ...(transaction.activity.name === "Stock Spinoff" ? { spinoffSource: transaction.spinoffSource?.id, allocatedBookCost: transaction.allocatedBookCost } : {}),
          ...(transaction.stock?.asset?.name === "GIC" && transaction.activity.name === "Buy" ? { rate: transaction.rate, maturityDate: transaction.maturityDate, interestCalculation: transaction.interestCalculation ?? "simple" } : {}),
          ...(transaction.activity.name === "GIC Maturity" ? { gicPurchase: transaction.gicPurchase?.id } : {}),
        },
      }
    });
    handleDialogClose();
  }

  const operation = query.definitions.find(definition => definition.kind === "OperationDefinition");
  const viewName = operation?.kind === "OperationDefinition" ? operation.name?.value ?? "transactions" : "transactions";
  const preferenceKey = `stock-portfolio-table-v1:${viewName}:${[...removeColumns].sort().join(",")}`;
  const defaults: TablePreferences = { sortModel: [{ field: defaultSort, sort: ascending ? "asc" : "desc" }], pageSize: 25, visibility: {}, widths: {}, density: "standard" };
  const [preferences, setPreferences] = useState(() => readTablePreferences(preferenceKey, defaults));
  const [bulkHiddenColumns, setBulkHiddenColumns] = useState<string[]>([]);
  const [bulkRows, setBulkRows] = useState<Transaction[] | null>(null);
  useEffect(() => {
    onBulkEditChange?.(bulkRows !== null);
    return () => onBulkEditChange?.(false);
  }, [bulkRows, onBulkEditChange]);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [page, setPage] = useState(0);
  useEffect(() => { saveTablePreferences(preferenceKey, preferences); }, [preferenceKey, preferences]);
  const rows = gridData ?? emptyRows;
  const filteredRows = useMemo(() => filterTransactions(rows, filters), [rows, filters]);
  const paginationModel = { page: Math.min(page, Math.max(0, Math.ceil((bulkRows ?? filteredRows).length / preferences.pageSize) - 1)), pageSize: preferences.pageSize };
  const changePagination = (model: TransactionPagination) => {
    setPage(model.page);
    setPreferences(value => ({ ...value, pageSize: model.pageSize }));
  };
  const setFilter = (update: Partial<TransactionFilters>) => { setFilters(value => ({ ...value, ...update })); setPage(0); };
  const options = (getValue: (row: Transaction) => string | undefined, getLabel: (row: Transaction) => string | undefined) =>
    Array.from(new Map(rows.map(row => [getValue(row), { value: getValue(row), label: getLabel(row) }])).values())
      .filter(option => option.value).sort((a, b) => (a.label ?? "").localeCompare(b.label ?? ""));
  const activityOptions = options(row => row.activity.name, row => row.activity.name);
  const accountOptions = options(row => row.account.id ?? row.account.code, row => row.account.code);
  const stockOptions = options(row => row.stock ? row.stock.id ?? row.stock.ticker : "__no_stock__", row => row.stock ? `${row.stock.name} (${row.stock.ticker})` : "No stock / cash transaction");
  const redundantColumns = useMemo(() => redundantTransactionColumns(filteredRows), [filteredRows]);
  const columns: GridColDef[] = defaultColumns.filter(column => !removeColumns.includes(column.field) && !redundantColumns.has(column.field)).map(column => ({
    ...column, width: preferences.widths[column.field] ?? column.width,
    ...(column.field === "activity" ? { valueOptions: activityOptions.map(option => option.value) } : {}),
    ...(column.field === "account" ? { valueOptions: Array.from(new Set(rows.map(row => row.account.code))) } : {}),
    ...(column.field === "platform" ? { valueOptions: Array.from(new Set(rows.map(row => row.platform.name))) } : {}),
  }));
  if (rows.some(row => row.activity.name === "Stock Spinoff")) columns.push(
    { field: "spinoffReceived", headerName: "Stock Received", width: 160, valueGetter: params => params.row.activity.name === "Stock Spinoff" ? params.row.stock?.ticker : "—" },
    { field: "spinoffSource", headerName: "Original Stock", width: 180, valueGetter: params => params.row.spinoffSource?.ticker ?? "—" },
    { field: "allocatedBookCost", headerName: "Allocated Book Cost", width: 180, valueGetter: params => params.row.allocatedBookCost, valueFormatter: params => params.value == null ? "—" : formatNumberAsCurrency(params.value) },
  );
  columns.push({ field: "actions", headerName: "Actions", width: 120, sortable: false, filterable: false, disableColumnMenu: true, disableReorder: true,
    renderCell: params => <>
      <IconButton aria-label="Edit transaction" title="Edit transaction" onClick={() => handleEditClick(params.row)} disabled={deleting}><EditIcon /></IconButton>
      <IconButton aria-label="Delete transaction" title="Delete transaction" color="error" onClick={() => { setDeleteItem(params.row); setDeleteError(undefined); }} disabled={deleting}><DeleteOutlineIcon /></IconButton>
    </> });
  const [widthField, setWidthField] = useState("transactionDate");
  const resizeField = columns.some(column => column.field === widthField) ? widthField : "transactionDate";
  const dates = onDateRangeChange ? dateRange ?? {} : filters;
  const hasFilters = Object.values(filters).some(Boolean) || !!dates.start || !!dates.end;
  const changeDates = (range: TransactionDateRange) => {
    if (onDateRangeChange) { onDateRangeChange(range); setPage(0); }
    else setFilter(range);
  };

  if (bulkRows) return <Box sx={{ marginTop: 3, width: "100%" }}>{notification.contextHolder}<BulkTransactionEditor paginationModel={paginationModel} onPaginationModelChange={changePagination} hiddenColumns={bulkHiddenColumns} rows={bulkRows} defaultSort={defaultSort} ascending={ascending} onComplete={(saved, warnings) => notification.openNotificationWithIcon(warnings.length ? "warning" : "success", "Transactions Updated", `${saved} transaction(s) saved.${warnings.length ? ` ${warnings.join(" ")}` : ""}`, warnings.length ? 8 : 2)} onCancel={() => setBulkRows(null)} /></Box>;

  return (
    <Box sx={{ marginTop: 3, width: "100%" }}>
      {notification.contextHolder}
      <Modal title="Delete transaction?" open={!!deleteItem} onOk={handleDelete} onCancel={() => { if (!deleting) setDeleteItem(undefined); }} okText="Delete Transaction" okButtonProps={{ danger: true }} confirmLoading={deleting} cancelButtonProps={{ disabled: deleting }} closable={!deleting} maskClosable={!deleting} keyboard={!deleting}>
        <Typography.Paragraph>This will permanently delete the transaction and update your portfolio statistics.</Typography.Paragraph>
        {deleteItem && <Typography.Paragraph>
          {dayjs(deleteItem.transactionDate).format("YYYY-MM-DD")} · {deleteItem.activity.name}{deleteItem.stock ? ` · ${deleteItem.stock.ticker}` : ""}<br />
          {deleteItem.account.code} · {deleteItem.platform.name} · {formatNumberAsCurrency(deleteItem.total ?? 0)}
        </Typography.Paragraph>}
        {deleteError && <Alert type="error" showIcon message={deleteError} />}
      </Modal>
      {selectedItem && <TransactionEditDialog open={open} setOpen={setOpen} handleDialogSave={handleDialogUpdate} onCancel={handleDialogClose} dataItem={selectedItem} platforms={platformQuery.data?.platforms.edges.map((edge: any) => edge.node)} platformsLoading={platformQuery.loading} platformsError={!!platformQuery.error} />}
      <Space wrap size={[16, 16]} style={{ marginBottom: 24, width: "100%" }}>
        <Button onClick={() => {
          setBulkHiddenColumns([...removeColumns, ...Array.from(redundantColumns), ...Object.keys(preferences.visibility).filter(field => preferences.visibility[field] === false)]);
          setBulkRows(filteredRows.slice());
        }} disabled={loading || deleting || !filteredRows.length}>Bulk Edit</Button>
        <DatePicker.RangePicker aria-label="Transaction date range" placeholder={["Start date", "End date"]}
          allowEmpty={[true, true]}
          value={dates.start || dates.end ? [dates.start ? dayjs(dates.start) : null, dates.end ? dayjs(dates.end) : null] : null}
          onChange={value => changeDates({ start: value?.[0]?.format("YYYY-MM-DD"), end: value?.[1]?.format("YYYY-MM-DD") })} />
        <Select aria-label="Filter by activity" placeholder="All activities" allowClear showSearch optionFilterProp="label" style={{ width: 180 }} value={filters.activity} options={activityOptions} onChange={activity => setFilter({ activity })} />
        {!hiddenFilters.includes("account") && <Select aria-label="Filter by account" placeholder="All accounts" allowClear showSearch optionFilterProp="label" style={{ width: 160 }} value={filters.account} options={accountOptions} onChange={account => setFilter({ account })} />}
        {!hiddenFilters.includes("stock") && <Select aria-label="Filter by stock" placeholder="All stocks" allowClear showSearch optionFilterProp="label" style={{ width: 240 }} value={filters.stock} options={stockOptions} onChange={stock => setFilter({ stock })} />}
        <Button disabled={!hasFilters} onClick={() => { setFilters({}); if (onDateRangeChange) onDateRangeChange({}); setPage(0); }}>Clear filters</Button>
        <Popover trigger="click" title="Table settings" content={<Space direction="vertical" style={{ width: 250 }}>
          <Typography.Text>Row density</Typography.Text>
          <Select aria-label="Row density" style={{ width: "100%" }} value={preferences.density} options={[{ value: "compact", label: "Compact" }, { value: "standard", label: "Standard" }, { value: "comfortable", label: "Comfortable" }]} onChange={density => setPreferences(value => ({ ...value, density }))} />
          <Typography.Text>Column width</Typography.Text>
          <Select aria-label="Column to resize" style={{ width: "100%" }} value={resizeField} options={columns.filter(column => column.field !== "actions").map(column => ({ value: column.field, label: column.headerName }))} onChange={setWidthField} />
          <InputNumber aria-label="Column width in pixels" min={50} max={2000} step={10} value={preferences.widths[resizeField] ?? columns.find(column => column.field === resizeField)?.width ?? 100} addonAfter="px" onChange={width => { if (width) setPreferences(value => ({ ...value, widths: { ...value.widths, [resizeField]: width } })); }} />
          <Button onClick={() => { setPreferences(defaults); setPage(0); }}>Reset table preferences</Button>
        </Space>}><Button>Table settings</Button></Popover>
        <Typography.Text type="secondary" aria-live="polite">{filteredRows.length} of {rows.length} transactions</Typography.Text>
      </Space>
      <DataGrid
        autoHeight
        loading={loading}
        columns={columns}
        rows={filteredRows}
        sortModel={preferences.sortModel.filter(item => columns.some(column => column.field === item.field))}
        onSortModelChange={sortModel => setPreferences(value => ({ ...value, sortModel }))}
        paginationModel={paginationModel}
        onPaginationModelChange={changePagination}
        columnVisibilityModel={preferences.visibility}
        onColumnVisibilityModelChange={visibility => setPreferences(value => ({ ...value, visibility }))}
        density={preferences.density}
        pageSizeOptions={transactionPageSizes}
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
