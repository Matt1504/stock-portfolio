/** Frozen pre-migration reference for regression tests only. */
import type { Stock } from "../models/Stock";
import type { Transaction } from "../models/Transaction";

export type StockHolding = {
  stock: Stock;
  shares: number;
  bookCost: number;
};

export type HoldingIssue = {
  stock: Stock;
  platform: string;
  missingShares: number;
};

/** Match the backend ledger: date, then creation ID for same-day events. */
export function compareLedgerTransactions(a: Transaction, b: Transaction): number {
  return new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
    || (a.id ?? "").localeCompare(b.id ?? "");
}

export function calculateStockHoldings(transactions: Transaction[], selectedStockId?: string) {
  const positions = new Map<string, StockHolding & { platform: string; accountCode?: string }>();
  const bookCostAfterTransaction = new Map<string, number>();
  let runningBookCost = 0;
  let realizedGain = 0;
  let hasIncompleteSales = false;

  [...transactions]
    .sort(compareLedgerTransactions)
    .forEach((transaction) => {
      const activity = transaction.activity.name;
      const quantity = transaction.shares ?? 0;
      const stock = transaction.stock;
      if (activity === "Stock Spinoff" && stock?.id && transaction.spinoffSource?.id) {
        const allocation = transaction.allocatedBookCost ?? 0;
        if (!selectedStockId || selectedStockId === stock.id) {
          const key = JSON.stringify([transaction.platform.id, stock.id]);
          const position = positions.get(key) ?? { stock, shares: 0, bookCost: 0, platform: transaction.platform.name ?? "", accountCode: transaction.account.code };
          position.shares += quantity;
          position.bookCost += allocation;
          runningBookCost += allocation;
          positions.set(key, position);
        }
        if (!selectedStockId || selectedStockId === transaction.spinoffSource.id) {
          const key = JSON.stringify([transaction.platform.id, transaction.spinoffSource.id]);
          const source = positions.get(key);
          if (source) {
            const moved = Math.min(source.bookCost, allocation);
            source.bookCost -= moved;
            runningBookCost -= moved;
          }
        }
      } else if (selectedStockId && stock?.id !== selectedStockId) {
        // Related corporate actions are returned for both stocks; cash trades
        // still belong only to the selected stock.
      } else if (stock?.id && stock.asset?.name === "GIC" && ["Buy", "GIC Maturity"].includes(activity ?? "")) {
        const key = JSON.stringify([transaction.platform.id, stock.id]);
        const position = positions.get(key) ?? { stock, shares: 0, bookCost: 0, platform: transaction.platform.name ?? "", accountCode: transaction.account.code };
        const previousCost = position.bookCost;
        position.bookCost = Math.max(0, position.bookCost + (activity === "Buy" ? transaction.total ?? 0 : -(transaction.principalReturned ?? 0)));
        runningBookCost += position.bookCost - previousCost;
        positions.set(key, position);
      } else if (stock?.id && ["Index Fund", "Mutual Fund"].includes(stock.asset?.name ?? "") && quantity === 0 && ["Buy", "Sell", "Transfer In", "Transfer Out"].includes(activity ?? "")) {
        const key = JSON.stringify([transaction.platform.id, stock.id]);
        const position = positions.get(key) ?? { stock, shares: 0, bookCost: 0, platform: transaction.platform.name ?? "", accountCode: transaction.account.code };
        if (activity === "Buy" || activity === "Transfer In") {
          // Amount-only funds use recorded purchase totals, just as on My Stocks.
          const cost = transaction.total ?? 0;
          position.bookCost += cost;
          runningBookCost += cost;
          positions.set(key, position);
        } else if (activity === "Transfer Out") {
          const cost = Math.min(position.bookCost, transaction.total ?? 0);
          position.bookCost -= cost;
          runningBookCost -= cost;
        } else {
          // TODO: Record disposal cost for amount-only funds. Sale proceeds alone
          // cannot identify the principal removed or the realized gain.
          hasIncompleteSales = true;
        }
      } else if (stock?.id && ["Buy", "Sell", "Stock Split", "Transfer In", "Transfer Out"].includes(activity ?? "") && quantity !== 0) {
        // Keep each broker's cost basis separate, then aggregate current
        // positions by stock ID. GraphQL object identity is not a stock ID.
        const key = JSON.stringify([transaction.platform.id, stock.id]);
        const position = positions.get(key) ?? {
          stock, shares: 0, bookCost: 0, platform: transaction.platform.name ?? "", accountCode: transaction.account.code,
        };
        const previousCost = position.bookCost;

        if (activity === "Buy" || activity === "Transfer In") {
          position.shares += quantity;
          position.bookCost += transaction.total ?? ((transaction.price ?? 0) * quantity + (transaction.fee ?? 0));
        } else if (activity === "Stock Split") {
          // The tracker records the share-count change, not the split ratio.
          position.shares += quantity;
        } else {
          // Remove the purchase cost of the disposed shares. Sale proceeds
          // describe cash received and must not become a negative pie slice.
          if (activity === "Sell") {
            if (quantity > position.shares) hasIncompleteSales = true;
            else realizedGain += (transaction.total ?? 0) - position.bookCost * quantity / position.shares;
          }
          if (position.shares > 0) {
            const disposed = Math.min(quantity, position.shares);
            position.bookCost -= position.bookCost * disposed / position.shares;
          }
          position.shares -= quantity;
        }

        if (Math.abs(position.shares) < 1e-8) position.shares = 0;
        if (position.shares <= 0) position.bookCost = 0;
        position.bookCost = Math.max(0, position.bookCost);
        runningBookCost += position.bookCost - previousCost;
        positions.set(key, position);
      }
      if (transaction.id) bookCostAfterTransaction.set(transaction.id, Math.max(0, runningBookCost));
    });

  const holdingsByStock = new Map<string, StockHolding>();
  const issues: HoldingIssue[] = [];
  positions.forEach((position) => {
    if (position.shares < 0) {
      issues.push({ stock: position.stock, platform: position.platform, missingShares: -position.shares });
    } else if (position.shares > 0 || position.bookCost > 0) {
      const holding = holdingsByStock.get(position.stock.id!);
      if (holding) {
        holding.shares += position.shares;
        holding.bookCost += position.bookCost;
      } else {
        holdingsByStock.set(position.stock.id!, { stock: position.stock, shares: position.shares, bookCost: position.bookCost });
      }
    }
  });

  const holdings = Array.from(holdingsByStock.values());
  return {
    holdings,
    issues,
    realizedGain: hasIncompleteSales ? undefined : realizedGain,
    positions: Array.from(positions.values()).filter(position => position.shares > 0 || position.bookCost > 0),
    totalShares: holdings.reduce((sum, holding) => sum + holding.shares, 0),
    totalBookCost: holdings.reduce((sum, holding) => sum + holding.bookCost, 0),
    bookCostAfterTransaction,
  };
}
