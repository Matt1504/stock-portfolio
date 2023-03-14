import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  RadioChangeEvent,
  Row,
  Select
} from "antd";
import { useEffect, useState } from "react";

import { useMutation, useQuery } from "@apollo/client";
import { storeValueIsStoreObject } from "@apollo/client/cache/inmemory/helpers";

import { NotificationComponent } from "../../components/Notification";
import { Activity } from "../../interfaces/Activity";
import { Currency } from "../../interfaces/Currency";
import { GraphQLNode } from "../../interfaces/GraphQLNode";
import { Platform } from "../../interfaces/Platform";
import { Stock } from "../../interfaces/Stock";
import { TransactionForm } from "../../interfaces/Transaction";
import { formatDate, formatDecimalTwoPlaces } from "../../utils/utils";
import { CREATE_TRANSACTION, GET_PLATFORM_INFO } from "./gql";

const AddTransactionView = () => {
  const { loading, error, data } = useQuery(GET_PLATFORM_INFO);
  const [form] = Form.useForm();
  const notification = new NotificationComponent();

  const [platformOptions, setPlatformOptions] = useState([]);
  const [stockOptions, setStockOptions] = useState([]);
  const [account, setAccount] = useState("");
  const [currency, setCurrency] = useState("");
  const [activity, setActivity] = useState("");
  const [price, setPrice] = useState(0);
  const [shares, setShares] = useState(0);
  const [fees, setFees] = useState(0);

  const [createTransaction] = useMutation(CREATE_TRANSACTION, {
    update: (cache: any, mutationResult: any) => {
      if (!mutationResult.data.createTransaction) {
        notification.openNotificationWithIcon("error", "Error Adding Transaction", "There was an error adding the transaction. Please try again.");
      } else {
        notification.openNotificationWithIcon("success", "Transaction Added", "The transaction was successfully added to the database.");
      }
    }
  });

  const onRadioChange = (e: RadioChangeEvent, updateFunc: Function) => {
    updateFunc(e.target.value);

    if (updateFunc.toString() === setCurrency.toString()) {
      form.setFieldValue("stock", null);
      if (!e.target.value) return;

      setStockOptions(
        data.stocks.edges
          .filter((x: GraphQLNode<Stock>) => x.node.currency?.id === e.target.value)
          .map((x: GraphQLNode<Stock>) => ({
            value: x.node.id,
            label: `${x.node.name} (${x.node.ticker})`,
          }))
      );
    }
  };

  const onSelectActivityChange = (value: { value: string; label: string }) => {
    setActivity(value.label);
    form.setFieldValue("activity", value.value);
    form.setFieldValue("description", null);
  };

  const onFinish = async (values: TransactionForm) => {
    values.transactionDate = formatDate((values.transaction ?? "").toString());
    values.total = formatDecimalTwoPlaces(values.total);
    delete values.transaction;
    delete values.currency;
    if (values.price)
      values.price = formatDecimalTwoPlaces(values.price);
    if (values.fee)
      values.fee = formatDecimalTwoPlaces(values.fee);
    console.log(values);
    await createTransaction({
      variables: {
        trans: values
      }
    });
  };

  useEffect(() => {
    form.setFieldValue("platform", null);
    if (!currency || !account) return;

    setPlatformOptions(
      data.platforms.edges
        .filter(
          (x: GraphQLNode<Platform>) =>
            x.node.currency?.id === currency && x.node.account?.id === account
        )
        .map((x: GraphQLNode<Platform>) => ({
          value: x.node.id,
          label: x.node.name,
        }))
    );
  }, [account, currency]);

  return (
    <Row>
      {notification.contextHolder}
      <Col span={24}>
        <Form form={form} name="add_transaction" onFinish={onFinish}>
          <Form.Item
            name="account"
            label="Account"
            rules={[
              {
                required: true,
                message: "Please select an account.",
              },
            ]}
          >
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              onChange={(e: RadioChangeEvent) => onRadioChange(e, setAccount)}
            >
              {data?.accounts?.edges.map((account: any) => {
                return (
                  <Radio key={account.node.id} value={account.node.id}>
                    {account.node.name}
                  </Radio>
                );
              })}
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="currency"
            label="Currency"
            rules={[
              {
                required: true,
                message: "Please select the currency of the transaction.",
              },
            ]}
          >
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              onChange={(e: RadioChangeEvent) => onRadioChange(e, setCurrency)}
            >
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
          <Form.Item
            name="activity"
            label="Activity"
            hidden={!(account && currency)}
            rules={[
              {
                required: true,
                message: "Please select the activity.",
              },
            ]}
          >
            <Select
              style={{ width: 200 }}
              labelInValue
              filterOption={(input, option: any) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              onChange={onSelectActivityChange}
              options={data?.activities?.edges.map(
                (activity: GraphQLNode<Activity>) => ({
                  value: activity.node.id,
                  label: activity.node.name,
                })
              )}
            />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            hidden={activity !== "Adjustment"}
            rules={[
              {
                required: activity === "Adjustment",
                message: "Description required for Adjustment activity.",
              },
            ]}
          >
            <Input style={{ width: 500 }} />
          </Form.Item>
          <Form.Item
            name="transaction"
            label="Transaction Date"
            rules={[{ required: true }]}
          >
            <DatePicker />
          </Form.Item>
          <Form.Item
            name="platform"
            label="Platform"
            hidden={!(account && currency)}
            rules={[
              {
                required: true,
                message: "Please select the platform.",
              },
            ]}
          >
            <Select style={{ width: 200 }} options={platformOptions} />
          </Form.Item>
          <Form.Item
            name="stock"
            label="Stock"
            hidden={!(account && currency)}
            rules={[
              {
                required: activity !== "Contribution" && activity !== "Transfer In" && activity !== "Transfer Out",
                message: "Please select the stock.",
              },
            ]}
          >
            <Select
              showSearch
              filterOption={(input, option: any) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              style={{ width: 400 }}
              options={stockOptions}
            />
          </Form.Item>
          <Form.Item name="price" label="Price">
            <InputNumber step={0.01} keyboard min={0} addonBefore="$" />
          </Form.Item>
          <Form.Item name="shares" label="Shares">
            <InputNumber keyboard min={0} />
          </Form.Item>
          <Form.Item name="fee" label="Fee">
            <InputNumber step={0.01} keyboard min={0} addonBefore="$" />
          </Form.Item>
          <Form.Item
            name="total"
            label="Total"
            rules={[
              {
                required: true,
                message: "Please select the platform.",
              },
            ]}
          >
            <InputNumber step={0.01} keyboard min={0} addonBefore="$" />
          </Form.Item>
          <Form.Item style={{ marginTop: 32 }}>
            <Button htmlType="submit">Reset</Button>
            <Button style={{ marginLeft: 16 }} type="primary" htmlType="submit">
              Submit
            </Button>
          </Form.Item>
        </Form>
      </Col>
    </Row>
  );
};

export default AddTransactionView;
