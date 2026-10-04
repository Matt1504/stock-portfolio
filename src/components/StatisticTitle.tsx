import { InfoCircleOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { useEffect, useState } from "react";

export const accountStatisticDescriptions: Record<string, string> = {
  "Cash Balance": "Estimated cash remaining from all recorded transactions in the selected account and currency, starting from zero. Adds contributions, cash transfers in, sale proceeds, dividends, interest, ETF rebates, and gross GIC maturity payouts. Subtracts buys, cash transfers out, withdrawals, all withholding tax, service fees, and separately recorded GIC fees. Trading fees included in buy/sell totals are not deducted again. Splits, spinoffs, and in-kind share transfers do not move cash. Uses recorded settlement totals, without applying FX again. Incomplete history or an unrecorded opening balance can make this differ from your broker’s cash balance.",
  "Total Share(s) Owned": "Total shares currently held across stocks in the selected account and currency. Buys and share transfers add shares; sales and transfers out remove shares; splits adjust the quantity. Negative recorded positions are excluded and flagged for review.",
  "Unique Share(s) Owned": "Number of distinct stocks with a positive share balance in the selected account and currency. Fully sold positions are excluded; the same stock held at multiple brokers counts once in an account overview.",
  "Smallest Holding": "Holding with the lowest positive remaining book cost in the selected account and currency, followed by that cost. Fully sold positions and zero-cost holdings are excluded. This uses recorded purchase cost, not current market value. A dash means no eligible holding remains.",
  "Largest Holding": "Holding with the highest positive remaining book cost in the selected account and currency, followed by that cost. Sales remove the average purchase cost of the shares sold, rather than their sale proceeds. Fully sold and zero-cost positions are excluded. A dash means no eligible holding remains. This uses recorded cost, not current market value.",
  "Amount Contributed": "Sum of recorded Contribution transaction totals in the selected account and currency, across all dates. Transfers, dividends, and interest are excluded.",
  "Amount Transferred In": "Sum of recorded Transfer In transaction totals in the selected account and currency, across all dates. These are shown separately from contributions.",
  "Amount Transferred Out": "Sum of recorded Transfer Out transaction totals in the selected account and currency, across all dates. This displays the amount moved out as a positive total.",
  "Total Book Cost": "Recorded cost of stock shares still held, amount-only Index/Mutual Fund purchase totals, and outstanding GIC principal in the selected account and currency. GIC maturities remove returned principal without adding interest to book cost. Purchases include their recorded fees; sales and transfers out remove the average cost of disposed shares at that broker. Amount-only fund disposal cost tracking is not yet defined. Splits change share counts without increasing cost. Spinoffs move cost between stocks without changing the account total. Negative positions are excluded.",
  "Dividends/Interest Earned": "All recorded dividends, account interest, and GIC maturity interest (excluding returned principal) in the selected account and currency, minus withholding tax associated with a stock. Withholding tax without a stock (such as tax on account withdrawals) is excluded. This is a lifetime total, including income from stocks that have since been sold.",
};

Object.assign(accountStatisticDescriptions, {
  "Amount Withdrawn": "Sum of positive Withdrawal transaction totals for the selected account and currency. Excludes transfers out and withholding tax.",
  "Fees Paid": "Sum of account Service Fee and SEC Fee totals, all withholding-tax totals (including account-level tax), and recorded trading/GIC fee fields across all dates in the selected account and currency. Trading fees are counted once here even when included in buy/sell totals. This includes buy fees on unsold shares; Realized Profit recognizes those buy fees as shares are sold.",
  "Net Deposits": "Lifetime contributions plus transfers in, minus transfers out and withdrawals. Dividends, interest, and withholding tax are excluded.",
  "Realized Gain/Loss": "Recorded sale proceeds minus the average purchase cost of shares sold at each broker. Purchase fees are included in book cost; sale totals are used as recorded. A dash means recorded sales exceed holdings or an amount-only fund sale has no defined disposal cost.",
  "Realized Profit": "Realized Gain/Loss plus Dividends/Interest Earned and account-level ETF rebates across all dates, minus account Service Fee and SEC Fee transactions. Includes stock-associated withholding tax through net income; excludes account-withdrawal tax and unrealized gains. Fees already reflected in share purchase or sale totals are not deducted again; separately recorded GIC fees are deducted from profit. Returned GIC principal is excluded. A dash means sale quantities need review or an amount-only fund sale has no defined disposal cost.",
});

export const homeStatisticDescriptions: Record<string, string> = Object.fromEntries(Object.entries(accountStatisticDescriptions).map(([title, description]) => [title, description.replaceAll("selected account", "selected profile")]));
homeStatisticDescriptions["Active Trading Accounts"] = "Number of existing brokerage platforms in the selected profile and currency, including accounts with only cash or no transactions yet.";

export const stockStatisticDescriptions: Record<string, string> = {
  "Share(s) Owned": "Total shares of this stock currently held across accounts and brokers. Includes buys, sales, share transfers, and split adjustments. Negative recorded positions are excluded and flagged for review.",
  "Book Cost": "Recorded cost of this stock's remaining shares across accounts. Sales and transfers out remove the average cost of disposed shares at each broker; splits adjust shares without adding cost. Includes book cost allocated to or from this stock by spinoffs. This is not current market value.",
  "Average Cost per Share": "Remaining book cost divided by shares currently owned. Includes fees recorded in purchase totals and reflects sales, splits, and spinoff allocations. Later purchases and sales also affect this average. A dash is shown when no shares remain.",
  "Realized Gain/Loss": "Recorded sale totals minus the average purchase cost of shares sold, calculated separately for each broker account and summed across all sales. Uses sale totals as recorded, without deducting fees again. Excludes dividends and changes in unsold shares. A dash means sales exceed the recorded holdings and entries need review.",
  "Dividends/Interest Earned": "Lifetime dividends and interest recorded for this stock across accounts, minus withholding tax associated with this stock. Withholding tax without a stock (such as tax on account withdrawals) is excluded. Includes income from positions that have since been sold.",
  "Realized Profit/Loss": "Realized Gain/Loss plus lifetime Dividends/Interest Earned for this stock. Stock-associated withholding tax is included through net income; account-withdrawal tax and unrealized gains are excluded. Fees already reflected in share purchase or sale totals are not deducted again; separately recorded GIC fees are deducted from profit. Returned GIC principal is excluded. A dash means sale quantities need review.",
  "Total Shares Bought": "Lifetime sum of share quantities on Buy transactions for this stock across accounts and brokers. Includes fractional shares; excludes splits and transfers. Selling shares does not reduce this total.",
  "Total Shares Sold": "Lifetime sum of share quantities on Sell transactions for this stock across accounts and brokers. Includes fractional shares; excludes splits and transfers. This is the quantity sold, not the remaining holdings.",
  "Total Invested": "Sum of all recorded Buy transaction totals for this stock across accounts, including fees contained in those totals. This lifetime amount is not reduced when shares are sold and excludes transfers in.",
  "Sale Proceeds": "Sum of all recorded Sell transaction totals for this stock across accounts. Uses the saved totals as recorded; fees are not subtracted again. This is cash from sales, not profit.",
  "Total Fees Paid": "Sum of the fee fields on all recorded transactions for this stock across accounts. Fees already included in purchase or sale totals are not added to those totals again.",
  "Last Sell Date": "Most recent date of a recorded Sell transaction for this stock in the displayed currency across accounts and brokers. Transfers, splits, and GIC maturities are excluded. A dash means no sale is recorded.",
  "Last Buy Date": "Most recent date of a recorded Buy transaction for this stock across accounts. Transfers and splits do not count as buys. A dash means no buy is recorded.",
};

export function stockStatisticDescription(title: string) {
  return stockStatisticDescriptions[title];
}

export default function StatisticTitle({ title, description, disabled = false }: { title: string; description: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  return <span>
    {title}
    <Tooltip title={description} trigger={["hover", "focus", "click"]} open={!disabled && open} onOpenChange={value => setOpen(!disabled && value)} destroyTooltipOnHide transitionName={disabled ? "" : undefined} mouseLeaveDelay={0}>
      <button type="button" disabled={disabled} aria-label={`About ${title}`} style={{
        border: 0, padding: "2px 4px", marginLeft: 4, background: "transparent", color: "inherit", cursor: "help",
      }}>
        <InfoCircleOutlined aria-hidden />
      </button>
    </Tooltip>
  </span>;
}
