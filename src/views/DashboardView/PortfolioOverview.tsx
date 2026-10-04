import { Alert, Tabs } from "antd";
import { Typography } from "@mui/material";
import { useContext, useState } from "react";
import FlippableStatistics from "../../components/FlippableStatistics";
import { homeStatisticDescriptions } from "../../components/StatisticTitle";
import { HoldingDetail } from "../../models/Common";
import { Transaction } from "../../models/Transaction";
import { useProfileQuery } from "../../profiles/hooks";
import { shareCountPrecision, formatNumber } from "../../utils/utils";
import { portfolioStatistics } from "../AccountView/portfolioStatistics";
import { ProfileContext } from "../../profiles/ProfileContext";
import { PORTFOLIO_OVERVIEW } from "./gql";

export default function PortfolioOverview() {
  const profile = useContext(ProfileContext)?.profile;
  const { data, loading, error } = useProfileQuery(PORTFOLIO_OVERVIEW, { notifyOnNetworkStatusChange: true });
  const [currency, setCurrency] = useState("CAD");
  const codes: string[] = data?.currencies.edges.map(({ node }: any) => node.code) ?? ["CAD", "USD"];
  const selectedCurrency = codes.includes(currency) ? currency : codes[0];
  const transactions: Transaction[] = (data?.history ?? []).filter((transaction: Transaction) => transaction.platform.currency?.code === selectedCurrency);
  const summary = portfolioStatistics(transactions);
  const detail = (title: string, value: number | string, money = true, precision = 2): HoldingDetail => ({ title, value, prefix: money && typeof value === "number" ? "$" : undefined, precision: typeof value === "number" ? precision : undefined, colour: "" });
  const largest = summary.largestHolding;
  const details = [
    detail("Total Book Cost", summary.holdings.totalBookCost),
    detail("Net Deposits", summary.netDeposits),
    detail("Realized Profit", summary.realizedProfit ?? "—"),
    detail("Realized Gain/Loss", summary.holdings.realizedGain ?? "—"),
    detail("Total Share(s) Owned", summary.holdings.totalShares, false, shareCountPrecision(summary.holdings.totalShares)),
    detail("Unique Share(s) Owned", summary.holdings.holdings.filter(holding => holding.shares > 0).length, false, 0),
    detail("Largest Holding", largest ? `${largest.stock.ticker} | $${formatNumber(largest.bookCost, 2, 2)}` : "—", false),
    detail("Smallest Holding", summary.smallestHolding ? `${summary.smallestHolding.stock.ticker} | $${formatNumber(summary.smallestHolding.bookCost, 2, 2)}` : "—", false),
    detail("Fees Paid", summary.feesPaid),
    detail("Dividends/Interest Earned", summary.income),
    detail("Amount Transferred In", summary.transfersIn),
    detail("Amount Transferred Out", summary.transfersOut),
    detail("Amount Contributed", summary.contributions),
    detail("Amount Withdrawn", summary.withdrawals),
  ];
  return <section style={{ marginBottom: 32 }} aria-label="Portfolio overview">
    <Typography variant="h6">Portfolio Overview</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>All-time totals for this profile, shown in the selected currency.</Typography>
    <Tabs activeKey={selectedCurrency} onChange={setCurrency} items={codes.map(code => ({ key: code, label: code }))} />
    {error ? <Alert type="error" showIcon message="Unable to load portfolio statistics. Try refreshing." /> : <FlippableStatistics key={`${profile?.id ?? "home"}:${selectedCurrency}`} details={details} descriptions={homeStatisticDescriptions} loading={loading} />}
  </section>;
}
