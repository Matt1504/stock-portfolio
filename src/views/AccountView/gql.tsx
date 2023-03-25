import { gql } from "@apollo/client";

export const ALL_ACCOUNT_PLATFORMS = gql(`
    query {
        accounts {
            edges {
                node {
                    id 
                    name
                    code
                }
            }
        }
        platforms {
            edges {
                node {
                    id 
                    name
                    account {
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
                    name
                    code
                }
            }
        }
    }`);

export const CREATE_PLATFORM = gql(`
    mutation creatStock($platform: PlatformInput!) {
        createStock(platformData: $platform) {
            platform {
                id
                name
                account {
                    id 
                    code
                }
                currency { 
                    id
                    code
                }
            }
        }
    }`);

export const TRANSACTIONS_BY_ACCOUNT = gql(`
    query transaction_account($account: ID) {
        transactionsByAccount(account: $account) {
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
                    id
                }
            }
            activity {
                name
            }
            stock {
                id
                ticker
                name
            }
            transactionDate
            price
            shares
            fee
            total
        }
    }`);
