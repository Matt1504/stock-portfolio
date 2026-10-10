import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from "@apollo/client";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AddContributionLimit from "./AddContributionLimit";
import ContributionLimits from "./ContributionLimits";

jest.mock("./ContributionGraph", () => ({ __esModule: true, default: ({ accounts }: any) => <div data-testid="limit-graph">{accounts.map((account: any) => account.node.code).join(",")}</div> }));
const tfsa = { __typename: "AccountType", id: "tfsa", code: "TFSA", name: "Tax-Free Savings Account", hasContributionLimit: true };
const nrsa = { __typename: "AccountType", id: "nrsa", code: "NRSA", name: "Non-Registered Savings Account", hasContributionLimit: false };
jest.mock("recharts", () => ({ ...jest.requireActual("recharts"), ResponsiveContainer: () => null }));
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }) });
});
function show(nodes = [tfsa, nrsa]) {
  const accounts = { __typename: "AccountConnection", edges: nodes.map(node => ({ __typename: "AccountEdge", node })) };
  const client = new ApolloClient({ cache: new InMemoryCache({ addTypename: false }), link: new ApolloLink(operation => new Observable(observer => {
    observer.next({ data: { contributionAnalytics: [{accountId:"tfsa", contribution:50, limit:100, percentage:50, history:[]},{accountId:"nrsa",contribution:200,limit:null,percentage:null,history:[]}] } }); observer.complete();
  })) });
  render(<ApolloProvider client={client}><AddContributionLimit accounts={accounts} /><ContributionLimits accounts={accounts} /></ApolloProvider>);
}
test("unlimited accounts display contributions without a percentage or limit while retaining limit setup exclusions", async () => {
  show();
  expect(await screen.findByTestId("limit-graph")).toHaveTextContent("TFSA");
  expect(screen.getByTestId("limit-graph")).toHaveTextContent("NRSA");
  expect(screen.getByText(tfsa.name)).toBeVisible();
  expect(screen.getByText(nrsa.name)).toBeVisible();
  expect(screen.getByText("Contributions")).toBeVisible();
  const nrsaCard = screen.getByRole("group", { name: "NRSA contributions" });
  await waitFor(() => expect(nrsaCard).toHaveTextContent("$200.00 / -"));
  expect(within(nrsaCard).getByText("-")).toBeVisible();
  expect(nrsaCard).not.toHaveTextContent("%");
  expect(screen.getByRole("group", { name: "TFSA contributions" })).toHaveTextContent("50.00%");
  fireEvent.click(screen.getByRole("button", { name: "Add Contribution Limit" }));
  expect(screen.getByRole("radio", { name: "TFSA" })).toBeInTheDocument();
  expect(screen.queryByRole("radio", { name: "NRSA" })).not.toBeInTheDocument();
});
test("only unlimited accounts still show contribution totals without limit controls", async () => {
  show([nrsa]);
  expect(screen.queryByRole("button", { name: "Add Contribution Limit" })).not.toBeInTheDocument();
  expect(screen.getByText("Contributions")).toBeVisible();
  await waitFor(() => expect(screen.getByRole("group", { name: "NRSA contributions" })).toHaveTextContent("$200.00 / -"));
  expect(screen.getByTestId("limit-graph")).toHaveTextContent("NRSA");
});
