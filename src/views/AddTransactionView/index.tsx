import {
  Button,
  Card,
  Checkbox,
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

import { NotificationComponent } from "../../components/Notification";
import { Activity } from "../../models/Activity";
import { Currency } from "../../models/Currency";
import { GraphQLNode } from "../../models/GraphQLNode";
import { Platform } from "../../models/Platform";
import { Stock } from "../../models/Stock";
import { TransactionForm } from "../../models/Transaction";
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
  const [isIndex, setIsIndex] = useState(false);

  const [createTransaction] = useMutation(CREATE_TRANSACTION, {
    update: (cache: any, mutationResult: any) => {
      if (!mutationResult.data.createTransaction) {
        notification.openNotificationWithIcon(
          "error",
          "Error Adding Transaction",
          "There was an error adding the transaction. Please try again."
        );
      } else {
        notification.openNotificationWithIcon(
          "success",
          "Transaction Added",
          "The transaction was successfully added to the database."
        );
        var fields = ["total"];
        if (activity !== "Withholding Tax") {
          fields = fields.concat([
            "stock",
            "price",
            "shares",
            "fee",
            "description",
          ]);
        }
        if (isIndex) setIsIndex(false);
        fields.forEach((field: string) => {
          form.setFieldValue(field, null);
        });
      }
    },
  });

  const onRadioChangeCurrency = (e: RadioChangeEvent, updateFunc: Function) => {
    onRadioChange(e, updateFunc);

    form.setFieldValue("stock", null);
    if (!e.target.value) return;

    setStockOptions(
      data.stocks.edges
        .filter(
          (x: GraphQLNode<Stock>) => x.node.currency?.id === e.target.value
        )
        .map((x: GraphQLNode<Stock>) => ({
          value: x.node.id,
          label: `${x.node.name} (${x.node.ticker})`,
        }))
    );
  };

  const onRadioChange = (e: RadioChangeEvent, updateFunc: Function) =>
    updateFunc(e.target.value);

  const onSelectActivityChange = (value: { value: string; label: string }) => {
    setActivity(value.label);
    if (isIndex) setIsIndex(false);
    form.setFieldValue("activity", value.value);
    form.setFieldValue("description", null);
  };

  const onInputNumberChange = (
    shares: number | null = null,
    price: number | null = null,
    fee: number | null = null
  ) => {
    if (!["Buy", "Sell"].includes(activity)) return;
    if (shares === null) {
      shares = form.getFieldValue("shares");
    }
    if (price === null) {
      price = form.getFieldValue("price");
    }
    if (fee === null) {
      fee = form.getFieldValue("fee");
    }

    if (!shares && !price) {
      return;
    }
    var total = (price ?? 0) * (shares ?? 0);
    if (fee !== null && fee > 0) {
      if (activity === "Buy") {
        total += fee;
      } else {
        total -= fee;
      }
    }
    form.setFieldValue("total", formatDecimalTwoPlaces(total));
  };

  const onReset = () => form.resetFields();

  const onIndexCheckboxChange = (e: { target: { checked: boolean } }) =>
    setIsIndex(e.target.checked);

  const onFinish = async (values: TransactionForm) => {
    values.transactionDate = formatDate((values.transaction ?? "").toString());
    values.total = formatDecimalTwoPlaces(values.total);
    delete values.transaction;
    delete values.currency;
    if (values.price) values.price = formatDecimalTwoPlaces(values.price);
    if (values.fee) values.fee = formatDecimalTwoPlaces(values.fee);
    await createTransaction({
      variables: {
        trans: values,
      },
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
        {loading ? (
          <Card style={{ width: 500, marginTop: 16 }} loading={loading} />
        ) : (
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
                onChange={(e: RadioChangeEvent) =>
                  onRadioChangeCurrency(e, setCurrency)
                }
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
              name="platform"
              label="Platform"
              rules={[
                {
                  required: true,
                  message: "Please select the platform.",
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
                style={{ width: 200 }}
                options={platformOptions}
              />
            </Form.Item>
            <Form.Item
              name="activity"
              label="Activity"
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
                showSearch
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
              name="stock"
              label="Stock"
              hidden={[
                "Contribution",
                "Transfer In",
                "Transfer Out",
                "Adjustment",
              ].includes(activity)}
              rules={[
                {
                  required: ![
                    "Contribution",
                    "Transfer In",
                    "Transfer Out",
                    "Adjustment",
                  ].includes(activity),
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
            <Form.Item hidden={!["Buy", "Sell"].includes(activity)}>
              <Checkbox checked={isIndex} onChange={onIndexCheckboxChange}>
                Index Fund
              </Checkbox>
            </Form.Item>
            <Form.Item
              name="price"
              label="Price"
              hidden={!["Buy", "Sell"].includes(activity)}
              rules={[
                {
                  required: ["Buy", "Sell"].includes(activity) && !isIndex,
                  message: "Please include the price.",
                },
              ]}
            >
              <InputNumber
                step={0.01}
                onChange={(value) => onInputNumberChange(null, value, null)}
                keyboard
                min={0}
                addonBefore="$"
              />
            </Form.Item>
            <Form.Item
              name="shares"
              label="Shares"
              hidden={!["Stock Split", "Buy", "Sell"].includes(activity)}
              rules={[
                {
                  required:
                    ["Stock Split", "Buy", "Sell"].includes(activity) &&
                    !isIndex,
                  message: "Please include the shares.",
                },
              ]}
            >
              <InputNumber
                onChange={(value) => onInputNumberChange(value, null, null)}
                keyboard
                min={0}
              />
            </Form.Item>
            <Form.Item
              name="fee"
              label="Fee"
              hidden={!["Buy", "Sell"].includes(activity)}
            >
              <InputNumber
                step={0.01}
                onChange={(value) => onInputNumberChange(null, null, value)}
                keyboard
                min={0}
                addonBefore="$"
              />
            </Form.Item>
            <Form.Item
              name="total"
              label="Total"
              hidden={activity === "Stock Split"}
              rules={[
                {
                  required: activity !== "Stock Split",
                  message: "Please select the platform.",
                },
              ]}
            >
              <InputNumber step={0.01} keyboard min={0} addonBefore="$" />
            </Form.Item>
            <Form.Item style={{ marginTop: 32 }}>
              <Button onClick={onReset}>Reset</Button>
              <Button
                style={{ marginLeft: 16 }}
                type="primary"
                htmlType="submit"
              >
                Submit
              </Button>
            </Form.Item>
          </Form>
        )}
      </Col>
    </Row>
  );
};

export default AddTransactionView;
