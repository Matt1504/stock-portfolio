import { Typography } from "antd";
import React from "react";

const { Title } = Typography;

const titleStyle: React.CSSProperties = {
  paddingInline: 16,
  marginTop: 8,
};

type TProps = {
  title: String;
  collapsed: boolean;
};

const TitleComponent = (props: TProps) => {
  const { title, collapsed } = props;
  return (
    <Title
      level={3}
      style={{
        paddingInline: 16,
        marginTop: 8,
        transition: "margin-left 0.3s",
        marginLeft: collapsed ? 80 : 200,
      }}
    >
      {title}
    </Title>
  );
};

export default TitleComponent;
