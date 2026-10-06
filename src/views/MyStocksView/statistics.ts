import { shareCountPrecision } from "../../utils/utils";
import { Transaction } from "../../models/Transaction";
import { HoldingDetail } from "../../models/Common";
import { calculateStockHoldings } from "../AccountView/holdings";

export function isFundAsset(assetType: string) {
  return ["Index Fund", "Mutual Fund"].includes(assetType);
}

export function stockStatistics(transactions: Transaction[], assetType = "Stock", stockId?: string) {
  const isFund = isFundAsset(assetType);
  const isGic = assetType === "GIC";
  const fundTrades = transactions.filter(transaction => ["Buy", "Sell"].includes(transaction.activity.name ?? ""));
  const amountOnlyFund = isFund && (!fundTrades.length || fundTrades.some(transaction => !(transaction.shares && transaction.shares > 0)));
  const portfolio = calculateStockHoldings(amountOnlyFund ? transactions.map(transaction => ({ ...transaction, stock: transaction.stock ? { ...transaction.stock, asset: { id: transaction.stock.asset?.id ?? assetType, name: assetType } } : undefined })) : transactions, stockId);
  let principalReturned = 0;
  let invested = 0, proceeds = 0, dividends = 0, sharesBought = 0, sharesSold = 0, fees = 0;
  let lastBuy = "", lastSell = "";
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
    if (activity === "GIC Maturity") {
      principalReturned += transaction.principalReturned ?? 0;
      dividends += transaction.interestEarned ?? 0;
    }
    if (activity === "Sell") {
      proceeds += total;
      sharesSold += transaction.shares ?? 0;
      if (date > lastSell) lastSell = date;
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
  if (isGic) return { portfolio, details: [
    detail("Book Cost", Math.max(0, invested - principalReturned), true),
    detail("Interest Earned", dividends, true),
    detail("Realized Profit/Loss", dividends - fees, true),
    detail("Total Invested", invested, true),
    detail("Principal Returned", principalReturned, true),
    detail("Last Buy Date", lastBuy || "—"),
  ] };
  return { portfolio, details: [
    detail("Book Cost", portfolio.totalBookCost, true),
    detail("Average Cost per Share", portfolio.totalShares ? portfolio.totalBookCost / portfolio.totalShares : "—", true),
    detail("Realized Profit/Loss", amountOnlyFund || portfolio.realizedGain === undefined ? "—" : portfolio.realizedGain + dividends, true),
    detail("Realized Gain/Loss", amountOnlyFund ? "—" : portfolio.realizedGain ?? "—", true),
    { ...detail("Share(s) Owned", portfolio.totalShares), precision: shareCountPrecision(portfolio.totalShares) },
    { ...detail("Total Shares Bought", sharesBought), precision: shareCountPrecision(sharesBought) },
    { ...detail("Total Shares Sold", sharesSold), precision: shareCountPrecision(sharesSold) },
    detail("Dividends/Interest Earned", dividends, true),
    detail("Total Invested", invested, true),
    detail("Sale Proceeds", proceeds, true),
    detail("Total Fees Paid", fees, true),
    detail("Last Buy Date", lastBuy || "—"),
    ...(!isFund ? [detail("Last Sell Date", lastSell || "—")] : []),
  ].filter(item => assetType !== "Index Fund" || ["Book Cost", "Realized Gain/Loss", "Sale Proceeds", "Last Buy Date"].includes(item.title)).filter(item => !isFund || !["Average Cost per Share", "Share(s) Owned", "Total Shares Bought", "Total Shares Sold", "Dividends/Interest Earned", "Total Invested"].includes(item.title)) };
}
