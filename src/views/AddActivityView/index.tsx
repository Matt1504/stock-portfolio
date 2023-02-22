import React, { useState, useEffect, useRef } from "react";
import type { DatePickerProps } from "antd";
import {
  Button,
  Radio,
  Row,
  Col,
  Form,
  Input,
  InputNumber,
  Space,
  Select,
  RadioChangeEvent,
  DatePicker,
  Divider,
} from "antd";
import dayjs from "dayjs";
import type { InputRef } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useQuery, gql } from "@apollo/client";
import { formatDate } from "../../utils/utils";

const dateFormat = "YYYY/MM/DD";

const GET_PLATFORM_INFO = gql(`
  query {
    accounts {
      edges {
        node {
          id
          code
          name
        }
      }
    }
    currencies {
        edges {
            node {
                id
                name
                code
            }
        }
    }
    activities {
        edges {
            node {
                id 
                name
            }
        }
    }
    platforms {
      edges {
        node {
          id
          name
          account {
            id
            code
            name
          }
          currency {
            id
            code
            name
          }
        }
      }
    }
    activities {
        edges {
            node {
                id
                name
            }
        }
    }
    stocks {
        edges {
            node {
                id
                name
                ticker
            }
        }
    }
  }
`);

const tailLayout = {
  wrapperCol: { offset: 8, span: 16 },
};

const AddActivityView = () => {
  const { loading, error, data } = useQuery(GET_PLATFORM_INFO);
  const inputRef = useRef<InputRef>(null);

  const [accountId, setAccountId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [platform, setPlatform] = useState("");
  const [platforms, setPlatforms] = useState([]);
  const [stockName, setStockName] = useState("");
  const [stocks, setStocks] = useState([]);
  const [price, setPrice] = useState(0);
  const [fee, setFee] = useState(0);
  const [shares, setShares] = useState(0);
  const [total, setTotal] = useState(0);
  const [transDate, setTransDate] = useState(formatDate(""));

  const onAccountChange = (e: RadioChangeEvent) => {
    setAccountId(e.target.value);
    let x = data?.platforms?.edges.filter(
      (platform: any) =>
        platform.node.account.id === e.target.value &&
        (!currencyId || platform.node.currency.id === currencyId)
    );
    setPlatforms(x);
    setPlatform(x[0].node.id);
  };

  const onCurrencyChange = (e: RadioChangeEvent) => {
    setCurrencyId(e.target.value);
    let x = data?.platforms?.edges.filter(
      (platform: any) =>
        (!accountId || platform.node.account.id === accountId) &&
        platform.node.currency.id === e.target.value
    );
    setPlatforms(x);
    setPlatform(x[0].node.id);
  };

  const onPlatformChange = (value: string) => {
    setPlatform(value);
  };

  const onNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStockName(event.target.value);
  };

  const addItem = (
    e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>
  ) => {
    e.preventDefault();
    setStockName("");
    //setStocks([...stocks, stockName])
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const onDateChange: DatePickerProps["onChange"] = (date, dateString) => {
    setTransDate(dateString);
  };
  
  const onPriceChange = (value: number | null) => {
    setPrice(value ?? 0);
  }

  const onShareChange = (value: number | null) => {
    setShares(value ?? 0);
  }

  const onFeeChange = (value: number | null) => {
    setFee(value ?? 0);
  }

  const onTotalChange = (value: number | null) => {
    setTotal(value ?? 0);
  }

  useEffect(() => {
    if (data?.stocks) {
      setStocks(data.stocks?.edges);
    }
  }, [data]);

  return (
    <Form>
      <Row>
        <Col span={12}>
          <Form.Item
            name="account"
            label="Account"
            rules={[{ required: true }]}
          >
            <Radio.Group optionType="button" buttonStyle="solid">
              {data?.accounts?.edges.map((account: any) => {
                return (
                  <Radio
                    key={account.node.id}
                    onChange={onAccountChange}
                    value={account.node.id}
                  >
                    {account.node.name}
                  </Radio>
                );
              })}
            </Radio.Group>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="currency"
            label="Currency"
            rules={[{ required: true }]}
          >
            <Radio.Group optionType="button" buttonStyle="solid">
              {data?.currencies?.edges.map((currency: any) => {
                return (
                  <Radio
                    key={currency.node.id}
                    onChange={onCurrencyChange}
                    value={currency.node.id}
                  >
                    {currency.node.code}
                  </Radio>
                );
              })}
            </Radio.Group>
          </Form.Item>
        </Col>
      </Row>
      {accountId && currencyId ? (
        <>
          <Space align="baseline">
            <Form.Item name="platform" label="Platform" />
            <Select
              onChange={onPlatformChange}
              value={platform}
              style={{ width: 200 }}
              options={platforms.map((platform: any) => ({
                label: platform.node.name,
                value: platform.node.id,
              }))}
            />
          </Space>
          <Form.Item>
            <Select
              style={{ width: 300 }}
              placeholder="Stock Name"
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: "8px 0" }} />
                  <Space style={{ padding: "0 8px 4px" }}>
                    <Input
                      placeholder="Please enter name"
                      ref={inputRef}
                      value={stockName}
                      onChange={onNameChange}
                    />
                    <Button
                      type="text"
                      icon={<PlusOutlined />}
                      onClick={addItem}
                    >
                      Add Stock Name
                    </Button>
                  </Space>
                </>
              )}
            />
          </Form.Item>
          <Form.Item
            name="activity"
            label="Activity"
            rules={[{ required: true }]}
          >
            <Select
              style={{ width: 300 }}
              options={data?.activities?.edges.map((activity: any) => ({
                label: activity.node.name,
                value: activity.node.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="date"
            label="Transaction Date"
            rules={[{ required: true }]}
          >
            <DatePicker
              value={dayjs(transDate, dateFormat)}
              onChange={onDateChange}
              style={{ width: 200 }}
              format={dateFormat}
            />
          </Form.Item>
          <Space>
            <Form.Item name="price" label="Price">
              <InputNumber
                min={0}
                step={0.01}
                value={price}
                onChange={onPriceChange}
                formatter={(value) => `$ ${value}`}
              />
            </Form.Item>
            <Form.Item name="shares" label="Shares">
              <InputNumber value={shares} onChange={onShareChange} min={0} step={1} />
            </Form.Item>
            <Form.Item name="fee" label="Fee">
              <InputNumber
                min={0}
                step={0.01}
                value={fee}
                onChange={onFeeChange}
                formatter={(value) => `$ ${value}`}
              />
            </Form.Item>
            <Form.Item name="total" label="Total" rules={[{ required: true }]}>
              <InputNumber
                min={0}
                step={0.01}
                value={total}
                onChange={onTotalChange}
                formatter={(value) => `$ ${value}`}
              />
            </Form.Item>
          </Space>
        </>
      ) : (
        <></>
      )}
      <Form.Item {...tailLayout}>
        <Button type="primary" htmlType="submit">
          Submit
        </Button>
        <Button htmlType="button">Reset</Button>
      </Form.Item>
    </Form>
  );
};

export default AddActivityView;
