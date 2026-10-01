import { Transaction } from "../../models/Transaction";
import { HoldingDetail } from "../../models/Common";
import { calculateStockHoldings } from "../AccountView/holdings";

export function stockStatistics(transactions: Transaction[], year = new Date().getFullYear()) {
  const portfolio = calculateStockHoldings(transactions);
  let invested = 0, proceeds = 0, dividends = 0, yearDividends = 0, fees = 0;
  let lastBuy = "";
  transactions.forEach(transaction => {
    const activity = transaction.activity.name;
    const total = transaction.total ?? 0;
    const date = transaction.transactionDate.toString().slice(0, 10);
    fees += transaction.fee ?? 0;
    if (activity === "Buy") {
      invested += total;
      if (date > lastBuy) lastBuy = date;
    }
    if (activity === "Sell") proceeds += total;
    if (["Dividends", "Interest", "Withholding Tax"].includes(activity ?? "")) {
      const amount = activity === "Withholding Tax" ? -total : total;
      dividends += amount;
      if (date.startsWith(`${year}-`)) yearDividends += amount;
    }
  });
  const detail = (title: string, value: number | string, money = false): HoldingDetail => ({
    title, value, prefix: money && typeof value === "number" ? "$" : undefined,
    precision: money && typeof value === "number" ? 2 : undefined, colour: "",
  });
  return { portfolio, details: [
    detail("Share(s) Owned", portfolio.totalShares),
    detail("Book Cost", portfolio.totalBookCost, true),
    detail("Average Cost per Share", portfolio.totalShares ? portfolio.totalBookCost / portfolio.totalShares : "—", true),
    detail("Realized Gain/Loss", portfolio.realizedGain ?? "—", true),
    detail("Dividends/Interest Earned", dividends, true),
    detail("Total Invested", invested, true),
    detail("Sale Proceeds", proceeds, true),
    detail(`Dividends/Interest (${year})`, yearDividends, true),
    detail("Total Fees Paid", fees, true),
    detail("Last Buy Date", lastBuy || "—"),
  ] };
}
