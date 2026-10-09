import MarketValuation, { MARKET_VALUATION } from "../../components/MarketValuation";
import LastUpdated from "../../components/LastUpdated";
import FlippableStatistics, { accountCardPairs } from "../../components/FlippableStatistics";
import { calculateCashBalance } from "./cashBalance";
import { portfolioStatistics } from "./portfolioStatistics";
import { startCalculationTiming, useRenderTiming } from "../../utils/performanceDiagnostics";
import ChartTimeRange, { ChartRange, chartHistoryInRange } from "../../components/ChartTimeRange";
import { useApolloClient } from "@apollo/client";
import { coldRefetch } from "../../utils/coldRefetch";
import { useProfileQuery as useQuery } from "../../profiles/hooks";
import { Alert, Col, Row, Tabs, Typography as AntTypography } from "antd";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
import BookCostDistribution from "../../components/BookCostDistribution";
import { TransactionDataGrid } from "../../components/TransactionDataGrid";
import { HoldingDetail } from "../../models/Common";
import { Currency } from "../../models/Currency";
import { GraphData } from "../../models/GraphData";
import { GraphQLNode } from "../../models/GraphQLNode";
import { Platform } from "../../models/Platform";
import { Transaction } from "../../models/Transaction";
import { shareCountPrecision, formatNumber } from "../../utils/utils";
import { TRANSACTIONS_BY_ACCOUNT, TRANSACTIONS_BY_PLATFORM } from "./gql";
import { compareLedgerTransactions, HoldingIssue } from "./holdings";

type SAProps = {
  name: string | undefined;
  platform: string | undefined;
  platformGroup?: Platform[];
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

defaultAccountDetails.push(...["Amount Withdrawn", "Net Deposits", "Realized Gain/Loss", "Realized Profit", "Fees Paid"].map(title => ({ title, value: 0, prefix: "$", colour: "", precision: 2 })));

defaultAccountDetails.push({ title: "Smallest Holding", value: "—", prefix: undefined, colour: "", precision: undefined });

defaultAccountDetails.push({ title: "Cash Balance", value: 0, prefix: "$", colour: "", precision: 2 });

const SelectedAccountInfo = (props: SAProps) => {
  const { name, platform, platformGroup = [], account, accountName, currencies, currency, availableCurrencyIds, onCurrencyChange } = props;
  const query = platform ? TRANSACTIONS_BY_PLATFORM : TRANSACTIONS_BY_ACCOUNT;
  const [bulkEditing, setBulkEditing] = useState(false);
  const [chartRange, setChartRange] = useState<ChartRange>("all");

  const client = useApolloClient();
  // Keep both currency queries mounted with stable variables. A tab change only
  // selects a result; it cannot cancel the other currency's in-flight request.
  const firstPlatform = platformGroup[0]?.id ?? platform;
  const secondPlatform = platformGroup[1]?.id;
  const first = useQuery(query, {
    variables: platform ? { platform_one: firstPlatform } : { account },
    notifyOnNetworkStatusChange: true,
  });
  const second = useQuery(TRANSACTIONS_BY_PLATFORM, {
    variables: { platform_one: secondPlatform },
    skip: !platform || !secondPlatform,
    notifyOnNetworkStatusChange: true,
  });
  const { loading, data } = platform && platform === secondPlatform ? second : first;

  const filteredTransactions = useMemo(() => data?.transactions.filter(
    (transaction: Transaction) => transaction.platform.currency?.id === currency.id
  ), [data, currency.id]);
  useRenderTiming("account details");

  // Derive display values in the same render as the selected query result.
  // Effect-backed state could show the previous selection for one frame,
  // particularly when switching to a result already in Apollo's cache.
  const { accountDetails, pieGraphHoldingData, graphBookCostData, holdingIssues } = useMemo(() => {
    if (!filteredTransactions) {
      return { accountDetails: defaultAccountDetails.map(detail => ({ ...detail })), pieGraphHoldingData: [] as GraphData[], graphBookCostData: [] as GraphData[], holdingIssues: [] as HoldingIssue[] };
    }
    const finishTiming = startCalculationTiming("account history and statistics", filteredTransactions.length);

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
      .sort(compareLedgerTransactions)
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
          case "GIC Maturity":
            if (transaction.activity.name === "GIC Maturity") dividends += transaction.interestEarned ?? 0;
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

    const maxHolding = summary.largestHolding;

    const pieGraphHoldingData = (
      portfolio.holdings.filter((holding) => holding.bookCost > 0).map((holding) => {
        return new GraphData(
          `${holding.stock.ticker}`,
          holding.bookCost,
          undefined,
          holding.shares > 0 ? holding.shares.toString() : undefined
        );
      })
    );

    const graphBookCostData = Array.from(bookCostHistory.values());
    const holdingIssues = portfolio.issues;

    const accountDetails = (() => {
      const finishCardsTiming = startCalculationTiming("account card values", filteredTransactions.length);
      let update = defaultAccountDetails.map((detail) => ({ ...detail }));
      update[0].value = portfolio.totalShares;
      update[0].precision = shareCountPrecision(portfolio.totalShares);
      update[1].value = portfolio.holdings.filter(holding => holding.shares > 0).length;
      update[2].value = maxHolding
        ? `${maxHolding.stock.ticker} | $${formatNumber(maxHolding.bookCost, 2, 2)}`
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
      update[12].value = summary.feesPaid;
      update[13].value = summary.smallestHolding ? `${summary.smallestHolding.stock.ticker} | $${formatNumber(summary.smallestHolding.bookCost, 2, 2)}` : "—";
      update[14].value = calculateCashBalance(filteredTransactions);
      finishCardsTiming();
      return update;
    })();
    finishTiming();
    return { accountDetails, pieGraphHoldingData, graphBookCostData, holdingIssues };
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
          <LastUpdated queries={[query]} />
      <ReloadButton onReload={() => coldRefetch(client, [query, MARKET_VALUATION])} loading={loading} disabled={bulkEditing} />
        </Stack>
      </Col>
      <Col span={24}>
        {props.platformGroup?.find(item => item.id === props.platform)?.closedAt && <Alert type="info" showIcon style={{ marginBottom: 16 }} message={`Platform closed on ${props.platformGroup.find(item => item.id === props.platform)?.closedAt}. Historical transactions remain available.`} />}
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
        <MarketValuation key={`${account}:${platform}:${currency.code}`} currency={currency.code} platform={platform} account={platform ? undefined : account} />
        <AntTypography.Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>Portfolio Analytics</AntTypography.Title>
        <FlippableStatistics key={`${account}:${platform ?? ""}:${currency.id}`} pairs={accountCardPairs} loading={loading} descriptions={accountStatisticDescriptions} details={accountDetails} />
      </Col>
      {data && !loading ? (
        <>
          <Col span={24}>
            <BookCostDistribution data={pieGraphHoldingData} />
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
                <YAxis tickFormatter={value => formatNumber(Number(value), 2)} />
                <Legend verticalAlign="bottom" height={36} />
                <Tooltip
                  formatter={(value: any) => `$${formatNumber(Number(value), 2, 2)}`}
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

        </>
      ) : (
        <LoadingProgress />
      )}
          <Col span={24}>
            <TransactionDataGrid
              onBulkEditChange={setBulkEditing}
              key={`${account}:${platform ?? ""}:${currency.id}`}
              loading={loading}
              gridData={!loading ? filteredTransactions ?? [] : []}
              defaultSort="transactionDate"
              ascending={false}
              removeColumns={
                name === "Overview" ? ["account"] : ["account", "platform"]
              }
              hiddenFilters={["account"]}
              query={query}
            />
          </Col>
    </Row>
  );
};

export default SelectedAccountInfo;
