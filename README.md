# Stock Portfolio Client 

## Docker stack

The sibling `stock-portfolio-stack` project runs this frontend, the Python API and Redis with one Compose configuration. Production builds use the committed npm lockfile and serve React through Nginx; `/graphql` is proxied to the backend and direct React routes fall back to `index.html`. The development image uses the React dev server with a backend proxy and source hot reload. See the stack README for setup and `docker compose up --build -d --wait`.

The Docker build sets `REACT_APP_GRAPHQL_URL=/graphql`; local non-Docker launches retain their existing API URL default. `node_modules`, `.env` files, build output and statement PDFs are excluded from Docker build contexts.

## Overview
This project is the code that runs the front end client application for our Stock Portfolio application. It is written in TypeScript using ReactJS and Ant Design library. The client uses Apollo Client to send GraphQL API requests to our backend web server.

## Getting started
Make sure you have both the front end and the back end repos cloned to your local machine 

```bash 
git clone https://github.com/Matt1504/stock-portfolio-backend.git
git clone https://github.com/Matt1504/stock-portfolio
```

Follow the steps in the backend README to get your local web server up and running on the url [http://127.0.0.1:5002/graphql](http://127.0.0.1:5002/graphql)

Navigate to the cloned front end directory and make sure to install the packages and run the client 
```bash
cd stock-portfolio
npm install 
npm run start
```

## Profiles

Use the profile selector in the page header to switch the person whose records
are displayed. Add Profile creates a separate, initially empty portfolio. Stocks,
account types, currencies, and activities are shared definitions; brokerage
platforms, transactions, contribution limits, and statistics are scoped to the
selected profile.

The selected profile is included in the URL as `profile=<id>` and remembered in
local storage under `stock-portfolio-profile`. Explicit URL selections take
precedence over the saved preference. An unknown profile link shows recovery
guidance rather than another person's records. Account selections and open forms
reset when switching profiles; a selected stock can stay selected because stock
definitions are shared. Browser back/forward restores the profile in the link.

Personal Apollo queries include `profileId`, which also separates their cache
entries. Mutations retire stale personal lists. Forms and dialogs remount when
the owner changes so a draft cannot be submitted under a different profile.

Upgrade the backend and run its non-destructive profile migration before using
existing records; see the backend README. Profiles organize records, without
adding login authentication. To point a development frontend at another backend,
set `REACT_APP_GRAPHQL_URL` before starting/building (default:
`http://127.0.0.1:5002/graphql`).

## Account links

Account and currency selections are reflected in the URL and can be bookmarked:

```text
http://localhost:3000/myaccounts?profile=<profile-id>&account=<platform-id>&currency=<currency-id>
```

For a broker account (for example, RRSP Wealthsimple), `account` is a MongoDB
platform ID belonging to that broker and account type. Either its CAD or USD
platform ID works; `currency` selects the currency tab using its MongoDB currency
ID. For an account overview, use the account type's MongoDB ID instead.

Selecting an account or currency updates the URL automatically. Direct links,
refreshes, and browser back/forward restore the selection. Without `currency`,
a broker link uses that platform's currency; an overview defaults to CAD when
available. An unavailable currency falls back to an available tab and corrects
the URL. An unknown account shows a message so you can select another account.

## Stock links

Open a stock directly using its MongoDB ID:

```text
http://localhost:3000/mystocks?profile=<profile-id>&stock=<stock-id>
```

The stock determines its currency; no currency parameter is needed. Legacy
`currency` parameters are removed automatically. Selecting another stock updates the stock parameter;
refreshes and browser back/forward restore the selection. Unknown stock IDs show
recovery guidance, and `/mystocks` opens with no stock selected.

## Appearance

Use the light/dark mode button in the page header to switch themes. The choice is
saved locally in `localStorage` under `stock-portfolio-theme`, survives reloads,
and synchronizes across tabs. On the first visit, the system color preference is
used. Both Ant Design and Material UI follow the same selection.

## Transaction tables

The dashboard's Recent Transactions date picker defaults to the last 30 calendar
days, including today. Changing either date fetches that range from GraphQL, so
older history is searchable too. Boundaries are inclusive; clearing the dates
fetches all history for the selected profile. Activity, account, and stock filters
apply to the fetched range. Clear filters removes those filters and date bounds.

Account and stock tables filter their loaded transactions locally. Filters do
not change the statistics or charts above the table.

Sorting, page size, visible columns, column widths, and row density are saved
in local storage separately for each table view. Use Columns to choose visible
fields and Table settings to adjust column widths or density, or reset saved
preferences. Changing filters returns to the first page. Filter selections and
transaction records are not stored with table preferences.

Bulk Edit opens the currently filtered rows as local drafts, including rows on other pages. Change relevant fields inline, then Submit sends only changed rows in one `bulkUpdateTransactions` request (up to 200 changed rows). Cancel discards unsaved edits. A successful Submit automatically closes Bulk Edit; rejected rows keep the editor open for correction. Manual refresh is disabled while bulk editing; Submit still refreshes statistics automatically. The backend applies existing validation to each row independently: valid rows save, warnings are shown, and rejected rows retain their drafts with an error for correction. Related historical edits may need a second submission after another row saves. Successfully saved changes remain saved when you close the editor.

Prices retain up to eight decimal places for storage and calculations, including three-decimal prices. Read-only transaction tables and chart amounts display two rounded decimal places; editing preserves the full price. No migration is needed for existing two-decimal prices. Restart the backend to load the batch mutation and updated price model.

## Transactions and portfolio statistics

- Shares support fractional quantities with up to eight decimal places. Shares owned statistics round to four decimal places and display whole numbers without `.0000`.
- Contribution and Withdrawal are cash-only activities. Switching activity clears inapplicable fields, and submission excludes hidden trade fields. Withholding Tax and Interest accept an optional stock; leave it empty for account-level tax or interest. Switching to either activity clears the previous stock selection.
- Withdrawal amounts are entered as positive numbers. Net deposit history uses contributions + transfers in − transfers out − withdrawals. Dividends, interest, and withholding tax do not change net deposits.
- Buy totals already include buying fees. Book cost uses these totals once and removes the average cost of sold shares. Cash withdrawals do not change book cost.
- Edit transactions can change the date, account type, and platform. Destination platforms must exist in the selected profile and match the chosen account type and Platform Currency. Currency changes reset fees and reinitialize totals/FX: cash amounts and spinoff allocations must be re-entered in the destination currency; converted share trades require a new rate. Changing only the account/platform within the same currency preserves recorded amounts.
- The Actions column includes deletion with confirmation. Successful edits and deletions refresh records and statistics; failed deletions leave the record visible.
- The account filter is hidden on My Accounts, and the stock filter is hidden on My Stocks. Other table filters remain available.

## Refresh and existing database upgrades

Refresh buttons bypass Apollo, browser, and Redis caches, read MongoDB, and replace matching cache entries with fresh data. Normal loads retain caching. Restart the backend after upgrading to enable cache bypass and the updated transaction validation.

For existing databases, follow the backend README's profile migration instructions if needed. To add the Withdrawal activity without changing existing transactions or activity IDs, run from the backend project with its Python environment active:

```bash
python3 src/add_withdrawal_activity.py --apply
```

The command is rerunnable; without `--apply`, it only checks whether the activity exists. Reload the frontend afterward to fetch the new activity. Fresh database setup already includes Withdrawal in `src/startup.json`.

Dividends/Interest Earned subtracts withholding tax only when the transaction references a stock. Withholding tax without a stock is treated as account-level tax and excluded from both lifetime and annual dividend/interest totals.

Line charts offer 3 months, 1 year, 2 years, and All time (the default). The shorter ranges end today and change only the visible chart history, leaving statistics and table filters unchanged. Cumulative balances carry forward from before the selected range.

## Account and home overview cards

My Accounts and Home display four cards by default, with Show more statistics revealing the second row of four on desktop, adapting to two or one column on smaller screens. Each pair initially displays its larger value (the newer date for date pairs), retaining that statistic’s colour; ties use the listed first face. Click a card (or use its keyboard-accessible flip button) to reveal the paired statistic: Net Deposits ↔ Total Book Cost, Realized Profit ↔ Realized Gain/Loss (both green), Amount Contributed ↔ Amount Withdrawn, Amount Transferred In ↔ Amount Transferred Out, and Dividends/Interest Earned ↔ Fees Paid. Other reverse faces are red. Shares owned and unique stocks owned remain standalone cards in the default theme colours. Largest Holding flips to Smallest Holding, both in default colours; Smallest Holding uses the lowest positive remaining book cost and excludes sold or zero-cost positions. Each card has one calculation tooltip for its active face, outside the animated faces; opening a tooltip does not flip the card. Flips reset on account, profile, or currency changes, and animation respects reduced-motion preferences.

My Accounts retains shares owned, unique stocks, largest holding, contributions, and transfers, and adds withdrawals and realized profit. Home shows profile-wide totals from the full transaction history, independently of the Recent Transactions date filter. Its currency tabs keep CAD and USD separate. Active Trading Accounts counts existing brokerage platforms in the chosen currency, including cash-only and empty accounts. Contribution limits remain in their own section.

All overview cards use recorded transactions; no market prices are required. Book cost measures remaining purchase cost rather than market value, and realized gain/loss uses recorded sale proceeds. A dash indicates incomplete sale quantities.

Fees Paid totals account Service Fees, all withholding tax (stock-linked and account-level), and recorded trading/GIC fee fields. It includes fees on purchases still held. Realized Profit retains its existing fee timing through cost basis for sold shares and directly deducts account Service Fees and separately recorded GIC fees; showing Fees Paid does not deduct fees a second time. Home and My Accounts now use the same eight-card layout, including Largest Holding.

Stock assets on My Stocks display four cards by default, with Show more statistics revealing the second row of four on desktop: Book Cost, Average Cost per Share, Realized Profit/Loss, Shares Owned, Total Shares Sold, Dividends/Interest Earned, Last Sell Date, and Sale Proceeds. Five cards flip to Realized Gain/Loss, Total Shares Bought, Total Fees Paid, Last Buy Date, and Total Invested respectively. Incoming cash/activity faces are green; outgoing faces are red; both realized-profit/gain faces stay green. Book Cost, Average Cost per Share, and Shares Owned retain default colours. Last Sell Date is the latest recorded Sell date in the selected displayed currency; a dash means no sale. Smaller Index Fund, Mutual Fund, and GIC layouts retain their existing card counts, with the same cash-flow colour convention. Tooltips close during flips and re-enable when animation finishes.

## Asset types

Stocks share an Asset Type: Stock, Index Fund, Mutual Fund, or GIC. Choose it in the Add Stock dialog (defaults to Stock). The Add Transaction form uses the selected stock's saved type instead of a per-transaction radio selector, retaining the existing amount-only fund fields and rate/maturity fields for GIC buys/sells. Existing unclassified stocks default to Stock until the backend migration is applied. Classifications are shared across profiles.

Add Transaction includes compact Add Platform and Add Stock buttons beside their fields. Their dialogs prefill the current account/currency, refresh the options after saving, and select the new item when it matches the transaction context. The transaction draft is preserved.

Stock sales are validated by the backend on creation and edit against the selected platform’s holdings on the transaction date. Sales cannot exceed shares held after buys, previous sales, splits, spinoffs, and share transfers. Historical ledger edits cannot invalidate a later sale. Dividends, withholding tax, and splits do not require an existing positive position; users are responsible for recording those activities correctly. Basic fields, profile ownership, currency, GIC contracts, and spinoff cost allocation remain validated. Backend errors appear in the Add Transaction notification or Edit Transaction dialog and retain the draft. Successful saves can include a contribution-limit warning matching the lifetime overview for the selected profile/account type. Amount-only fund ownership validation remains deferred; account-level withholding tax stays stock-optional.

On My Stocks, Index Fund and Mutual Fund use an amount-only summary: share counts, average share cost, dividend/interest income, and duplicate Total Invested cards are hidden. Index Fund shows Book Cost, Realized Gain/Loss, Sale Proceeds, and Last Buy Date in a single four-card row on desktop without an expand control. Mutual Fund keeps its six-card expandable summary. Fund Book Cost is the lifetime sum of recorded Buy totals (including recorded fees already in those totals), matching Total Invested without deducting sales. Its tooltip explains this definition. Realized gain/profit show a dash until fund disposal cost tracking is defined. Transaction bars omit share labels, and dividend history is hidden for these funds. Stock and GIC summaries retain their existing behavior.


### GIC purchases and maturity

Record a GIC using **Buy**, with principal, purchase date, maturity date, annual rate, and interest calculation (simple or annual compound). These estimates use actual days divided by 365; the amount actually paid by the institution is authoritative. GICs do not use shares or price per share.

Record **GIC Maturity** against an outstanding purchase in the same profile and platform. Enter the gross payout before tax and fees. The backend derives principal returned and interest earned. A purchase can mature only once; maturity before the purchase date or below principal is rejected. Early maturity and a payout different from the estimate save with warnings. Record associated withholding tax separately. Interest activity is for account interest, rather than GIC payouts.

Maturity removes the returned principal from outstanding book cost. Only interest contributes to income and realized profit; the payout does not count as a contribution or withdrawal. Delete the maturity before deleting its purchase or changing the purchase principal. Existing legacy GIC transactions are not rewritten automatically.

For an existing database, run from the backend `src` directory:

```sh
python3 add_gic_maturity_activity.py --apply
```

This adds the activity and a unique purchase-to-maturity index without changing transaction records. Fresh setup includes GIC Maturity in `startup.json`. Restart the backend after updating.

My Stocks transaction and dividend/interest bar charts offer independent time ranges when their history includes activity within the past year. Only nonempty ranges that narrow the data are offered, and equivalent ranges are omitted. All time is the default; older histories have no range control. Bar filters affect chart entries only, without changing lifetime statistics or adding carried balances.

Non-Registered Savings Account (`NRSA`) is available as a shared account type. Select it in Add Platform to create a brokerage account for the active profile. For existing databases, the backend provides `src/add_nrsa_account.py --apply`; fresh setup includes it automatically. Refresh the application after adding the type.

Account types expose `has_contribution_limit` in MongoDB and `hasContributionLimit` in GraphQL. Existing account types default to `true`; NRSA is `false`. Unlimited accounts retain normal contribution/withdrawal/net-deposit tracking, but are excluded from contribution-limit setup and limit-chart selectors. The Contributions section includes their cards, displaying a dash for percentage and the contributed amount followed by `/ -` instead of a limit. The backend rejects new limits and skips over-limit warnings for these accounts, including when a legacy limit record exists. Existing limit records are preserved for inspection or deletion.

Run `python3 add_nrsa_account.py --apply` from the backend `src` directory with the normal Redis environment to update NRSA and backfill missing flags on existing account types. Explicit flags on other account types are preserved; fresh setup reads the flag from `startup.json`. Restart the backend and refresh the frontend after updating.


### Transaction currencies and exchange rates

A transaction stores `priceCurrency`, `totalCurrency`, and `exchangeRate`. Price currency defaults to the stock currency; total currency follows the selected platform. The exchange rate means units of total currency per one unit of price currency. Fees are entered in total currency. Buy totals are `price × shares × exchangeRate + fee`; Sell totals subtract the fee. The calculated total remains editable so the actual broker charge can be recorded. The backend allows calculated-versus-recorded differences of up to ±0.10 in the total currency, including exactly 0.10, to accommodate rounded statement prices. Larger differences return a warning; the entered total is always preserved. This applies to buys and sells in add, edit, and statement import flows. Different currencies require a positive exchange rate; matching currencies use 1.

Stocks can be selected across currencies, so a CAD platform can hold USD stocks. For Index Fund and Mutual Fund purchases with units, select **Enter price and shares**. Ownership validation applies to share-based funds; amount-only funds retain their existing behavior. Do not mix amount-only and share-based purchases for the same fund/platform. Account and homepage book cost, holdings distribution, and holding rankings include amount-only Index/Mutual Fund purchase totals without inventing shares. Amount-only fund disposal cost tracking is not yet defined; such sales make account realized gain/profit unavailable rather than guessing a cost from sale proceeds. Stock statistics and transaction history separate recorded amounts by total currency instead of adding CAD and USD together.

For an existing database, run from the backend `src` directory with the normal Redis environment:

```sh
python3 migrate_transaction_currencies.py
python3 migrate_transaction_currencies.py --apply
```

The first command previews the changes. The migration fills missing currency metadata using the transaction platform currency and an exchange rate of 1. It preserves historical prices, totals, shares, fees, and explicit currency metadata; it does not convert historical amounts. Review historical transactions individually if their prices were originally entered in another currency. Fresh databases use the updated transaction model and need no backfill. Restart the backend and refresh the frontend after updating.


### Account service fees

Use **Service Fee** for a fee charged directly to an account. Select the account/platform and date, then enter the fee amount in Total (a positive expense in the platform currency). It does not require or accept a stock. It is separate from trading fees and does not count as a contribution, withdrawal, or stock dividend/interest. Total currency is inferred from the platform and is not shown as a form field.

Fresh setup includes this activity. For an existing database, run `python3 add_service_fee_activity.py --apply` from the backend `src` directory, then refresh the frontend. The script preserves existing activities and transactions and is safe to rerun.


### CSV transaction import

On **Add Transaction → Import Transactions**, choose a CAD account/platform and either paste CSV into **CSV text** or use **Choose CSV**. Supported Wealthsimple columns are `date,transaction,description,amount,balance,currency`. Both inputs use the same CSV-only parser; PDF/statement text and the old Debit/Credit layout are not supported.

Choosing a CSV fills the text box and automatically previews it when a CAD account/platform is selected. For pasted text, click **Preview**. Review new stocks, transactions, existing records, skipped ROC/NCDIS rows, and errors. Click **Import** to save; results include counts, backend warnings/errors, and a downloadable JSON audit. Editing text or selections requires another preview. After a successful preview, Preview is disabled until the CSV or destination changes, avoiding repeat API calls. Preview pagination supports changing pages and rows per page, resetting to page 1 for new input. Failed requests and partial imports allow a fresh preview for retry. After a partial import, preview again before retrying; earlier successful saves remain and are skipped on the next preview.

Selected files are read temporarily in the browser and populate the text box. The file input is cleared immediately, and no File object or source file is uploaded/stored. Only CSV text goes to the existing GraphQL operations. Text is cleared after a successful import, closing the dialog, or Clear text; partial imports retain it for another preview. No external service is needed. See the backend README for parsing rules and CSV-only CLI commands.


CSV withholding tax: an unnamed `NRT` row inherits the ticker/name from the immediately preceding dividend only when its date matches. The preview labels this stock **From dividend**. Explicit stock labels are preserved, and intervening/error/skipped rows or different dates prevent inference; otherwise withholding stays account-level. Dividends and withholding without FX notes use the saved stock currency (or buy/FX information in the CSV for new stocks). A possible existing unlinked withholding transaction is flagged for review instead of importing a duplicate.

CSV descriptions are used to extract transaction details for the import preview; they are not saved in transaction records.

Use **ETF Rebate** for an account-level reimbursement (CSV code `REIMB`). Enter the date and positive total in the platform currency; no stock, shares, price, or fee is needed. Rebates increase account/homepage Realized Profit but do not affect contributions, net deposits, book cost, or Dividends/Interest Earned.

Account/homepage **Realized Profit** subtracts account **Service Fee** transaction totals in addition to separately recorded GIC fees. Trading fees are already included in recorded Buy/Sell totals and are not deducted again: purchase fees reduce realized profit as the corresponding shares are sold. Service Fees do not change Realized Gain/Loss, book cost, net deposits, or Dividends/Interest Earned.


Stock spinoffs are recorded as one **Stock Spinoff** transaction. Select the platform, date, received Stock asset, original Stock asset, shares received, and allocated book cost in the platform’s currency. Use the broker’s allocation; the app does not fetch or infer a market-price allocation. Both stocks must have the same quote currency. The original stock must be owned on the event date, and allocation cannot exceed its remaining book cost. A zero allocation is allowed when explicitly recorded.

A spinoff adds received shares and moves book cost between stocks without changing total account cost, cash, contributions, dividends, fees, investment totals, buy/sell quantities, or last trade dates. Future realized gains use the adjusted basis. Both stock pages show linked Corporate actions notes scoped to the selected profile and recorded currency. Transaction tables expose Original Stock and Allocated Book Cost columns when spinoffs are present; editing supports date, platform/account, received shares, and allocation. Original and received stocks remain fixed during editing. Backend validation protects later dependent events and sales on edits/deletes. Spinoffs are excluded from Buy/Sell cash-flow bars.

Restart the backend after updating its schema. Existing databases can add the activity with `python src/add_stock_spinoff_activity.py --apply` from the backend directory; the script is idempotent and does not modify transaction records. Fresh setups include Stock Spinoff automatically.


The accounts page includes **Cash Balance**, estimated from complete recorded cash history with an opening balance of zero, separately for each platform/account currency. It adds contributions, cash transfers in, sale proceeds, dividends, account interest, ETF rebates, and gross GIC maturity payouts, then subtracts buys, cash transfers out, withdrawals, all withholding tax, service fees, and separate GIC fees. Recorded trade totals already include FX and trading fees. Splits, spinoffs, and in-kind share transfers do not change cash. Missing history or an unrecorded opening balance may cause differences from broker balances; negative results are displayed for review. This card is available only on the accounts page. Eight tiles remain: Cash Balance; Book Cost/Net Deposits; Realized Profit/Gain; Contributions/Withdrawals; Transfers In/Out; Income/Fees; Total/Unique Shares; Largest/Smallest Holding. The second row is collapsed by default.


Largest and Smallest Holding use the same set of current holdings with positive remaining book cost. Partial sales remove the average cost of the shares sold (not sale proceeds); fully sold positions and zero-cost holdings are excluded from both rankings. The same calculation is used on accounts and the homepage.

### SEC Fee

SEC Fee is an account-level expense available only for USD trading accounts. Enter its positive amount in Total without selecting a stock. It reduces Cash Balance and Realized Profit and increases Fees Paid, like Service Fee. It does not change stock holdings, book cost, Realized Gain/Loss, net deposits, or Dividends/Interest Earned. The backend validates the currency and account-only restriction for creation, individual edits, and bulk edits. Fresh setup includes the activity. Existing databases can add it idempotently from the backend directory with `python3 src/add_sec_fee_activity.py --apply`; restart the API afterward.

### Performance diagnostics

Add `performance=1` to a My Accounts or My Stocks URL to log network, calculation, and render-to-layout timings in the browser console. This is opt-in and logs only timing labels/counts, without portfolio data or GraphQL variables. Remove the parameter to turn it off. Render-to-layout timings exclude browser paint.

For a local benchmark of existing statistics helpers, run `node scripts/benchmark-statistics.cjs /tmp/transaction-responses.json` with the response snapshot produced by the backend benchmark. Keep snapshots outside version control because they contain portfolio data.
