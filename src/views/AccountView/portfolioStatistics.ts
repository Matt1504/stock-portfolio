import { Transaction } from "../../models/Transaction";
import { calculateStockHoldings } from "./holdings";

export function portfolioStatistics(transactions: Transaction[]) {
  const holdings = calculateStockHoldings(transactions);
  let contributions = 0, withdrawals = 0, transfersIn = 0, transfersOut = 0, income = 0, fees = 0;
  for (const transaction of transactions) {
    const total = transaction.total ?? 0;
    fees += transaction.fee ?? 0;
    switch (transaction.activity.name) {
      case "Contribution": contributions += total; break;
      case "Withdrawal": withdrawals += total; break;
      case "Transfer In": transfersIn += total; break;
      case "Transfer Out": transfersOut += total; break;
      case "Dividends": case "Interest": income += total; break;
      case "Withholding Tax": if (transaction.stock) income -= total; break;
    }
  }
  const realizedProfit = holdings.realizedGain === undefined ? undefined : holdings.realizedGain + income;
  return { realizedProfit, holdings, contributions, withdrawals, transfersIn, transfersOut, income, fees, netDeposits: contributions + transfersIn - transfersOut - withdrawals };
}
