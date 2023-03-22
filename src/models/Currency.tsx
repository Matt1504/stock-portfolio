import { GraphQLType } from "./GraphQLType";

export interface Currency extends GraphQLType {
    name?: string,
    code?: string,
}