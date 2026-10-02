# Stock Portfolio Client 

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

## Transactions and portfolio statistics

- Shares support fractional quantities with up to eight decimal places. Shares owned statistics round to four decimal places and display whole numbers without `.0000`.
- Contribution and Withdrawal are cash-only activities. Switching activity clears inapplicable fields, and submission excludes hidden trade fields. Withholding Tax accepts an optional stock; leave it empty for account-level tax.
- Withdrawal amounts are entered as positive numbers. Net deposit history uses contributions + transfers in − transfers out − withdrawals. Dividends, interest, and withholding tax do not change net deposits.
- Buy totals already include buying fees. Book cost uses these totals once and removes the average cost of sold shares. Cash withdrawals do not change book cost.
- Edit transactions can change the date, account type, and platform. Destination platforms must exist in the selected profile and match the chosen account type and original currency.
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

My Accounts and Home display four primary statistics: Total Book Cost, Net Deposits, Realized Profit, and Realized Gain/Loss. Show more statistics reveals eight additional cards in two rows of four on desktop; the grid adapts to smaller screens. Every card has a calculation tooltip.

My Accounts retains shares owned, unique stocks, largest holding, contributions, and transfers, and adds withdrawals and realized profit. Home shows profile-wide totals from the full transaction history, independently of the Recent Transactions date filter. Its currency tabs keep CAD and USD separate. Active Trading Accounts counts existing brokerage platforms in the chosen currency, including cash-only and empty accounts. Contribution limits remain in their own section.

All overview cards use recorded transactions; no market prices are required. Book cost measures remaining purchase cost rather than market value, and realized gain/loss uses recorded sale proceeds. A dash indicates incomplete sale quantities.

Realized Profit replaces Total Fees Paid in the account and home overview cards. It is Realized Gain/Loss + Dividends/Interest Earned, including stock-associated withholding tax through net income and avoiding a second deduction of recorded fees. It excludes account-withdrawal tax and unrealized gains. Account rows group profit metrics first, holdings and income second, then transfers and contributions/withdrawals. Home uses the same grouping, with Active Trading Accounts in place of Largest Holding.

My Stocks uses the same expandable 12-card grid. The first row shows Book Cost, Average Cost per Share, Realized Profit/Loss, and Realized Gain/Loss. The second row shows shares owned, lifetime shares bought, lifetime shares sold, and net dividend/interest income. The third row shows Total Invested, Sale Proceeds, Total Fees Paid, and Last Buy Date. Shares bought/sold count only Buy/Sell transactions, excluding splits and transfers, and display up to four decimal places. Realized Profit/Loss adds lifetime net income to realized gain/loss without deducting fees or withholding tax again.
