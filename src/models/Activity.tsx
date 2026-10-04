import { GraphQLType } from "./GraphQLType";

export interface Activity extends GraphQLType {
  name?: ActivityEnum;
}

export enum ActivityEnum {
  CONTRIBUTION = "Contribution",
  WITHDRAWAL = "Withdrawal",
  SERVICEFEE = "Service Fee",
  SECFEE = "SEC Fee",
  ETFREBATE = "ETF Rebate",
  TRANSFERIN = "Transfer In",
  TRANSFEROUT = "Transfer Out",
  BUY = "Buy",
  SELL = "Sell",
  DIVIDENDS = "Dividends",
  WITHHOLDINGTAX = "Withholding Tax",
  ADJUSTMENT = "Adjustment",
  STOCKSPINOFF = "Stock Spinoff",
  STOCKSPLIT = "Stock Split",
  GICMATURITY = "GIC Maturity",
  INTEREST = "Interest",
}
