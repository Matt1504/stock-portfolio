import { Col, Divider } from "antd";

import { useApolloClient, useQuery } from "@apollo/client";
import { Stack, Typography } from "@mui/material";

import LoadingProgress from "../../components/LoadingProgress";
import ReloadButton from "../../components/ReloadButton";
import { TransactionDataGrid } from "../../components/TransactionDataGrid";
import AddContributionLimit from "./AddContributionLimit";
import ContributionLimits from "./ContributionLimits";
import { DASHBOARD_TRANSACTIONS, GET_CONTRIBUTION_LIMITS, TRANSACTIONS_BY_ACTIVITY } from "./gql";

const DashboardView = () => {
  const client = useApolloClient();
  const {loading, data} = useQuery(DASHBOARD_TRANSACTIONS, {
    notifyOnNetworkStatusChange: true,
  });
  const handleReload = () => client.refetchQueries({
    include: [DASHBOARD_TRANSACTIONS, GET_CONTRIBUTION_LIMITS, TRANSACTIONS_BY_ACTIVITY],
  });

  return (
        !data ? <LoadingProgress/> :
        <>
          <AddContributionLimit accounts={data.accounts}/>
          <Divider />
          <Stack
            direction="row"
            justifyContent="flex-end"
            alignItems="center" sx={{ mb: 2 }}>
            <ReloadButton onReload={handleReload} loading={loading} />
          </Stack>
          <ContributionLimits accounts={data.accounts} />
          <Col span={24} style={{ marginTop: 32 }}>
            <Typography variant="h6">
              Transactions From Last 30 Days
            </Typography>
            <TransactionDataGrid
              gridData={data?.transactionsFromLastMonth}
              defaultSort="transactionDate"
              ascending={false}
              removeColumns={[]}
              query={DASHBOARD_TRANSACTIONS}
            />
          </Col>
        </>
  );
};

export default DashboardView;
