import { DownOutlined, UpOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Row, Statistic } from "antd";
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
import { Stack, Typography } from "@mui/material";

import { CustomTooltip } from "../../components/BarChartTooltip";
import LoadingProgress from "../../components/LoadingProgress";
import ReloadButton from "../../components/ReloadButton";
import StatisticTitle, { stockStatisticDescription } from "../../components/StatisticTitle";
import { RenderActiveShape } from "../../components/PieChartShape";
import { TransactionDataGrid } from "../../components/TransactionDataGrid";
import { GraphData } from "../../models/GraphData";
import { Transaction } from "../../models/Transaction";
import {
  compareDates,
  getColourCodeByAccount
} from "../../utils/utils";
import { TRANSACTIONS_BY_STOCK } from "./gql";
import { stockStatistics } from "./statistics";
import "./statistics.css";

type SSProps = {
  stock: string | undefined;
  name: string | undefined;
  currency: string | undefined;
};

const defaultHoldingDetails = stockStatistics([]).details;

const SelectedStockInfo = (props: SSProps) => {
  const { stock, name, currency } = props;
  const [expanded, setExpanded] = useState(false);
  const [hasHoldingIssues, setHasHoldingIssues] = useState(false);
  const [holdingDetails, setHoldingDetails] = useState(defaultHoldingDetails);
  const [barGraphBuyData, setBarGraphBuyData] = useState<GraphData[]>([]);
  const [barGraphDivData, setBarGraphDivData] = useState<GraphData[]>([]);
  const [pieGraphPlatData, setPieGraphPlatData] = useState<GraphData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const { loading, error, data, refetch } = useQuery(TRANSACTIONS_BY_STOCK, {
    variables: { stock },
    notifyOnNetworkStatusChange: true
  });

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  useEffect(() => {
    if (data?.transactions) {
      var buyGraphData = new Map<string, GraphData>();
      var divGraphData = new Map<string, GraphData>();
      var transactions = [...data.transactions];
      transactions
        .sort((a: Transaction, b: Transaction) =>
          compareDates(a.transactionDate, b.transactionDate)
        )
        .forEach((transaction: Transaction) => {
          var transDate = transaction.transactionDate.toString();
          var divData = divGraphData.get(transDate);
          var buyData = buyGraphData.get(transDate);
          switch (transaction.activity.name) {
            case "Stock Split":
              break;
            case "Buy":
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
              break;
            case "Sell":
              if (buyData) {
                buyData.value_1 = (buyData.value_1 ?? 0) - (transaction.total ?? 0);
              } else {
                buyData = new GraphData(
                  transDate,
                  0,
                  (transaction.total ?? 0) * -1,
                  (transaction.shares ?? 0).toString()
                )
              }
              buyGraphData.set(transDate, buyData);
              break;
            case "Interest":
            case "Dividends":
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
      setBarGraphDivData(Array.from(divGraphData.values()));
      setBarGraphBuyData(
        Array.from(buyGraphData.values()).map((x: GraphData) => ({
          ...x,
          label: `${x.label} Share(s)`,
        }))
      );
      const summary = stockStatistics(data.transactions);
      setHoldingDetails(summary.details);
      setHasHoldingIssues(summary.portfolio.issues.length > 0 || summary.portfolio.realizedGain === undefined);
      setActiveIndex(0);
      setPieGraphPlatData(summary.portfolio.positions.filter(position => position.bookCost > 0).map(position =>
        new GraphData(`${position.platform} (${position.accountCode ?? ""})`, position.bookCost, undefined, position.shares.toString())
      ));
    }
  }, [data]);

  return (
    <Row className="portfolio-details" gutter={[24, 24]}>
      <Col span={24}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
          mb={0}
        >
          <Typography variant="h6">
            {name} | {currency}
          </Typography>
          <ReloadButton onReload={() => refetch()} loading={loading} />
        </Stack>
      </Col>
      {hasHoldingIssues && !loading && <Col span={24}><Alert type="warning" showIcon message="Some sales exceed recorded holdings. Review the transaction history; realized gain/loss is unavailable until missing entries are corrected." style={{ marginBottom: 16 }} /></Col>}
      <Col span={24}>
        <div className="stock-statistics-grid">
          {holdingDetails.slice(0, 5).map(detail => <div key={detail.title}>
            <Card style={{ height: "100%" }}><Statistic loading={loading} title={<StatisticTitle title={detail.title} description={stockStatisticDescription(detail.title)} />} value={detail.value} prefix={detail.prefix} precision={detail.precision} /></Card>
          </div>)}
        </div>
        <div id="additional-stock-statistics" hidden={!expanded} style={{ marginTop: 16 }}>
          <div className="stock-statistics-grid">
            {holdingDetails.slice(5).map(detail => <div key={detail.title}>
              <Card style={{ height: "100%" }}><Statistic loading={loading} title={<StatisticTitle title={detail.title} description={stockStatisticDescription(detail.title)} />} value={detail.value} prefix={detail.prefix} precision={detail.precision} /></Card>
            </div>)}
          </div>
        </div>
        <div style={{ textAlign: "center", margin: "12px 0 20px" }}>
          <Button type="text" icon={expanded ? <UpOutlined aria-hidden /> : <DownOutlined aria-hidden />} aria-expanded={expanded} aria-controls="additional-stock-statistics" onClick={() => setExpanded(value => !value)}>
            {expanded ? "Show fewer statistics" : "Show more statistics"}
          </Button>
        </div>
      </Col>
      {data && !loading ? (
        <>
          {pieGraphPlatData.length ? (
            <Col span={24} className="pie-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart width={450} height={450}>
                  <text
                    x="50%"
                    y={25}
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
                    x="50%"
                    y={10}
                    fill="black"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    <tspan fontWeight="600" fontSize="18">
                      Transaction History
                    </tspan>
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
                  {barGraphBuyData.some(
                    (x: GraphData) => x.value_1 !== undefined
                  ) && (
                    <Bar
                      dataKey="value_1"
                      fill="#FF6961"
                      name="Sell Price"
                      />
                  )}
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
                    x="50%"
                    y={30}
                    fill="black"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    <tspan fontWeight="600" fontSize="18">
                      Dividend History
                    </tspan>
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
            <TransactionDataGrid
              gridData={data?.transactions}
              defaultSort="transactionDate"
              ascending={false}
              removeColumns={["stock", "description"]}
              query={TRANSACTIONS_BY_STOCK}
            />
          </Col>
        </>
      ) : <LoadingProgress />}
    </Row>
  );
};

export default SelectedStockInfo;
