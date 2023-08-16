import { Button, Col, Form, Input, InputNumber, Radio, Row } from "antd";

import { useMutation } from "@apollo/client";

import { NotificationComponent } from "../../components/Notification";
import { Account } from "../../models/Account";
import { ContributionLimt } from "../../models/ContributionLimit";
import { GraphQLEdge } from "../../models/GraphQLEdge";
import { GraphQLNode } from "../../models/GraphQLNode";
import { CREATE_CONTRIBUTION, GET_CONTRIBUTION_LIMITS } from "./gql";

type ACSProps = {
  accounts: GraphQLEdge<Account>;
};

const AddContributionLimit = (props: ACSProps) => {
  const { accounts } = props;
  const notification = new NotificationComponent();
  const [form] = Form.useForm();

  const [createContributionLimit] = useMutation(CREATE_CONTRIBUTION, {
    update: (cache: any, mutationResult: any) => {
      if (!mutationResult.data.createContributionLimit) {
        notification.openNotificationWithIcon(
          "error",
          "Error Adding Contribution Limit",
          "The contribution limit could not be added to the database because it already exists."
        );
      }
      var newContributionLimit: ContributionLimt = mutationResult.data.createContributionLimit.contributionLimit;
      const readData = cache.readQuery({
        query: GET_CONTRIBUTION_LIMITS,
      });
      cache.writeQuery({
        query: GET_CONTRIBUTION_LIMITS,
        data: {
          stocks: { edges: [...readData.contributionLimits.edges, { node: newContributionLimit }] },
          currencies: readData.currencies,
        },
      });
      notification.openNotificationWithIcon(
        "success",
        "Contribution Limit Added",
        `Contribution Limit of $${newContributionLimit.amount} for ${newContributionLimit.account?.code} for the year ${newContributionLimit.year} successfully added to the database.`
      );
      form.resetFields();
    },
  });

  const onFinish = async (values: ContributionLimt) => {
    await createContributionLimit({
      variables: {
        contribution: values,
      },
    });
  };

  return (
    <Row>
      {notification.contextHolder}
      <Col span={24}>
        <Form
          form={form}
          name="horizontal_add_contribution_limit"
          layout="inline"
          onFinish={onFinish}
        >
          <Form.Item
            name="amount"
            label="Add Contribution Limit"
            style={{ width: 400 }}
            rules={[
              {
                required: true,
                message: "Please input the amount!",
              },
            ]}
          >
            <InputNumber
                step={0.01}
                placeholder="Amount"
                keyboard
                min={0}
                addonBefore="$"
              />
          </Form.Item>
          <Form.Item
            name="year"
            style={{ width: 150 }}
            rules={[
              {
                required: true,
                message: "Please input the year!",
              },
            ]}
          >
            <Input type="number" placeholder="Year" />
          </Form.Item>
          <Form.Item name="account" rules={[{ required: true }]}>
            <Radio.Group optionType="button" buttonStyle="solid">
              {accounts?.edges.map((account: GraphQLNode<Account>) => {
                return (
                  <Radio key={account.node.id} value={account.node.id}>
                    {account.node.code}
                  </Radio>
                );
              })}
            </Radio.Group>
          </Form.Item>
          <Form.Item shouldUpdate>
            {() => (
              <Button
                type="primary"
                htmlType="submit"
                disabled={
                  !form.isFieldsTouched(true) ||
                  !!form.getFieldsError().filter(({ errors }) => errors.length)
                    .length
                }
              >
                Add Contribution Limit
              </Button>
            )}
          </Form.Item>
        </Form>
      </Col>
    </Row>
  );
};

export default AddContributionLimit;
