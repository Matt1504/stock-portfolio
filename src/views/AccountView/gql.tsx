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

export const CREATE_PLATFORM = gql(`
    mutation createPlatform($platform: PlatformInput!) {
        createPlatform(platformData: $platform) {
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

export const TRANSFER_ACCOUNT = gql(`
    mutation transferPlatform($transferFrom: ID!, $transferTo: ID!) {
        transferAccount(transFrom: $transferFrom, transTo: $transferTo) {
            success
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
            rate
            maturityDate
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
            rate
            maturityDate
            total
        }
    }`);