import { GraphQLEdge } from "./GraphQLEdge";

export interface GraphQLResponse<T> {
    edges: Array<GraphQLEdge<T>>;
    __typename: string;
}