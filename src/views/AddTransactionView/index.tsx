import {
  Button,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Radio,
  RadioChangeEvent,
  Row,
  Select,
  Space
} from "antd";
import { DefaultOptionType } from "antd/es/select";
import dayjs from "dayjs";
import React, { useEffect, useRef, useState } from "react";

import { PlusOutlined } from "@ant-design/icons";
import { gql, useQuery } from "@apollo/client";

import { Activity } from "../../interfaces/Activity";
import { Currency } from "../../interfaces/Currency";
import { GraphQLNode } from "../../interfaces/GraphQLNode";
import { Platform } from "../../interfaces/Platform";
import { Stock } from "../../interfaces/Stock";
import { formatDate, formatDecimalTwoPlaces } from "../../utils/utils";
import { GET_PLATFORM_INFO } from "./gql";

const AddTransactionView = () => {
  const { loading, error, data } = useQuery(GET_PLATFORM_INFO);
  const [form] = Form.useForm();

  const [platformOptions, setPlatformOptions] = useState([]);
  const [stockOptions, setStockOptions] = useState([]);
  const [account, setAccount] = useState("");
  const [currency, setCurrency] = useState("");
  const [activity, setActivity] = useState("");
  const [showDescription, setShowDescription] = useState(false);

  const onRadioChange = (e: RadioChangeEvent, updateFunc: Function) =>
    updateFunc(e.target.value);

  const onSelectChange = (value: { value: string; label: string }) => {
    console.log(value);
    setActivity(value.label);
  };

  const onFinish = async (values: any) => {
    console.log(values);
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

  useEffect(() => {
    form.setFieldValue("stock", null);
    if (!currency) return;

    setStockOptions(
      data.stocks.edges
        .filter((x: GraphQLNode<Stock>) => x.node.currency?.id === currency)
        .map((x: GraphQLNode<Stock>) => ({
          value: x.node.id,
          label: `${x.node.name} (${x.node.ticker})`,
        }))
    );
  }, [currency]);

  useEffect(() => {
    form.setFieldValue("description", null);
    if (activity === "Adjustment") {
      setShowDescription(true);
    } else {
      setShowDescription(false);
    }
  }, [activity]);

  return (
    <Row>
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
              onChange={onSelectChange}
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
            hidden={!showDescription}
            rules={[
              {
                required: showDescription,
                message: "Description required for Adjustment activity.",
              },
            ]}
          >
            <Input style={{ width: 500 }} />
          </Form.Item>
          <Form.Item
            name="transactionDate"
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
                required: true,
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

          <Form.Item style={{ marginTop: 32 }}>
            <Button htmlType="submit">Reset</Button>
            <Button style={{ marginLeft: 16 }} type="primary" htmlType="button">
              Submit
            </Button>
          </Form.Item>
        </Form>
      </Col>
    </Row>
  );
};

export default AddTransactionView;
