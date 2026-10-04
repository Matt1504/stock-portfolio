import { PlusOutlined } from "@ant-design/icons";
import { useState } from "react";
import { Button, Col, Form, Input, Modal, Radio, Row, Select, Space, Tooltip } from "antd";

import { useMutation } from "@apollo/client";

import { NotificationComponent } from "../../components/Notification";
import { Currency } from "../../models/Currency";
import { GraphQLNode } from "../../models/GraphQLNode";
import { Stock } from "../../models/Stock";
import { ALL_STOCKS_CURRENCY, CREATE_STOCK } from "./gql";

type SADProps = {
  data: { stocks: { edges: GraphQLNode<Stock>[] }; currencies: { edges: GraphQLNode<Currency>[] }; assets?: { edges: GraphQLNode<{ id: string; name: string }>[] } } | undefined;
  loading: boolean;
  selectedStockId: string | undefined;
  onStockChange: (id: string) => void;
  compact?: boolean;
  initialValues?: { currency?: string; account?: string };
  onCreated?: (record: Stock) => Promise<void> | void;
};

const StocksAddDropdown = (props: SADProps) => {
  const { data, loading, selectedStockId, onStockChange, compact = false, initialValues, onCreated } = props;
  const notification = new NotificationComponent();
  const [form] = Form.useForm();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [createStock, { loading: saving }] = useMutation(CREATE_STOCK, {
    update: (cache: any, mutationResult: any) => {
      if (!mutationResult.data?.createStock?.stock) {
        notification.openNotificationWithIcon(
          "error",
          "Error Adding Stock",
          "The stock could not be added to the database because it already exists."
        );
        return;
      }
      var newStock: Stock = mutationResult.data.createStock.stock;
      const readData = cache.readQuery({
        query: ALL_STOCKS_CURRENCY,
      });
      if (readData) cache.writeQuery({
        query: ALL_STOCKS_CURRENCY,
        data: {
          stocks: { edges: [...readData.stocks.edges, { node: newStock }] },
          currencies: readData.currencies,
          assets: readData.assets,
        },
      });
      notification.openNotificationWithIcon(
        "success",
        "Stock Added",
        `"${newStock.name}" with ticker ${newStock.ticker} was successfully added to the database.`
      );
      form.resetFields();
      setDialogOpen(false);
    },
  });

  const onFinish = async (values: { name: string; ticker: string; currency: string; assetId: string }) => {
    if (saving) return;
    try {
      const result = await createStock({ variables: { stock: { ...values, ticker: values.ticker?.trim().toUpperCase(), name: values.name?.trim() } } });
      if (result.data?.createStock?.stock) {
        try {
          await onCreated?.(result.data.createStock.stock);
        } catch {
          notification.openNotificationWithIcon("error", "Refresh Failed", "The stock was saved, but the transaction options could not be refreshed. Please reload the page.");
        }
      }
    } catch {
      notification.openNotificationWithIcon("error", "Error Adding Stock", "Could not save the stock. Please try again.");
    }
  };
  const handleCancel = () => {
    if (saving) return;
    setDialogOpen(false);
    form.resetFields();
  };

  const addButton = <Tooltip title="Add Stock"><Button aria-label="Add Stock" type={compact ? "default" : "primary"} size={compact ? "small" : "middle"} icon={<PlusOutlined aria-hidden />} disabled={loading || !data} onClick={() => { form.setFieldsValue({ ...initialValues, assetId: data?.assets?.edges.find(({ node }) => node.name === "Stock")?.node.id }); setDialogOpen(true); }}>{compact ? null : "Add Stock"}</Button></Tooltip>;
  const dialog = (
      <Modal title="Add Stock" open={dialogOpen} onCancel={handleCancel} onOk={() => form.submit()} okText="Add Stock" confirmLoading={saving} cancelButtonProps={{ disabled: saving }} closable={!saving} maskClosable={!saving} keyboard={!saving}>
        <Form form={form} name="add_stock_dialog" layout="vertical" onFinish={onFinish} disabled={saving}>
          <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: "Please enter a name." }]}>
            <Input placeholder="Stock name" autoFocus />
          </Form.Item>
          <Form.Item name="ticker" label="Ticker" rules={[{ required: true, whitespace: true, message: "Please enter a ticker." }]}>
            <Input placeholder="e.g. AAPL" />
          </Form.Item>
          <Form.Item name="assetId" label="Asset Type" rules={[{ required: true, message: "Please select an asset type." }]}>
            <Select options={data?.assets?.edges.map(({ node }) => ({ value: node.id, label: node.name }))} />
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
            disabled={loading}
            onChange={onStockChange}
            value={selectedStockId}
            aria-label="Select a Stock"
            style={{ width: "100%", maxWidth: 480 }}
            placeholder="Select a Stock"
            optionFilterProp="children"
            filterOption={(input, option: any) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={data.currencies?.edges.map(
              (currency: GraphQLNode<Currency>) => ({
                label: currency.node.code,
                options: data?.stocks.edges
                  ?.filter(
                    (x: GraphQLNode<Stock>) =>
                      x.node.currency?.code === currency.node.code
                  )
                  .map((x: GraphQLNode<Stock>) => ({
                    value: x.node.id,
                    label: `${x.node.name} (${x.node.ticker})`,
                  })),
              })
            )}
          />
        )}
      </Col>
      <Col xs={24} md={8} style={{ display: "flex", justifyContent: "flex-end" }}>
        <Space wrap>
          {addButton}
        </Space>
      </Col>
      {dialog}
    </Row>
  );
};

export default StocksAddDropdown;
