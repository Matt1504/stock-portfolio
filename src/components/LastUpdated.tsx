import { DocumentNode } from "@apollo/client";
import { Typography } from "antd";
import { useLastUpdated } from "../utils/dataFreshness";
export default function LastUpdated({ queries }: { queries: DocumentNode[] }) {
  const timestamp = useLastUpdated(queries);
  return <Typography.Text type="secondary" style={{ fontSize: 12 }} title="Earliest fetch time among the displayed query results. Cached data retains its original fetch time.">
    Last fetched: {timestamp ? <time dateTime={timestamp}>{new Date(timestamp).toLocaleString()}</time> : '—'}
  </Typography.Text>;
}
