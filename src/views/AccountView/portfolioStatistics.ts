import { Transaction } from "../../models/Transaction";
import { calculateStockHoldings } from "./holdings";

export function portfolioStatistics(transactions: Transaction[]) {
  const holdings = calculateStockHoldings(transactions);
  const currentHoldings = holdings.holdings.filter(holding => holding.bookCost > 0);
  const largestHolding = currentHoldings.reduce<typeof holdings.holdings[number] | undefined>((largest, holding) => !largest || holding.bookCost > largest.bookCost ? holding : largest, undefined);
  const smallestHolding = currentHoldings.reduce<typeof holdings.holdings[number] | undefined>((smallest, holding) => !smallest || holding.bookCost < smallest.bookCost ? holding : smallest, undefined);
  let contributions = 0, withdrawals = 0, transfersIn = 0, transfersOut = 0, income = 0, fees = 0, gicFees = 0, rebates = 0, serviceFees = 0, withholdingTax = 0;
  for (const transaction of transactions) {
    const total = transaction.total ?? 0;
    fees += transaction.fee ?? 0;
    if (transaction.stock?.asset?.name === "GIC") gicFees += transaction.fee ?? 0;
    switch (transaction.activity.name) {
      case "Service Fee": case "SEC Fee": serviceFees += total; fees += total; break;
      case "ETF Rebate": rebates += total; break;
      case "Contribution": contributions += total; break;
      case "Withdrawal": withdrawals += total; break;
      case "Transfer In": transfersIn += total; break;
      case "Transfer Out": transfersOut += total; break;
      case "GIC Maturity": income += transaction.interestEarned ?? 0; break;
      case "Dividends": case "Interest": income += total; break;
      case "Withholding Tax": withholdingTax += total; if (transaction.stock) income -= total; break;
    }
  }
  // Trading fees are already reflected in the realized cost basis and sale
  // totals. Deduct only separately recorded expenses here.
  const realizedProfit = holdings.realizedGain === undefined ? undefined : holdings.realizedGain + income + rebates - gicFees - serviceFees;
  return { largestHolding, smallestHolding, realizedProfit, holdings, contributions, withdrawals, transfersIn, transfersOut, income, fees, rebates, serviceFees, feesPaid: fees + withholdingTax, netDeposits: contributions + transfersIn - transfersOut - withdrawals };
}
