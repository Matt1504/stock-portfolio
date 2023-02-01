import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

const titleStyle: React.CSSProperties = {
    paddingInline: 16,
    marginTop: 8
};

type TProps = {
    title: String
};

const TitleComponent = (props:TProps) => {
    const { title } = props;
    return (
        <Title level={3} style={titleStyle}>{title}</Title>
    )
}

export default TitleComponent;