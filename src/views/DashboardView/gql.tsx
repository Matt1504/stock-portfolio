import { gql } from "@apollo/client";

export const DASHBOARD_TRANSACTIONS = gql(`
  query RecentTransactions($profileId: ID!, $startDate: Date, $endDate: Date) {
    accounts {
      edges {
          node {
              id 
              name
              code
          }
      }
    }
    recentTransactions: transactionsByDateRange(profileId: $profileId, startDate: $startDate, endDate: $endDate) {
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

  export const TRANSACTIONS_BY_ACTIVITY = gql(`
  query transaction_activity( $profileId: ID!, $activity: ID!) {
      transactions: transactionsByActivity(profileId: $profileId, activity: $activity) {
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

export const GET_CONTRIBUTION_LIMITS = gql(`
  query($profileId: ID!) {
    activities {
      edges {
        node {
          id
          name
        }
      }
    }
    contributionLimits(profileId: $profileId) {
      edges {
        node {
          id
          account {
            id
            name
            code
          }
          amount
          yearEnd
        }
      }
    }
  }`);

export const CREATE_CONTRIBUTION = gql(`
  mutation createContributionLimit( $profileId: ID!, $contribution: ContributionLimitInput!) {
    createContributionLimit(profileId: $profileId, contrLimitData: $contribution) {
      contributionLimit {
        id
        account {
          id
          name
          code
        }
        amount
        yearEnd
      }
    }
  }`);
export const PORTFOLIO_OVERVIEW = gql`
  query PortfolioOverview($profileId: ID!) {
    currencies { edges { node { id code } } }
    platforms(profileId: $profileId) { edges { node { id currency { id code } } } }
    history: transactionsByDateRange(profileId: $profileId) {
      id transactionDate price shares fee total
      activity { name }
      account { id code }
      stock { id name ticker }
      platform { id name currency { id code } }
    }
  }
`;
