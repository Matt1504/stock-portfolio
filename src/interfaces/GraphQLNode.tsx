export interface GraphQLNode<T> {
    node: T;
    __typename: string;
}