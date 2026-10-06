import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from "@apollo/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TransactionsView from "./index";
import { ProfileContext } from "../../profiles/ProfileContext";
jest.mock('../../components/TransactionDataGrid', () => ({ TransactionDataGrid: ({ gridData, hasMore, onLoadMore }: any) => <div data-testid="rows">{JSON.stringify(gridData)}{hasMore && <button onClick={onLoadMore}>Load more</button>}</div> }));
beforeEach(() => Object.defineProperty(window, 'matchMedia', { writable: true, value: () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }) }));
function setup() {
  const searches: any[] = [];
  const client = new ApolloClient({ cache: new InMemoryCache(), link: new ApolloLink(operation => new Observable(observer => {
    const data = operation.operationName === 'SearchTransactions' ? (() => {
      searches.push({ ...operation.variables });
      return { searchTransactions: { transactions: [{ id: operation.variables.after ? 'second' : 'first', account: { id: 'rrsp', code: 'RRSP' }, platform: { id: 'broker', name: 'Broker', currency: { id: 'cad', code: 'CAD' } }, activity: { name: 'Contribution' }, stock: null, transactionDate: '2026-10-05', transferBatch: null, spinoffSource: null, allocatedBookCost: null, principalReturned: null, interestEarned: null, interestCalculation: 'simple', priceCurrency: null, totalCurrency: null, exchangeRate: 1, gicPurchase: null, price: null, shares: null, fee: null, rate: null, maturityDate: null, total: 100 }], nextCursor: operation.variables.after ? null : 'cursor' } };
    })() : { accounts: { edges: [{ node: { id: 'rrsp', code: 'RRSP', name: 'Retirement' } }] }, activities: { edges: [] }, stocks: { edges: [] }, assets: { edges: [] }, currencies: { edges: [] }, platforms: { edges: [] } };
    observer.next({ data }); observer.complete();
  })) });
  const view = (id: string) => <ApolloProvider client={client}><ProfileContext.Provider value={{ profile: { id, name: id }, profiles: [], loading: false, selectProfile() {}, refetch: async () => {} }}><TransactionsView /></ProfileContext.Provider></ApolloProvider>;
  const rendered = render(view('owner'));
  return { searches, rendered, view };
}
test('starts empty and searches only on submit; cursor pages append rows', async () => {
  const { searches } = setup();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Search' })).toBeEnabled());
  expect(searches).toHaveLength(0);
  expect(screen.queryByTestId('rows')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  await waitFor(() => expect(screen.getByTestId('rows')).toHaveTextContent('first'));
  expect(searches[0].profileId).toBe('owner');
  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
  await waitFor(() => expect(screen.getByTestId('rows')).toHaveTextContent('second'));
  expect(screen.getByTestId('rows')).toHaveTextContent('first');
  expect(searches[1].after).toBe('cursor');
});
test('changing account waits for Search and switching profile clears results', async () => {
  const { searches, rendered, view } = setup();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Search' })).toBeEnabled());
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Search Account' }));
  fireEvent.click(await screen.findByText('RRSP'));
  expect(searches).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  await waitFor(() => expect(searches).toHaveLength(1));
  expect(searches[0].account).toBe('rrsp');
  rendered.rerender(view('another'));
  expect(screen.queryByTestId('rows')).not.toBeInTheDocument();
  expect(searches).toHaveLength(1);
});
