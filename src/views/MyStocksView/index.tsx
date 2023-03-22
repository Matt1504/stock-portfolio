import { Divider } from "antd";
import { useState } from "react";

import { useQuery } from "@apollo/client";

import { Stock } from "../../models/Stock";
import { ACTIVITY_PLATFORM_ACCOUNT_NAMES } from "./gql";
import SelectedStockInfo from "./SelectedStockInfo";
import StocksAddDropdown from "./StocksAddDropdown";

const MyStocksView = () => {
  const { loading, error, data } = useQuery(ACTIVITY_PLATFORM_ACCOUNT_NAMES);
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
          currency={selectedStock.currency?.code}
          columnData={data}
        />
      )}
    </>
  );
};

export default MyStocksView;
