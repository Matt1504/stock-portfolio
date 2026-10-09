import ChartTimeRange, { ChartRange, chartHistoryInRange } from "../../components/ChartTimeRange";
import { Col, Radio, RadioChangeEvent } from "antd";
import { useMemo, useState } from "react";
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
import { ContributionLimt } from "../../models/ContributionLimit";
import { GraphData } from "../../models/GraphData";
import { GraphQLEdge } from "../../models/GraphQLEdge";
import { GraphQLNode } from "../../models/GraphQLNode";
import { Transaction } from "../../models/Transaction";
import { compareDates, formatNumber } from "../../utils/utils";

type CGProps = {
    accounts: Array<GraphQLNode<Account>>,
    transactions: Array<Transaction>,
    contributionLimits: GraphQLEdge<ContributionLimt>
};

const ContributionGraph = (props: CGProps) => {
    const {accounts, transactions, contributionLimits} = props;
    const [chartRange, setChartRange] = useState<ChartRange>("all");
    const [selectedAccount, setSelectedAccount] = useState(0);

    const graphContributionData = useMemo(() => {
        const account = accounts[selectedAccount];
        if (!account) return [];
        const contributionHistory = new Map<string, GraphData>();
        let contributionTotal = 0;

        [...transactions].sort((a, b) => compareDates(a.transactionDate, b.transactionDate)).filter((transaction: Transaction) => transaction.account?.id === account.node.id).forEach((transaction: Transaction) => {
            const contributionAmount = (transaction.total ?? 0);
            const transDate = transaction.transactionDate.toString();
            let transHistory = contributionHistory.get(transDate);

            contributionTotal += contributionAmount;
            
            if (transHistory) {
                transHistory.value += contributionAmount;
            } else {
                transHistory = new GraphData(
                    transDate,
                    contributionTotal,
                    0,
                    undefined
                );
            }
            contributionHistory.set(transDate, transHistory);
        });

        const accountContributionLimits = account.node.hasContributionLimit === false ? [] : (contributionLimits?.edges ?? []).filter((limit: GraphQLNode<ContributionLimt>) => limit.node.account?.id === account.node.id);
        const graphData = Array.from(contributionHistory.values());
        
        if (accountContributionLimits.length) {
            let counter = 0;
            let limitTotal = accountContributionLimits[counter].node.amount ?? 0;
            
            graphData.forEach((x: GraphData, idx: number) => {
                const currDeadline = accountContributionLimits[counter].node.yearEnd;
                const transDate = x.name as string;
                let increment = false;
                if (idx > 0 && compareDates(currDeadline as Date, new Date(transDate)) < 0) {
                    increment = true;
                }
                if (increment) {
                    counter++;
                    const currLimit = accountContributionLimits[counter];
                    if  (currLimit) {
                        limitTotal += (currLimit.node.amount ?? 0);
                    }
                }
                x.value_1 = limitTotal;
            });
        }
        return graphData;
    }, [accounts, selectedAccount, transactions, contributionLimits]);

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
