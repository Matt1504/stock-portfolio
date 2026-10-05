import { Link } from "react-router-dom";
import { useApolloClient } from "@apollo/client";
import { coldRefetch } from "../../utils/coldRefetch";
import { useProfileQuery as useQuery } from "../../profiles/hooks";
import { startCalculationTiming, useRenderTiming } from "../../utils/performanceDiagnostics";
import { Alert, Col, Row, Tag, Tabs } from "antd";
import { useContext, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";


import { Stack, Typography } from "@mui/material";

import { CustomTooltip } from "../../components/BarChartTooltip";
import ChartTimeRange, { ChartRange, availableBarRanges, barHistoryInRange } from "../../components/ChartTimeRange";
import LoadingProgress from "../../components/LoadingProgress";
import ReloadButton from "../../components/ReloadButton";
import { stockStatisticDescriptions } from "../../components/StatisticTitle";
import FlippableStatistics, { stockCardPairs } from "../../components/FlippableStatistics";
import { ProfileContext } from "../../profiles/ProfileContext";
import ExpandableStatistics from "../../components/ExpandableStatistics";
import BookCostDistribution from "../../components/BookCostDistribution";
import { TransactionDataGrid } from "../../components/TransactionDataGrid";
import { GraphData } from "../../models/GraphData";
import { Transaction } from "../../models/Transaction";
import {
  formatNumber,
  compareDates
} from "../../utils/utils";
import { TRANSACTIONS_BY_STOCK } from "./gql";
import { isFundAsset, stockStatistics } from "./statistics";

type SSProps = {
  stock: string | undefined;
  name: string | undefined;
  currency: string | undefined;
  assetType?: string;
};

const SelectedStockInfo = (props: SSProps) => {
  const { stock, name, currency, assetType = "Stock" } = props;
  const [bulkEditing, setBulkEditing] = useState(false);
  const isGic = assetType === "GIC";
  const isFund = isFundAsset(assetType);
  const assetColour = assetType === "GIC" ? "green" : ["Index Fund", "Mutual Fund"].includes(assetType) ? "yellow" : "red";
  const [hasHoldingIssues, setHasHoldingIssues] = useState(false);
  const profile = useContext(ProfileContext)?.profile;
  const [holdingDetails, setHoldingDetails] = useState(() => stockStatistics([], assetType).details);
  const [barGraphBuyData, setBarGraphBuyData] = useState<GraphData[]>([]);
  const [barGraphDivData, setBarGraphDivData] = useState<GraphData[]>([]);
  const [pieGraphPlatData, setPieGraphPlatData] = useState<GraphData[]>([]);
  const [transactionRange, setTransactionRange] = useState<ChartRange>("all");
  const [incomeRange, setIncomeRange] = useState<ChartRange>("all");
  const transactionRanges = availableBarRanges(barGraphBuyData);
  const incomeRanges = availableBarRanges(barGraphDivData);
  const visibleTransactions = barHistoryInRange(barGraphBuyData, transactionRanges.includes(transactionRange) ? transactionRange : "all");
  const visibleIncome = barHistoryInRange(barGraphDivData, incomeRanges.includes(incomeRange) ? incomeRange : "all");
  useEffect(() => { setTransactionRange("all"); setIncomeRange("all"); }, [stock]);
  const client = useApolloClient();
  const { loading, data: currentData, previousData } = useQuery(TRANSACTIONS_BY_STOCK, {
    variables: { stock },
    notifyOnNetworkStatusChange: true
  });

  const data = currentData ?? previousData;
  const [amountCurrency, setAmountCurrency] = useState<string>();
  const amountCurrencies = Array.from(new Set<string>((data?.transactions ?? []).map((transaction: Transaction) => transaction.totalCurrency?.code ?? transaction.platform.currency?.code).filter(Boolean))).sort();
  const selectedAmountCurrency = amountCurrency && amountCurrencies.includes(amountCurrency) ? amountCurrency : amountCurrencies[0];
  const currencyTransactions = useMemo(() => data?.transactions?.filter((transaction: Transaction) => (transaction.totalCurrency?.code ?? transaction.platform.currency?.code) === selectedAmountCurrency), [data?.transactions, selectedAmountCurrency]);
  useRenderTiming("stock details");

  useEffect(() => {
    if (currencyTransactions) {
      const finishTiming = startCalculationTiming("stock history and statistics", currencyTransactions.length);
      var buyGraphData = new Map<string, GraphData>();
      var divGraphData = new Map<string, GraphData>();
      const sellShares = new Map<string, number>();
      var transactions = [...currencyTransactions];
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
            case "GIC Maturity":
              divGraphData.set(transDate, new GraphData(transDate, (divData?.value ?? 0) + (transaction.interestEarned ?? 0), divData?.value_1, undefined));
              buyGraphData.set(transDate, new GraphData(transDate, buyData?.value ?? 0, (buyData?.value_1 ?? 0) + (transaction.principalReturned ?? 0), undefined));
              break;
            case "Sell":
              sellShares.set(transDate, (sellShares.get(transDate) ?? 0) + (transaction.shares ?? 0));
              if (buyData) {
                buyData.value_1 = (buyData.value_1 ?? 0) + (transaction.total ?? 0);
              } else {
                buyData = new GraphData(
                  transDate,
                  0,
                  (transaction.total ?? 0),
                  undefined
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
              if (!transaction.stock) break;
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
          label: isFund || isGic || x.label === undefined ? undefined : `${formatNumber(Number(x.label))} Share(s)`,
          sellLabel: isFund || isGic || !sellShares.has(x.name) ? undefined : `${formatNumber(sellShares.get(x.name)!)} Share(s)`,
        }))
      );
      const summary = stockStatistics(currencyTransactions, assetType, stock);
      setHoldingDetails(summary.details);
      setHasHoldingIssues(summary.portfolio.issues.length > 0 || summary.portfolio.realizedGain === undefined);
      setPieGraphPlatData(summary.portfolio.positions.filter(position => position.bookCost > 0).map(position =>
        new GraphData(`${position.platform} (${position.accountCode ?? ""})`, position.bookCost, undefined, isGic ? undefined : position.shares.toString())
      ));
      finishTiming();
    }
  }, [currencyTransactions, assetType, isFund, isGic, stock]);

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
          <Typography variant="h6" sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <span>{name}</span>
            <Tag color={assetColour} style={{ margin: 0 }}>{assetType}</Tag>
            {currency === "CAD" || currency === "USD" ? (
              <span role="img" aria-label={currency === "CAD" ? "Canadian dollar (CAD)" : "US dollar (USD)"} title={currency === "CAD" ? "Canadian dollar (CAD)" : "US dollar (USD)"}>
                {currency === "CAD" ? "🇨🇦" : "🇺🇸"}
              </span>
            ) : <span>{currency}</span>}
          </Typography>
          <ReloadButton onReload={() => coldRefetch(client, [TRANSACTIONS_BY_STOCK])} loading={loading} disabled={bulkEditing} />
        </Stack>
      </Col>
      {amountCurrencies.length > 0 && <Col span={24}>
        <Typography variant="caption" component="p" sx={{ mb: 2, color: "text.secondary", fontStyle: "italic" }}>Recorded amounts in {selectedAmountCurrency}. Stock price currency: {currency}.</Typography>
        {amountCurrencies.length > 1 && <Tabs size="large" type="card" activeKey={selectedAmountCurrency} onChange={setAmountCurrency} items={amountCurrencies.map(code => ({ key: code, label: code }))} />}
      </Col>}
      {(currencyTransactions ?? []).some((transaction: Transaction) => transaction.activity.name === "Stock Spinoff") && <Col span={24}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Corporate actions</Typography>
        <div style={{ display: "grid", gap: 12 }}>{(currencyTransactions ?? []).filter((transaction: Transaction) => transaction.activity.name === "Stock Spinoff").map((transaction: Transaction) => {
          const received = transaction.stock?.id === stock;
          const related = received ? transaction.spinoffSource : transaction.stock;
          const params = new URLSearchParams({ stock: related?.id ?? "" });
          if (profile?.id) params.set("profile", profile.id);
          return <Alert key={transaction.id} type="info" showIcon message={<>
            {received ? "Spun off from " : "Spinoff: "}<Link to={`/mystocks?${params}`}>{related?.name} ({related?.ticker})</Link> · {String(transaction.transactionDate).slice(0, 10)}
          </>} description={`${formatNumber(transaction.shares ?? 0)} ${transaction.stock?.ticker} share(s) received. ${selectedAmountCurrency} $${formatNumber(transaction.allocatedBookCost ?? 0, 2, 2)} of book cost ${received ? "allocated from the original holding" : "moved to the new holding; original share count unchanged"}. ${transaction.account.code} · ${transaction.platform.name}`} />;
        })}</div>
      </Col>}
      {hasHoldingIssues && !loading && <Col span={24}><Alert type="warning" showIcon message="Some sales exceed recorded holdings. Review the transaction history; realized gain/loss is unavailable until missing entries are corrected." style={{ marginBottom: 16 }} /></Col>}
      <Col span={24}>
        {!isFund && !isGic ? <FlippableStatistics key={`${profile?.id ?? ""}:${stock}:${selectedAmountCurrency}`} pairs={stockCardPairs} details={holdingDetails} descriptions={stockStatisticDescriptions} loading={loading} /> : <ExpandableStatistics columns={assetType === "Index Fund" ? 4 : isFund || isGic ? 3 : 4} collapsible={assetType !== "Index Fund"} details={holdingDetails} descriptions={isGic ? {
          ...stockStatisticDescriptions,
          "Book Cost": "Principal invested in GIC purchases minus principal returned by linked GIC Maturity transactions. Interest is excluded. Matured purchases have no outstanding book cost.",
          "Interest Earned": "Actual GIC maturity interest (gross payout minus original principal), less stock-linked withholding tax. Principal returned is excluded.",
          "Realized Profit/Loss": "Actual GIC maturity interest less stock-linked withholding tax and recorded GIC fees. Returning your principal is not profit.",
          "Principal Returned": "Original principal returned by GIC Maturity transactions. This is neither income nor an account contribution.",
        } : isFund ? {
          ...stockStatisticDescriptions,
          "Book Cost": "For amount-only funds, the sum of recorded Buy totals. For funds tracked with shares, the remaining average-cost purchase basis after sales. Uses the selected recorded currency; this is not current market value.",
          "Realized Gain/Loss": "For share-based fund trades, recorded sale totals minus the average cost of shares sold in the displayed currency. Unavailable for amount-only funds until disposal cost tracking is defined.",
          "Realized Profit/Loss": "Unavailable for amount-only funds until a method for tracking the cost of sold investments is defined. These funds are tracked without shares or dividends.",
        } : stockStatisticDescriptions} loading={loading} id="additional-stock-statistics" />}
      </Col>
      {data && !loading ? (
        <>
          <Col span={24}><BookCostDistribution data={pieGraphPlatData} /></Col>
          {barGraphBuyData.length ? (
            <Col span={24} className="chart-container" style={{ height: "auto" }}>
              {transactionRanges.length > 1 && <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}><ChartTimeRange value={transactionRanges.includes(transactionRange) ? transactionRange : "all"} onChange={setTransactionRange} ranges={transactionRanges} label="Transaction history time range" /></div>}
              <div style={{ height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  width={800}
                  height={400}
                  data={visibleTransactions}
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
                  <YAxis tickFormatter={value => formatNumber(Number(value), 2)} />
                  <Tooltip content={<CustomTooltip hideZeroValues />} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#000" />
                  <Bar dataKey="value" fill="#FF6961" name="Buy Total">
                    {!isFund && !isGic && <LabelList dataKey="label" position="top" />}
                  </Bar>
                  {visibleTransactions.some(
                    (x: GraphData) => x.value_1 !== undefined
                  ) && (
                    <Bar
                      dataKey="value_1"
                      fill="#ACE1AF"
                      name={isGic ? "Principal Returned" : "Sale Proceeds"}
                    >
                      {!isFund && !isGic && <LabelList dataKey="sellLabel" position="top" />}
                    </Bar>
                  )}
                </BarChart>
              </ResponsiveContainer>
              </div>
            </Col>
          ) : (
            <></>
          )}
          {!isFund && barGraphDivData.length ? (
            <Col span={24} className="chart-container" style={{ height: "auto" }}>
              {incomeRanges.length > 1 && <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}><ChartTimeRange value={incomeRanges.includes(incomeRange) ? incomeRange : "all"} onChange={setIncomeRange} ranges={incomeRanges} label="Income history time range" /></div>}
              <div style={{ height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  width={800}
                  height={400}
                  data={visibleIncome}
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
                      {isGic ? "Interest History" : "Dividend History"}
                    </tspan>
                  </text>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={value => formatNumber(Number(value), 2)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#000" />
                  <Bar dataKey="value" fill="#ACE1AF" name={isGic ? "Interest Earned" : "Dividends Earned"} />
                  {visibleIncome.some(
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
              </div>
            </Col>
          ) : (
            <></>
          )}

        </>
      ) : <LoadingProgress />}
          <Col span={24}>
            <TransactionDataGrid
              onBulkEditChange={setBulkEditing}
              key={`${stock}:${selectedAmountCurrency ?? ""}`}
              loading={loading}
              gridData={!loading ? currencyTransactions ?? [] : []}
              defaultSort="transactionDate"
              ascending={false}
              removeColumns={["stock", "description"]}
              hiddenFilters={["stock"]}
              query={TRANSACTIONS_BY_STOCK}
            />
          </Col>
    </Row>
  );
};

export default SelectedStockInfo;
