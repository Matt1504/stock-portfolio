import { gql } from "@apollo/client";

export const DASHBOARD_TRANSACTIONS = gql(`
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
    transactionsFromThisWeek {
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
      stock {
          name
          ticker
      }
      transactionDate
      price
      shares
      fee
      total
    }
  }`);

  export const TRANSACTIONS_BY_ACTIVITY = gql(`
  query transaction_activity($activity: ID) {
      transactions: transactionsByActivity(activity: $activity) {
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

export const GET_CONTRIBUTION_LIMITS = gql(`
  query {
    activities {
      edges {
        node {
          id
          name
        }
      }
    }
    contributionLimits {
      edges {
        node {
          id
          account {
            id
            name
            code
          }
          amount
          year
        }
      }
    }
  }`);

export const CREATE_CONTRIBUTION = gql(`
  mutation createContributionLimit($contribution: ContributionLimitInput!) {
    createContributionLimit(contrLimitData: $contribution) {
      contributionLimit {
        id
        account {
          id
          name
          code
        }
        amount
        year
      }
    }
  }`);