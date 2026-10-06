import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from "@apollo/client";
import { render, screen } from "@testing-library/react";
import DashboardView from "./index";
jest.mock("./PortfolioOverview", () => () => <div>Portfolio summary</div>);
jest.mock("./ContributionLimits", () => () => null);
jest.mock("./AddContributionLimit", () => () => null);
test("dashboard loads metadata and summaries without a recent transaction table", async () => {
  const queries: string[] = [];
  const client = new ApolloClient({ cache: new InMemoryCache(), link: new ApolloLink(operation => new Observable(observer => {
    queries.push(operation.operationName);
    observer.next({ data: { accounts: { edges: [] } } }); observer.complete();
  })) });
  render(<ApolloProvider client={client}><DashboardView /></ApolloProvider>);
  expect(await screen.findByText("Portfolio summary")).toBeVisible();
  expect(screen.queryByText("Recent Transactions")).not.toBeInTheDocument();
  expect(queries).toEqual(['DashboardMetadata']);
});
