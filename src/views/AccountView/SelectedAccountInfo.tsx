import ExpandableStatistics from "../../components/ExpandableStatistics";
import { portfolioStatistics } from "./portfolioStatistics";
import ChartTimeRange, { ChartRange, chartHistoryInRange } from "../../components/ChartTimeRange";
import { useApolloClient } from "@apollo/client";
import { coldRefetch } from "../../utils/coldRefetch";
import { useProfileQuery as useQuery } from "../../profiles/hooks";
import { Alert, Col, Row, Tabs } from "antd";
import { useEffect, useMemo, useState } from "react";
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


import { Typography } from "@mui/material";
import { Stack } from "@mui/system";

import LoadingProgress from "../../components/LoadingProgress";
import ReloadButton from "../../components/ReloadButton";
import { accountStatisticDescriptions } from "../../components/StatisticTitle";
import { RenderActiveShape } from "../../components/PieChartShape";
import { TransactionDataGrid } from "../../components/TransactionDataGrid";
import { HoldingDetail } from "../../models/Common";
import { Currency } from "../../models/Currency";
import { GraphData } from "../../models/GraphData";
import { GraphQLNode } from "../../models/GraphQLNode";
import { Transaction } from "../../models/Transaction";
import { compareDates, getColourCodeByAccount, shareCountPrecision } from "../../utils/utils";
import { TRANSACTIONS_BY_ACCOUNT, TRANSACTIONS_BY_PLATFORM } from "./gql";
import { HoldingIssue } from "./holdings";

type SAProps = {
  name: string | undefined;
  platform: string | undefined;
  account: string | undefined;
  accountName: string | undefined;
  currencies: GraphQLNode<Currency>[];
  currency: Currency;
  availableCurrencyIds: string[];
  onCurrencyChange: (id: string) => void;
};

const defaultAccountDetails: HoldingDetail[] = [
  {
    title: "Total Share(s) Owned",
    value: 0,
    prefix: undefined,
    colour: "",
    precision: 0,
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
    title: "Dividends/Interest Earned",
    value: 0,
    prefix: "$",
    colour: "",
    precision: 2,
  },
];

defaultAccountDetails.push(...["Amount Withdrawn", "Net Deposits", "Realized Gain/Loss", "Realized Profit"].map(title => ({ title, value: 0, prefix: "$", colour: "", precision: 2 })));
const accountCardOrder = [
  "Total Book Cost", "Net Deposits", "Realized Profit", "Realized Gain/Loss",
  "Total Share(s) Owned", "Unique Share(s) Owned", "Largest Holding", "Dividends/Interest Earned",
  "Amount Transferred In", "Amount Transferred Out", "Amount Contributed", "Amount Withdrawn",
];

const SelectedAccountInfo = (props: SAProps) => {
  const { name, platform, account, accountName, currencies, currency, availableCurrencyIds, onCurrencyChange } = props;
  const query = platform ? TRANSACTIONS_BY_PLATFORM : TRANSACTIONS_BY_ACCOUNT;
  const [accountDetails, setAccountDetails] = useState(() => defaultAccountDetails.map((detail) => ({ ...detail })));
  const [pieGraphHoldingData, setPieGraphHoldingData] = useState<GraphData[]>(
    []
  );
  const [chartRange, setChartRange] = useState<ChartRange>("all");
  const [graphBookCostData, setGraphBookCostData] = useState<GraphData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [holdingIssues, setHoldingIssues] = useState<HoldingIssue[]>([]);

  const client = useApolloClient();
  const {loading, data} = useQuery(query, {
    variables: platform ? { platform_one: platform } : { account },
    notifyOnNetworkStatusChange: true,
  });

  const filteredTransactions = useMemo(() => data?.transactions.filter(
    (transaction: Transaction) => transaction.platform.currency?.id === currency.id
  ), [data, currency.id]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  useEffect(() => {
    if (!filteredTransactions) {
      return;
    }

    var contributions = 0;
    var transferIn = 0;
    var transferOut = 0;
    var bookCost = 0;
    var dividends = 0;
    var netDeposit = 0;

    const summary = portfolioStatistics(filteredTransactions);
    const portfolio = summary.holdings;
    var bookCostHistory = new Map<string, GraphData>();

    var transactions = [...filteredTransactions];

    transactions
      .sort((a: Transaction, b: Transaction) =>
        compareDates(a.transactionDate, b.transactionDate)
      )
      .forEach((transaction: Transaction) => {
        var transDate = transaction.transactionDate.toString();
        bookCost = portfolio.bookCostAfterTransaction.get(transaction.id ?? "") ?? bookCost;
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
          case "Withdrawal":
          case "Transfer Out":
            if (transaction.activity.name === "Transfer Out") transferOut += transaction.total ?? 0;
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
          case "Sell":
          case "Stock Split":
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
          case "Interest":
          case "Dividends":
            dividends += transaction.total ?? 0;
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
            if (transaction.stock) dividends -= transaction.total ?? 0;
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

    const maxHolding = portfolio.holdings.reduce<typeof portfolio.holdings[number] | undefined>(
      (largest, holding) => !largest || holding.bookCost > largest.bookCost ? holding : largest,
      undefined
    );

    setPieGraphHoldingData(
      portfolio.holdings.filter((holding) => holding.bookCost > 0).map((holding) => {
        return new GraphData(
          `${holding.stock.ticker}`,
          holding.bookCost,
          undefined,
          holding.shares.toString()
        );
      })
    );

    setGraphBookCostData(Array.from(bookCostHistory.values()));
    setHoldingIssues(portfolio.issues);
    setActiveIndex(0);

    setAccountDetails((prev: HoldingDetail[]) => {
      let update = prev.map((detail) => ({ ...detail }));
      update[0].value = portfolio.totalShares;
      update[0].precision = shareCountPrecision(portfolio.totalShares);
      update[1].value = portfolio.holdings.length;
      update[2].value = maxHolding
        ? `${maxHolding.stock.ticker} | $${maxHolding.bookCost.toFixed(2)}`
        : "-";
      update[3].value = contributions;
      update[4].value = transferIn;
      update[5].value = transferOut;
      update[6].value = portfolio.totalBookCost;
      update[7].value = dividends;
      update[8].value = summary.withdrawals;
      update[9].value = summary.netDeposits;
      update[10].value = portfolio.realizedGain ?? "—";
      update[10].prefix = typeof portfolio.realizedGain === "number" ? "$" : undefined;
      update[11].value = summary.realizedProfit ?? "—";
      update[11].prefix = typeof summary.realizedProfit === "number" ? "$" : undefined;
      return update;
    });
  }, [filteredTransactions]);

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
            {accountName} {name}
          </Typography>
          <ReloadButton onReload={() => coldRefetch(client, [query])} loading={loading} />
        </Stack>
      </Col>
      <Col span={24}>
        <Tabs
          activeKey={currency.id}
          size="large"
          type="card"
          onChange={onCurrencyChange}
          items={currencies.filter(({ node }) => node.id).map(({ node }) => {
            return {
              label: node.code,
              key: node.id!,
              disabled: !availableCurrencyIds.includes(node.id!)
            };
          })}
        />
      </Col>
      {!loading && holdingIssues.length > 0 && <Col span={24}>
        <Alert
          type="warning"
          showIcon
          message="Some stock quantities need review"
          description={<>
            {holdingIssues.map((issue) => <div key={`${issue.stock.id}-${issue.platform}`}>
              {issue.stock.ticker} ({issue.platform}): the recorded share balance is −{issue.missingShares}.
            </div>)}
            Review the buy, sell, split, and transfer entries for these stocks. Negative positions are excluded from the current holdings totals and chart.
          </>}
          style={{ marginBottom: 16 }}
        />
      </Col>}
      <Col span={24}>
        <ExpandableStatistics id="additional-account-statistics" loading={loading} descriptions={accountStatisticDescriptions} details={[
          ...accountCardOrder.map(title => accountDetails.find(detail => detail.title === title)!),
        ]} />
      </Col>
      {data && !loading ? (
        <>
          <Col span={24}>
            {pieGraphHoldingData.length ? (
              <Col span={24} className="pie-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart width={450} height={450}>
                    <text
                      x="50%"
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
          <Col span={24} style={{ display: "flex", justifyContent: "flex-end" }}>
            <ChartTimeRange value={chartRange} onChange={setChartRange} label="Book cost and net deposit time range" />
          </Col>
          <Col span={24} className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                width={800}
                height={400}
                data={chartHistoryInRange(graphBookCostData, chartRange)}
                margin={{
                  top: 30,
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
              gridData={filteredTransactions}
              defaultSort="transactionDate"
              ascending={false}
              removeColumns={
                name === "Overview" ? ["account"] : ["account", "platform"]
              }
              hiddenFilters={["account"]}
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
