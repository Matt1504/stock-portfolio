import { Card, Col, Row, Statistic, Tabs } from "antd";
import { useEffect, useState } from "react";

import { useQuery } from "@apollo/client";
import { Typography } from "@mui/material";

import { HoldingDetail } from "../../models/Common";
import { Currency } from "../../models/Currency";
import { GraphQLNode } from "../../models/GraphQLNode";
import { Stock } from "../../models/Stock";
import { Transaction } from "../../models/Transaction";
import { TRANSACTIONS_BY_ACCOUNT } from "./gql";

type SAProps = {
  name: string | undefined;
  account: string | undefined;
  accountName: string | undefined;
  currencies: GraphQLNode<Currency>[];
};

class StockHolding {
  total: number;
  shares: number;
  label: string;

  constructor(total: number, shares: number, label: string) {
    this.total = total;
    this.shares = shares;
    this.label = label;
  }
}

const defaultAccountDetails: HoldingDetail[] = [
  {
    title: "Total Share(s) Owned",
    value: 0,
    prefix: undefined,
    colour: "",
    precision: undefined,
  },
  {
    title: "Unique Share(s) Owned",
    value: 0,
    prefix: undefined,
    colour: "",
    precision: undefined,
  },
  {
    title: "Largest Holding",
    value: "",
    prefix: undefined,
    colour: "",
    precision: undefined,
  },
  {
    title: "Amount Contributed",
    value: 0,
    prefix: "$",
    colour: "",
    precision: 2,
  },
  {
    title: "Amount Transferred In",
    value: 0,
    prefix: "$",
    colour: "",
    precision: 2,
  },
  {
    title: "Amount Transferred Out",
    value: 0,
    prefix: "$",
    colour: "",
    precision: 2,
  },
  {
    title: "Total Book Cost",
    value: 0,
    prefix: "$",
    colour: "",
    precision: 2,
  },
  {
    title: "Total Dividends Earned",
    value: 0,
    prefix: "$",
    colour: "",
    precision: 2,
  },
];

const SelectedAccountInfo = (props: SAProps) => {
  const { name, account, accountName, currencies } = props;
  const [accountDetails, setAccountDetails] = useState(defaultAccountDetails);
  const [selectedCurrrency, setSelectedCurrency] = useState("");
  const { loading, error, data } = useQuery(TRANSACTIONS_BY_ACCOUNT, {
    variables: { account },
  });

  const handleTabChange = (key: string) => {
    setSelectedCurrency(key);
    processTransactionData(key);
  };

  useEffect(() => {
    if (currencies && data?.transactionsByAccount) {
      setSelectedCurrency(currencies[0].node.id ?? "");
      processTransactionData(currencies[0].node.id ?? "");
    }
  }, [currencies, name, data]);

  const processTransactionData = (currency: string) => {
    if (!data?.transactionsByAccount || !currency) {
      return;
    }

    var contributions = 0;
    var transferIn = 0;
    var transferOut = 0;
    var shares = 0;
    var bookCost = 0;
    var dividends = 0;

    var stockHoldings = new Map<Stock, StockHolding>();
    var transactions = data?.transactionsByAccount.filter(
      (transaction: Transaction) =>
        transaction.platform?.currency?.id === currency &&
        (name === "Overview" || transaction.platform.name === name)
    );

    if (!transactions.length) return;

    transactions.map((transaction: Transaction) => {
      switch (transaction.activity.name) {
        case "Contribution":
          contributions += transaction.total ?? 0;
          break;
        case "Transfer In":
          transferIn += transaction.total ?? 0;
          break;
        case "Transfer Out":
          transferOut += transaction.total ?? 0;
          break;
        case "Buy":
          shares += transaction.shares ?? 0;
          bookCost += transaction.total ?? 0;
          var holding = stockHoldings.get(transaction.stock as Stock);
          if (holding) {
            holding.shares += transaction.shares ?? 0;
            holding.total += transaction.total ?? 0;
          } else {
            holding = new StockHolding(
              transaction.total ?? 0,
              transaction.shares ?? 0,
              transaction.stock?.ticker as string
            );
          }
          stockHoldings.set(transaction.stock as Stock, holding);
          break;
        case "Stock Split":
          shares += transaction.shares ?? 0;
          break;
        case "Sell":
          shares -= transaction.shares ?? 0;
          var holding = stockHoldings.get(transaction.stock as Stock);
          if (holding) {
            holding.shares -= transaction.shares ?? 0;
            holding.total -= transaction.total ?? 0;
          } else {
            holding = new StockHolding(
              (transaction.total ?? 0) * -1,
              (transaction.shares ?? 0) * -1,
              transaction.stock?.ticker as string
            );
          }
          stockHoldings.set(transaction.stock as Stock, holding);
          break;
        case "Dividends":
          dividends += transaction.total ?? 0;
          break;
        case "Withholding Tax":
          dividends -= transaction.total ?? 0;
      }
    });

    var maxHolding = new StockHolding(0, 0, "");
    if (stockHoldings.size) {
      maxHolding = Array.from(stockHoldings.values()).reduce(
        (prev: StockHolding, current: StockHolding) =>
          prev.total > current.total ? prev : current
      );
    }

    setAccountDetails((prev: HoldingDetail[]) => {
      let update = [...prev];
      update[0].value = shares;
      update[1].value = stockHoldings.size;
      update[2].value = stockHoldings.size ? `${maxHolding.label} | $${maxHolding.total.toFixed(2)}` : "-";
      update[3].value = contributions;
      update[4].value = transferIn;
      update[5].value = transferOut;
      update[6].value = bookCost;
      update[7].value = dividends;
      return update;
    });
  };

  return (
    <Row>
      <Col span={24}>
        <Typography gutterBottom variant="h6">
          {accountName} {name}
        </Typography>
      </Col>
      <Col span={24}>
        <Tabs
          activeKey={selectedCurrrency}
          size="large"
          type="card"
          onChange={handleTabChange}
          items={currencies.map(
            (currency: GraphQLNode<Currency>, index: number) => {
              return {
                label: currency.node.code,
                key: currency.node.id ?? "",
                disabled:
                  loading ||
                  data?.transactionsByAccount.filter(
                    (transaction: Transaction) =>
                      transaction.platform?.currency?.id === currency.node.id &&
                      (name === "Overview" ||
                        transaction.platform.name === name)
                  ).length === 0,
              };
            }
          )}
        />
      </Col>
      {accountDetails.map((x: HoldingDetail, index: number) => (
        <Col span={6} key={index}>
          <Card style={{ marginBottom: 16, marginLeft: 8, marginRight: 8 }}>
            <Statistic
              loading={loading}
              title={x.title}
              value={x.value}
              prefix={x.prefix}
              precision={x.precision}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default SelectedAccountInfo;
