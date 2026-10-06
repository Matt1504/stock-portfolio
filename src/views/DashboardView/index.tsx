import LastUpdated from "../../components/LastUpdated";
import { coldRefetch } from "../../utils/coldRefetch";
import { useProfileQuery } from "../../profiles/hooks";
import { useApolloClient } from "@apollo/client";
import { Stack } from "@mui/material";
import { Alert } from "antd";
import LoadingProgress from "../../components/LoadingProgress";
import ReloadButton from "../../components/ReloadButton";
import AddContributionLimit from "./AddContributionLimit";
import PortfolioOverview from "./PortfolioOverview";
import ContributionLimits from "./ContributionLimits";
import { DASHBOARD_METADATA, GET_CONTRIBUTION_LIMITS, TRANSACTIONS_BY_ACTIVITY, PORTFOLIO_OVERVIEW } from "./gql";

const DashboardView = () => {
  const client = useApolloClient();
  const { data, loading, error } = useProfileQuery(DASHBOARD_METADATA, { notifyOnNetworkStatusChange: true });
  return <>
    <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2} sx={{ mb: 3, flexWrap: "wrap", rowGap: 2 }}>
      {data?.accounts && <AddContributionLimit accounts={data.accounts} />}
      <LastUpdated queries={[DASHBOARD_METADATA, GET_CONTRIBUTION_LIMITS, TRANSACTIONS_BY_ACTIVITY, PORTFOLIO_OVERVIEW]} />
      <ReloadButton loading={loading} onReload={() => coldRefetch(client, [DASHBOARD_METADATA, GET_CONTRIBUTION_LIMITS, TRANSACTIONS_BY_ACTIVITY, PORTFOLIO_OVERVIEW])} />
    </Stack>
    {error && <Alert type="error" message="Unable to load dashboard. Try refreshing." />}
    <PortfolioOverview />
    {data?.accounts ? <ContributionLimits accounts={data.accounts} /> : loading && <LoadingProgress />}
  </>;
};
export default DashboardView;
