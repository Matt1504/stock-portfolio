import { gql } from "@apollo/client";
export const AUDIT = gql`query TransactionAudit($profileId: ID!, $platform: ID, $transactionId: ID, $operationId: String, $after: ID) {
  transactionAudit(profileId: $profileId, platform: $platform, transactionId: $transactionId, operationId: $operationId, after: $after) {
    items { id transactionId occurredAt action source operationId note changes { field before after } } nextCursor
  }
}`;
export const SCAN = gql`query DuplicateCandidates($profileId: ID!, $platform: ID) {
  duplicateCandidates(profileId: $profileId, platform: $platform) {
    scannedCount candidateCount truncated groups { fingerprint kind reason members { id platform platformName transactionDate activity ticker currency total shares price fee } }
  }
}`;
export const DISMISS = gql`mutation DismissDuplicate($profileId: ID!, $fingerprint: String!, $reason: String!) {
  dismissDuplicate(profileId: $profileId, fingerprint: $fingerprint, reason: $reason) { success }
}`;
