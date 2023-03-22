import { Account } from "./Account";
import { Activity } from "./Activity";
import { SelectInput } from "./Common";
import { Currency } from "./Currency";
import { GraphQLType } from "./GraphQLType";
import { Platform } from "./Platform";
import { Stock } from "./Stock";

export interface TransactionForm {
    account: string,
    currency?: string,
    activity: string,
    description?: string,
    fee?: number,
    platform: string,
    price?: number,
    shares?: number,
    stock?: string,
    total: number
    transaction?: object,
    transactionDate: string,
}
export interface Transaction extends GraphQLType {
    account: Account,
    stock?: Stock,
    platform: Platform,
    currency: Currency,
    price?: number,
    shares?: number,
    fee?: number,
    transactionDate: Date,
    activity: Activity,
    total?: number,
    description: string,
}
