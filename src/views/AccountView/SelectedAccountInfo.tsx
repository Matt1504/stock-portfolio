import { Button, Card, Col, Row, Statistic, Tabs } from "antd";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { ReloadOutlined } from "@ant-design/icons";
import { useQuery } from "@apollo/client";
import { Typography } from "@mui/material";
import { Stack } from "@mui/system";

import LoadingProgress from "../../components/LoadingProgress";
import { RenderActiveShape } from "../../components/PieChartShape";
import { TransactionDataGrid } from "../../components/TransactionDataGrid";
import { HoldingDetail } from "../../models/Common";
import { Currency } from "../../models/Currency";
import { GraphData } from "../../models/GraphData";
import { GraphQLNode } from "../../models/GraphQLNode";
import { Stock } from "../../models/Stock";
import { Transaction } from "../../models/Transaction";
import { compareDates, getColourCodeByAccount } from "../../utils/utils";
import {
  TRANSACTIONS_BY_ACCOUNT,
  TRANSACTIONS_BY_PLATFORM,
  TRANSACTIONS_BY_PLATFORMS
} from "./gql";

type SAProps = {
  name: string | undefined;
  platform: string | undefined;
  account: string | undefined;
  accountName: string | undefined;
  currencies: GraphQLNode<Currency>[];
};

class StockHolding {
  total: number;
  shares: number;

  constructor(total: number, shares: number) {
    this.total = total;
    this.shares = shares;
  }
}

const defaultAccountDetails: HoldingDetail[] = [
  {
    title: "Total Share(s) Owned",
    value: 0,
    prefix: undefined,
    colour: "",
    precision: undefined,
  },
  {
    title: "Unique Share(s) Owned",
    value: 0,
    prefix: undefined,
    colour: "",
    precision: undefined,
  },
  {
    title: "Largest Holding",
    value: "",
    prefix: undefined,
    colour: "",
    precision: undefined,
  },
  {
    title: "Amount Contributed",
    value: 0,
    prefix: "$",
    colour: "",
    precision: 2,
  },
  {
    title: "Amount Transferred In",
    value: 0,
    prefix: "$",
    colour: "",
    precision: 2,
  },
  {
    title: "Amount Transferred Out",
    value: 0,
    prefix: "$",
    colour: "",
    precision: 2,
  },
  {
    title: "Total Book Cost",
    value: 0,
    prefix: "$",
    colour: "",
    precision: 2,
  },
  {
    title: "Total Dividends Earned",
    value: 0,
    prefix: "$",
    colour: "",
    precision: 2,
  },
];

const SelectedAccountInfo = (props: SAProps) => {
  const { name, platform, account, accountName, currencies } = props;

  var query = TRANSACTIONS_BY_ACCOUNT;

  var platform_one = "";
  var platform_two = "";

  if (platform && !platform?.includes("all")) {
    query = TRANSACTIONS_BY_PLATFORM;
    var platforms: string[] = platform.split(",");
    platform_one = platforms[0];
    if (platforms.length > 1) {
      platform_two = platforms[1];
      query = TRANSACTIONS_BY_PLATFORMS;
    }
  }

  const [accountDetails, setAccountDetails] = useState(defaultAccountDetails);
  const [selectedCurrrency, setSelectedCurrency] = useState("");
  const [pieGraphHoldingData, setPieGraphHoldingData] = useState<GraphData[]>(
    []
  );
  const [graphBookCostData, setGraphBookCostData] = useState<GraphData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const { loading, error, data, refetch } = useQuery(query, {
    variables: { account, platform_one, platform_two },
    notifyOnNetworkStatusChange: true,
  });

  const handleTabChange = (key: string) => {
    setSelectedCurrency(key);
    processTransactionData(key);
  };

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  useEffect(() => {
    if (currencies && data?.transactions) {
      setSelectedCurrency(currencies[0].node.id ?? "");
      processTransactionData(currencies[0].node.id ?? "");
    }
  }, [currencies, name, data]);

  const processTransactionData = (currency: string) => {
    if (!data?.transactions || !currency) {
      return;
    }

    var contributions = 0;
    var transferIn = 0;
    var transferOut = 0;
    var shares = 0;
    var bookCost = 0;
    var dividends = 0;
    var netDeposit = 0;

    var stockHoldings = new Map<Stock, StockHolding>();
    var bookCostHistory = new Map<string, GraphData>();

    var transactions = [...data?.transactions];
    if (data?.transactions_two) {
      transactions = transactions.concat(data.transactions_two);
    }

    if (!transactions.length) return;

    transactions
      .filter(
        (transaction: Transaction) =>
          transaction.platform?.currency?.id === currency
      )
      .sort((a: Transaction, b: Transaction) =>
        compareDates(a.transactionDate, b.transactionDate)
      )
      .forEach((transaction: Transaction) => {
        var transDate = transaction.transactionDate.toString();
        var holding = stockHoldings.get(transaction.stock as Stock);
        var transHistory = bookCostHistory.get(transDate);
        switch (transaction.activity.name) {
          case "Contribution":
            contributions += transaction.total ?? 0;
            netDeposit += transaction.total ?? 0;
            if (transHistory) {
              transHistory.value_1 = netDeposit;
            } else {
              transHistory = new GraphData(
                transDate,
                bookCost,
                netDeposit,
                undefined
              );
            }
            bookCostHistory.set(transDate, transHistory);
            break;
          case "Transfer In":
            transferIn += transaction.total ?? 0;
            netDeposit += transaction.total ?? 0;
            if (transHistory) {
              transHistory.value_1 = netDeposit;
            } else {
              transHistory = new GraphData(
                transDate,
                bookCost,
                netDeposit,
                undefined
              );
            }
            bookCostHistory.set(transDate, transHistory);
            break;
          case "Transfer Out":
            transferOut += transaction.total ?? 0;
            netDeposit -= transaction.total ?? 0;
            if (transHistory) {
              transHistory.value_1 = netDeposit;
            } else {
              transHistory = new GraphData(
                transDate,
                bookCost,
                netDeposit,
                undefined
              );
            }
            bookCostHistory.set(transDate, transHistory);
            break;
          case "Buy":
            shares += transaction.shares ?? 0;
            bookCost += transaction.total ?? 0;
            if (holding) {
              holding.shares += transaction.shares ?? 0;
              holding.total += transaction.total ?? 0;
            } else {
              holding = new StockHolding(
                transaction.total ?? 0,
                transaction.shares ?? 0
              );
            }
            stockHoldings.set(transaction.stock as Stock, holding);
            if (transHistory) {
              transHistory.value = bookCost;
            } else {
              transHistory = new GraphData(
                transDate,
                bookCost,
                netDeposit,
                undefined
              );
            }
            bookCostHistory.set(transDate, transHistory);
            break;
          case "Stock Split":
            shares += transaction.shares ?? 0;
            break;
          case "Sell":
            shares -= transaction.shares ?? 0;
            if (holding) {
              holding.shares -= transaction.shares ?? 0;
              holding.total -= transaction.total ?? 0;
            } else {
              holding = new StockHolding(
                (transaction.total ?? 0) * -1,
                (transaction.shares ?? 0) * -1
              );
            }
            stockHoldings.set(transaction.stock as Stock, holding);
            break;
          case "Dividends":
            dividends += transaction.total ?? 0;
            netDeposit += transaction.total ?? 0;
            if (transHistory) {
              transHistory.value_1 = netDeposit;
            } else {
              transHistory = new GraphData(
                transDate,
                bookCost,
                netDeposit,
                undefined
              );
            }
            bookCostHistory.set(transDate, transHistory);
            break;
          case "Withholding Tax":
            dividends -= transaction.total ?? 0;
            netDeposit -= transaction.total ?? 0;
            if (transHistory) {
              transHistory.value_1 = netDeposit;
            } else {
              transHistory = new GraphData(
                transDate,
                bookCost,
                netDeposit,
                undefined
              );
            }
            bookCostHistory.set(transDate, transHistory);
            break;
        }
      });

    var maxHolding: Stock;
    if (stockHoldings.size) {
      maxHolding = Array.from(stockHoldings.keys()).reduce(
        (prev: Stock, current: Stock) =>
          (stockHoldings.get(prev) as StockHolding).total >
          (stockHoldings.get(current) as StockHolding).total
            ? prev
            : current
      );
    }

    setPieGraphHoldingData(
      Array.from(stockHoldings.keys()).map((stock: Stock) => {
        var totals: StockHolding = stockHoldings.get(stock) as StockHolding;
        return new GraphData(
          `${stock.ticker}`,
          totals.total,
          undefined,
          totals.shares.toString()
        );
      })
    );

    setGraphBookCostData(Array.from(bookCostHistory.values()));

    setAccountDetails((prev: HoldingDetail[]) => {
      let update = [...prev];
      update[0].value = shares;
      update[1].value = stockHoldings.size;
      update[2].value = stockHoldings.size
        ? `${maxHolding.ticker} | $${(
            stockHoldings.get(maxHolding) as StockHolding
          ).total.toFixed(2)}`
        : "-";
      update[3].value = contributions;
      update[4].value = transferIn;
      update[5].value = transferOut;
      update[6].value = bookCost;
      update[7].value = dividends;
      return update;
    });
  };

  return (
    <Row>
      <Col span={24}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
          mb={1}
        >
          <Typography gutterBottom variant="h6">
            {accountName} {name}
          </Typography>
          <Button
            onClick={() => refetch()}
            type="primary"
            shape="round"
            icon={<ReloadOutlined />}
          />
        </Stack>
      </Col>
      <Col span={24}>
        <Tabs
          activeKey={selectedCurrrency}
          size="large"
          type="card"
          onChange={handleTabChange}
          items={currencies.map((currency: GraphQLNode<Currency>) => {
            return {
              label: currency.node.code,
              key: currency.node.id ?? "",
              disabled:
                loading ||
                data?.transactions
                  .concat(data?.transactions_two ?? [])
                  .filter(
                    (transaction: Transaction) =>
                      transaction.platform?.currency?.id === currency.node.id &&
                      (name === "Overview" ||
                        transaction.platform.name === name)
                  ).length === 0,
            };
          })}
        />
      </Col>
      {accountDetails.map((x: HoldingDetail, index: number) => (
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
      {data && !loading ? (
        <>
          <Col span={24}>
            {pieGraphHoldingData.length ? (
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
                        Stock Holdings Distribution
                      </tspan>
                    </text>
                    <Pie
                      activeIndex={activeIndex}
                      activeShape={RenderActiveShape}
                      data={pieGraphHoldingData}
                      cx="50%"
                      cy="50%"
                      innerRadius={100}
                      outerRadius={140}
                      fill="#8884d8"
                      dataKey="value"
                      name="Book Cost"
                      onMouseEnter={onPieEnter}
                    >
                      {pieGraphHoldingData.map(
                        (entry: GraphData, index: number) => {
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={getColourCodeByAccount(entry.name ?? "")}
                            />
                          );
                        }
                      )}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </Col>
            ) : (
              <></>
            )}
          </Col>
          <Col span={24} className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                width={800}
                height={400}
                data={graphBookCostData}
                margin={{
                  top: 30,
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
                  <tspan fontWeight="600" fontSize="18">
                    Book Cost and Net Deposit History
                  </tspan>
                </text>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Legend verticalAlign="bottom" height={36} />
                <Tooltip
                  formatter={(value: any, name: any) => `$${value.toFixed(2)}`}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Book Cost"
                  stroke="#8884d8"
                />
                <Line
                  type="monotone"
                  dataKey="value_1"
                  name="Net Deposit"
                  stroke="#82ca9d"
                />
              </LineChart>
            </ResponsiveContainer>
          </Col>
          <Col span={24}>
            <TransactionDataGrid
              gridData={data?.transactions
                .concat(data?.transactions_two ?? [])
                .filter(
                  (transaction: Transaction) =>
                    transaction.platform?.currency?.id === selectedCurrrency &&
                    (name === "Overview" || transaction.platform.name === name)
                )}
              defaultSort="transactionDate"
              ascending={false}
              removeColumns={
                name === "Overview" ? ["account"] : ["account", "platform"]
              }
              query={query}
            />
          </Col>
        </>
      ) : (
        <LoadingProgress />
      )}
    </Row>
  );
};

export default SelectedAccountInfo;
