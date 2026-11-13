import { gql } from "@apollo/client";
import { Typography } from "antd";
import { useProfileQuery } from "../profiles/hooks";
const STATUS = gql`query ReconciliationStatus($profileId: ID!, $platform: ID!) {
  reconciliations(profileId: $profileId, platform: $platform, first: 1, completedOnly: true) {
    items { id state statementEnd needsRecheck snapshot { scope } }
  }
}`;
export default function ReconciliationStatus({ platform }: { platform: string }) {
  const { data, loading, error } = useProfileQuery(STATUS, { variables: { platform }, fetchPolicy: "network-only" });
  const review = data?.reconciliations.items[0];
  if (loading) return null;
  return <Typography.Text type="secondary" style={{ display: "block", marginTop: 12 }}>
    {error ? "Unable to check reconciliation status." : !review ? "No completed statement review yet." : `${review.needsRecheck ? "Needs recheck" : review.state === "matched" ? "Matched checked scope" : "Reviewed with exceptions"} · Statement ${review.statementEnd} · ${review.snapshot.scope.join(", ")}`}
  </Typography.Text>;
}
