import { Account } from "./Account";
import { GraphQLType } from "./GraphQLType";

export interface ContributionLimt extends GraphQLType {
    amount?: number,
    account?: Account,
    year?: number,
}