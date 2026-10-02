import { shareCountPrecision } from "../../utils/utils";
import { Transaction } from "../../models/Transaction";
import { HoldingDetail } from "../../models/Common";
import { calculateStockHoldings } from "../AccountView/holdings";

export function stockStatistics(transactions: Transaction[]) {
  const portfolio = calculateStockHoldings(transactions);
  let invested = 0, proceeds = 0, dividends = 0, sharesBought = 0, sharesSold = 0, fees = 0;
  let lastBuy = "";
  transactions.forEach(transaction => {
    const activity = transaction.activity.name;
    const total = transaction.total ?? 0;
    const date = transaction.transactionDate.toString().slice(0, 10);
    fees += transaction.fee ?? 0;
    if (activity === "Buy") {
      invested += total;
      sharesBought += transaction.shares ?? 0;
      if (date > lastBuy) lastBuy = date;
    }
    if (activity === "Sell") {
      proceeds += total;
      sharesSold += transaction.shares ?? 0;
    }
    if (["Dividends", "Interest"].includes(activity ?? "") || (activity === "Withholding Tax" && transaction.stock)) {
      const amount = activity === "Withholding Tax" ? -total : total;
      dividends += amount;
    }
  });
  const detail = (title: string, value: number | string, money = false): HoldingDetail => ({
    title, value, prefix: money && typeof value === "number" ? "$" : undefined,
    precision: money && typeof value === "number" ? 2 : undefined, colour: "",
  });
  return { portfolio, details: [
    detail("Book Cost", portfolio.totalBookCost, true),
    detail("Average Cost per Share", portfolio.totalShares ? portfolio.totalBookCost / portfolio.totalShares : "—", true),
    detail("Realized Profit/Loss", portfolio.realizedGain === undefined ? "—" : portfolio.realizedGain + dividends, true),
    detail("Realized Gain/Loss", portfolio.realizedGain ?? "—", true),
    { ...detail("Share(s) Owned", portfolio.totalShares), precision: shareCountPrecision(portfolio.totalShares) },
    { ...detail("Total Shares Bought", sharesBought), precision: shareCountPrecision(sharesBought) },
    { ...detail("Total Shares Sold", sharesSold), precision: shareCountPrecision(sharesSold) },
    detail("Dividends/Interest Earned", dividends, true),
    detail("Total Invested", invested, true),
    detail("Sale Proceeds", proceeds, true),
    detail("Total Fees Paid", fees, true),
    detail("Last Buy Date", lastBuy || "—"),
  ] };
}
