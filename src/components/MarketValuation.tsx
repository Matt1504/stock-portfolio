import { gql } from "@apollo/client";
import { Alert, Card, Statistic, Typography } from "antd";
import { useProfileQuery } from "../profiles/hooks";
import StatisticTitle from "./StatisticTitle";
import { FlipCard } from "./FlippableStatistics";
import { HoldingDetail } from "../models/Common";
import "./expandableStatistics.css";

export const MARKET_VALUATION = gql`
  query MarketValuation($profileId: ID!, $currency: String!, $platform: ID, $stock: ID, $account: ID) {
    marketValuation(profileId: $profileId, currency: $currency, platform: $platform, stock: $stock, account: $account) {
      currency complete marketValue pricedMarketValue bookCost unrealizedGain unrealizedReturn
      annualizedReturn annualizedStartDate annualizedReturnNote
      cashBalance totalValue quoteTime lastUpdated refreshOverdue missingTickers warnings currentPrice priceCurrency
    }
  }
`;

type Valuation = {
  currency: string; complete: boolean; marketValue: string | null; pricedMarketValue: string;
  unrealizedGain: string | null; unrealizedReturn: string | null; totalValue: string | null;
  currentPrice: string | null; priceCurrency: string | null; quoteTime: string | null;
  lastUpdated: string | null; missingTickers: string[]; warnings: string[];
  annualizedReturn?: string | null; annualizedStartDate?: string | null; annualizedReturnNote?: string | null;
};

export function ValuationDisplay({ value, loading, error, stock = false, portfolio = false, currency }: {
  value?: Valuation; loading: boolean; error?: boolean; stock?: boolean; portfolio?: boolean; currency?: string;
}) {
  const cards = [
    stock ? { title: "Current Price", value: value?.currentPrice, currency: value?.priceCurrency,
      description: "Latest cached regular-session market price per share, in the stock's price currency. Refreshed hourly; this is not a guaranteed live price." }
      : { title: portfolio ? "Portfolio Value" : "Account Value", value: value?.totalValue, currency,
        description: "Current market value of all holdings plus recorded cash balance in the selected currency. Unavailable if any holding is unpriced or its ledger needs review." },
    { title: "Market Value", value: value?.marketValue, currency,
      description: "Shares currently held multiplied by cached market prices. Foreign-currency quotes are converted using the cached current FX rate. Excludes cash; a dash means the valuation is incomplete." },
    { title: "Unrealized Gain/Loss", value: value?.unrealizedGain, currency,
      description: "Current holdings' market value minus remaining recorded book cost. Includes fees already recorded in book cost; excludes estimated selling fees, realized gains and dividends." },
    { title: "Unrealized Return", value: value?.unrealizedReturn, percent: true,
      description: "Unrealized Gain/Loss divided by remaining book cost, multiplied by 100. Unavailable for zero book cost or an incomplete valuation." },
  ];
  return <section aria-label="Market valuation" style={{ marginBottom: 24 }}>
    <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>Market Valuation</Typography.Title>
    {error ? <Alert showIcon type="error" message="Unable to load market valuation. Try refreshing." /> : <>
      <div className="portfolio-statistics-grid">
        {cards.map(card => {
          const numeric = card.value == null ? null : Number(card.value);
          const gain = card.title === "Unrealized Gain/Loss" || card.percent;
          if (card.percent) {
            const percentDetail = (title: string, amount: string | null | undefined): HoldingDetail => {
              const number = amount == null ? null : Number(amount);
              return { title, value: number ?? "—", prefix: undefined, suffix: number == null ? undefined : "%",
                precision: number == null ? undefined : 2, colour: "",
                valueColor: number != null && number !== 0 ? number > 0 ? "#22c55e" : "#ef4444" : undefined };
            };
            const annualizedDescription = stock
              ? "Money-weighted yearly return (XIRR) in the selected currency using dated purchases, sales, stock-linked income and withholding tax, boundary transfers at market value, and current holdings value. Trading fees already in totals are included; account-only fees are excluded."
              : "Money-weighted yearly return (XIRR) in the selected currency using dated contributions, withdrawals, boundary transfers at market value, and current holdings plus cash. Includes realized and unrealized gains, retained income and fees; matched internal transfers cancel out.";
            return <FlipCard key={card.title} front={percentDetail(card.title, value?.unrealizedReturn)}
              back={percentDetail("Annualized Return", value?.annualizedReturn)} loading={loading}
              descriptions={{ [card.title]: card.description, "Annualized Return": `${annualizedDescription} This is a compounded annual rate, not return divided by years.${value?.annualizedStartDate ? ` First recorded investment: ${value.annualizedStartDate}.` : ""}${value?.annualizedReturnNote ? ` ${value.annualizedReturnNote}` : ""} A dash means there is insufficient valuation or cash-flow data, or no stable solution.` }} />;
          }
          return <Card key={card.title}>
            <Statistic loading={loading} title={<StatisticTitle title={card.title} description={card.description} />}
              value={numeric ?? "—"} precision={numeric === null ? undefined : 2}
              prefix={numeric !== null && !card.percent
                ? card.currency && card.currency !== currency ? `${card.currency} $` : "$"
                : undefined}
              suffix={numeric !== null && card.percent ? "%" : undefined}
              valueStyle={gain && numeric !== null && numeric !== 0 ? { color: numeric > 0 ? "#22c55e" : "#ef4444" } : undefined} />
          </Card>;
        })}
      </div>
      {!loading && value && !value.complete && <Alert style={{ marginTop: 16 }} showIcon type="warning"
        message="Valuation incomplete"
        description={<>{value.missingTickers.length > 0 && <div>Price or FX unavailable: {value.missingTickers.join(", ")}. GICs and amount-only funds currently have no market-price valuation.</div>}{value.warnings.map(warning => <div key={warning}>{warning}</div>)}</>} />}
      {!loading && value?.quoteTime && <Typography.Text type="secondary" style={{ display: "block", marginTop: 12, fontSize: 12 }}
        title="Earliest quote or FX observation used. Closing prices are retained while markets are closed. Page refresh reads the latest cached prices; the worker fetches new prices hourly.">
        Prices as of {new Date(value.quoteTime).toLocaleString()} · Updated hourly
        {value.lastUpdated && ` · Last fetched ${new Date(value.lastUpdated).toLocaleString()}`}
      </Typography.Text>}
    </>}
  </section>;
}

export default function MarketValuation({ currency, platform, stock, account, portfolio = false }: {
  currency?: string; platform?: string; stock?: string; account?: string; portfolio?: boolean;
}) {
  const { data, loading, error } = useProfileQuery<{ marketValuation: Valuation }>(MARKET_VALUATION, {
    variables: { currency, platform, stock, account }, skip: !currency,
    notifyOnNetworkStatusChange: true, fetchPolicy: "cache-and-network", pollInterval: 3600000,
  });
  // Hide cached previous selections during variable changes/refetches.
  return <ValuationDisplay currency={currency} value={loading ? undefined : data?.marketValuation}
    stock={!!stock} portfolio={portfolio} loading={loading || !currency} error={!!error} />;
}
