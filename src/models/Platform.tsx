import { Account } from "./Account";
import { Currency } from "./Currency";
import { GraphQLType } from "./GraphQLType";

export interface Platform extends GraphQLType {
  name?: string;
  closedAt?: string | null;
  profile?: { id: string; name: string };
  account?: Account;
  currency?: Currency;
}
