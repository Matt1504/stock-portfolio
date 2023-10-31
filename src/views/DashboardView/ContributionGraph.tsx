import { Col, Radio, RadioChangeEvent } from "antd";
import { useEffect, useState } from "react";
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
import { compareDates } from "../../utils/utils";

type CGProps = {
    accounts: Array<GraphQLNode<Account>>,
    transactions: Array<Transaction>,
    contributionLimits: GraphQLEdge<ContributionLimt>
};

const ContributionGraph = (props: CGProps) => {
    const {accounts, transactions, contributionLimits} = props;
    const [graphContributionData, setGraphContributionData] = useState<GraphData[]>([]);
    const [selectedAccount, setSelectedAccount] = useState(0);

    function processContributionData(index = 0) {
        const account = accounts[index];
        const contributionHistory = new Map<string, GraphData>();
        let contributionTotal = 0;

        transactions.filter((transaction: Transaction) => transaction.account?.id === account.node.id).forEach((transaction: Transaction) => {
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

        const accountContributionLimits = contributionLimits?.edges.filter((limit: GraphQLNode<ContributionLimt>) => limit.node.account?.id === account.node.id);
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
                    limitTotal += (currLimit.node.amount ?? 0)
                }
                x.value_1 = limitTotal;
            });
        }
        setGraphContributionData(graphData);
    }

    const onRadioChange = (e: RadioChangeEvent) => {
        setSelectedAccount(e.target.value);
        processContributionData(e.target.value);
    }

    useEffect(() => {
        if (transactions.length || contributionLimits) {
            processContributionData();
        }
    }, [transactions, contributionLimits]);

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
            <Col span={24} className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart
                        width={800}
                        height={400}
                        data={graphContributionData}
                        margin={{
                            top: 30,
                            right: 30,
                            left: 0,
                            bottom: 0,
                        }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value: any, name: any) => `$${value.toFixed(2)}`}/>
                            <Line
                                type="monotone"
                                dataKey="value"
                                name="Total Contribution"
                                stroke="#82ca9d"
                            />
                            <Line
                                type="monotone"
                                dataKey="value_1"
                                name="Contribution Limit"
                                stroke="#FF6961"
                            />
                        </LineChart>
                </ResponsiveContainer>
            </Col>
        </>
    );
}

export default ContributionGraph;