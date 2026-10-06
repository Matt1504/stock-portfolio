import { useProfileQuery as useQuery } from "../../profiles/hooks";
import { Card, Col, Row, Statistic } from "antd";
import { useEffect, useState } from "react";


import { Typography } from "@mui/material";

import { Account } from "../../models/Account";
import { Activity } from "../../models/Activity";
import { ContributionLimt } from "../../models/ContributionLimit";
import { GraphQLEdge } from "../../models/GraphQLEdge";
import { GraphQLNode } from "../../models/GraphQLNode";
import { Transaction } from "../../models/Transaction";
import { formatNumberAsCurrency, formatNumber } from "../../utils/utils";
import ContributionBars from "./ContributionBars";
import ContributionGraph from "./ContributionGraph";
import { GET_CONTRIBUTION_LIMITS, TRANSACTIONS_BY_ACTIVITY } from "./gql";

type CLProps = {
    accounts: GraphQLEdge<Account>;
};

const ContributionLimits = (props: CLProps) => {
    const {accounts} = props;
    const eligibleAccounts = accounts.edges.filter(account => account.node.hasContributionLimit !== false);
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
        return limit > 0 ? (contribution / limit) * 100 : 0;
    }

    function printContributionUsed(accountId: string, hasLimit: boolean) {
        const contribution = contributions?.get(accountId) ?? 0;
        const limit = contributionLimits?.get(accountId) ?? 0;
        return hasLimit ? `${formatNumberAsCurrency(contribution)} / ${formatNumberAsCurrency(limit)}` : `$${formatNumber(contribution, 2, 2)} / -`;
    }

    if (!accounts.edges.length) return null;

    return (
        <Row gutter={[24, 24]}>
            <Col span={24}>
                <Typography variant="h6">
                Contributions
                </Typography>
            </Col>
            {accounts.edges.map((account: GraphQLNode<Account>) => {
                const name = account.node.name ?? "";
                const savingsIndex = name.indexOf("Savings");
                return (
                    <Col xs={24} md={12} xl={6} key={account.node.id}>
                        <Card role="group" aria-label={`${account.node.code} contributions`}>
                            <Statistic 
                                loading={isLoading}
                                title={<span style={{ display: "inline-block", minHeight: 39 }}>
                                    {savingsIndex > 0 ? <>{name.slice(0, savingsIndex)}<br />{name.slice(savingsIndex)}</> : name}
                                </span>}
                                value={account.node.hasContributionLimit === false ? "-" : computeContributionUsed(account.node.id ?? "")}
                                suffix={account.node.hasContributionLimit === false ? undefined : "%"}
                                precision={account.node.hasContributionLimit === false ? undefined : 2}
                            />
                            {!isLoading && <Typography display="block" variant="overline" sx={{ mt: 2, lineHeight: 1.6 }}>{printContributionUsed(account.node.id ?? "", account.node.hasContributionLimit !== false)}</Typography>}
                        </Card>
                    </Col>
                )
            })}
            <Col span={24}>
                {!isLoading && <ContributionBars data={accounts.edges.map(({ node }) => ({ name: node.code ?? "", contribution: contributions.get(node.id ?? "") ?? 0, limit: node.hasContributionLimit === false ? undefined : contributionLimits.get(node.id ?? "") ?? 0 }))} />}
            </Col>
            <Col span={24}>
                {data && eligibleAccounts.length > 0 && <ContributionGraph accounts={eligibleAccounts} contributionLimits={data.contributionLimits} transactions={transactions?.transactions ?? []} />}
            </Col>
        </Row>
    );
};

export default ContributionLimits;
