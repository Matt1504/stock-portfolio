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
import { formatDate, formatDecimalTwoPlaces } from "../../utils/utils";

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

const AddActivityView = () => {
  const { loading, error, data } = useQuery(GET_PLATFORM_INFO);
  const inputRef = useRef<InputRef>(null);

  const [accountId, setAccountId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [platform, setPlatform] = useState("");
  const [platforms, setPlatforms] = useState([]);
  const [addStock, setAddStock] = useState("");
  const [activity, setActivity] = useState("");
  const [stockName, setStockName] = useState("");
  const [stocks, setStocks] = useState([]);
  const [ticker, setTicker] = useState("");
  const [addedStock, setAddedStock] = useState(false);
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

  const handleStockChange = (value: { value: string; label: string }) => {
    setStockName(value.label);
    setTicker(value.value);
  };

  const onAddNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log(event.target);
    setAddStock(event.target.value);
    setAddedStock(false);
  };

  const addItem = (
    e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>
  ) => {
    e.preventDefault();
    setAddStock("");
    //setStocks([...stocks, stockName])
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const onActivityChange = (value: string) => {
    setActivity(value);
  };

  const onTickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTicker(e.target.value);
  };

  const onDateChange: DatePickerProps["onChange"] = (date, dateString) => {
    setTransDate(dateString);
  };

  const onPriceChange = (value: number | null) => {
    setPrice(value ?? 0);
    if (shares) {
      setTotal(formatDecimalTwoPlaces((fee ?? 0) + shares * (value ?? 0)));
    }
  };

  const onShareChange = (value: number | null) => {
    setShares(value ?? 0);
    if (price) {
      setTotal(formatDecimalTwoPlaces(fee ?? 0) + price * (value ?? 0));
    }
  };

  const onFeeChange = (value: number | null) => {
    setFee(value ?? 0);
    if (shares && price) {
      setTotal(formatDecimalTwoPlaces((value ?? 0) + price * shares));
    }
  };

  const onTotalChange = (value: number | null) => {
    setTotal(value ?? 0);
  };

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
          <Row>
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
          </Row>
          <Space align="baseline">
            <Form.Item name="stock name" label="Stock Name" />
            <Select
              style={{ width: 500 }}
              labelInValue
              placeholder="Stock Name"
              onChange={handleStockChange}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: "8px 0" }} />
                  <Space style={{ padding: "0 8px 4px" }}>
                    <Input
                      placeholder="Name,Ticker"
                      ref={inputRef}
                      value={addStock}
                      onChange={onAddNameChange}
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
              options={stocks.map((item: any) => ({
                label: item.node.name,
                value: item.node.ticker,
              }))}
            />
            <Form.Item name="stock ticker" label="Stock Ticker" />
            <Input
              value={ticker}
              disabled={!addedStock}
              onChange={onTickerChange}
            />
          </Space>
          <Space align="baseline">
            <Form.Item
              name="activity"
              label="Activity"
              rules={[{ required: true }]}
            >
              <Select
                style={{ width: 300 }}
                value={activity}
                onChange={onActivityChange}
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
          </Space>
          <Space align="baseline">
            <InputNumber
              min={0}
              step={0.01}
              value={price}
              addonBefore="Price"
              onChange={onPriceChange}
              formatter={(value) => `$ ${value}`}
            />
            <InputNumber
              value={shares}
              onChange={onShareChange}
              addonBefore="Shares"
              min={0}
              step={1}
            />
            <InputNumber
              min={0}
              step={0.01}
              value={fee}
              onChange={onFeeChange}
              addonBefore="Fees"
              formatter={(value) => `$ ${value}`}
            />
            <InputNumber
              min={0}
              step={0.01}
              value={total}
              onChange={onTotalChange}
              addonBefore="Total"
              formatter={(value) => `$ ${value}`}
            />
          </Space>
        </>
      ) : (
        <></>
      )}
      <Form.Item style={{ marginTop: 32 }}>
        <Button htmlType="submit">Reset</Button>
        <Button style={{ marginLeft: 16 }} type="primary" htmlType="button">
          Submit
        </Button>
      </Form.Item>
    </Form>
  );
};

export default AddActivityView;
