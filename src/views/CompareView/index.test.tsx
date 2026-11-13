import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from "@apollo/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProfileContext } from "../../profiles/ProfileContext";
import CompareView, { comparedStatistic } from "./index";
jest.mock('./ComparisonCharts',()=>()=> <div>Comparison charts</div>);
const edges=(nodes:any[])=>({edges:nodes.map(node=>({node}))});
const account={id:'tfsa',name:'Tax-Free',code:'TFSA'},rrsp={id:'rrsp',name:'Retirement',code:'RRSP'};
const platform=(id:string,name:string,currency='CAD',a=account)=>({id,name,closedAt:null,account:a,currency:{id:currency,code:currency}});
const metadata={accounts:edges([account,rrsp]),platforms:edges([platform('a','Broker A'),platform('b','Broker B'),platform('us','US Broker','USD'),platform('c','Retirement','CAD',rrsp)])};
const stat=(amount:string)=>({title:'Cash Balance',value:amount,text:null,monetary:true,holding:false});
const valuation={complete:true,quoteTime:null,annualizedStartDate:null,annualizedReturnNote:null,missingTickers:[],warnings:[],refreshOverdue:false};
const comparison={currency:'CAD',left:{selectionId:'a',label:'TFSA · Broker A · CAD',analytics:{issues:[]},valuation},right:{selectionId:'b',label:'TFSA · Broker B · CAD',analytics:{issues:[]},valuation},statistics:[{title:'Cash Balance',difference:'80',left:stat('80'),right:stat('160')}],marketStatistics:[],holdings:[{stockId:'stock',ticker:'EX',name:'Example',assetType:'Stock',leftHeld:true,rightHeld:true,leftShares:'2',rightShares:'4',leftBookCost:'20',rightBookCost:'40',bookCostDifference:'20',leftWeight:'100',rightWeight:'100'}],history:[]};
function setup(url='/compare?profile=owner'){
 const calls:any[]=[];
 const client=new ApolloClient({cache:new InMemoryCache({addTypename:false}),link:new ApolloLink(operation=>new Observable(observer=>{
  calls.push({name:operation.operationName,variables:operation.variables});
  observer.next({data:operation.operationName==='CompareMetadata'?metadata:{portfolioComparison:comparison}});observer.complete();
 }))});
 render(<ApolloProvider client={client}><MemoryRouter initialEntries={[url]}><ProfileContext.Provider value={{profile:{id:'owner',name:'Owner'},profiles:[],loading:false,selectProfile(){},refetch:async()=>{}}}><CompareView /></ProfileContext.Provider></MemoryRouter></ApolloProvider>);
 return calls;
}
beforeEach(()=>Object.defineProperty(window,'matchMedia',{writable:true,value:()=>({matches:false,addListener(){},removeListener(){}})}));
test('waits for two valid same-currency selections',async()=>{
 const calls=setup();
 await waitFor(()=>expect(calls.some(call=>call.name==='CompareMetadata')).toBe(true));
 expect(calls.some(call=>call.name==='PortfolioComparison')).toBe(false);
 fireEvent.mouseDown(screen.getByRole('combobox',{name:'Compare A'}));
 fireEvent.click(await screen.findByTitle('TFSA · Broker A'));
 expect(calls.some(call=>call.name==='PortfolioComparison')).toBe(false);
 fireEvent.mouseDown(screen.getByRole('combobox',{name:'Compare B'}));
 expect(screen.queryByTitle('TFSA · US Broker')).not.toBeInTheDocument();
 fireEvent.click((await screen.findAllByTitle('TFSA · Broker B')).slice(-1)[0]);
 await waitFor(()=>expect(calls.find(call=>call.name==='PortfolioComparison')?.variables).toMatchObject({profileId:'owner',kind:'PLATFORM',currency:'CAD',left:'a',right:'b'}));
 expect(await screen.findByText('Portfolio Analytics (CAD)')).toBeInTheDocument();
 expect(screen.getAllByText('$80.00').length).toBeGreaterThan(0);
});
test('deep links restore comparison and swapping reverses the selected sides',async()=>{
 const calls=setup('/compare?profile=owner&mode=platform&currency=CAD&left=a&right=b');
 expect(await screen.findByText('Portfolio Analytics (CAD)')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Swap A / B'}));
 await waitFor(()=>expect(calls.filter(call=>call.name==='PortfolioComparison').slice(-1)[0].variables).toMatchObject({left:'b',right:'a'}));
});
test('account comparison uses account IDs and holdings show backend costs',async()=>{
 const calls=setup('/compare?profile=owner&mode=account&currency=CAD&left=tfsa&right=rrsp');
 await waitFor(()=>expect(calls.find(call=>call.name==='PortfolioComparison')?.variables.kind).toBe('ACCOUNT'));
 fireEvent.click(await screen.findByRole('tab',{name:'Holdings & Allocation'}));
 expect(await screen.findByRole('link',{name:'EX · Example'})).toHaveAttribute('href','/mystocks?profile=owner&stock=stock');
 expect(screen.getAllByText('$20.00').length).toBeGreaterThan(0);
});
test('invalid cross-currency deep links never request a comparison',async()=>{
 const calls=setup('/compare?profile=owner&currency=CAD&left=a&right=us');
 await screen.findByText(/Choose two different items/);
 expect(calls.some(call=>call.name==='PortfolioComparison')).toBe(false);
});

test('emphasizes only the numerically larger value, including negative values',()=>{
 const {container,rerender}=render(comparedStatistic(stat('-10'),stat('-20')));
 expect(container.querySelector('strong')).toHaveTextContent('$-10.00');
 rerender(comparedStatistic(stat('80'),stat('160')));
 expect(container.querySelector('strong')).toBeNull();
 rerender(comparedStatistic(stat('80'),stat('80')));
 expect(container.querySelector('strong')).toBeNull();
 rerender(comparedStatistic(stat('80'),null));
 expect(container.querySelector('strong')).toBeNull();
});
test('groups quote timestamps together and return start dates together',async()=>{
 setup('/compare?profile=owner&mode=platform&currency=CAD&left=a&right=b');
 await screen.findByText('Portfolio Analytics (CAD)');
 const notes=document.querySelector('.compare-metadata');
 expect(notes?.children).toHaveLength(4);
 expect(notes?.children[0]).toHaveTextContent('APrices as of');
 expect(notes?.children[1]).toHaveTextContent('BPrices as of');
 expect(notes?.children[2]).toHaveTextContent('AAnnualized-return start:');
 expect(notes?.children[3]).toHaveTextContent('BAnnualized-return start:');
});
