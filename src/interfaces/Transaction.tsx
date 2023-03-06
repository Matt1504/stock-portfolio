import { Stock } from "./Stock";
import { Currency } from "./Currency";
import { Platform } from "./Platform";
import { Activity } from "./Activity";
import { GraphQLType } from "./GraphQLType";

export interface Transaction extends GraphQLType {
    stock?: Stock,
    platform?: Platform,
    currency?: Currency,
    price?: number,
    shares?: number,
    fee?: number,
    transactionDate?: Date,
    activity?: Activity,
    total?: number
}