import { gql } from "@apollo/client";

export const GET_PLATFORM_INFO = gql(`
  query {
    accounts {
      edges {
        node {
          id
          name
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
    activities {
        edges {
            node {
                id 
                name
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
                currency {
                  id
                }
            }
        }
    }
  }`);

export const CREATE_TRANSACTION = gql(`
  mutation createTransaction($trans: TransactionInput!) {
    createTransaction(transData: $trans) {
        transaction { 
          id
        }
    }
  }`);