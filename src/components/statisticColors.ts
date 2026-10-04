// Colours describe cash-flow direction, not whether a metric is above zero.
const incoming = new Set(["Net Deposits", "Realized Profit", "Realized Profit/Loss", "Realized Gain/Loss", "Amount Contributed", "Amount Transferred In", "Dividends/Interest Earned", "Interest Earned", "Total Shares Sold", "Sale Proceeds", "Last Sell Date", "Principal Returned"]);
const outgoing = new Set(["Total Book Cost", "Amount Withdrawn", "Amount Transferred Out", "Fees Paid", "Total Fees Paid", "Total Shares Bought", "Total Invested", "Last Buy Date"]);
export function statisticColor(title: string): "green" | "red" | "default" {
  return incoming.has(title) ? "green" : outgoing.has(title) ? "red" : "default";
}
