import { Col, Row, Space } from "antd";
import React from "react";

import { useQuery } from "@apollo/client";

import LoadingProgress from "../../components/LoadingProgress";
import { TransactionDataGrid } from "../../components/TransactionDataGrid";
import { ALL_ACCOUNTS_TRANSACTIONS } from "./gql";

const DashboardView = () => {
  const { loading, error, data, refetch } = useQuery(ALL_ACCOUNTS_TRANSACTIONS);

  return (
    <Row>
      {data && !loading ? (
        <Col span={24}>
          <TransactionDataGrid
            gridData={data?.transactions?.edges}
            defaultSort="transactionDate"
            ascending={false}
            removeColumns={[]}
            query={ALL_ACCOUNTS_TRANSACTIONS}
          />
        </Col>
      ) : (
        <LoadingProgress />
      )}
    </Row>
  );
};

export default DashboardView;
