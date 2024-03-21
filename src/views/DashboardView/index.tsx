import { Button, Col, Divider } from "antd";
import React, { useEffect, useState } from "react";

import { ReloadOutlined } from "@ant-design/icons";
import { useLazyQuery } from "@apollo/client";
import { Stack, Typography } from "@mui/material";

import LoadingProgress from "../../components/LoadingProgress";
import { TransactionDataGrid } from "../../components/TransactionDataGrid";
import AddContributionLimit from "./AddContributionLimit";
import ContributionLimits from "./ContributionLimits";
import { DASHBOARD_TRANSACTIONS } from "./gql";

const DashboardView = () => {
  const [fetchData, {loading, data}] = useLazyQuery(DASHBOARD_TRANSACTIONS, {
    notifyOnNetworkStatusChange: true,
  });
  const [reload, setReload] = useState(false);

  const handleReload = () => {
    setReload(true);
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
        loading || !data ? <LoadingProgress/> :
        <>
          <AddContributionLimit accounts={data.accounts}/>
          <Divider />
          <Stack
            direction="row"
            justifyContent="flex-end"
            alignItems="center">
            <Button
              onClick={() => handleReload()}
              type="primary"
              shape="round"
              icon={<ReloadOutlined />}
            />
          </Stack>
          <ContributionLimits accounts={data.accounts} reload={reload} setReload={setReload} />
          <Col span={24}>
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
