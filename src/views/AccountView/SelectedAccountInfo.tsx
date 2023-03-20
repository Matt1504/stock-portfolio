import { Col, Row } from "antd";
import { useEffect } from "react";

import { Typography } from "@mui/material";

type SAProps = {
  platform: string | undefined;
  name: string | undefined;
  account: string | undefined;
};

const SelectedAccountInfo = (props: SAProps) => {
  const { platform, name, account } = props;

  return (
    <Row>
      <Col span={24}>
        <Typography gutterBottom variant="h6">
          {account} {name}
        </Typography>
      </Col>
    </Row>
  );
};

export default SelectedAccountInfo;
