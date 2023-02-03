import React from 'react';
import axios from 'axios';
import { Space, Input } from 'antd';

/*
API endpoints using Polygon.io
Aggregate - https://api.polygon.io/v2/aggs/ticker/AAPL/range/1/day/2022-01-09/2023-01-09?adjusted=true&sort=asc&apiKey=O8n2aAfs5gZH7yUue92pepD_sCKE2zpU
Ticker Details - https://api.polygon.io/v3/reference/tickers/AAPL?apiKey=O8n2aAfs5gZH7yUue92pepD_sCKE2zpU
News - https://api.polygon.io/v2/reference/news?ticker=AAPL&apiKey=O8n2aAfs5gZH7yUue92pepD_sCKE2zpU
Stock Split - https://api.polygon.io/v3/reference/splits?ticker=AAPL&apiKey=O8n2aAfs5gZH7yUue92pepD_sCKE2zpU
Dividends - https://api.polygon.io/v3/reference/dividends?ticker=AAPL&apiKey=O8n2aAfs5gZH7yUue92pepD_sCKE2zpU
*/

const { Search } = Input;

const onSearch = (ticker: string) => {

}

const StocksView = () => {
  return (
    <Space>
      <Search placeholder="input search text" onSearch={onSearch} allowClear />
    </Space>
  );
};

export default StocksView;