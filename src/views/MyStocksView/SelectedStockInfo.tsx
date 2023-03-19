import { Card, Col, Row, Statistic } from "antd";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis
} from "recharts";

import { useMutation, useQuery } from "@apollo/client";
import { StepIcon, Typography } from "@mui/material";
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

import { NotificationComponent } from "../../components/Notification";
import { Activity } from "../../interfaces/Activity";
import { Currency } from "../../interfaces/Currency";
import { GraphQLNode } from "../../interfaces/GraphQLNode";
import { Stock } from "../../interfaces/Stock";
import { Transaction } from "../../interfaces/Transaction";
import {
  formatDecimalTwoPlaces,
  formatNumberAsCurrency
} from "../../utils/utils";
import {
  ALL_STOCKS_CURRENCY,
  CREATE_STOCK,
  TRANSACTIONS_BY_STOCK
} from "./gql";

type SSProps = {
  stock: string | undefined;
  name: string | undefined;
  ticker: string | undefined;
  currency: string | undefined;
};

type HoldingDetail = {
  title: string;
  value: number | string;
  prefix: string | undefined;
  colour: string;
  precision: number | undefined;
};

class GraphData {
  name: string;
  value: number;
  label: string | undefined;

  constructor(name: string, buy: number, label: string | undefined) {
    this.name = name;
    this.value = buy;
    this.label = label;
  }
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  if (active) {
    return (
      <div className="custom-chart-tooltip">
        <p className="chart-label">{label}</p>
        <p className="chart-desc">{`$${payload?.[0].value?.toFixed(2)}`}</p>
      </div>
    );
  }

  return null;
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
  {
    field: "shares",
    headerName: "Shares",
    width: 100,
    valueFormatter: (params: GridValueFormatterParams<number>) =>
      params.value ?? "-",
  },
  {
    field: "total",
    headerName: "Total",
    width: 100,
    valueFormatter: (params: GridValueFormatterParams<number>) =>
      formatNumberAsCurrency(params.value),
  },
  { field: "description", headerName: "Description" },
];

const defaultHoldingDetails: HoldingDetail[] = [
  {
    title: "Share(s) Owned",
    value: 0,
    prefix: undefined,
    colour: "",
    precision: undefined,
  },
  {
    title: "Book Cost",
    value: 0,
    prefix: "$",
    colour: "",
    precision: 2,
  },
  {
    title: "Dividends Earned",
    value: 0,
    prefix: "$",
    colour: "",
    precision: 2,
  },
  {
    title: "Last Buy Date",
    value: "",
    prefix: "",
    precision: undefined,
    colour: "",
  },
];

const SelectedStockInfo = (props: SSProps) => {
  const { stock, name, ticker, currency } = props;
  const [holdingDetails, setHoldingDetails] = useState(defaultHoldingDetails);
  const [barGraphBuyData, setBarGraphBuyData] = useState<GraphData[]>([]);
  const [barGraphDivData, setBarGraphDivData] = useState<GraphData[]>([]);
  const [pieGraphAccData, setPieGraphAccData] = useState<GraphData[]>([]);
  const [pieGraphPlatData, setPieGraphPlatData] = useState<GraphData[]>([]);
  const { loading, error, data } = useQuery(TRANSACTIONS_BY_STOCK, {
    variables: { stock },
  });

  useEffect(() => {
    if (data?.transactionsByStock) {
      var shares: number = 0;
      var bookCost: number = 0;
      var dividends: number = 0;
      var lastBuyDate: string = "NA";
      var buyGraphData = new Map<string, GraphData>();
      var divGraphData = new Map<string, GraphData>();
      var accountBuyData = new Map<string, GraphData>();
      var platformBuyData = new Map<string, GraphData>();
      data.transactionsByStock.map((transaction: Transaction) => {
        switch (transaction.activity.name) {
          case "Stock Split":
            shares += transaction.shares ?? 0;
            break;
          case "Buy":
            shares += transaction.shares ?? 0;
            bookCost += transaction.total ?? 0;
            lastBuyDate = transaction.transactionDate.toString();
            var buyData = buyGraphData.get(lastBuyDate);
            if (buyData) {
              buyData.value += transaction.total ?? 0;
              var shareLabel = Number(buyData.label ?? 0);
              shareLabel += transaction.shares ?? 0;
              buyData.label = shareLabel.toString();
            } else {
              buyData = new GraphData(
                lastBuyDate,
                transaction.total ?? 0,
                (transaction.shares ?? 0).toString()
              );
            }
            buyGraphData.set(lastBuyDate, buyData);
            if (transaction.account.code) {
              var accData = accountBuyData.get(transaction.account.code);
              if (accData) {
                accData.value += transaction.total ?? 0;
              } else {
                accData = new GraphData(
                  transaction.account.code,
                  transaction.total ?? 0,
                  undefined
                );
              }
              accountBuyData.set(transaction.account.code, accData);
            }
            if (transaction.platform.name) {
              var platData = platformBuyData.get(transaction.platform.name);
              if (platData) {
                platData.value += transaction.total ?? 0;
              } else {
                platData = new GraphData(
                  transaction.platform.name,
                  transaction.total ?? 0,
                  undefined
                );
              }
              platformBuyData.set(transaction.platform.name, platData);
            }
            break;
          case "Sell":
            shares -= transaction.shares ?? 0;
            break;
          case "Dividends":
            dividends += transaction.total ?? 0;
            var transDate = transaction.transactionDate.toString();
            var data = divGraphData.get(transDate);
            if (data) {
              data.value += transaction.total ?? 0;
            } else {
              data = new GraphData(
                transDate,
                transaction.total ?? 0,
                undefined
              );
            }
            divGraphData.set(transDate, data);
            break;
          case "Withholding Tax":
            dividends -= transaction.total ?? 0;
            break;
        }
      });
      setPieGraphAccData(Array.from(accountBuyData.values()));
      setPieGraphPlatData(Array.from(platformBuyData.values()));
      setBarGraphDivData(Array.from(divGraphData.values()));
      setBarGraphBuyData(
        Array.from(buyGraphData.values()).map((x: GraphData) => ({
          ...x,
          label: `${x.label} Shares`,
        }))
      );
      setHoldingDetails((prev: HoldingDetail[]) => {
        let update = [...prev];
        update[0].value = shares;
        update[1].value = bookCost;
        update[2].value = dividends;
        update[3].value = lastBuyDate;
        return update;
      });
    }
  }, [data]);

  return (
    <Row>
      <Col span={24}>
        <Typography gutterBottom variant="h6">
          {name} | {currency}
        </Typography>
      </Col>
      {data && (
        <>
          {holdingDetails.map((x: HoldingDetail, index: number) => (
            <Col span={6} key={index}>
              <Card style={{ marginLeft: 8, marginRight: 8 }}>
                <Statistic
                  title={x.title}
                  value={x.value}
                  prefix={x.prefix}
                  precision={x.precision}
                />
              </Card>
            </Col>
          ))}
          {pieGraphAccData.length && pieGraphPlatData ? (
            <Col span={24} className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart width={400} height={400}>
                  <Pie
                    data={pieGraphPlatData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    fill="#8884d8"
                  />
                  <Pie
                    data={pieGraphAccData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    fill="#82ca9d"
                  >
                    <LabelList dataKey="label" position="top" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </Col>
          ) : (
            <></>
          )}
          {barGraphBuyData.length ? (
            <Col span={24} className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  width={800}
                  height={400}
                  data={barGraphBuyData}
                  maxBarSize={80}
                  margin={{
                    top: 32,
                    right: 16,
                    left: 16,
                    bottom: 24,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#000" />
                  <Bar dataKey="value" fill="#8884d8" name="Book Cost">
                    <LabelList dataKey="label" position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Col>
          ) : (
            <></>
          )}
          {barGraphDivData.length ? (
            <Col span={24} className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  width={800}
                  height={400}
                  data={barGraphDivData}
                  maxBarSize={80}
                  margin={{
                    top: 32,
                    right: 16,
                    left: 16,
                    bottom: 24,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#000" />
                  <Bar dataKey="value" fill="#8884d8" name="Dividends Earned" />
                </BarChart>
              </ResponsiveContainer>
            </Col>
          ) : (
            <></>
          )}
          <Col span={24}>
            <Box sx={{ height: 400, width: "100%" }}>
              <DataGrid
                columns={columns}
                rows={data?.transactionsByStock}
                slots={{
                  toolbar: CustomToolbar,
                }}
              />
            </Box>
          </Col>
        </>
      )}
    </Row>
  );
};

export default SelectedStockInfo;