import { useProfileQuery as useQuery } from "../../profiles/hooks";
import { Alert, Card, Col, Row, Statistic } from "antd";


import { Typography } from "@mui/material";

import { Account } from "../../models/Account";
import { GraphQLEdge } from "../../models/GraphQLEdge";
import { GraphQLNode } from "../../models/GraphQLNode";
import { formatNumberAsCurrency, formatNumber } from "../../utils/utils";
import ContributionBars from "./ContributionBars";
import ContributionGraph from "./ContributionGraph";
import { CONTRIBUTION_ANALYTICS } from "./gql";

type CLProps = {
    accounts: GraphQLEdge<Account>;
};

const ContributionLimits = (props: CLProps) => {
    const {accounts} = props;
    const {data, loading: isLoading, error} = useQuery(CONTRIBUTION_ANALYTICS, { notifyOnNetworkStatusChange: true });
    const summaries = data?.contributionAnalytics ?? [];
    const summaryFor = (id: string) => summaries.find((item: any) => item.accountId === id);
    function printContributionUsed(accountId: string, hasLimit: boolean) {
        const summary = summaryFor(accountId);
        const contribution = Number(summary?.contribution ?? 0);
        const limit = Number(summary?.limit ?? 0);
        return hasLimit ? `${formatNumberAsCurrency(contribution)} / ${formatNumberAsCurrency(limit)}` : `$${formatNumber(contribution, 2, 2)} / -`;
    }

    if (!accounts.edges.length) return null;

    return (
        <Row gutter={[24, 24]}>
            {error && <Col span={24}><Alert type="error" showIcon message="Unable to load contributions. Try refreshing." /></Col>}
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
                                value={account.node.hasContributionLimit === false ? "-" : Number(summaryFor(account.node.id ?? "")?.percentage ?? 0)}
                                suffix={account.node.hasContributionLimit === false ? undefined : "%"}
                                precision={account.node.hasContributionLimit === false ? undefined : 2}
                            />
                            {!isLoading && <Typography display="block" variant="overline" sx={{ mt: 2, lineHeight: 1.6 }}>{printContributionUsed(account.node.id ?? "", account.node.hasContributionLimit !== false)}</Typography>}
                        </Card>
                    </Col>
                )
            })}
            <Col span={24}>
                {!isLoading && <ContributionBars data={accounts.edges.map(({ node }) => ({ name: node.code ?? "", contribution: Number(summaryFor(node.id ?? "")?.contribution ?? 0), limit: node.hasContributionLimit === false ? undefined : Number(summaryFor(node.id ?? "")?.limit ?? 0) }))} />}
            </Col>
            <Col span={24}>
                {data && <ContributionGraph accounts={accounts.edges} summaries={summaries} />}
            </Col>
        </Row>
    );
};

export default ContributionLimits;
