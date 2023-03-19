import { Divider } from "antd";
import { useState } from "react";

import { Stock } from "../../interfaces/Stock";
import SelectedStockInfo from "./SelectedStockInfo";
import StocksAddDropdown from "./StocksAddDropdown";

const MyStocksView = () => {
  const [selectedStock, setSelectedStock] = useState<Stock | undefined>(
    undefined
  );

  return (
    <>
      <StocksAddDropdown setSelectedStock={setSelectedStock} />
      <Divider />
      {selectedStock && (
        <SelectedStockInfo
          stock={selectedStock.id}
          name={selectedStock.name}
          ticker={selectedStock.ticker}
          currency={selectedStock.currency?.code}
        />
      )}
    </>
  );
};

export default MyStocksView;
