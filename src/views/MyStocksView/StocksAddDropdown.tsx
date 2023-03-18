import { Button, Col, Divider, Form, Input, Radio, Row, Select } from "antd";
import { useEffect, useState } from "react";

import { useMutation, useQuery } from "@apollo/client";

import { NotificationComponent } from "../../components/Notification";
import { Currency } from "../../interfaces/Currency";
import { GraphQLNode } from "../../interfaces/GraphQLNode";
import { Stock } from "../../interfaces/Stock";
import { ALL_STOCKS_CURRENCY, CREATE_STOCK } from "./gql";

type SADProps = {
  setSelectedStock: Function;
};

const StocksAddDropdown = (props: SADProps) => {
  const { setSelectedStock } = props;
  const { loading, error, data } = useQuery(ALL_STOCKS_CURRENCY);
  const notification = new NotificationComponent();
  const [form] = Form.useForm();

  const [createStock] = useMutation(CREATE_STOCK, {
    update: (cache: any, mutationResult: any) => {
      if (!mutationResult.data.createStock) {
        notification.openNotificationWithIcon(
          "error",
          "Error Adding Stock",
          "The stock could not be added to the database because it already exists."
        );
      }
      var newStock: Stock = mutationResult.data.createStock.stock;
      const readData = cache.readQuery({
        query: ALL_STOCKS_CURRENCY,
      });
      cache.writeQuery({
        query: ALL_STOCKS_CURRENCY,
        data: {
          stocks: { edges: [...readData.stocks.edges, { node: newStock }] },
          currencies: readData.currencies,
        },
      });
      notification.openNotificationWithIcon(
        "success",
        "Stock Added",
        `"${newStock.name}" with ticker ${newStock.ticker} was successfully added to the database.`
      );
      form.resetFields();
    },
  });

  const handleChange = async (value: string) => {
    var index = data.stocks.edges.findIndex(
      (x: GraphQLNode<Stock>) => x.node.id === value
    );
    let x: Stock = data.stocks.edges[index].node;
    setSelectedStock(x);
  };

  const onFinish = async (values: Stock) => {
    values.ticker = values.ticker?.toUpperCase();
    await createStock({
      variables: {
        stock: values,
      },
    });
  };

  return (
    <Row>
      {notification.contextHolder}
      <Col span={8}>
        {data && (
          <Select
            showSearch
            disabled={loading}
            onChange={handleChange}
            style={{ width: "90%" }}
            placeholder="Select a Stock"
            optionFilterProp="children"
            filterOption={(input, option: any) =>
              (option?.label ?? "").toLowerCase().includes(input)
            }
            options={[
              {
                label: "CAD",
                options: data?.stocks.edges
                  ?.filter(
                    (x: GraphQLNode<Stock>) => x.node.currency?.code === "CAD"
                  )
                  .map((x: GraphQLNode<Stock>) => {
                    return {
                      value: x.node.id,
                      label: `${x.node.name} (${x.node.ticker})`,
                    };
                  }),
              },
              {
                label: "USD",
                options: data?.stocks.edges
                  ?.filter(
                    (x: GraphQLNode<Stock>) => x.node.currency?.code === "USD"
                  )
                  .map((x: GraphQLNode<Stock>) => {
                    return {
                      value: x.node.id,
                      label: `${x.node.name} (${x.node.ticker})`,
                    };
                  }),
              },
            ]}
          />
        )}
      </Col>
      <Col span={16}>
        <Form
          form={form}
          name="horizontal_add_stock"
          layout="inline"
          onFinish={onFinish}
        >
          <Form.Item
            name="name"
            style={{ width: 300 }}
            rules={[
              {
                required: true,
                message: "Please input the name of the stock!",
              },
            ]}
          >
            <Input placeholder="Name" />
          </Form.Item>
          <Form.Item
            name="ticker"
            style={{ width: 100 }}
            rules={[
              {
                required: true,
                message: "Please input the ticker of the stock!",
              },
            ]}
          >
            <Input placeholder="Ticker" />
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
                Add Stock
              </Button>
            )}
          </Form.Item>
        </Form>
      </Col>
    </Row>
  );
};

export default StocksAddDropdown;
