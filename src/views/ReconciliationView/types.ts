export type ValueCheck = { statement: string | null; calculated: string; difference: string | null; outcome: string };
export type HoldingCheck = { stockId: string; ticker: string; assetType: string; shares: ValueCheck | null; bookCost: ValueCheck };
export type Comparison = {
  platform: string; currency: string; statementEnd: string; dateBasis: string; fingerprint: string; canFinish: boolean;
  issues: string[]; scope: string[]; cash: ValueCheck; holdings: HoldingCheck[];
  pendingTrades: { id: string; ticker?: string; transactionDate: string; settlementDate: string; cashEffect: string }[];
};
export type Saved = {
  id: string; state: string; statementEnd: string; createdAt: string; reviewedAt: string | null; note: string; needsRecheck: boolean;
  platform: string; dateBasis: string; periodStart?: string; statementCash: string | null; completeHoldings: boolean;
  moneyTolerance: string; shareTolerance: string; snapshot: Comparison;
};
export type HoldingInput = { key: string; stock?: string; shares: string | null; bookCost: string | null };
