import { useProfileMutation as useMutation } from "../../profiles/hooks";
import { PlusOutlined } from "@ant-design/icons";
import { useState } from "react";
import { Button, Col, Form, Input, Modal, Radio, Row, Select, Space, Tooltip } from "antd";



import { NotificationComponent } from "../../components/Notification";
import { Account } from "../../models/Account";
import { GraphQLNode } from "../../models/GraphQLNode";
import { Platform } from "../../models/Platform";
import { ALL_ACCOUNT_PLATFORMS, CREATE_PLATFORM } from "./gql";
import TransferAccountModal from "./TransferAccountModal";
import { AccountData, AccountOption } from "./navigation";

type AADProps = {
  data?: AccountData;
  loading: boolean;
  options: AccountOption[];
  selectedAccountId?: string;
  onAccountChange: (id: string) => void;
  compact?: boolean;
  initialValues?: { currency?: string; account?: string };
  onCreated?: (record: Platform) => Promise<void> | void;
};

const AccountsAddDropdown = (props: AADProps) => {
  const { data, loading, options, selectedAccountId, onAccountChange, compact = false, initialValues, onCreated } = props;
  const notification = new NotificationComponent();
  const [form] = Form.useForm();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [createPlatform, { loading: saving }] = useMutation(CREATE_PLATFORM, {
    update: (cache: any, mutationResult: any, options: any) => {
      if (!mutationResult.data?.createPlatform?.platform) {
        notification.openNotificationWithIcon(
          "error",
          "Error Adding Platform",
          "The platform could not be added. It may already exist."
        );
        return;
      }
      var newPlatform: Platform = mutationResult.data.createPlatform.platform;
      const readData = cache.readQuery({
        query: ALL_ACCOUNT_PLATFORMS,
        variables: { profileId: options.variables?.profileId },
      });
      if (readData) cache.writeQuery({
        query: ALL_ACCOUNT_PLATFORMS,
        variables: { profileId: options.variables?.profileId },
        data: {
          ...readData,
          platforms: {
            ...readData.platforms,
            edges: [...readData.platforms.edges, { node: newPlatform }],
          },
          currencies: readData.currencies,
        },
      });
      notification.openNotificationWithIcon(
        "success",
        "Platform Added",
        `"${newPlatform.currency?.code} ${newPlatform.account?.code} for ${newPlatform.name} was successfully added to the database.`
      );
      form.resetFields();
      setDialogOpen(false);
    },
  });

  const onFinish = async (values: { name: string; account: string; currency: string }) => {
    if (saving) return;
    try {
      const result = await createPlatform({ variables: { platform: { ...values, name: values.name?.trim() } } });
      if (result.data?.createPlatform?.platform) {
        try {
          await onCreated?.(result.data.createPlatform.platform);
        } catch {
          notification.openNotificationWithIcon("error", "Refresh Failed", "The platform was saved, but the transaction options could not be refreshed. Please reload the page.");
        }
      }
    } catch {
      notification.openNotificationWithIcon("error", "Error Adding Platform", "Could not save the platform. Please try again.");
    }
  };
  const handleCancel = () => {
    if (saving) return;
    setDialogOpen(false);
    form.resetFields();
  };

  const addButton = <Tooltip title="Add Platform"><Button aria-label="Add Platform" type={compact ? "default" : "primary"} size={compact ? "small" : "middle"} icon={<PlusOutlined aria-hidden />} disabled={loading || !data} onClick={() => { form.setFieldsValue(initialValues ?? {}); setDialogOpen(true); }}>{compact ? null : "Add Platform"}</Button></Tooltip>;
  const dialog = (
      <Modal title="Add Platform" open={dialogOpen} onCancel={handleCancel} onOk={() => form.submit()} okText="Add Platform" confirmLoading={saving} cancelButtonProps={{ disabled: saving }} closable={!saving} maskClosable={!saving} keyboard={!saving}>
        <Form form={form} name="add_platform_dialog" layout="vertical" onFinish={onFinish} disabled={saving}>
          <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: "Please enter a name." }]}>
            <Input placeholder="Platform name, e.g. Wealthsimple" autoFocus />
          </Form.Item>
          <Form.Item name="account" label="Account" rules={[{ required: true, message: "Please select an account." }]}>
            <Radio.Group optionType="button" buttonStyle="solid">
              {data?.accounts.edges.map(({ node }) => <Radio key={node.id} value={node.id}>{node.code}</Radio>)}
            </Radio.Group>
          </Form.Item>
          <Form.Item name="currency" label="Currency" rules={[{ required: true, message: "Please select a currency." }]}>
            <Radio.Group optionType="button" buttonStyle="solid">
              {data?.currencies.edges.map(({ node }) => <Radio key={node.id} value={node.id}>{node.code}</Radio>)}
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
  );
  if (compact) return <>{notification.contextHolder}{addButton}{dialog}</>;

  return (
    <Row gutter={[16, 16]} align="middle">
      {notification.contextHolder}
      <Col xs={24} md={16}>
        {data && (
          <Select
            showSearch
            aria-label="Select an account"
            value={selectedAccountId}
            disabled={loading}
            onChange={onAccountChange}
            style={{ width: "100%", maxWidth: 480 }}
            placeholder="Select a Platform"
            optionFilterProp="children"
            filterOption={(input, option: any) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={data.accounts?.edges.map(
              (account: GraphQLNode<Account>) => ({
                label: account.node.code,
                options: options
                  ?.filter(
                    (option: AccountOption) => option.account.id === account.node.id
                  )
                  .map((option: AccountOption) => ({
                    value: option.id,
                    label: `${option.account.code} ${option.name}`,
                  })),
              })
            )}
          />
        )}
      </Col>
      <Col xs={24} md={8} style={{ display: "flex", justifyContent: "flex-end" }}>
        <Space wrap>
          <TransferAccountModal accounts={data?.accounts.edges as GraphQLNode<Account>[]} platforms={data?.platforms.edges as GraphQLNode<Platform>[]} notification={notification} />
          {addButton}
        </Space>
      </Col>
      {dialog}
    </Row>
  );
};

export default AccountsAddDropdown;
