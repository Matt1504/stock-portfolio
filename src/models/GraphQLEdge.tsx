import { GraphQLNode } from "./GraphQLNode";

export interface GraphQLEdge<T> {
    edges: Array<GraphQLNode<T>>;
    __typename: string;
}