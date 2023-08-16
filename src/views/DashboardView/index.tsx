import { Col, Divider, Row, Space } from "antd";
import React from "react";

import { useQuery } from "@apollo/client";
import { Typography } from "@mui/material";

import LoadingProgress from "../../components/LoadingProgress";
import { TransactionDataGrid } from "../../components/TransactionDataGrid";
import AddContributionLimit from "./AddContributionLimit";
import ContributionLimits from "./ContributionLimits";
import { DASHBOARD_TRANSACTIONS } from "./gql";

const DashboardView = () => {
  const { loading, error, data } = useQuery(DASHBOARD_TRANSACTIONS)
  return (
        loading ? <LoadingProgress/> :
        <>
          <AddContributionLimit accounts={data.accounts}/>
          <Divider />
          <ContributionLimits accounts={data.accounts} />
          <Col span={24}>
            <Typography variant="h6">
              Transactions This Week
            </Typography>
            <TransactionDataGrid
            gridData={data?.transactionsFromThisWeek}
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
