import { Account } from "./Account";
import { Activity } from "./Activity";
import { Currency } from "./Currency";
import { GraphQLType } from "./GraphQLType";
import { Platform } from "./Platform";
import { Stock } from "./Stock";

export interface TransactionForm {
    account: string,
    currency?: string,
    activity: string,
    description?: string,
    fee?: number | null,
    platform: string,
    price?: number,
    priceCurrency?: string,
    totalCurrency?: string,
    exchangeRate?: number,
    shareEntry?: boolean,
    shares?: number,
    stock?: string,
    spinoffSource?: string,
    allocatedBookCost?: number,
    total: number
    transaction?: object,
    transactionDate: string,
    maturity?: object,
    maturityDate?: string,
    rate?: number,
    gicPurchase?: string,
    interestCalculation?: string
}

export interface Transaction extends GraphQLType {
    transferBatch?: string | null,
    account: Account,
    stock?: Stock,
    spinoffSource?: Stock,
    allocatedBookCost?: number,
    platform: Platform,
    currency: Currency,
    price?: number,
    priceCurrency?: Currency,
    totalCurrency?: Currency,
    exchangeRate?: number,
    shares?: number,
    fee?: number | null,
    transactionDate: Date,
    activity: Activity,
    total?: number,
    description?: string,
    rate?: number,
    maturityDate?: string,
    interestCalculation?: string,
    principalReturned?: number,
    interestEarned?: number,
    expectedMaturityTotal?: number,
    gicPurchase?: { id: string; total?: number; transactionDate?: string; maturityDate?: string },
}
