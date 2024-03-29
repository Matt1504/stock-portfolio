import { Card, Col, Row, Statistic } from "antd";
import { useEffect, useState } from "react";

import { useLazyQuery, useQuery } from "@apollo/client";
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
    reload: boolean;
    setReload: Function;
};

const ContributionLimits = (props: CLProps) => {
    const {accounts, reload, setReload} = props;
    const [isLoading, setIsLoading] = useState(true);
    const [contributionId, setContributionId] = useState("");
    const [contributionLimits, setContributionLimits] = useState<Map<string, number>>(new Map<string, number>());
    const [contributions, setContributions] = useState<Map<string, number>>(new Map<string, number>());
    const {data} = useQuery(GET_CONTRIBUTION_LIMITS);
    const [fetchContributions, { data: transactions}] = useLazyQuery(TRANSACTIONS_BY_ACTIVITY, {
        variables: { activity: contributionId },
        notifyOnNetworkStatusChange: true,
    });

    useEffect(() => {
        if (data) {
            var contribution_activity = data.activities.edges.filter((x: GraphQLNode<Activity>) => x.node.name === "Contribution");
            if (contribution_activity.length) {
                setContributionId(contribution_activity[0].node.id)
            }
        }
    }, [data]);

    useEffect(() => {
        if (reload) {
            fetchContributions();
            setReload(false);
        }
    }, [reload]);

    useEffect(() => {
        if (contributionId) {
            fetchContributions();
        }
    }, [contributionId]);

    useEffect(() => {
        if (transactions) {
            processContributions();
        }
    }, [transactions]);

    const processContributions = () => {
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

        transactions.transactions.forEach((transaction: Transaction) => {
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
        setIsLoading(false);
    }

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
        <Row>
            <Col span={24}>
                <Typography variant="h6">
                Contribution Limits
                </Typography>
            </Col>
            {accounts.edges.map((account: GraphQLNode<Account>) => {
                return (
                    <Col span={8} key={account.node.id}>
                        <Card style={{ marginTop: 8, marginBottom: 16, marginLeft: 24, marginRight: 24 }}>
                            <Statistic 
                                loading={isLoading}
                                title={`${account.node.name} (${account.node.code})`}
                                value={computeContributionUsed(account.node.id ?? "")}
                                suffix="%"
                                precision={2}
                            />
                            {!isLoading && <Typography display="block" variant="overline">{printContributionUsed(account.node.id ?? "")}</Typography>}
                        </Card>
                    </Col>
                )
            })}
            <Col span={24}>
                <ContributionGraph accounts={accounts?.edges ?? []} contributionLimits={data?.contributionLimits} transactions={transactions?.transactions ?? []} />
            </Col>
        </Row>
    );
};

export default ContributionLimits;
