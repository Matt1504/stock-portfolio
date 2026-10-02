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
                        id
                        code
                    }
                }
            }
        }
        currencies {
            edges {
                node {
                    id
                    code
                }
            }
        }
    }`);

export const ACTIVITY_PLATFORM_ACCOUNT_NAMES = gql(`
    query($profileId: ID!) {
        accounts {
            edges {
                node {
                    code
                }
            }
        }
        platforms(profileId: $profileId) {
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
                    id
                    code
                }
            }
        }
    }`);

export const TRANSACTIONS_BY_STOCK = gql(`
    query transaction_stock( $profileId: ID!, $stock: ID!) {
        transactions: transactionsByStock(profileId: $profileId, stock: $stock) {
            id
            account {
                id
                code
            }
            platform {
                id
                name
                currency {
                    id
                    code
                }
            }
            activity {
                name
            }
            stock {
                id
                name
                ticker
            }
            transactionDate
            price
            shares
            fee
            rate
            maturityDate
            total
        }
    }`);

export const UPDATE_TRANSACTION = gql(`
    mutation UpdateTransaction( $profileId: ID!, $trans:TransactionInput!){
        updateTransaction(profileId: $profileId, transData:$trans) {
            trans {
                id
                account { id code }
                platform { id name account { id code } currency { id code } }
                transactionDate
                price
                shares
                fee
                total
            }
        }
    }`);