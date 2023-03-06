import { gql } from "@apollo/client";

export const ALL_STOCKS_CURRENCY = gql(`
    query {
        stocks {
            edges {
                node {
                    id
                    name
                    ticker
                    currency {
                        code
                    }
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
    }`);

export const CREATE_STOCK = gql(`
    mutation creatStock($stock: StockInput!) {
        createStock(stockData: $stock) {
            stock {
                id
                name
                ticker
                currency {
                    code
                }
            }
        }
    }`);
