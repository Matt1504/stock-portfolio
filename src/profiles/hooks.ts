import { useContext } from "react";
import { DocumentNode, MutationHookOptions, OperationVariables, QueryHookOptions, useMutation, useQuery } from "@apollo/client";
import { ProfileContext } from "./ProfileContext";

function isScoped(document: DocumentNode): boolean {
  return document.definitions.some(definition => definition.kind === "OperationDefinition" &&
    definition.variableDefinitions?.some(variable => variable.variable.name.value === "profileId"));
}

export function useProfileQuery<TData = any, TVariables extends OperationVariables = OperationVariables>(document: DocumentNode, options?: QueryHookOptions<TData, TVariables>) {
  const scope = useContext(ProfileContext);
  const scoped = isScoped(document);
  return useQuery<TData, TVariables>(document, {
    ...options,
    variables: { ...options?.variables, ...(scoped && scope?.profile ? { profileId: scope.profile.id } : {}) } as TVariables,
    skip: options?.skip || (scoped && scope !== null && !scope.profile),
  });
}

export function useProfileMutation<TData = any, TVariables extends OperationVariables = OperationVariables>(document: DocumentNode, options?: MutationHookOptions<TData, TVariables>) {
  const scope = useContext(ProfileContext);
  return useMutation<TData, TVariables>(document, {
    ...options,
    update: (cache, result, updateOptions) => {
      options?.update?.(cache, result, updateOptions);
      if (isScoped(document) && result.data) {
        // Retire inactive personal lists as well as refreshing the current view.
        // Otherwise returning to a previously visited page could reuse old stats.
        for (const fieldName of ["searchTransactions", "outstandingGicPurchases", "transactions", "transactionsByAccount", "transactionsByPlatform", "transactionsByStock", "transactionsByActivity", "transactionsFromThisWeek", "transactionsFromLastMonth", "transactionsByDateRange", "platforms", "contributionLimits", "contributionLimitsByAccount"]) {
          cache.evict({ id: "ROOT_QUERY", fieldName });
        }
      }
    },
    refetchQueries: options?.refetchQueries ?? "active",
    variables: { ...options?.variables, ...(isScoped(document) && scope?.profile ? { profileId: scope.profile.id } : {}) } as TVariables,
  });
}
