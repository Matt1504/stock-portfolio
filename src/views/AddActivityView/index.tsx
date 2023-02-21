import React, { useState, useEffect } from "react";
import {
  Button,
  Radio,
  Row,
  Col,
  Form,
  Input,
  Space,
  Select,
  RadioChangeEvent,
} from "antd";
import { useQuery, gql } from "@apollo/client";

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
  }
`);

const tailLayout = {
  wrapperCol: { offset: 8, span: 16 },
};

const AddActivityView = () => {
  const { loading, error, data } = useQuery(GET_PLATFORM_INFO);

  const [accountId, setAccountId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [platform, setPlatform] = useState("");
  const [platforms, setPlatforms] = useState([]);

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

  useEffect(() => {
    console.log(platform);
  }, [platform]);

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
        <Space align="baseline">
          <Form.Item
            name="platform"
            label="Platform" />
          <Select
            onChange={onPlatformChange}
            value={platform}
            style={{width: 200}}
            options={platforms.map((platform: any) => ({
              label: platform.node.name,
              value: platform.node.id,
            }))}
          />
        </Space>
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
