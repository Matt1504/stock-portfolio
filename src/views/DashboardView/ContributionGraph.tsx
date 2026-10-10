import ChartTimeRange, { ChartRange, chartHistoryInRange } from "../../components/ChartTimeRange";
import { Col, Radio, RadioChangeEvent } from "antd";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { Account } from "../../models/Account";
import { GraphQLNode } from "../../models/GraphQLNode";
import { formatNumber } from "../../utils/utils";

import { AnalyticsPoint, graphPoints } from "../../components/FinancialAnalytics";
type CGProps = {
    accounts: Array<GraphQLNode<Account>>,
    summaries: { accountId: string; history: AnalyticsPoint[] }[]
};

const ContributionGraph = (props: CGProps) => {
    const {accounts, summaries} = props;
    const [chartRange, setChartRange] = useState<ChartRange>("all");
    const [selectedAccount, setSelectedAccount] = useState(0);

    const graphContributionData = graphPoints(summaries.find(item => item.accountId === accounts[selectedAccount]?.node.id)?.history);

    const onRadioChange = (e: RadioChangeEvent) => {
        setSelectedAccount(e.target.value);
    }



    return (
        <>
            <Col span={24}>
                <Radio.Group value={selectedAccount} onChange={onRadioChange} optionType="button" buttonStyle="solid">
                {accounts.map((account: GraphQLNode<Account>, index: number) => {
                    return (
                    <Radio key={account.node.id} value={index}>
                        {account.node.code}
                    </Radio>
                    );
                })}
                </Radio.Group>
            </Col>
            <Col span={24} style={{ display: "flex", justifyContent: "flex-end" }}>
                <ChartTimeRange value={chartRange} onChange={setChartRange} label="Contribution history time range" />
            </Col>
            <Col span={24} className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart
                        width={800}
                        height={400}
                        data={chartHistoryInRange(graphContributionData, chartRange)}
                        margin={{
                            top: 30,
                            right: 30,
                            left: 0,
                            bottom: 0,
                        }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={value => formatNumber(Number(value), 2)} />
                            <Tooltip formatter={(value: any) => `$${formatNumber(Number(value), 2, 2)}`}/>
                            <Line
                                type="monotone"
                                dataKey="value"
                                name="Total Contribution"
                                stroke="#82ca9d"
                            />
                            {accounts[selectedAccount]?.node.hasContributionLimit !== false && <Line
                                type="monotone"
                                dataKey="value_1"
                                name="Contribution Limit"
                                stroke="#FF6961"
                            />}
                        </LineChart>
                </ResponsiveContainer>
            </Col>
        </>
    );
}

export default ContributionGraph;
