import { gql } from "@apollo/client";

export const GET_PLATFORM_INFO = gql(`
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
    assets { edges { node { id name } } }
    currencies {
        edges {
            node {
                id
                code
            }
        }
    }
    activities {
        edges {
            node {
                id 
                name
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
          }
          currency {
            id
          }
        }
      }
    }
    stocks {
        edges {
            node {
                id
                name
                ticker
                asset { id name }
                currency {
                  id
                }
            }
        }
    }
  }`);

export const CREATE_TRANSACTION = gql(`
  mutation createTransaction( $profileId: ID!, $trans: TransactionInput!) {
    createTransaction(profileId: $profileId, transData: $trans) {
        warnings { code message }
        transaction { 
          id
        }
    }
  }`);
export const OUTSTANDING_GIC_PURCHASES = gql(`
  query OutstandingGicPurchases($profileId: ID!, $platform: ID!, $stock: ID) {
    outstandingGicPurchases(profileId: $profileId, platform: $platform, stock: $stock) {
      id total transactionDate maturityDate rate interestCalculation expectedMaturityTotal
    }
  }
`);
