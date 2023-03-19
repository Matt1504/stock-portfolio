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

export const ACTIVITY_PLATFORM_ACCOUNT_NAMES = gql(`
    query {
        accounts {
            edges {
                node {
                    code
                }
            }
        }
        platforms {
            edges {
                node {
                    name
                }
            }
        }
        activities {
            edges {
                node {
                    name
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

export const TRANSACTIONS_BY_STOCK = gql(`
    query transaction_stock($stock: ID) {
        transactionsByStock(stock: $stock) {
            id
            account {
                id
                code
            }
            platform {
                id
                name
                currency {
                    code
                }
            }
            activity {
                name
            }
            transactionDate
            price
            shares
            fee
            total
        }
    }`);
