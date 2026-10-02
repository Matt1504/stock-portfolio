import { GraphQLType } from "./GraphQLType";

export interface Activity extends GraphQLType {
  name?: ActivityEnum;
}

export enum ActivityEnum {
  CONTRIBUTION = "Contribution",
  WITHDRAWAL = "Withdrawal",
  TRANSFERIN = "Transfer In",
  TRANSFEROUT = "Transfer Out",
  BUY = "Buy",
  SELL = "Sell",
  DIVIDENDS = "Dividends",
  WITHHOLDINGTAX = "Withholding Tax",
  ADJUSTMENT = "Adjustment",
  STOCKSPLIT = "Stock Split",
  INTEREST = "Interest",
}
