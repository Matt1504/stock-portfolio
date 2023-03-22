import { GraphQLType } from "./GraphQLType";

export interface Account extends GraphQLType {
    name?: string,
    code?: string,
}