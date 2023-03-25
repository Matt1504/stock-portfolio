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
  XAxis,
  YAxis
} from "recharts";

import { useQuery } from "@apollo/client";
import { Typography } from "@mui/material";
import {
  GridColDef,
  GridValueFormatterParams,
  GridValueGetterParams
} from "@mui/x-data-grid";

import { CustomTooltip } from "../../components/BarChartTooltip";
import { RenderActiveShape } from "../../components/PieChartShape";
import { TransactionDataGrid } from "../../components/TransactionDataGrid";
import { Account } from "../../models/Account";
import { Activity } from "../../models/Activity";
import { HoldingDetail } from "../../models/Common";
import { GraphData } from "../../models/GraphData";
import { GraphQLNode } from "../../models/GraphQLNode";
import { Platform } from "../../models/Platform";
import { Transaction } from "../../models/Transaction";
import {
  compareDates,
  convertStringToDate,
  formatNumberAsCurrency,
  getColourCodeByAccount,
  getMinMaxDate
} from "../../utils/utils";
import { TRANSACTIONS_BY_STOCK } from "./gql";

type SSProps = {
  stock: string | undefined;
  name: string | undefined;
  currency: string | undefined;
  columnData: any;
};

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
  const { stock, name, currency, columnData } = props;
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
      var shares = 0;
      var bookCost = 0;
      var dividends = 0;
      var lastBuyDate = getMinMaxDate();
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
          label: `${x.label} Share(s)`,
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
                <PieChart width={450} height={450}>
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
                    activeShape={RenderActiveShape}
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
                    top: 40,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <text
                    x={600}
                    y={10}
                    fill="black"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    <tspan fontWeight="600" fontSize="18">Buy History</tspan>
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
                    x={600}
                    y={30}
                    fill="black"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    <tspan fontWeight="600" fontSize="18">Dividend History</tspan>
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
            <TransactionDataGrid columns={columns} data={data?.transactionsByStock} defaultSort="transactionDate" ascending={false} />
          </Col>
        </>
      )}
    </Row>
  );
};

export default SelectedStockInfo;
