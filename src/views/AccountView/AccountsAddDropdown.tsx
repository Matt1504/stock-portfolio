import { Button, Col, Form, Input, Radio, Row, Select } from "antd";
import { useEffect, useState } from "react";

import { useMutation, useQuery } from "@apollo/client";

import { NotificationComponent } from "../../components/Notification";
import { Account } from "../../models/Account";
import { Currency } from "../../models/Currency";
import { GraphQLNode } from "../../models/GraphQLNode";
import { Platform } from "../../models/Platform";
import { Stock } from "../../models/Stock";
import { ALL_ACCOUNT_PLATFORMS, CREATE_PLATFORM } from "./gql";
import TransferAccountModal from "./TransferAccountModal";

type AADProps = {
  setSelectedAccount: Function;
  setCurrencies: Function;
};

const AccountsAddDropdown = (props: AADProps) => {
  const { setSelectedAccount, setCurrencies } = props;
  const { loading, error, data } = useQuery(ALL_ACCOUNT_PLATFORMS);
  const notification = new NotificationComponent();
  const [form] = Form.useForm();
  const [accOverviewOptions, setAccOverviewOptions] = useState<
    GraphQLNode<Account>[]
  >([]);
  const [platformOptions, setPlatformOptions] = useState<
    GraphQLNode<Platform>[]
  >([]);

  const [createPlatform] = useMutation(CREATE_PLATFORM, {
    update: (cache: any, mutationResult: any) => {
      if (!mutationResult.data.createPlatform) {
        notification.openNotificationWithIcon(
          "error",
          "Error Adding Stock",
          "The stock could not be added to the database because it already exists."
        );
      }
      var newPlatform: Platform = mutationResult.data.createPlatform.platform;
      const readData = cache.readQuery({
        query: ALL_ACCOUNT_PLATFORMS,
      });
      cache.writeQuery({
        query: ALL_ACCOUNT_PLATFORMS,
        data: {
          platforms: {
            edges: [...readData.platforms.edges, { node: newPlatform }],
          },
          currencies: readData.currencies,
        },
      });
      notification.openNotificationWithIcon(
        "success",
        "Platform Added",
        `"${newPlatform.currency?.code} ${newPlatform.account?.name} for ${newPlatform.name} was successfully added to the database.`
      );
      form.resetFields();
    },
  });

  const handleChange = async (value: string) => {
    var arr = accOverviewOptions.concat(platformOptions);
    var index = arr.findIndex(
      (x: GraphQLNode<Platform>) => x.node.id === value
    );
    setSelectedAccount(arr[index].node);
  };

  const onFinish = async (values: Stock) => {
    await createPlatform({
      variables: {
        platform: values,
      },
    });
  };

  useEffect(() => {
    if (data?.accounts?.edges) {
      setCurrencies(data.currencies.edges);
      setAccOverviewOptions(
        data.accounts?.edges.map((account: GraphQLNode<Account>) => ({
          node: {
            id: `${account.node.code}-all`,
            account: {
              id: account.node.id,
              code: account.node.code,
            },
            name: `Overview`,
          },
        }))
      );
    }
    if (data?.platforms?.edges) {
      var plats: GraphQLNode<Platform>[] = [];
      data?.platforms?.edges.forEach((platform: GraphQLNode<Platform>) => {
        let index = plats.findIndex(
          (x: GraphQLNode<Platform>) =>
            x.node.name === platform.node.name &&
            x.node.account?.id === platform.node.account?.id
        );
        if (index === -1) {
          plats.push(platform);
        } else {
          let obj: GraphQLNode<Platform> = {
            node: {
              id: `${plats[index].node.id},${platform.node.id}`,
              name: plats[index].node.name,
              account: plats[index].node.account,
              __typename: plats[index].node.__typename,
            },
            __typename: plats[index].__typename,
          };
          plats[index] = obj;
        }
      });
      setPlatformOptions(plats);
    }
  }, [data]);

  return (
    <Row>
      {notification.contextHolder}
      <Col span={5}>
        {data && (
          <Select
            showSearch
            disabled={loading}
            onChange={handleChange}
            style={{ width: "90%" }}
            placeholder="Select a Platform"
            optionFilterProp="children"
            filterOption={(input, option: any) =>
              (option?.label ?? "").toLowerCase().includes(input)
            }
            options={data.accounts?.edges.map(
              (account: GraphQLNode<Account>) => ({
                label: account.node.code,
                options: accOverviewOptions
                  .concat(platformOptions)
                  ?.filter(
                    (x: GraphQLNode<Platform>) =>
                      x.node.account?.code === account.node.code
                  )
                  .map((x: GraphQLNode<Platform>) => ({
                    value: x.node.id,
                    label: x.node.name,
                  })),
              })
            )}
          />
        )}
      </Col>
      <Col span={19}>
        <Form
          form={form}
          name="horizontal_add_platform"
          layout="inline"
          onFinish={onFinish}
        >
          <Form.Item>
            <TransferAccountModal
              accounts={data?.accounts?.edges as GraphQLNode<Account>[]}
              platforms={data?.platforms?.edges as GraphQLNode<Platform>[]}
              notification={notification}
            />
          </Form.Item>
          <Form.Item
            name="name"
            label="Add Platform"
            style={{ width: 350 }}
            rules={[
              {
                required: true,
                message: "Please input the name of the platform!",
              },
            ]}
          >
            <Input placeholder="Name" />
          </Form.Item>
          <Form.Item name="account" rules={[{ required: true }]}>
            <Radio.Group optionType="button" buttonStyle="solid">
              {data?.accounts?.edges.map((account: GraphQLNode<Account>) => {
                return (
                  <Radio key={account.node.id} value={account.node.id}>
                    {account.node.code}
                  </Radio>
                );
              })}
            </Radio.Group>
          </Form.Item>
          <Form.Item name="currency" rules={[{ required: true }]}>
            <Radio.Group optionType="button" buttonStyle="solid">
              {data?.currencies?.edges.map(
                (currency: GraphQLNode<Currency>) => {
                  return (
                    <Radio key={currency.node.id} value={currency.node.id}>
                      {currency.node.code}
                    </Radio>
                  );
                }
              )}
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
                Add Platform
              </Button>
            )}
          </Form.Item>
        </Form>
      </Col>
    </Row>
  );
};

export default AccountsAddDropdown;
