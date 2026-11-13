import { gql } from "@apollo/client";
export const COMPARE_METADATA = gql`query CompareMetadata($profileId: ID!) {
  accounts { edges { node { id name code } } }
  platforms(profileId:$profileId) { edges { node { id name closedAt account { id code } currency { id code } } } }
}`;
export const COMPARE = gql`query PortfolioComparison($profileId: ID!, $kind: CompareKind!, $currency: String!, $left: ID!, $right: ID!) {
  portfolioComparison(profileId:$profileId,kind:$kind,currency:$currency,left:$left,right:$right) {
    currency
    left { selectionId label analytics { issues } valuation { complete quoteTime annualizedStartDate annualizedReturnNote missingTickers warnings refreshOverdue } }
    right { selectionId label analytics { issues } valuation { complete quoteTime annualizedStartDate annualizedReturnNote missingTickers warnings refreshOverdue } }
    statistics { title difference left { title value text monetary holding } right { title value text monetary holding } }
    marketStatistics { title difference left { title value text monetary holding } right { title value text monetary holding } }
    holdings { stockId ticker name assetType leftHeld rightHeld leftShares rightShares leftBookCost rightBookCost bookCostDifference leftWeight rightWeight }
    history { date leftBookCost rightBookCost leftNetDeposits rightNetDeposits leftIncome rightIncome leftBuys rightBuys leftSales rightSales }
  }
}`;
