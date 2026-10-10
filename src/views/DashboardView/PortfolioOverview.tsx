import MarketValuation from "../../components/MarketValuation";
import BookCostDistribution from "../../components/BookCostDistribution";
import { FinancialAnalytics, graphPoints, statisticDetails } from "../../components/FinancialAnalytics";
import { Alert, Tabs, Typography as AntTypography } from "antd";
import { Typography } from "@mui/material";
import { useContext, useState } from "react";
import FlippableStatistics from "../../components/FlippableStatistics";
import { homeStatisticDescriptions } from "../../components/StatisticTitle";
import { useProfileQuery } from "../../profiles/hooks";
import { ProfileContext } from "../../profiles/ProfileContext";
import { PORTFOLIO_OVERVIEW } from "./gql";

export default function PortfolioOverview() {
  const profile = useContext(ProfileContext)?.profile;
  const { data, loading, error } = useProfileQuery(PORTFOLIO_OVERVIEW, { notifyOnNetworkStatusChange: true });
  const [currency, setCurrency] = useState("CAD");
  const codes: string[] = data?.currencies.edges.map(({ node }: any) => node.code) ?? ["CAD", "USD"];
  const selectedCurrency = codes.includes(currency) ? currency : codes[0];
  const analytics: FinancialAnalytics | undefined = data?.analytics?.find((item: FinancialAnalytics) => item.currency === selectedCurrency);
  const distribution = graphPoints(analytics?.accountDistribution);
  const details = statisticDetails(analytics);

  return <section style={{ marginBottom: 32 }} aria-label="Portfolio overview">
    <Typography variant="h6">Portfolio Overview</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>All-time totals for this profile, shown in the selected currency.</Typography>
    <Tabs activeKey={selectedCurrency} onChange={setCurrency} items={codes.map(code => ({ key: code, label: code }))} />
    <MarketValuation key={`valuation:${profile?.id}:${selectedCurrency}`} currency={selectedCurrency} portfolio />
    <AntTypography.Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>Portfolio Analytics</AntTypography.Title>
    {error ? <Alert type="error" showIcon message="Unable to load portfolio statistics. Try refreshing." /> : <FlippableStatistics key={`${profile?.id ?? "home"}:${selectedCurrency}`} details={details} descriptions={homeStatisticDescriptions} loading={loading} />}
    {!loading && !error && <div style={{ marginTop: 24 }}><BookCostDistribution key={selectedCurrency} data={distribution} /></div>}
  </section>;
}
