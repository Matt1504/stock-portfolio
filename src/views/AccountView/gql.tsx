import { gql } from "@apollo/client";
import { ANALYTICS_FIELDS } from "../../components/FinancialAnalytics";

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
                    closedAt
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
                closedAt
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
    mutation transferPlatform( $profileId: ID!, $transferFrom: ID!, $transferTo: ID!, $transferDate: Date!, $closeOriginalAccount: Boolean!, $marketValues: [TransferAssetValueInput!]) {
        transferAccount(profileId: $profileId, transFrom: $transferFrom, transTo: $transferTo, transferDate: $transferDate, closeOriginalAccount: $closeOriginalAccount, marketValues: $marketValues) {
            success
        }
  }`);

export const TRANSACTIONS_BY_ACCOUNT = gql`
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
            transactionDate transferBatch
            spinoffSource { id ticker name asset { id name } currency { id code } } allocatedBookCost
            principalReturned interestEarned interestCalculation
          priceCurrency { id code } totalCurrency { id code } exchangeRate
            gicPurchase { id total transactionDate maturityDate }
          stock { currency { id code } }
            stock { asset { id name } }
            price
            shares
            fee
            rate
            maturityDate
            total
        }
        analytics: financialAnalytics(profileId: $profileId, account: $account) { ...FinancialAnalyticsFields distribution { name value shares } bookCostHistory { name value value1 } }
    }
    ${ANALYTICS_FIELDS}
`;

export const TRANSACTIONS_BY_PLATFORM = gql`
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
            transactionDate transferBatch
            spinoffSource { id ticker name asset { id name } currency { id code } } allocatedBookCost
            principalReturned interestEarned interestCalculation
          priceCurrency { id code } totalCurrency { id code } exchangeRate
            gicPurchase { id total transactionDate maturityDate }
          stock { currency { id code } }
            stock { asset { id name } }
            price
            shares
            fee
            rate
            maturityDate
            total
        }
        analytics: financialAnalytics(profileId: $profileId, platform: $platform_one) { ...FinancialAnalyticsFields distribution { name value shares } bookCostHistory { name value value1 } }
    }
    ${ANALYTICS_FIELDS}
`;

export const PREVIEW_ACCOUNT_TRANSFER = gql`
 query previewAccountTransfer($profileId: ID!, $transferFrom: ID!, $transferTo: ID!, $transferDate: Date!, $closeOriginalAccount: Boolean!) {
   previewAccountTransfer(profileId: $profileId, transFrom: $transferFrom, transTo: $transferTo, transferDate: $transferDate, closeOriginalAccount: $closeOriginalAccount) {
     cash currency assets { stockId ticker shares bookCost }
   }
 }
`;
