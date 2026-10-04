import { useProfileQuery as useQuery, useProfileMutation as useMutation } from "../../profiles/hooks";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Form,
  InputNumber,
  Radio,
  RadioChangeEvent,
  Row,
  Select,
} from "antd";
import { useEffect, useMemo, useState } from "react";



import { UploadOutlined } from "@ant-design/icons";
import StatementImportDialog from "./StatementImportDialog";
import StocksAddDropdown from "../MyStocksView/StocksAddDropdown";
import AccountsAddDropdown from "../AccountView/AccountsAddDropdown";
import { notifyTransactionSaved, transactionErrorMessage } from "../../utils/transactionFeedback";
import { NotificationComponent } from "../../components/Notification";
import { Activity } from "../../models/Activity";
import { Account } from "../../models/Account";
import { Currency } from "../../models/Currency";
import { GraphQLNode } from "../../models/GraphQLNode";
import { Platform } from "../../models/Platform";
import { Stock } from "../../models/Stock";
import { Transaction, TransactionForm } from "../../models/Transaction";
import { formatDate, formatDecimalTwoPlaces, formatNumber } from "../../utils/utils";
import { inactiveTransactionFields, sanitizeTransactionFields } from "./transactionFields";
import { CREATE_TRANSACTION, GET_PLATFORM_INFO, OUTSTANDING_GIC_PURCHASES } from "./gql";

const AddTransactionView = () => {
  const { loading, data, refetch } = useQuery(GET_PLATFORM_INFO);
  const [form] = Form.useForm();
  const notification = new NotificationComponent();

  const [importOpen, setImportOpen] = useState(false);
  const [account, setAccount] = useState("");
  const [currency, setCurrency] = useState("");
  const [activity, setActivity] = useState("");
  const selectedPlatformId = Form.useWatch("platform", form);
  const selectedGicPurchaseId = Form.useWatch("gicPurchase", form);
  const selectedStockId = Form.useWatch("stock", form);
  const transactionDate = Form.useWatch("transaction", form)?.format("YYYY-MM-DD");
  const selectedStock = data?.stocks.edges.find(({ node }: GraphQLNode<Stock>) => node.id === selectedStockId)?.node;
  const assetName = selectedStock?.asset?.name ?? "Stock";
  const selectedPlatform = data?.platforms.edges.find(({ node }: GraphQLNode<Platform>) => node.id === selectedPlatformId)?.node;
  const hasCurrencyMismatch = Boolean(selectedStock?.currency?.id && selectedPlatform?.currency?.id && selectedStock.currency.id !== selectedPlatform.currency.id);
  const shareEntry = Form.useWatch("shareEntry", form);
  const priceCurrencyId = Form.useWatch("priceCurrency", form);
  const totalCurrencyId = Form.useWatch("totalCurrency", form);
  const shareTrade = ["Buy", "Sell"].includes(activity) && assetName !== "GIC" && (!["Index Fund", "Mutual Fund"].includes(assetName) || shareEntry);
  useEffect(() => {
    const totalCurrency = selectedPlatform?.currency?.id ?? currency;
    const priceCurrency = selectedStock?.currency?.id ?? totalCurrency;
    form.setFieldsValue({ totalCurrency, priceCurrency, exchangeRate: priceCurrency === totalCurrency ? 1 : undefined });
  }, [selectedPlatform?.currency?.id, selectedStock?.currency?.id, currency, form]);
  useEffect(() => { form.setFieldValue("shareEntry", false); }, [selectedStockId, form]);
  const nonStock = ["Buy", "Sell"].includes(activity) ? (assetName === "GIC" ? "gic" : ["Index Fund", "Mutual Fund"].includes(assetName) && !shareEntry ? "index" : "") : "";

  const gicQuery = useQuery(OUTSTANDING_GIC_PURCHASES, { variables: { platform: selectedPlatformId, stock: selectedStockId }, skip: activity !== "GIC Maturity" || !selectedPlatformId || !selectedStockId });
  const gicPurchases: Transaction[] = useMemo(() => gicQuery.data?.outstandingGicPurchases ?? [], [gicQuery.data?.outstandingGicPurchases]);
  const selectedGicPurchase = gicPurchases.find(purchase => purchase.id === selectedGicPurchaseId);

  useEffect(() => {
    if (activity !== "GIC Maturity") return;
    const matches = !selectedPlatformId || !selectedStockId || gicQuery.loading || gicQuery.error || !transactionDate ? [] : gicPurchases.filter(purchase => purchase.maturityDate?.toString().slice(0, 10) === transactionDate);
    // A date can identify a contract only when exactly one outstanding purchase matches.
    // Manual selection still supports early/late payouts and duplicate maturity dates.
    const purchase = matches.length === 1 ? matches[0] : undefined;
    form.setFieldsValue({ gicPurchase: purchase?.id ?? null, total: purchase ? purchase.expectedMaturityTotal ?? purchase.total : null });
  }, [activity, transactionDate, selectedPlatformId, selectedStockId, gicQuery.loading, gicQuery.error, gicPurchases, form]);

  const [createTransaction, { loading: saving }] = useMutation(CREATE_TRANSACTION, {
    update: (cache: any, mutationResult: any) => {
      if (!mutationResult.data?.createTransaction?.transaction) {
        notification.openNotificationWithIcon(
          "error",
          "Error Adding Transaction",
          "There was an error adding the transaction. Please try again."
        );
      } else {
        notifyTransactionSaved(notification, "Transaction Added", "The transaction was successfully added to the database.", mutationResult.data.createTransaction.warnings);
        var fields = ["total"];
        if (activity !== "Withholding Tax") {
          fields = fields.concat([
            "stock",
            "price",
            "shares",
            "fee",
            "gicPurchase",
            "spinoffSource",
            "allocatedBookCost",
          ]);
        }
        fields.forEach((field: string) => {
          form.setFieldValue(field, null);
        });
      }
    },
  });

  const onRadioChangeCurrency = (e: RadioChangeEvent, updateFunc: Function) => {
    onRadioChange(e, updateFunc);

    form.setFieldValue("stock", null);

  };

  const onRadioChange = (e: RadioChangeEvent, updateFunc: Function) =>
    updateFunc(e.target.value);

  const onSelectActivityChange = (value: string, option: any) => {
    setActivity(option.label);
    inactiveTransactionFields(option.label).forEach(field => form.setFieldValue(field, null));
    if (["Withholding Tax", "Interest", "GIC Maturity"].includes(option.label)) form.setFieldValue("stock", null);
    form.setFieldValue("activity", value);
  };

  const onInputNumberChange = (
    shares: number | null = null,
    price: number | null = null,
    fee: number | null = null,
    exchangeRate: number | null = null,
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
    const conversion = exchangeRate ?? form.getFieldValue("exchangeRate");
    if (form.getFieldValue("priceCurrency") !== form.getFieldValue("totalCurrency") && !conversion) { form.setFieldValue("total", null); return; }
    var total = (price ?? 0) * (shares ?? 0) * (conversion ?? 1);
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

  const onFinish = async (formValues: TransactionForm) => {
    const values = sanitizeTransactionFields(formValues, activity, nonStock);
    values.transactionDate = formatDate((values.transaction ?? "").toString());
    values.total = formatDecimalTwoPlaces(values.total);
    if (nonStock === 'gic') values.maturityDate = formatDate((values.maturity ?? "").toString());
    delete values.transaction;
    delete values.currency;
    delete values.maturity;

    if (values.fee) values.fee = formatDecimalTwoPlaces(values.fee);
    if (values.rate) values.rate = formatDecimalTwoPlaces(values.rate);
    if (nonStock === "gic" && activity === "Buy") values.interestCalculation = formValues.interestCalculation ?? "simple";
    if (saving) return;
    try {
      await createTransaction({ variables: { trans: values } });
    } catch (error) {
      notification.openNotificationWithIcon("error", "Error Adding Transaction", transactionErrorMessage(error), 8);
    }
  };

  useEffect(() => {
    if (!nonStock || nonStock === "index") {
      // set the gic stuff to null
      form.setFieldValue("rate", null);
      form.setFieldValue("maturity", null);
    }
    if (nonStock === "gic") form.setFieldValue("interestCalculation", form.getFieldValue("interestCalculation") ?? "simple");
    form.setFieldValue("total", null);
    if (!nonStock) {
      return;
    }
    form.setFieldValue("price", null);
    form.setFieldValue("shares", null);
    form.setFieldValue("fee", null);
  }, [nonStock, form]);

  useEffect(() => {
    form.setFieldValue("platform", null);
  }, [account, currency, form]);

  const stockOptions = useMemo(() => (data?.stocks?.edges ?? [])
    .filter(({ node }: GraphQLNode<Stock>) => (activity !== "GIC Maturity" || node.asset?.name === "GIC") && (activity !== "Stock Spinoff" || node.asset?.name === "Stock"))
    .map(({ node }: GraphQLNode<Stock>) => ({ value: node.id, label: `${node.name} (${node.ticker})` })), [activity, data?.stocks?.edges]);

  const platformOptions = useMemo(() => {
    if (!currency || !account) return [];
    return (data?.platforms?.edges ?? [])
      .filter((x: GraphQLNode<Platform>) => x.node.currency?.id === currency && x.node.account?.id === account)
      .map((x: GraphQLNode<Platform>) => ({ value: x.node.id, label: x.node.name }));
  }, [account, currency, data?.platforms?.edges]);

  return (
    <Row>
      {notification.contextHolder}
      {importOpen && data && <StatementImportDialog data={data} initialPlatform={selectedPlatformId} onClose={() => setImportOpen(false)} onImported={async () => { await refetch(); }} />}
      <Col span={24} className="transaction-entry">
        <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)} disabled={loading || !data} style={{ marginBottom: 24 }}>Import Transactions</Button>
        {loading ? (
          <Card style={{ width: "100%", marginTop: 16 }} loading={loading} />
        ) : (
          <Form className="portfolio-transaction-form" layout="vertical" form={form} name="add_transaction" onFinish={onFinish}>
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
                style={{ display: "flex", flexWrap: "nowrap", gap: 0, overflowX: "auto" }}
                onChange={(e: RadioChangeEvent) => onRadioChange(e, setAccount)}
              >
                {data?.accounts?.edges.map((account: GraphQLNode<Account>) => {
                  return (
                    <Radio key={account.node.id} value={account.node.id} style={{ flexShrink: 0, whiteSpace: "nowrap", marginRight: 0 }}>
                      {account.node.code ?? account.node.name}
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
              label="Platform"
            >
              <div className="transaction-field-with-action">
                <Form.Item noStyle name="platform"
                  rules={[
                    {
                      required: true,
                      message: "Please select the platform.",
                    },
                  ]}
                >
                  <Select
                    aria-label="Platform"
                    showSearch
                    filterOption={(input, option: any) =>
                      (option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    style={{ width: "100%" }}
                    options={platformOptions}
                  />
                </Form.Item>
                <AccountsAddDropdown compact data={data} loading={loading} options={[]} onAccountChange={() => {}} initialValues={{ account, currency }} onCreated={async platform => { await refetch(); if (platform.account?.id === account && platform.currency?.id === currency) form.setFieldValue("platform", platform.id); }} />
              </div>
            </Form.Item>
            <Form.Item
              name="activity"
              label="Activity"
              extra={activity === "SEC Fee" ? "Account-level fee for USD trading accounts only. Enter the positive fee amount in Total." : undefined}
              rules={[
                {
                  required: true,
                  message: "Please select the activity.",
                },
              ]}
            >
              <Select
                style={{ width: "100%" }}
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
              name="transaction"
              label="Transaction Date"
              rules={[{ required: true }]}
            >
              <DatePicker />
            </Form.Item>
            <Form.Item
              label={activity === "Stock Spinoff" ? "Stock Received" : "Stock"}
              extra={activity === "Withholding Tax" ? "Optional: leave empty for account withholding tax." : activity === "Interest" ? "Optional: leave empty for interest earned on the account." : selectedStockId ? `Asset Type: ${assetName}` : undefined}
              hidden={[
                "Contribution",
                "Withdrawal",
                "Service Fee",
                "SEC Fee",
                "ETF Rebate",
                "Transfer In",
                "Transfer Out",
                "Adjustment",
              ].includes(activity)}
            >
              <div className="transaction-field-with-action">
                <Form.Item noStyle name="stock"
                  rules={[
                    {
                      required: ![
                        "Interest",
                        "Withholding Tax",
                        "Contribution",
                        "Withdrawal",
                        "Service Fee",
                        "SEC Fee",
                        "ETF Rebate",
                        "Transfer In",
                        "Transfer Out",
                        "Adjustment",
                      ].includes(activity),
                      message: "Please select the stock.",
                    },
                  ]}
                >
                  <Select
                    aria-label="Stock"
                    allowClear
                    showSearch
                    filterOption={(input, option: any) =>
                      (option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    style={{ width: "100%" }}
                    options={stockOptions}
                  />
                </Form.Item>
                <StocksAddDropdown compact data={data} loading={loading} selectedStockId={undefined} onStockChange={() => {}} initialValues={{ currency }} onCreated={async stock => { await refetch(); form.setFieldValue("stock", stock.id); }} />
              </div>
            </Form.Item>
            {activity === "Stock Spinoff" && <>
              <Alert type="info" showIcon message="Receive shares and move part of the original stock’s book cost. No cash, contribution, dividend, or purchase is recorded." style={{ marginBottom: 24 }} />
              <Form.Item name="spinoffSource" label="Original Stock" rules={[{ required: true, message: "Select the original stock." }]}>
                <Select aria-label="Original Stock" showSearch optionFilterProp="label" options={stockOptions.filter((option: { value: string | undefined }) => option.value !== selectedStockId)} />
              </Form.Item>
              <Form.Item name="allocatedBookCost" label="Allocated Book Cost" extra="Amount moved from the original stock to the received stock, in the platform’s currency. Use your broker’s allocation." rules={[{ required: true, message: "Enter the allocated book cost." }]}>
                <InputNumber min={0} precision={2} step={0.01} addonBefore="$" />
              </Form.Item>
            </>}
            <Form.Item
              name="gicPurchase"
              label="Original GIC Purchase"
              hidden={activity !== "GIC Maturity"}
              rules={[{ required: activity === "GIC Maturity", message: "Please select the original GIC purchase." }]}
            >
              <Select aria-label="Original GIC Purchase" showSearch optionFilterProp="label" loading={gicQuery.loading} disabled={!selectedStockId || !selectedPlatformId || gicQuery.loading} onChange={id => { const purchase = gicPurchases.find(record => record.id === id); form.setFieldValue("total", purchase?.expectedMaturityTotal ?? purchase?.total); }} options={gicPurchases.map(purchase => ({ value: purchase.id, label: `${purchase.transactionDate} · $${formatNumber(purchase.total ?? 0, 2, 2)} · matures ${purchase.maturityDate ?? "unknown"}` }))} />
            </Form.Item>
            {activity === "GIC Maturity" && <>
              {gicQuery.error && <Alert type="error" showIcon message="Unable to load GIC purchases. Please reload and try again." />}
              {selectedStockId && selectedPlatformId && !gicQuery.loading && !gicQuery.error && !gicPurchases.length && <Alert type="info" showIcon message="No outstanding GIC purchases found for this asset and platform." />}
              {selectedGicPurchase && <Alert type="info" showIcon message={`Principal: $${formatNumber(selectedGicPurchase.total ?? 0, 2, 2)} · Estimated maturity payout: ${selectedGicPurchase.expectedMaturityTotal == null ? "unavailable; verify purchase terms" : `$${formatNumber(selectedGicPurchase.expectedMaturityTotal, 2, 2)}`}`} style={{ marginBottom: 24 }} />}
            </>}
            {["Index Fund", "Mutual Fund"].includes(assetName) && ["Buy", "Sell"].includes(activity) && <Form.Item name="shareEntry" valuePropName="checked"><Checkbox>Enter price and shares</Checkbox></Form.Item>}
            <Form.Item name="priceCurrency" label="Price Currency" hidden={!shareTrade} rules={[{ required: shareTrade, message: "Select the price currency." }]}>
              <Select disabled={!hasCurrencyMismatch} options={(data?.currencies.edges ?? []).map(({ node }: GraphQLNode<Currency>) => ({ value: node.id, label: node.code }))} onChange={id => { form.setFieldsValue({ exchangeRate: id === totalCurrencyId ? 1 : undefined, total: null }); }} />
            </Form.Item>
            <Form.Item name="totalCurrency" hidden>
              <Select disabled options={(data?.currencies.edges ?? []).map(({ node }: GraphQLNode<Currency>) => ({ value: node.id, label: node.code }))} />
            </Form.Item>
            <Form.Item name="exchangeRate" label="Exchange Rate" extra={`${selectedPlatform?.currency?.code ?? "Total currency"} per 1 ${data?.currencies.edges.find(({ node }: GraphQLNode<Currency>) => node.id === priceCurrencyId)?.node.code ?? "price currency"}`} hidden={!shareTrade || priceCurrencyId === totalCurrencyId} rules={[{ required: shareTrade && priceCurrencyId !== totalCurrencyId, message: "Enter the exchange rate." }]}>
              <InputNumber min={0.00000001} precision={8} step={0.000001} style={{ width: "100%" }} onChange={value => onInputNumberChange(null, null, null, value)} />
            </Form.Item>
            <Form.Item
              name="price"
              label="Price"
              hidden={!["Buy", "Sell"].includes(activity) || nonStock !== ""}
              rules={[
                {
                  required: ["Buy", "Sell"].includes(activity) && !nonStock,
                  message: "Please include the price.",
                },
              ]}
            >
              <InputNumber
                step={0.001}
                onChange={(value) => onInputNumberChange(null, value, null)}
                keyboard
                min={0}
                addonBefore="$"
              />
            </Form.Item>
            <Form.Item
              name="shares"
              label={activity === "Stock Spinoff" ? "Shares Received" : "Shares"}
              hidden={!["Stock Split", "Buy", "Sell", "Stock Spinoff"].includes(activity) || nonStock !== ""}
              rules={[
                {
                  required:
                    ["Stock Split", "Buy", "Sell", "Stock Spinoff"].includes(activity) && !nonStock,
                  message: "Please include the shares.",
                },
              ]}
            >
              <InputNumber
                step={1}
                precision={4}
                formatter={(value, info) => info.userTyping ? info.input : value === undefined || value === null ? "" : String(Number(Number(value).toFixed(4)))}
                onChange={(value) => onInputNumberChange(value, null, null)}
                keyboard
                min={0}
              />
            </Form.Item>
            <Form.Item
              name="fee"
              label="Fee"
              hidden={!["Buy", "Sell"].includes(activity) || nonStock !== ""}
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
              name="rate"
              label="Interest Rate"
              hidden={nonStock !== "gic"}
              rules={[
                {
                  required: nonStock === "gic",
                  message: "Please enter the interest rate.",
                },
              ]}
            >
              <InputNumber
                step={0.01}
                keyboard
                min={0}
                addonAfter="%"
              />
            </Form.Item>
            <Form.Item
              name="maturity"
              label="Maturity Date"
              hidden={nonStock !== "gic"}
              rules={[
                {
                  required: nonStock === "gic",
                  message: "Please enter the maturity date.",
                },
              ]}
            >
              <DatePicker />
            </Form.Item>
            <Form.Item
              name="interestCalculation"
              label="Interest Calculation"
              hidden={nonStock !== "gic" || activity !== "Buy"}
              initialValue="simple"
            >
              <Select options={[{ value: "simple", label: "Simple interest (actual days / 365)" }, { value: "annual_compound", label: "Annual compounding (actual days / 365)" }]} />
            </Form.Item>
            <Form.Item
              name="total"
              label={activity === "GIC Maturity" ? "Gross Payout" : "Total"}
              extra={activity === "GIC Maturity" ? "Principal plus interest before any tax or fees. The backend calculates interest from the original purchase." : undefined}
              hidden={["Stock Split", "Stock Spinoff"].includes(activity)}
              rules={[
                {
                  required: !["Stock Split", "Stock Spinoff"].includes(activity),
                  message: "Please enter the total.",
                },
              ]}
            >
              <InputNumber step={0.01} keyboard min={0} addonBefore="$" />
            </Form.Item>
            <Form.Item className="transaction-form-actions">
              <Button onClick={onReset}>Reset</Button>
              <Button
                style={{ marginLeft: 16 }}
                type="primary"
                htmlType="submit"
                loading={saving}
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
