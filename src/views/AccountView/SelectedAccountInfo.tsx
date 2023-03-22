import { Col, Row } from "antd";
import { useEffect } from "react";

import { useQuery } from "@apollo/client";
import { Typography } from "@mui/material";

import { TRANSACTIONS_BY_ACCOUNT, TRANSACTIONS_BY_PLATFORM } from "./gql";

type SAProps = {
  platform: string | undefined;
  name: string | undefined;
  account: string | undefined;
  accountName: string | undefined
};

const SelectedAccountInfo = (props: SAProps) => {
  const { platform, name, account, accountName } = props;
  const { loading, error, data } = useQuery(platform?.includes("all") ? TRANSACTIONS_BY_ACCOUNT
   : TRANSACTIONS_BY_PLATFORM, {
    variables: {  platform, account },
  });
  useEffect(() => {
    
  }, [platform]);

  return (
    <Row>
      <Col span={24}>
        <Typography gutterBottom variant="h6">
          {accountName} {name}
        </Typography>
      </Col>
    </Row>
  );
};

export default SelectedAccountInfo;
