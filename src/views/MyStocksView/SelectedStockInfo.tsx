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
  Sector,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis
} from "recharts";

import { useQuery } from "@apollo/client";
import { Typography } from "@mui/material";
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

import { Account } from "../../interfaces/Account";
import { Activity } from "../../interfaces/Activity";
import { GraphQLNode } from "../../interfaces/GraphQLNode";
import { Platform } from "../../interfaces/Platform";
import { Transaction } from "../../interfaces/Transaction";
import {
  compareDates,
  formatNumberAsCurrency,
  getColourCodeByAccount,
  getMinMaxDate
} from "../../utils/utils";
import { TRANSACTIONS_BY_STOCK } from "./gql";

type SSProps = {
  stock: string | undefined;
  name: string | undefined;
  ticker: string | undefined;
  currency: string | undefined;
  columnData: any;
};

type HoldingDetail = {
  title: string;
  value: number | string;
  prefix: string | undefined;
  colour: string;
  precision: number | undefined;
};

type PieShapeProps = {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  payload: any;
  percent: number;
  value: number;
};

class GraphData {
  name: string;
  value: number;
  value_1: number | undefined;
  label: string | undefined;

  constructor(
    name: string,
    value: number,
    value_1: number | undefined,
    label: string | undefined
  ) {
    this.name = name;
    this.value = value;
    this.value_1 = value_1;
    this.label = label;
  }
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active) {
    console.log(typeof payload);
    return (
      <div className="custom-chart-tooltip">
        <p className="chart-label">{label}</p>
        <p className="chart-desc">
          {payload?.[0].name}:{" "}
          <span style={{ color: payload?.[0].fill }}>
            ${payload?.[0].value?.toFixed(2)}
          </span>
        </p>
        {payload?.[1] && (
          <p className="chart-desc">
            {payload?.[1].name}:{" "}
            <span style={{ color: payload?.[1].fill }}>
              ${payload?.[1].value?.toFixed(2)}
            </span>
          </p>
        )}
      </div>
    );
  }
  return null;
};

const renderActiveShape = (props: PieShapeProps) => {
  const RADIAN = Math.PI / 180;
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        fill="none"
      />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        textAnchor={textAnchor}
        fill="#333"
      >{`$${value.toFixed(2)} or ${payload.label} Share(s)`}</text>
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        dy={18}
        textAnchor={textAnchor}
        fill="#999"
      >
        {`(Rate ${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
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
      new Date(params.row.transactionDate),
    width: 200,
  },
  {
    field: "activity",
    headerName: "Activity",
    valueGetter: (params: GridValueGetterParams) => params.row.activity.name,
    width: 200,
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
  const { stock, name, ticker, currency, columnData } = props;
  const [holdingDetails, setHoldingDetails] = useState(defaultHoldingDetails);
  const [barGraphBuyData, setBarGraphBuyData] = useState<GraphData[]>([]);
  const [barGraphDivData, setBarGraphDivData] = useState<GraphData[]>([]);
  const [pieGraphPlatData, setPieGraphPlatData] = useState<GraphData[]>([]);
  const [columns, setColumns] = useState<GridColDef[]>(defaultColumns);
  const [activeIndex, setActiveIndex] = useState(0);
  const { loading, error, data } = useQuery(TRANSACTIONS_BY_STOCK, {
    variables: { stock },
  });

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  useEffect(() => {
    if (columnData.accounts && columnData.activities && columnData.platforms) {
      let activities: string[] = columnData.activities.edges.map(
        (x: GraphQLNode<Activity>) => x.node.name
      );
      let accounts: string[] = columnData.accounts.edges.map(
        (x: GraphQLNode<Account>) => x.node.code
      );
      let platforms: string[] = columnData.platforms.edges.map(
        (x: GraphQLNode<Platform>) => x.node.name
      );
      setColumns((prev: any[]) => {
        let update = [...prev];
        // activity
        update[1].type = "singleSelect";
        update[1].valueOptions = activities;

        // account
        update[2].type = "singleSelect";
        update[2].valueOptions = accounts;

        // platform
        update[3].type = "singleSelect";
        update[3].valueOptions = platforms.reduce(
          (unique: any, item: string) =>
            unique.includes(item) ? unique : [...unique, item],
          []
        );
        return update;
      });
    }
  }, [columnData]);

  useEffect(() => {
    if (data?.transactionsByStock) {
      var shares: number = 0;
      var bookCost: number = 0;
      var dividends: number = 0;
      var lastBuyDate: Date = getMinMaxDate();
      var buyGraphData = new Map<string, GraphData>();
      var divGraphData = new Map<string, GraphData>();
      var platformBuyData = new Map<string, GraphData>();
      data.transactionsByStock.map((transaction: Transaction) => {
        var transDate = transaction.transactionDate.toString();
        switch (transaction.activity.name) {
          case "Stock Split":
            shares += transaction.shares ?? 0;
            break;
          case "Buy":
            shares += transaction.shares ?? 0;
            bookCost += transaction.total ?? 0;
            if (compareDates(lastBuyDate, transaction.transactionDate) === -1) {
              lastBuyDate = transaction.transactionDate;
            }
            var buyData = buyGraphData.get(transDate);
            if (buyData) {
              buyData.value += transaction.total ?? 0;
              var shareLabel = Number(buyData.label ?? 0);
              shareLabel += transaction.shares ?? 0;
              buyData.label = shareLabel.toString();
            } else {
              buyData = new GraphData(
                transDate,
                transaction.total ?? 0,
                undefined,
                (transaction.shares ?? 0).toString()
              );
            }
            buyGraphData.set(transDate, buyData);
            if (transaction.platform.name && transaction.account.code) {
              let key = `${transaction.platform.name} (${transaction.account.code})`;
              var platData = platformBuyData.get(key);
              if (platData) {
                platData.value += transaction.total ?? 0;
                let shareCount = Number(platData.label);
                platData.label = (shareCount +=
                  transaction.shares ?? 0).toString();
              } else {
                platData = new GraphData(
                  key,
                  transaction.total ?? 0,
                  undefined,
                  (transaction.shares ?? 0).toString()
                );
              }
              platformBuyData.set(key, platData);
            }
            break;
          case "Sell":
            shares -= transaction.shares ?? 0;
            break;
          case "Dividends":
            dividends += transaction.total ?? 0;
            var divData = divGraphData.get(transDate);
            if (divData) {
              divData.value += transaction.total ?? 0;
            } else {
              divData = new GraphData(
                transDate,
                transaction.total ?? 0,
                undefined,
                undefined
              );
            }
            divGraphData.set(transDate, divData);
            break;
          case "Withholding Tax":
            dividends -= transaction.total ?? 0;
            var divData = divGraphData.get(transDate);
            if (divData) {
              divData.value_1 =
                (divData.value_1 ?? 0) - (transaction.total ?? 0);
            } else {
              divData = new GraphData(
                transDate,
                0,
                (transaction.total ?? 0) * -1,
                undefined
              );
            }
            divGraphData.set(transDate, divData);
            break;
        }
      });
      console.log(divGraphData);
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
        update[3].value = lastBuyDate.toString();
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
      {holdingDetails.map((x: HoldingDetail, index: number) => (
        <Col span={6} key={index}>
          <Card style={{ marginBottom: 16, marginLeft: 8, marginRight: 8 }}>
            <Statistic
              loading={loading}
              title={x.title}
              value={x.value}
              prefix={x.prefix}
              precision={x.precision}
            />
          </Card>
        </Col>
      ))}
      {data && (
        <>
          {pieGraphPlatData.length ? (
            <Col span={24} className="pie-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart width={400} height={400}>
                  <text
                    x={600}
                    y={20}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    <tspan fontWeight="600" fontSize="18">
                      Book Cost Distribution
                    </tspan>
                  </text>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={pieGraphPlatData}
                    cx="50%"
                    cy="50%"
                    innerRadius={100}
                    outerRadius={140}
                    fill="#8884d8"
                    dataKey="value"
                    onMouseEnter={onPieEnter}
                  >
                    {pieGraphPlatData.map((entry: GraphData, index: number) => {
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={getColourCodeByAccount(entry.name ?? "")}
                        />
                      );
                    })}
                  </Pie>
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
                    top: 50,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <text
                    x={800}
                    y={20}
                    fill="black"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    <tspan fontSize="18">Buy History</tspan>
                  </text>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#000" />
                  <Bar dataKey="value" fill="#ACE1AF" name="Book Cost">
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
                    top: 50,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <text
                    x={800 / 2}
                    y={20}
                    fill="black"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    <tspan fontSize="18">Dividend History</tspan>
                  </text>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#000" />
                  <Bar dataKey="value" fill="#ACE1AF" name="Dividends Earned" />
                  {barGraphDivData.some(
                    (x: GraphData) => x.value_1 !== undefined
                  ) && (
                    <Bar
                      dataKey="value_1"
                      fill="#FF6961"
                      name="Withholding Tax"
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </Col>
          ) : (
            <></>
          )}
          <Col span={24}>
            <Box sx={{ marginTop: 3, width: "100%" }}>
              <DataGrid
                autoHeight
                columns={columns}
                rows={data?.transactionsByStock}
                initialState={{
                  sorting: {
                    sortModel: [{ field: "transactionDate", sort: "desc" }],
                  },
                  pagination: { paginationModel: { pageSize: 5 } },
                }}
                pageSizeOptions={[5, 10, 25]}
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
