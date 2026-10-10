import { gql } from "@apollo/client";
import { HoldingDetail } from "../models/Common";
import { GraphData } from "../models/GraphData";
import { formatNumber, shareCountPrecision } from "../utils/utils";

export const ANALYTICS_FIELDS = gql`
  fragment FinancialAnalyticsFields on FinancialAnalytics {
    currency
    statistics { title value text monetary holding }
    issues
  }
`;
export type AnalyticsPoint = { name: string; value: string | number; value1?: string | number | null; shares?: string | number | null; sellShares?: string | number | null };
export type FinancialAnalytics = {
  currency: string;
  statistics: { title: string; value?: string | number | null; text?: string | null; monetary: boolean; holding: boolean }[];
  distribution: AnalyticsPoint[]; accountDistribution: AnalyticsPoint[];
  bookCostHistory: AnalyticsPoint[]; tradeHistory: AnalyticsPoint[]; incomeHistory: AnalyticsPoint[];
  issues: string[];
};

/** Presentation only: financial totals and history are supplied by GraphQL. */
export function statisticDetails(analytics?: FinancialAnalytics): HoldingDetail[] {
  return (analytics?.statistics ?? []).map(stat => {
    const number = stat.value == null ? undefined : Number(stat.value);
    const value = stat.holding && number !== undefined ? `${stat.text} | $${formatNumber(number, 2, 2)}` : stat.text ?? number ?? "—";
    return { title: stat.title, value, prefix: stat.monetary && typeof value === "number" ? "$" : undefined,
      precision: typeof value === "number" ? stat.monetary ? 2 : shareCountPrecision(value) : undefined, colour: "" };
  });
}
export function graphPoints(points: AnalyticsPoint[] = [], shareLabels = false) {
  return points.map(point => ({ ...new GraphData(point.name, Number(point.value), point.value1 == null ? undefined : Number(point.value1),
    point.shares == null || Number(point.shares) <= 0 ? undefined : shareLabels ? `${formatNumber(Number(point.shares))} Share(s)` : String(point.shares)),
    sellLabel: shareLabels && point.sellShares != null ? `${formatNumber(Number(point.sellShares))} Share(s)` : undefined }));
}
