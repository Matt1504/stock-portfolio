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
        transactions: transactionsByAccount(account: $account) {
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
            description
            transactionDate
            price
            shares
            fee
            total
        }
    }`);

export const TRANSACTIONS_BY_PLATFORM = gql(`
    query transactions_platform($platform_one: ID) {
        transactions: transactionsByPlatform(platform: $platform_one) {
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
            description
            price
            shares
            fee
            total
        }
    }`);

export const TRANSACTIONS_BY_PLATFORMS = gql(`
    query transaction_platforms($platform_one: ID, $platform_two: ID) {
        transactions: transactionsByPlatform(platform: $platform_one) {
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
            description
            price
            shares
            fee
            total
        }
        transactions_two: transactionsByPlatform(platform: $platform_two) {
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
            description
            price
            shares
            fee
            total
        }
    }`);
