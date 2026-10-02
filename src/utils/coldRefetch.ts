import { ApolloClient, DocumentNode } from "@apollo/client";
import { print } from "graphql";

export function coldRefetch(client: ApolloClient<object>, queries: DocumentNode[]) {
  const documents = new Set(queries.map(query => print(query)));
  return Promise.all(Array.from(client.getObservableQueries("active").values())
    .filter(observable => documents.has(print(observable.options.query)))
    .map(observable => {
      const context = observable.options.context ?? {};
      return client.query({
        query: observable.options.query,
        variables: observable.variables,
        fetchPolicy: "network-only",
        context: {
          ...context,
          queryDeduplication: false,
          headers: { ...context.headers, "X-Cache-Bypass": "true" },
          fetchOptions: { ...context.fetchOptions, cache: "no-store" },
        },
      });
    }));
}
