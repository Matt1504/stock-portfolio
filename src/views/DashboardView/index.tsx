import { coldRefetch } from "../../utils/coldRefetch";
import { useProfileQuery as useQuery } from "../../profiles/hooks";
import { useState } from "react";
import dayjs from "dayjs";
import { Alert, Col } from "antd";

import { useApolloClient } from "@apollo/client";
import { Stack, Typography } from "@mui/material";

import LoadingProgress from "../../components/LoadingProgress";
import ReloadButton from "../../components/ReloadButton";
import { TransactionDataGrid, TransactionDateRange } from "../../components/TransactionDataGrid";
import AddContributionLimit from "./AddContributionLimit";
import PortfolioOverview from "./PortfolioOverview";
import ContributionLimits from "./ContributionLimits";
import { DASHBOARD_TRANSACTIONS, GET_CONTRIBUTION_LIMITS, TRANSACTIONS_BY_ACTIVITY, PORTFOLIO_OVERVIEW } from "./gql";

const DashboardView = () => {
  const [bulkEditing, setBulkEditing] = useState(false);
  const client = useApolloClient();
  const [dateRange, setDateRange] = useState<TransactionDateRange>(() => ({
    start: dayjs().subtract(29, "day").format("YYYY-MM-DD"),
    end: dayjs().format("YYYY-MM-DD"),
  }));
  const {loading, data, previousData, error} = useQuery(DASHBOARD_TRANSACTIONS, {
    variables: { startDate: dateRange.start ?? null, endDate: dateRange.end ?? null },
    notifyOnNetworkStatusChange: true,
  });
  const handleReload = () => coldRefetch(client, [DASHBOARD_TRANSACTIONS, GET_CONTRIBUTION_LIMITS, TRANSACTIONS_BY_ACTIVITY, PORTFOLIO_OVERVIEW]);

  const accounts = data?.accounts ?? previousData?.accounts;

  return (
        <>
          <Stack
            direction="row"
            justifyContent="flex-end"
            alignItems="center" spacing={2} sx={{ mb: 3, flexWrap: "wrap", rowGap: 2 }}>
            {accounts && <AddContributionLimit accounts={accounts}/>}
            <ReloadButton onReload={handleReload} loading={loading} disabled={bulkEditing} />
          </Stack>
          <PortfolioOverview />
          {accounts ? <ContributionLimits accounts={accounts} /> : loading && <LoadingProgress />}
          <Col span={24} style={{ marginTop: 32 }}>
            <Typography variant="h6">
              Recent Transactions
            </Typography>
            {error && <Alert type="error" showIcon message="Unable to load transactions for this date range. Try reloading or changing the dates." style={{ marginTop: 16 }} />}
            <TransactionDataGrid
              onBulkEditChange={setBulkEditing}
              gridData={!loading && !error ? data?.recentTransactions ?? [] : []}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              loading={loading}
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
