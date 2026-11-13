import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from "@apollo/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProfileContext } from "../../profiles/ProfileContext";
import HistoryView from "./index";
const edges = (nodes: any[]) => ({ edges: nodes.map(node => ({ node })) });
const event = { id: 'audit', transactionId: 'transaction', occurredAt: '2026-11-11T12:00:00Z', action: 'delete', source: 'manual', operationId: 'operation', note: 'Saved deletion evidence', changes: [{ field:'total', before:'20', after:null }] };
const member = { id:'one', platform:'platform', platformName:'Broker', transactionDate:'2026-11-01', activity:'Buy', ticker:'EX', currency:'CAD', total:'20', shares:'2', price:'10', fee:null };
function setup() {
  const calls: { name:string; variables:any }[]=[];
  const client=new ApolloClient({cache:new InMemoryCache({addTypename:false}),link:new ApolloLink(operation=>new Observable(observer=>{
    calls.push({name:operation.operationName,variables:operation.variables});
    const data=operation.operationName==='TransactionAudit' ? {transactionAudit:{items:[event],nextCursor:null}}
      :operation.operationName==='DuplicateCandidates' ? {duplicateCandidates:{scannedCount:2,candidateCount:1,truncated:false,groups:[{fingerprint:'candidate',kind:'exact',reason:'Matching financial fields.',members:[member,{...member,id:'two'}]}]}}
      :operation.operationName==='DismissDuplicate' ? {dismissDuplicate:{success:true}}
      :{accounts:edges([{id:'account',code:'TFSA',name:'Savings'}]),currencies:edges([{id:'cad',code:'CAD'}]),platforms:edges([{id:'platform',name:'Broker',closedAt:null,account:{id:'account'},currency:{id:'cad'}}]),stocks:edges([]),activities:edges([]),assets:edges([])};
    observer.next({data});observer.complete();
  }))});
  render(<ApolloProvider client={client}><MemoryRouter><ProfileContext.Provider value={{profile:{id:'owner',name:'Owner'},profiles:[],loading:false,selectProfile(){},refetch:async()=>{}}}><HistoryView /></ProfileContext.Provider></MemoryRouter></ApolloProvider>);
  return calls;
}
beforeEach(()=>Object.defineProperty(window,'matchMedia',{writable:true,value:()=>({matches:false,addListener(){},removeListener(){}})}));

test('audit is scoped and deletion evidence remains expandable',async()=>{
  const calls=setup();
  expect(await screen.findByText('manual')).toBeInTheDocument();
  expect(calls.find(call=>call.name==='TransactionAudit')?.variables.profileId).toBe('owner');
  fireEvent.click(screen.getByRole('button',{name:'Expand row'}));
  expect(await screen.findByText('Saved deletion evidence')).toBeInTheDocument();
  expect(screen.getByText('Before')).toBeInTheDocument();
  expect(screen.getByText('20')).toBeInTheDocument();
  expect(calls.some(call=>call.name==='DuplicateCandidates')).toBe(false);
});

test('scan is explicit and reviewing a candidate never changes transactions',async()=>{
  const calls=setup();
  fireEvent.click(screen.getByRole('tab',{name:'Possible Duplicates'}));
  expect(calls.some(call=>call.name==='DuplicateCandidates')).toBe(false);
  fireEvent.click(screen.getByRole('button',{name:'Scan for Possible Duplicates'}));
  expect(await screen.findByText('Matching transaction fields')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Mark as Legitimate'}));
  expect(screen.getByRole('button',{name:'Save Review'})).toBeDisabled();
  fireEvent.change(screen.getByRole('textbox',{name:'Duplicate review reason'}),{target:{value:'Two separate orders verified'}});
  fireEvent.click(screen.getByRole('button',{name:'Save Review'}));
  await waitFor(()=>expect(screen.getByText('No unreviewed candidates found.')).toBeInTheDocument());
  expect(calls.find(call=>call.name==='DismissDuplicate')?.variables).toEqual({profileId:'owner',fingerprint:'candidate',reason:'Two separate orders verified'});
  expect(calls.some(call=>/CreateTransaction|DeleteTransaction|UpdateTransaction/.test(call.name))).toBe(false);
});
