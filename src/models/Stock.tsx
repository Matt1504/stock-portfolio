import { Currency } from "./Currency";
import { GraphQLType } from "./GraphQLType";

export interface Stock extends GraphQLType {
    name?: string,
    ticker?: string,
    currency?: Currency,
}