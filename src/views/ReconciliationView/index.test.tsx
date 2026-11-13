import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from "@apollo/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProfileContext } from "../../profiles/ProfileContext";
import ReconciliationView from "./index";

const comparison = { __typename: 'Preview', platform: 'platform', currency: 'CAD', statementEnd: '2026-09-30', dateBasis: 'recorded', fingerprint: 'fingerprint', canFinish: true,
  issues: [], scope: ['Cash'], cash: { __typename: 'Comparison', statement: '800', calculated: '800', difference: '0', outcome: 'exact' }, holdings: [], pendingTrades: [] };
const edges = (nodes: any[]) => ({ edges: nodes.map(node => ({ node })) });
const metadata = { accounts: edges([{ id: 'rrsp', name: 'Retirement', code: 'RRSP' }]), assets: edges([]), currencies: edges([{ id: 'cad', code: 'CAD' }]), activities: edges([]),
  platforms: edges([{ id: 'platform', name: 'Broker', closedAt: null, account: { id: 'rrsp' }, currency: { id: 'cad' } }]), stocks: edges([]) };
const saved = { __typename: 'SavedReconciliation', id: 'saved', state: 'matched', statementEnd: '2026-09-30', createdAt: '2026-10-01T12:00:00', reviewedAt: '2026-10-01T12:00:00', note: '', needsRecheck: true,
  platform: 'platform', dateBasis: 'recorded', periodStart: null, statementCash: '800', completeHoldings: false, moneyTolerance: '0.01', shareTolerance: '0.0001', snapshot: comparison };
function setup(withSaved = false) {
  const calls: { name: string; variables: any }[] = [];
  const client = new ApolloClient({ cache: new InMemoryCache(), link: new ApolloLink(operation => new Observable(observer => {
    calls.push({ name: operation.operationName, variables: operation.variables });
    const data = operation.operationName === 'PreviewReconciliation' ? { previewReconciliation: comparison }
      : operation.operationName === 'SaveReconciliation' ? { saveReconciliation: { reconciliation: { ...saved, needsRecheck: false } } }
      : operation.operationName === 'ReconciliationHistory' ? { reconciliations: { items: withSaved ? [saved] : [], nextCursor: null } } : metadata;
    observer.next({ data }); observer.complete();
  })) });
  render(<ApolloProvider client={client}><MemoryRouter initialEntries={['/reconciliation?profile=owner&platform=platform']}><ProfileContext.Provider value={{ profile: { id: 'owner', name: 'Owner' }, profiles: [], loading: false, selectProfile() {}, refetch: async () => {} }}><ReconciliationView /></ProfileContext.Provider></MemoryRouter></ApolloProvider>);
  return calls;
}
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', { writable: true, value: () => ({ matches: false, addListener() {}, removeListener() {} }) });
});

test('comparison is explicit; cash-only review saves its checked scope', async () => {
  const calls = setup();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Compare' })).toBeEnabled());
  expect(calls.some(call => call.name === 'PreviewReconciliation')).toBe(false);
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Statement cash' }), { target: { value: '800' } });
  fireEvent.click(screen.getByRole('button', { name: 'Compare' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Finish Reconciliation' })).toBeEnabled());
  expect(screen.getByText(/Checked scope: Cash/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Finish Reconciliation' }));
  await waitFor(() => expect(calls.some(call => call.name === 'SaveReconciliation')).toBe(true));
  const request = calls.find(call => call.name === 'SaveReconciliation')!;
  expect(request.variables).toMatchObject({ profileId: 'owner', state: 'matched', previewFingerprint: 'fingerprint', input: { platform: 'platform', cash: '800', holdings: [], completeHoldings: false } });
});

test('changing statement values discards the old comparison before finishing', async () => {
  setup();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Compare' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Compare' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Finish Reconciliation' })).toBeEnabled());
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Statement cash' }), { target: { value: '900' } });
  expect(screen.getByRole('button', { name: 'Finish Reconciliation' })).toBeDisabled();
});

test('stale saved evidence remains visible and must be compared again', async () => {
  setup(true);
  fireEvent.click(await screen.findByRole('button', { name: 'Open' }));
  expect(screen.getByText(/Needs recheck — records/)).toBeInTheDocument();
  expect(screen.getByText('Saved comparison snapshot')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Finish Reconciliation' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Compare Again' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Finish Reconciliation' })).toBeEnabled());
});
