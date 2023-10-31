import { Account } from "./Account";
import { GraphQLType } from "./GraphQLType";

export interface ContributionLimitForm {
    amount?: number,
    account?: Account,
    year?: object,
    yearEnd?: string,
}

export interface ContributionLimt extends GraphQLType {
    amount?: number,
    account?: Account,
    yearEnd?: Date,
}