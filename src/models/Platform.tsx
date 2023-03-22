import { Account } from "./Account";
import { Currency } from "./Currency";
import { GraphQLType } from "./GraphQLType";

export interface Platform extends GraphQLType {
  name?: string;
  account?: Account;
  currency?: Currency;
}
