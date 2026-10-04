import { Transaction } from "../../models/Transaction";

/** Recorded cash movement in a single account/currency; opening balance is zero. */
export function calculateCashBalance(transactions: Transaction[]): number {
  let balance = 0;
  for (const transaction of transactions) {
    const total = transaction.total ?? 0;
    switch (transaction.activity.name) {
      case "Contribution":
      case "Sell":
      case "Dividends":
      case "Interest":
      case "ETF Rebate":
      case "GIC Maturity":
        balance += total;
        break;
      case "Buy":
      case "Withdrawal":
      case "Withholding Tax":
      case "Service Fee":
      case "SEC Fee":
        balance -= total;
        break;
      case "Transfer In":
      case "Transfer Out":
        // An in-kind share transfer carries cost basis, not spendable cash.
        if (!transaction.shares) balance += transaction.activity.name === "Transfer In" ? total : -total;
        break;
    }
    // Share trade totals already include fees. GIC fees are separate from
    // principal/gross maturity payout and must be deducted once.
    if (transaction.stock?.asset?.name === "GIC" && ["Buy", "GIC Maturity"].includes(transaction.activity.name ?? "")) {
      balance -= transaction.fee ?? 0;
    }
  }
  return Math.round((balance + Number.EPSILON) * 100) / 100;
}
