import { Box } from "@mui/system";
import {
  DataGrid,
  GridColDef,
  GridToolbarColumnsButton,
  GridToolbarContainer,
  GridToolbarDensitySelector,
  GridToolbarExport
} from "@mui/x-data-grid";

type TDGProps = {
  columns: GridColDef[];
  data: any;
  defaultSort: string,
  ascending: boolean
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

export const TransactionDataGrid = (props: TDGProps) => {
  const { columns, data, defaultSort, ascending } = props;
  return (
    <Box sx={{ marginTop: 3, width: "100%" }}>
      <DataGrid
        autoHeight
        columns={columns}
        rows={data}
        initialState={{
          sorting: {
            sortModel: [{ field: defaultSort, sort: ascending ? "asc" : "desc" }],
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
