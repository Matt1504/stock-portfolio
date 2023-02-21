import { Row } from "antd";
import { ReactNode } from "react";

type RowProps = {
    children: ReactNode
};

export const CustomRow = (props: RowProps) => {
    const {children} = props;

    return (
        <Row style={{marginTop: 16, marginBottom: 16}}>
            {children}
        </Row>
    )
}