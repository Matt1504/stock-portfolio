import { gql } from "@apollo/client";
import { Alert, Card, Statistic, Typography } from "antd";
import { useProfileQuery } from "../profiles/hooks";
import StatisticTitle from "./StatisticTitle";
import { FlipCard } from "./FlippableStatistics";
import { HoldingDetail } from "../models/Common";
import "./expandableStatistics.css";

export const MARKET_VALUATION = gql`
  query MarketValuation($profileId: ID!, $currency: String!, $platform: ID, $stock: ID, $account: ID, $allowPartial: Boolean) {
    marketValuation(profileId: $profileId, currency: $currency, platform: $platform, stock: $stock, account: $account, allowPartial: $allowPartial) {
      currency complete partial omittedAssets { ticker reason } marketValue pricedMarketValue pricedBookCost bookCost unrealizedGain unrealizedReturn
      annualizedReturn annualizedStartDate annualizedReturnNote
      cashBalance totalValue quoteTime lastUpdated refreshOverdue missingTickers warnings currentPrice priceCurrency
    }
  }
`;

type Valuation = {
  currency: string; complete: boolean; partial?: boolean; omittedAssets?: { ticker: string; reason: string }[]; marketValue: string | null; pricedMarketValue: string;
  unrealizedGain: string | null; unrealizedReturn: string | null; totalValue: string | null;
  currentPrice: string | null; priceCurrency: string | null; quoteTime: string | null;
  lastUpdated: string | null; missingTickers: string[]; warnings: string[];
  annualizedReturn?: string | null; annualizedStartDate?: string | null; annualizedReturnNote?: string | null;
};

const UNREALIZED_RETURN_DESCRIPTION = "Unrealized Gain/Loss divided by remaining book cost, multiplied by 100. The dashboard uses only the book cost of priced holdings when assets are omitted. Unavailable for zero book cost or a valuation that cannot be calculated safely.";

function percentDetail(title: string, amount: string | null | undefined): HoldingDetail {
  const value = amount == null ? null : Number(amount);
  return {
    title,
    value: value ?? "—",
    prefix: undefined,
    suffix: value == null ? undefined : "%",
    precision: value == null ? undefined : 2,
    colour: "",
    valueColor: value != null && value !== 0 ? value > 0 ? "#22c55e" : "#ef4444" : undefined,
  };
}

function ValuationReturnCard({ value, stock, loading }: { value?: Valuation; stock: boolean; loading: boolean }) {
  const annualizedDescription = stock
    ? "Money-weighted yearly return (XIRR) in the selected currency using dated purchases, sales, stock-linked income and withholding tax, boundary transfers at market value, and current holdings value. Trading fees already in totals are included; account-only fees are excluded."
    : "Money-weighted yearly return (XIRR) in the selected currency using dated contributions, withdrawals, boundary transfers at market value, and current holdings plus cash. Includes realized and unrealized gains, retained income and fees; matched internal transfers cancel out.";
  return <FlipCard front={percentDetail("Unrealized Return", value?.unrealizedReturn)}
    back={percentDetail("Annualized Return", value?.annualizedReturn)} loading={loading}
    descriptions={{
      "Unrealized Return": UNREALIZED_RETURN_DESCRIPTION,
      "Annualized Return": `${annualizedDescription} This is a compounded annual rate, not return divided by years.${value?.annualizedStartDate ? ` First recorded investment: ${value.annualizedStartDate}.` : ""}${value?.annualizedReturnNote ? ` ${value.annualizedReturnNote}` : ""} A dash means there is insufficient valuation or cash-flow data, or no stable solution.`,
    }} />;
}

export function ValuationDisplay({ value, loading, error, stock = false, portfolio = false, currency }: {
  value?: Valuation; loading: boolean; error?: boolean; stock?: boolean; portfolio?: boolean; currency?: string;
}) {
  const partial = portfolio && !!value?.partial;
  const cards = [
    stock ? { title: "Current Price", value: value?.currentPrice, currency: value?.priceCurrency,
      description: "Latest cached regular-session market price per share, in the stock's price currency. Refreshed hourly; this is not a guaranteed live price." }
      : { title: portfolio ? "Portfolio Value" : "Account Value", value: value?.totalValue, currency,
        description: partial ? "Market value of priced holdings plus the full recorded cash balance in the selected currency. Assets listed in the warning are omitted, so this is a partial portfolio value." : "Current market value of all holdings plus recorded cash balance in the selected currency. Unavailable if any holding is unpriced or its ledger needs review." },
    { title: "Market Value", value: value?.marketValue, currency,
      description: "Shares currently held multiplied by cached market prices. Foreign-currency quotes are converted using the cached current FX rate. Excludes cash. On the dashboard, unpriced assets listed in the warning are omitted; other views require a complete valuation." },
    { title: "Unrealized Gain/Loss", value: value?.unrealizedGain, currency,
      description: "Priced holdings' market value minus their corresponding remaining recorded book cost. Includes fees already recorded in book cost; excludes estimated selling fees, realized gains and dividends." },
  ];
  return <section aria-label="Market valuation" style={{ marginBottom: 24 }}>
    <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>Market Valuation</Typography.Title>
    {error ? <Alert showIcon type="error" message="Unable to load market valuation. Try refreshing." /> : <>
      <div className="portfolio-statistics-grid">
        {cards.map(card => {
          const numeric = card.value == null ? null : Number(card.value);
          const gain = card.title === "Unrealized Gain/Loss";
          return <Card key={card.title}>
            <Statistic loading={loading} title={<StatisticTitle title={card.title} description={card.description} />}
              value={numeric ?? "—"} precision={numeric === null ? undefined : 2}
              prefix={numeric === null ? undefined : card.currency && card.currency !== currency ? `${card.currency} $` : "$"}
              valueStyle={gain && numeric !== null && numeric !== 0 ? { color: numeric > 0 ? "#22c55e" : "#ef4444" } : undefined} />
          </Card>;
        })}
        <ValuationReturnCard value={value} stock={stock} loading={loading} />
      </div>
      {!loading && value && !value.complete && <Alert style={{ marginTop: 16 }} showIcon type="warning"
        message={partial ? "Partial valuation — some assets omitted" : "Valuation incomplete"}
        description={<>{partial ? <>
          <div>These figures are not a complete portfolio valuation. The following assets were omitted:</div>
          <ul style={{ marginBottom: 0 }}>{value.omittedAssets?.map(asset => <li key={asset.ticker}>{asset.ticker}: {asset.reason}</li>)}</ul>
          <div>Portfolio Value includes recorded cash. Unrealized gain and return use only priced holdings and their book cost. Annualized return requires a complete valuation.</div>
        </> : value.missingTickers.length > 0 && <div>Price or FX unavailable: {value.missingTickers.join(", ")}. GICs and amount-only funds currently have no market-price valuation.</div>}{value.warnings.map(warning => <div key={warning}>{warning}</div>)}</>} />}
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
    variables: { currency, platform, stock, account, ...(portfolio ? { allowPartial: true } : {}) }, skip: !currency,
    notifyOnNetworkStatusChange: true, fetchPolicy: "cache-and-network", pollInterval: 3600000,
  });
  // Hide cached previous selections during variable changes/refetches.
  return <ValuationDisplay currency={currency} value={loading ? undefined : data?.marketValuation}
    stock={!!stock} portfolio={portfolio} loading={loading || !currency} error={!!error} />;
}
