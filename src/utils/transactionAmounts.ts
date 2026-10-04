export function tradeTotal(price = 0, shares = 0, exchangeRate = 1, fee: number | null = 0, activity = "Buy") {
  return Number((price * shares * exchangeRate + (activity === "Sell" ? -(fee ?? 0) : (fee ?? 0))).toFixed(2));
}
