import { ApolloLink, Observable, DocumentNode, useApolloClient } from "@apollo/client";
import { print, visit } from "graphql";
import { useSyncExternalStore } from "react";
const timestamps = new Map<string, string>();
const listeners = new Set<() => void>();
let version = 0;
const documentKey = (document: DocumentNode) => print(visit(document, { Field: node => node.name.value === '__typename' ? null : undefined }));
const key = (document: DocumentNode, variables: any) => documentKey(document) + JSON.stringify(Object.keys(variables ?? {}).sort().map(name => [name, variables[name]]));
export const dataFreshnessLink = new ApolloLink((operation, forward) => new Observable(observer => {
  const subscription = forward(operation).subscribe({
    next: result => {
      const timestamp = result.extensions?.dataFreshness?.lastUpdated;
      if (!result.errors?.length && timestamp && Number.isFinite(Date.parse(timestamp))) {
        timestamps.set(key(operation.query, operation.variables), timestamp);
        version++;
        listeners.forEach(listener => listener());
      }
      observer.next(result);
    },
    error: error => observer.error(error),
    complete: () => observer.complete(),
  });
  return () => subscription.unsubscribe();
}));
export function useLastUpdated(documents: DocumentNode[]) {
  const client = useApolloClient();
  useSyncExternalStore(callback => { listeners.add(callback); return () => { listeners.delete(callback); }; }, () => version);
  const queries = new Set(documents.map(documentKey));
  const values = Array.from(client.getObservableQueries("active").values()).filter(query => queries.has(documentKey(query.options.query)))
    .map(query => timestamps.get(key(query.options.query, query.variables))).filter((value): value is string => !!value);
  return values.length ? values.sort((a, b) => Date.parse(a) - Date.parse(b))[0] : undefined;
}
