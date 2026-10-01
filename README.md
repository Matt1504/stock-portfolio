# Stock Portfolio Client 

## Overview
This project is the code that runs the front end client application for our Stock Portfolio application. It is written in TypeScript using ReactJS and Ant Deisgn library. The client uses Apollo Client to send GraphQL API requests to our backend web server. 

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

## Account links

Account and currency selections are reflected in the URL and can be bookmarked:

```text
http://localhost:3000/myaccounts?account=<platform-id>&currency=<currency-id>
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
http://localhost:3000/mystocks?stock=<stock-id>
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

Filter the transactions loaded in the current view by date range, activity,
account, or stock. Filters combine, date boundaries are inclusive, and Clear
filters restores all rows. Dashboard filters apply to its last-30-days dataset;
filters do not change the statistics or charts above the table.

Sorting, page size, visible columns, column widths, and row density are saved
in local storage separately for each table view. Use Columns to choose visible
fields and Table settings to adjust column widths or density, or reset saved
preferences. Changing filters returns to the first page. Filter selections and
transaction records are not stored with table preferences.
