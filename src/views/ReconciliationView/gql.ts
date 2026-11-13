import { gql } from "@apollo/client";
export const COMPARISON = gql`fragment ReconciliationComparison on Preview {
  platform currency statementEnd dateBasis fingerprint canFinish issues scope
  cash { statement calculated difference outcome }
  holdings { stockId ticker assetType shares { statement calculated difference outcome } bookCost { statement calculated difference outcome } }
  pendingTrades { id ticker transactionDate settlementDate cashEffect }
}`;
export const SAVED = gql`fragment SavedComparison on SavedReconciliation {
  id state statementEnd createdAt reviewedAt note needsRecheck platform dateBasis periodStart statementCash completeHoldings moneyTolerance shareTolerance
  snapshot { ...ReconciliationComparison }
} ${COMPARISON}`;
export const PREVIEW = gql`query PreviewReconciliation($profileId: ID!, $input: ReconciliationInput!) {
  previewReconciliation(profileId: $profileId, input: $input) { ...ReconciliationComparison }
} ${COMPARISON}`;
export const SAVE = gql`mutation SaveReconciliation($profileId: ID!, $input: ReconciliationInput!, $previewFingerprint: String, $state: String!, $note: String, $id: ID) {
  saveReconciliation(profileId: $profileId, input: $input, previewFingerprint: $previewFingerprint, state: $state, note: $note, id: $id) { reconciliation { ...SavedComparison } }
} ${SAVED}`;
export const HISTORY = gql`query ReconciliationHistory($profileId: ID!, $platform: ID!, $after: ID) {
  reconciliations(profileId: $profileId, platform: $platform, after: $after) { items { ...SavedComparison } nextCursor }
} ${SAVED}`;
