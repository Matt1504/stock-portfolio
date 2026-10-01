import { InfoCircleOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";

export const accountStatisticDescriptions: Record<string, string> = {
  "Total Share(s) Owned": "Total shares currently held across stocks in the selected account and currency. Buys and share transfers add shares; sales and transfers out remove shares; splits adjust the quantity. Negative recorded positions are excluded and flagged for review.",
  "Unique Share(s) Owned": "Number of distinct stocks with a positive share balance in the selected account and currency. Fully sold positions are excluded; the same stock held at multiple brokers counts once in an account overview.",
  "Largest Holding": "Stock with the highest remaining book cost in the selected account and currency, followed by that cost. This is based on recorded purchase cost, not current market value.",
  "Amount Contributed": "Sum of recorded Contribution transaction totals in the selected account and currency, across all dates. Transfers, dividends, and interest are excluded.",
  "Amount Transferred In": "Sum of recorded Transfer In transaction totals in the selected account and currency, across all dates. These are shown separately from contributions.",
  "Amount Transferred Out": "Sum of recorded Transfer Out transaction totals in the selected account and currency, across all dates. This displays the amount moved out as a positive total.",
  "Total Book Cost": "Recorded cost of stock shares still held in the selected account and currency. Purchases include their recorded fees; sales and transfers out remove the average cost of disposed shares at that broker. Splits change share counts without increasing cost. Negative positions are excluded.",
  "Dividends/Interest Earned": "All recorded dividends and interest in the selected account and currency, minus recorded withholding tax. This is a lifetime total, including income from stocks that have since been sold.",
};

export const stockStatisticDescriptions: Record<string, string> = {
  "Share(s) Owned": "Total shares of this stock currently held across accounts and brokers. Includes buys, sales, share transfers, and split adjustments. Negative recorded positions are excluded and flagged for review.",
  "Book Cost": "Recorded cost of this stock's remaining shares across accounts. Sales and transfers out remove the average cost of disposed shares at each broker; splits adjust shares without adding cost. This is not current market value.",
  "Average Cost per Share": "Remaining book cost divided by shares currently owned. Includes fees recorded in purchase totals and reflects sales and splits. A dash is shown when no shares remain.",
  "Realized Gain/Loss": "Recorded sale totals minus the average purchase cost of shares sold, calculated separately for each broker account and summed across all sales. Uses sale totals as recorded, without deducting fees again. Excludes dividends and changes in unsold shares. A dash means sales exceed the recorded holdings and entries need review.",
  "Dividends/Interest Earned": "Lifetime dividends and interest recorded for this stock across accounts, minus withholding tax. Includes income from positions that have since been sold.",
  "Total Invested": "Sum of all recorded Buy transaction totals for this stock across accounts, including fees contained in those totals. This lifetime amount is not reduced when shares are sold and excludes transfers in.",
  "Sale Proceeds": "Sum of all recorded Sell transaction totals for this stock across accounts. Uses the saved totals as recorded; fees are not subtracted again. This is cash from sales, not profit.",
  "Total Fees Paid": "Sum of the fee fields on all recorded transactions for this stock across accounts. Fees already included in purchase or sale totals are not added to those totals again.",
  "Last Buy Date": "Most recent date of a recorded Buy transaction for this stock across accounts. Transfers and splits do not count as buys. A dash means no buy is recorded.",
};

export function stockStatisticDescription(title: string) {
  const year = title.match(/^Dividends\/Interest \((\d{4})\)$/)?.[1];
  return year
    ? `Dividends and interest recorded for this stock during calendar year ${year}, minus withholding tax recorded in that year. Includes all accounts; this is not a rolling 12-month total.`
    : stockStatisticDescriptions[title];
}

export default function StatisticTitle({ title, description }: { title: string; description: string }) {
  return <span>
    {title}
    <Tooltip title={description} trigger={["hover", "focus", "click"]}>
      <button type="button" aria-label={`About ${title}`} style={{
        border: 0, padding: "2px 4px", marginLeft: 4, background: "transparent", color: "inherit", cursor: "help",
      }}>
        <InfoCircleOutlined aria-hidden />
      </button>
    </Tooltip>
  </span>;
}
