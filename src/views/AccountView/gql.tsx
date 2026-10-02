import { gql } from "@apollo/client";

export const ALL_ACCOUNT_PLATFORMS = gql(`
    query($profileId: ID!) {
        accounts {
            edges {
                node {
                    id 
                    name
                    code
                }
            }
        }
        platforms(profileId: $profileId) {
            edges {
                node {
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
    mutation createPlatform( $profileId: ID!, $platform: PlatformInput!) {
        createPlatform(profileId: $profileId, platformData: $platform) {
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
    mutation transferPlatform( $profileId: ID!, $transferFrom: ID!, $transferTo: ID!) {
        transferAccount(profileId: $profileId, transFrom: $transferFrom, transTo: $transferTo) {
            success
        }
  }`);

export const TRANSACTIONS_BY_ACCOUNT = gql(`
    query transaction_account( $profileId: ID!, $account: ID!) {
        transactions: transactionsByAccount(profileId: $profileId, account: $account) {
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
    query transactions_platform( $profileId: ID!, $platform_one: ID!) {
        transactions: transactionsByPlatform(profileId: $profileId, platform: $platform_one) {
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
