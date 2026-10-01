import { Card, Col, Row, Statistic } from "antd";
import { useEffect, useState } from "react";

import { useQuery } from "@apollo/client";
import { Typography } from "@mui/material";

import { Account } from "../../models/Account";
import { Activity } from "../../models/Activity";
import { ContributionLimt } from "../../models/ContributionLimit";
import { GraphQLEdge } from "../../models/GraphQLEdge";
import { GraphQLNode } from "../../models/GraphQLNode";
import { Transaction } from "../../models/Transaction";
import { formatNumberAsCurrency } from "../../utils/utils";
import ContributionGraph from "./ContributionGraph";
import { GET_CONTRIBUTION_LIMITS, TRANSACTIONS_BY_ACTIVITY } from "./gql";

type CLProps = {
    accounts: GraphQLEdge<Account>;
};

const ContributionLimits = (props: CLProps) => {
    const {accounts} = props;
    const [contributionLimits, setContributionLimits] = useState<Map<string, number>>(new Map<string, number>());
    const [contributions, setContributions] = useState<Map<string, number>>(new Map<string, number>());
    const {data, loading: limitsLoading} = useQuery(GET_CONTRIBUTION_LIMITS, {
        notifyOnNetworkStatusChange: true,
    });
    const contributionId = data?.activities.edges.find(
        (activity: GraphQLNode<Activity>) => activity.node.name === "Contribution"
    )?.node.id;
    const { data: transactions, loading: contributionsLoading } = useQuery(TRANSACTIONS_BY_ACTIVITY, {
        variables: { activity: contributionId },
        skip: !contributionId,
        notifyOnNetworkStatusChange: true,
    });
    const isLoading = limitsLoading || contributionsLoading;

    useEffect(() => {
        if (!data) return;
        var limitMap = new Map<string, number>();
        var contributionMap = new Map<string, number>(); 

        data.contributionLimits.edges.forEach((limit: GraphQLNode<ContributionLimt>) => {
            const account = limit.node.account?.id ?? "";
            const amount = limit.node.amount ?? 0;

            let value = limitMap.get(account);
            if (value) {
                value += amount;
            } else {
                value = amount;
            }
            limitMap.set(account, value);
        });

        (transactions?.transactions ?? []).forEach((transaction: Transaction) => {
            const account = transaction.account?.id ?? "";
            const amount = transaction.total ?? 0;

            let value = contributionMap.get(account);
            if (value) {
                value += amount;
            } else {
                value = amount;
            }
            contributionMap.set(account, value);
        });

        setContributionLimits(limitMap);
        setContributions(contributionMap);
    }, [data, transactions]);

    function computeContributionUsed(accountId: string) {
        const contribution = contributions?.get(accountId) ?? 0;
        const limit = contributionLimits?.get(accountId) ?? 0;
        return (contribution / limit) * 100; 
    }

    function printContributionUsed(accountId: string) {
        const contribution = contributions?.get(accountId) ?? 0;
        const limit = contributionLimits?.get(accountId) ?? 0;
        return `${formatNumberAsCurrency(contribution)} / ${formatNumberAsCurrency(limit)}`;
    }

    return (
        <Row gutter={[24, 24]}>
            <Col span={24}>
                <Typography variant="h6">
                Contribution Limits
                </Typography>
            </Col>
            {accounts.edges.map((account: GraphQLNode<Account>) => {
                return (
                    <Col xs={24} md={12} xl={8} key={account.node.id}>
                        <Card>
                            <Statistic 
                                loading={isLoading}
                                title={account.node.name}
                                value={computeContributionUsed(account.node.id ?? "")}
                                suffix="%"
                                precision={2}
                            />
                            {!isLoading && <Typography display="block" variant="overline" sx={{ mt: 2, lineHeight: 1.6 }}>{printContributionUsed(account.node.id ?? "")}</Typography>}
                        </Card>
                    </Col>
                )
            })}
            <Col span={24}>
                {data && accounts.edges.length > 0 && <ContributionGraph accounts={accounts.edges} contributionLimits={data.contributionLimits} transactions={transactions?.transactions ?? []} />}
            </Col>
        </Row>
    );
};

export default ContributionLimits;
