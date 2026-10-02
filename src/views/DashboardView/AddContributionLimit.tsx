import { useProfileMutation as useMutation } from "../../profiles/hooks";
import { Button, DatePicker, Form, InputNumber, Modal, Radio } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useState } from "react";
import { Dayjs } from "dayjs";



import { NotificationComponent } from "../../components/Notification";
import { Account } from "../../models/Account";
import {
  ContributionLimt
} from "../../models/ContributionLimit";
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

  const [dialogOpen, setDialogOpen] = useState(false);

  const [createContributionLimit, { loading: saving }] = useMutation(CREATE_CONTRIBUTION, {
    update: (cache: any, mutationResult: any, options: any) => {
      if (!mutationResult.data?.createContributionLimit?.contributionLimit) {
        notification.openNotificationWithIcon(
          "error",
          "Error Adding Contribution Limit",
          "The contribution limit could not be added to the database because it already exists."
        );
        return;
      }
      var newContributionLimit: ContributionLimt = mutationResult.data.createContributionLimit.contributionLimit;
      const readData = cache.readQuery({
        query: GET_CONTRIBUTION_LIMITS,
        variables: { profileId: options.variables?.profileId },
      });
      if (readData) cache.writeQuery({
        query: GET_CONTRIBUTION_LIMITS,
        variables: { profileId: options.variables?.profileId },
        data: {
          ...readData,
          contributionLimits: { ...readData.contributionLimits, edges: [...readData.contributionLimits.edges, { node: newContributionLimit }] },
        },
      });
      notification.openNotificationWithIcon(
        "success",
        "Contribution Limit Added",
        `Contribution Limit of $${newContributionLimit.amount} for ${newContributionLimit.account?.code} with deadline ${newContributionLimit.yearEnd} successfully added to the database.`
      );
      form.resetFields();
      setDialogOpen(false);
    },
  });

  const onFinish = async (values: { amount: number; account: string; year: Dayjs }) => {
    if (saving) return;
    try {
      await createContributionLimit({
        variables: { contribution: { amount: values.amount, account: values.account, yearEnd: values.year.format("YYYY-MM-DD") } },
      });
    } catch {
      notification.openNotificationWithIcon("error", "Error Adding Contribution Limit", "Could not save the contribution limit. Please try again.");
    }
  };

  const handleCancel = () => {
    if (saving) return;
    setDialogOpen(false);
    form.resetFields();
  };

  return (
    <>
      {notification.contextHolder}
      <Button type="primary" icon={<PlusOutlined aria-hidden />} onClick={() => setDialogOpen(true)}>Add Contribution Limit</Button>
      <Modal title="Add Contribution Limit" open={dialogOpen} onCancel={handleCancel} onOk={() => form.submit()} okText="Add Limit" confirmLoading={saving} cancelButtonProps={{ disabled: saving }} closable={!saving} maskClosable={!saving} keyboard={!saving}>
        <Form form={form} name="add_contribution_limit_dialog" layout="vertical" onFinish={onFinish} disabled={saving}>
          <Form.Item name="amount" label="Contribution Limit" rules={[{ required: true, message: "Please input the amount!" }]}>
            <InputNumber step={0.01} placeholder="Amount" style={{ width: "100%" }} min={0} addonBefore="$" />
          </Form.Item>
          <Form.Item name="year" label="Year End Deadline" rules={[{ required: true, message: "Please input the deadline!" }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="account" label="Account Type" rules={[{ required: true, message: "Please select an account type." }]}>
            <Radio.Group optionType="button" buttonStyle="solid">
              {accounts.edges.map((account: GraphQLNode<Account>) => (
                <Radio key={account.node.id} value={account.node.id}>{account.node.code}</Radio>
              ))}
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AddContributionLimit;
