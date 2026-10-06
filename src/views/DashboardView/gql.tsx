import { gql } from "@apollo/client";

export const DASHBOARD_TRANSACTIONS = gql(`
  query RecentTransactions($profileId: ID!, $startDate: Date, $endDate: Date) {
    accounts {
      edges {
          node {
              id 
              name
              code
              hasContributionLimit
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
      id transactionDate transferBatch price shares fee total spinoffSource { id ticker name asset { id name } currency { id code } } allocatedBookCost
            principalReturned interestEarned
      priceCurrency { id code } totalCurrency { id code } exchangeRate
      activity { name }
      account { id code }
      stock { id name ticker asset { id name } }
      platform { id name currency { id code } }
    }
  }
`;

export const DASHBOARD_METADATA = gql`query DashboardMetadata { accounts { edges { node { id name code hasContributionLimit } } } }`;
