export type PlatformOption = { id: string; name: string; closedAt?: string | null; account: { id: string; code: string }; currency: { id: string; code: string } };
export type Metadata = { accounts: { edges: { node: { id: string; name: string; code: string } }[] }; platforms: { edges: { node: PlatformOption }[] } };
export type Stat = { title: string; value: string | null; text: string | null; monetary: boolean; holding: boolean };
export type StatRow = { title: string; difference: string | null; left: Stat | null; right: Stat | null };
export type Side = { selectionId: string; label: string; analytics: { issues: string[] }; valuation: { complete: boolean; quoteTime: string | null; annualizedStartDate: string | null; annualizedReturnNote: string | null; missingTickers: string[]; warnings: string[]; refreshOverdue: boolean } };
export type Holding = { stockId: string; ticker: string; name: string; assetType: string; leftHeld: boolean; rightHeld: boolean; leftShares: string | null; rightShares: string | null; leftBookCost: string; rightBookCost: string; bookCostDifference: string; leftWeight: string | null; rightWeight: string | null };
export type HistoryPoint = { date: string; leftBookCost: string; rightBookCost: string; leftNetDeposits: string; rightNetDeposits: string; leftIncome: string; rightIncome: string; leftBuys: string; rightBuys: string; leftSales: string; rightSales: string };
export type Comparison = { currency: string; left: Side; right: Side; statistics: StatRow[]; marketStatistics: StatRow[]; holdings: Holding[]; history: HistoryPoint[] };
