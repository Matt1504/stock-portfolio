import { Alert, Divider } from "antd";
import { useEffect } from "react";
import { useQuery } from "@apollo/client";
import { useSearchParams } from "react-router-dom";

import { Stock } from "../../models/Stock";
import { Currency } from "../../models/Currency";
import { GraphQLNode } from "../../models/GraphQLNode";
import { ALL_STOCKS_CURRENCY } from "./gql";
import SelectedStockInfo from "./SelectedStockInfo";
import StocksAddDropdown from "./StocksAddDropdown";

type StockData = {
  stocks: { edges: GraphQLNode<Stock>[] };
  currencies: { edges: GraphQLNode<Currency>[] };
};

const MyStocksView = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, loading, error } = useQuery<StockData>(ALL_STOCKS_CURRENCY);
  const stockId = searchParams.get("stock");
  const selectedStock = data?.stocks.edges.find(({ node }) => node.id === stockId)?.node;

  useEffect(() => {
    if (searchParams.has("currency")) {
      const next = new URLSearchParams(searchParams);
      next.delete("currency");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleStockChange = (id: string) => {
    const stock = data?.stocks.edges.find(({ node }) => node.id === id)?.node;
    if (!stock) return;
    const next = new URLSearchParams(searchParams);
    next.set("stock", id);
    next.delete("currency");
    setSearchParams(next);
  };

  return (
    <>
      <StocksAddDropdown data={data} loading={loading} selectedStockId={selectedStock?.id} onStockChange={handleStockChange} />
      <Divider />
      {error && <Alert type="error" showIcon message="Unable to load stocks. Please reload the page to try again." />}
      {data && stockId && !selectedStock && <Alert type="warning" showIcon message="This stock could not be found. Select a stock above." />}
      {selectedStock && <SelectedStockInfo key={selectedStock.id} stock={selectedStock.id} name={selectedStock.name} currency={selectedStock.currency?.code} />}
    </>
  );
};

export default MyStocksView;
