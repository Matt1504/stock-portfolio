import { ApolloClient, ApolloLink, ApolloProvider, gql, InMemoryCache, Observable, useQuery } from '@apollo/client';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LastUpdated from '../components/LastUpdated';
import { dataFreshnessLink } from './dataFreshness';
const query = gql`query Freshness { hello { message } }`;
test('displays the server fetch time and advances on a fresh response', async () => {
  let timestamp = '2026-10-01T12:00:00+00:00';
  const client = new ApolloClient({ cache: new InMemoryCache(), link: dataFreshnessLink.concat(new ApolloLink(() => new Observable(observer => {
    observer.next({ data: { hello: { __typename: 'Greeting', message: 'ok' } }, extensions: { dataFreshness: { lastUpdated: timestamp, cacheHit: true } } }); observer.complete();
  }))) });
  function Page() { const request = useQuery(query); return <><LastUpdated queries={[query]} /><button onClick={() => request.refetch()}>Refresh</button></>; }
  render(<ApolloProvider client={client}><Page /></ApolloProvider>);
  await waitFor(() => expect(document.querySelector('time')).toHaveAttribute('datetime', timestamp));
  timestamp = '2026-10-05T12:00:00+00:00';
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  await waitFor(() => expect(document.querySelector('time')).toHaveAttribute('datetime', timestamp));
});
