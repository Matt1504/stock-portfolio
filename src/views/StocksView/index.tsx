import React, { useState } from 'react';
import axios from 'axios';
import { Space, Badge, Statistic, Card, Input, Col, Row } from 'antd';
import * as aggregateData from '../../data/AggregateBars.json';
import * as dividendData from '../../data/Dividends.json';
import * as stockSplitData from '../../data/StockSplits.json';
import * as detailData from '../../data/TickerDetails.json';
import * as stockNewsData from '../../data/TickerNews.json';
import CarouselComponent from '../../components/Carousel';

/*
API endpoints using Polygon.io
Aggregate - https://api.polygon.io/v2/aggs/ticker/AAPL/range/1/day/2022-01-09/2023-01-09?adjusted=true&sort=asc&apiKey=O8n2aAfs5gZH7yUue92pepD_sCKE2zpU
Ticker Details - https://api.polygon.io/v3/reference/tickers/AAPL?apiKey=O8n2aAfs5gZH7yUue92pepD_sCKE2zpU
News - https://api.polygon.io/v2/reference/news?ticker=AAPL&apiKey=O8n2aAfs5gZH7yUue92pepD_sCKE2zpU
Stock Split - https://api.polygon.io/v3/reference/splits?ticker=AAPL&apiKey=O8n2aAfs5gZH7yUue92pepD_sCKE2zpU
Dividends - https://api.polygon.io/v3/reference/dividends?ticker=AAPL&apiKey=O8n2aAfs5gZH7yUue92pepD_sCKE2zpU
*/

const { Search } = Input;

const frequencyVal: {[key: number]: string } = {
  0 : "One-Time",
  1 : "Annually",
  2: "Bi-Annually",
  4: "Quarterly",
  12: "Monthly"
}

const StocksView = () => {
  const [ticker, setTicker] = useState({});
  const [aggData, setAggData] = useState(aggregateData);
  const [divData, setDivData] = useState(dividendData);
  const [splitData, setSplitData] = useState(stockSplitData);
  const [detData, setDetData] = useState(detailData);
  const [newsData, setNewsData] = useState(stockNewsData);

  const onSearch = (ticker: string) => {
    let urls = [
      `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/2022-01-09/2023-01-09?adjusted=true&sort=asc&apiKey=O8n2aAfs5gZH7yUue92pepD_sCKE2zpU`,
      `https://api.polygon.io/v3/reference/tickers/${ticker}?apiKey=O8n2aAfs5gZH7yUue92pepD_sCKE2zpU`,
      `https://api.polygon.io/v2/reference/news?ticker=${ticker}&apiKey=O8n2aAfs5gZH7yUue92pepD_sCKE2zpU`,
      `https://api.polygon.io/v3/reference/splits?ticker=${ticker}&apiKey=O8n2aAfs5gZH7yUue92pepD_sCKE2zpU`,
      `https://api.polygon.io/v3/reference/dividends?ticker=${ticker}&apiKey=O8n2aAfs5gZH7yUue92pepD_sCKE2zpU`
    ];

    const requests = urls.map(url => axios.get(url));

    axios.all(requests).then((responses) => {
      responses.forEach(resp => {

      });
    });
  }

  return (
    <>
      <Row gutter={16}>
        <Col span={24}>
          <Search placeholder="input search text" onSearch={onSearch} allowClear />
        </Col>
      </Row>
      <Row>
        <Col span={24}>
          <Card title={`${detData.results.name} (${detData.results.ticker})`}>
            <h1></h1>
            <p>{detData.results.description}</p>
            <Space size="large">
            <Statistic title="Market Cap" value={detData.results.market_cap} prefix="$" suffix={detData.results.currency_name?.toUpperCase()}/>
            <Statistic title="Shares Outstanding" value={detData.results.share_class_shares_outstanding}/>
            </Space>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col span={24}>
          <CarouselComponent auto={false} slides={4}>
          {divData.results.map((value) => {
            return( 
              <Card key={value.declaration_date}>
                <Statistic value={value.cash_amount} prefix="$" suffix={value.currency} />
                <p>Declaration Date: {value.declaration_date}</p>
                <p>Ex-Dividend Date: {value.ex_dividend_date}</p>
                <Badge count={frequencyVal[value.frequency]} />
              </Card>
            );
          })}
          </CarouselComponent>
        </Col>
      </Row>
      <Row>
        <Col span={24}>
          <CarouselComponent auto={false} slides={5}>
            {splitData.results.map((value) => {
              return(
                <Card key={value.execution_date}>
                  <Statistic title="Stock Split" value={`${value.split_to}:${value.split_from}`} />
                  <p>{value.execution_date}</p>
                </Card>
              )
            })}
          </CarouselComponent>
        </Col>
      </Row>
      <Row>
        <Col span={24}>
        <CarouselComponent auto={true} slides={3}>
            {newsData.results.map((value) => {
              return (
                <Card hoverable cover={<img src={value.image_url} />} key={value.id} title={value.title} extra={<a href={value.article_url} target="_blank" rel="noopener" >More</a>}>
                  <p>By: {value.author} | {value.published_utc}</p>
                  <p>{value.description}</p>
                  <div>
                    {value.tickers.map((x) => {
                      return <Badge count={x} />
                    })}
                  </div>
                </Card>
              );
            })}
          </CarouselComponent>
        </Col>
      </Row>
    </>
  );
};

export default StocksView;