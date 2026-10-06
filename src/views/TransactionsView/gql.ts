import { gql } from "@apollo/client";
export const SEARCH_TRANSACTIONS = gql`query SearchTransactions($profileId: ID!, $account: ID, $platform: ID, $stock: ID, $activity: ID, $currency: ID, $startDate: Date, $endDate: Date, $after: String) {
  searchTransactions(profileId: $profileId, account: $account, platform: $platform, stock: $stock, activity: $activity, currency: $currency, startDate: $startDate, endDate: $endDate, after: $after, first: 100) {
    nextCursor
    transactions {

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

 stock { id }
    }
  }
}`;
