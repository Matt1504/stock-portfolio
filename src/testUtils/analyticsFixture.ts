/** Frozen pre-migration calculations used only to build UI contract fixtures.
 * Production views must consume GraphQL analytics, never these helpers.
 */
import { Transaction } from "../models/Transaction";
import { portfolioStatistics } from "./legacyPortfolioStatistics";
import { calculateCashBalance } from "./legacyCashBalance";
import { stockStatistics } from "./legacyStockStatistics";
import { compareLedgerTransactions } from "./legacyHoldings";

export function analyticsFixture(rows: Transaction[], stock?: string, asset = "Stock") {
  const codes = Array.from(new Set(["CAD", "USD", ...rows.map(row => row.platform.currency?.code ?? "CAD")]));
  return codes.map(currency => {
    const transactions = rows.filter(row => row.platform.currency?.code === currency);
    const summary = portfolioStatistics(transactions);
    const stockSummary = stock ? stockStatistics(transactions, asset, stock) : undefined;
    const holdings = stockSummary?.portfolio ?? summary.holdings;
    const stats = stockSummary ? stockSummary.details.map(detail => ({ title: detail.title, value: typeof detail.value === "number" ? String(detail.value) : null, text: typeof detail.value === "string" ? detail.value : null, monetary: !!detail.prefix || ["Average Cost per Share", "Realized Gain/Loss", "Realized Profit/Loss"].includes(detail.title), holding: false })) : [
      ...Object.entries({ "Total Book Cost": holdings.totalBookCost, "Net Deposits": summary.netDeposits, "Realized Profit": summary.realizedProfit, "Realized Gain/Loss": holdings.realizedGain, "Fees Paid": summary.feesPaid, "Dividends/Interest Earned": summary.income, "Amount Transferred In": summary.transfersIn, "Amount Transferred Out": summary.transfersOut, "Amount Contributed": summary.contributions, "Amount Withdrawn": summary.withdrawals, "Cash Balance": calculateCashBalance(transactions) }).map(([title,value]) => ({ title,value:value == null ? null : String(value),text:null,monetary:true,holding:false })),
      { title:"Total Share(s) Owned",value:String(holdings.totalShares),text:null,monetary:false,holding:false },
      { title:"Unique Share(s) Owned",value:String(holdings.holdings.filter(h => h.shares > 0).length),text:null,monetary:false,holding:false },
      ...[["Largest Holding",summary.largestHolding],["Smallest Holding",summary.smallestHolding]].map(([title,h]: any[]) => ({title,value:h ? String(h.bookCost) : null,text:h?.stock.ticker ?? "—",monetary:false,holding:!!h})),
    ];
    const trade = new Map<string, any>(), income = new Map<string, any>(), history = new Map<string, any>();
    let deposits = 0;
    [...transactions].sort(compareLedgerTransactions).forEach(row => {
      const day = String(row.transactionDate), activity = row.activity.name, total = row.total ?? 0;
      if (["Contribution","Transfer In"].includes(activity ?? "")) deposits += total;
      if (["Withdrawal","Transfer Out"].includes(activity ?? "")) deposits -= total;
      history.set(day,{name:day,value:holdings.bookCostAfterTransaction.get(row.id ?? "") ?? 0,value1:deposits});
      if (["Buy","Sell","GIC Maturity"].includes(activity ?? "")) {
        const point = trade.get(day) ?? {name:day,value:0,value1:null,shares:null,sellShares:null};
        if (activity === "Buy") {point.value += total;point.shares = (point.shares ?? 0) + (row.shares ?? 0);}
        else {point.value1 = (point.value1 ?? 0) + (activity === "GIC Maturity" ? row.principalReturned ?? 0 : total);if (activity === "Sell") point.sellShares = (point.sellShares ?? 0) + (row.shares ?? 0);}
        trade.set(day,point);
      }
      if (["Dividends","Interest","GIC Maturity","Withholding Tax"].includes(activity ?? "")) {
        const point=income.get(day) ?? {name:day,value:0,value1:null};
        if (activity === "Withholding Tax") {if (row.stock) point.value1=(point.value1 ?? 0)-total;}
        else point.value += activity === "GIC Maturity" ? row.interestEarned ?? 0 : total;
        income.set(day,point);
      }
    });
    const costs = new Map<string,number>();holdings.positions.forEach(p => costs.set(p.accountCode ?? "Unknown",(costs.get(p.accountCode ?? "Unknown") ?? 0)+p.bookCost));
    return {__typename:"FinancialAnalytics",currency,statistics:stats,distribution:stock ? holdings.positions.filter(h=>h.bookCost>0).map(h=>({name:`${h.platform} (${h.accountCode ?? ""})`,value:h.bookCost,shares:h.shares})) : holdings.holdings.filter(h=>h.bookCost>0).map(h=>({name:h.stock.ticker,value:h.bookCost,shares:h.shares})),accountDistribution:Array.from(costs,([name,value])=>({name,value,shares:null})),bookCostHistory:Array.from(history.values()),tradeHistory:Array.from(trade.values()),incomeHistory:Array.from(income.values()),issues:holdings.issues.map(h=>`${h.stock.ticker}: missing shares`)};
  });
}
