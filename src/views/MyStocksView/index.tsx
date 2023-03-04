import {
  Divider,
  Select,
  Row,
  Col,
  Typography,
  Form,
  Input,
  Button,
  notification,
} from "antd";
import { useQuery, gql, useMutation } from "@apollo/client";
import { useState } from "react";

const ALL_STOCKS = gql(`
    query {
        stocks {
            edges {
                node {
                    id
                    name
                    ticker
                }
            }
        }
    }`);

const CREATE_STOCK = gql(`
    mutation creatStock($stock: StockInput!) {
        createStock(stockData: $stock) {
            stock {
                id
                name
                ticker
            }
        }
    }`);

type NotificationType = "success" | "info" | "warning" | "error";

const MyStocksView = () => {
  const { loading, error, data } = useQuery(ALL_STOCKS);

  const [api, contextHolder] = notification.useNotification();
  const openNotificationWithIcon = (
    type: NotificationType,
    message: string,
    description: string
  ) => {
    api[type]({
      message,
      description,
      placement: "bottomLeft",
      duration: 2,
    });
  };

  const [createStock] = useMutation(CREATE_STOCK, {
    update: (cache: any, mutationResult: any) => {
      if (!mutationResult.data.createStock) {
        openNotificationWithIcon(
          "error",
          "Error Adding Stock",
          "The stock could not be added to the database because it already exists."
        );
      }
      const newStock = mutationResult.data.createStock.stock;
      const readData = cache.readQuery({
        query: ALL_STOCKS,
      });
      cache.writeQuery({
        query: ALL_STOCKS,
        data: {
          stocks: { edges: [...readData.stocks.edges, { node: newStock }] },
        },
      });
      openNotificationWithIcon(
        "success",
        "Stock Added",
        `Stock ${newStock.name} with ticker ${newStock.ticker} was successfully added to the database.`
      );
      form.resetFields();
    },
  });

  const [form] = Form.useForm();
  const [selectedStock, setSelectedStock] = useState({});

  const handleChange = (value: any) => {
    var index = data.stocks.edges.findIndex((x: any) => x.node.id === value);
    setSelectedStock(data.stocks.edges[index].node);
  };

  const onFinish = async (values: any) => {
    await createStock({
      variables: {
        stock: values,
      },
    });
  };

  return (
    <Row>
      {contextHolder}
      <Col span={12}>
        <Select
          showSearch
          disabled={loading}
          onChange={handleChange}
          style={{ width: "80%" }}
          placeholder="Select a Stock"
          optionFilterProp="children"
          filterOption={(input, option: any) =>
            (option?.label ?? "").toLowerCase().includes(input)
          }
          filterSort={(optionA, optionB) =>
            (optionA?.label ?? "")
              .toLowerCase()
              .localeCompare((optionB?.label ?? "").toLowerCase())
          }
          options={data?.stocks.edges.map((x: any) => {
            return {
              value: x.node.id,
              label: `${x.node.name} (${x.node.ticker})`,
            };
          })}
        />
      </Col>
      <Col span={12}>
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
      <Divider />
    </Row>
  );
};

export default MyStocksView;
