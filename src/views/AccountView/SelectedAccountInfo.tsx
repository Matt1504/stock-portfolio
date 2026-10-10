import MarketValuation, { MARKET_VALUATION } from "../../components/MarketValuation";
import LastUpdated from "../../components/LastUpdated";
import FlippableStatistics, { accountCardPairs } from "../../components/FlippableStatistics";
import { FinancialAnalytics, graphPoints, statisticDetails } from "../../components/FinancialAnalytics";
import { useRenderTiming } from "../../utils/performanceDiagnostics";
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
import { Currency } from "../../models/Currency";
import { GraphQLNode } from "../../models/GraphQLNode";
import { Platform } from "../../models/Platform";
import { Transaction } from "../../models/Transaction";
import { formatNumber } from "../../utils/utils";
import { TRANSACTIONS_BY_ACCOUNT, TRANSACTIONS_BY_PLATFORM } from "./gql";

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
  const { loading, data, error } = platform && platform === secondPlatform ? second : first;

  const filteredTransactions = useMemo(() => data?.transactions.filter(
    (transaction: Transaction) => transaction.platform.currency?.id === currency.id
  ), [data, currency.id]);
  useRenderTiming("account details");

  const analytics: FinancialAnalytics | undefined = data?.analytics?.find((item: FinancialAnalytics) => item.currency === currency.code);
  const accountDetails = statisticDetails(analytics);
  const pieGraphHoldingData = graphPoints(analytics?.distribution);
  const graphBookCostData = graphPoints(analytics?.bookCostHistory);
  const holdingIssues = analytics?.issues ?? [];

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
            {holdingIssues.map((issue: string) => <div key={issue}>{issue}</div>)}
            Review the buy, sell, split, and transfer entries for these stocks. Negative positions are excluded from the current holdings totals and chart.
          </>}
          style={{ marginBottom: 16 }}
        />
      </Col>}
      <Col span={24}>
        <MarketValuation key={`${account}:${platform}:${currency.code}`} currency={currency.code} platform={platform} account={platform ? undefined : account} />
        <AntTypography.Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>Portfolio Analytics</AntTypography.Title>
        {error && <Alert type="error" showIcon message="Unable to load account statistics. Try refreshing." />}
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
