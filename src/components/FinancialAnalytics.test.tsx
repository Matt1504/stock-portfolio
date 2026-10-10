import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { render, screen } from "@testing-library/react";
import SelectedAccountInfo from "../views/AccountView/SelectedAccountInfo";
import { TRANSACTIONS_BY_PLATFORM } from "../views/AccountView/gql";
import { FinancialAnalytics, graphPoints, statisticDetails } from "./FinancialAnalytics";

jest.mock("./MarketValuation", () => ({ __esModule: true, default: () => null, MARKET_VALUATION: jest.requireActual("./MarketValuation").MARKET_VALUATION }));
jest.mock("./TransactionDataGrid", () => ({ TransactionDataGrid: () => null }));
jest.mock("recharts", () => ({ ...jest.requireActual("recharts"), ResponsiveContainer: () => null }));
beforeEach(() => Object.defineProperty(window,"matchMedia",{ writable:true,value:()=>({matches:false,addListener:()=>{},removeListener:()=>{}}) }));

test("account displays backend statistics even when they differ from table transactions", async () => {
  const currency={__typename:"CurrencyType",id:"cad",code:"CAD"};
  const analytics={__typename:"FinancialAnalytics",currency:"CAD",statistics:[{title:"Cash Balance",value:"1234.56",text:null,monetary:true,holding:false}],distribution:[],accountDistribution:[],bookCostHistory:[],tradeHistory:[],incomeHistory:[],issues:[]};
  const cache=new InMemoryCache({addTypename:false});
  cache.writeQuery({query:TRANSACTIONS_BY_PLATFORM,variables:{platform_one:"broker"},data:{transactions:[],analytics:[analytics]}});
  render(<ApolloProvider client={new ApolloClient({cache})}><SelectedAccountInfo name="Broker" platform="broker" account="tfsa" accountName="TFSA" currencies={[{__typename:"CurrencyEdge",node:currency}]} currency={currency} availableCurrencyIds={["cad"]} onCurrencyChange={()=>{}} /></ApolloProvider>);
  expect(await screen.findByRole("group",{name:"Cash Balance"})).toHaveTextContent("1,234.56");
});

test("decimal values, unknown gains and share quantities are presentation-only conversions",()=>{
  const analytics={statistics:[{title:"Realized Profit",value:null,text:null,monetary:true,holding:false},{title:"Total Share(s) Owned",value:"23.0000",monetary:false,holding:false},{title:"Largest Holding",value:"1234.56789",text:"EX",monetary:false,holding:true}]} as FinancialAnalytics;
  expect(statisticDetails(analytics)).toEqual([
    expect.objectContaining({title:"Realized Profit",value:"—",prefix:undefined}),
    expect.objectContaining({title:"Total Share(s) Owned",value:23,precision:0}),
    expect.objectContaining({title:"Largest Holding",value:"EX | $1,234.57"}),
  ]);
  expect(graphPoints([{name:"2026-01-01",value:"150",value1:"60",shares:"4.234567",sellShares:"1.5"}],true)).toEqual([{name:"2026-01-01",value:150,value_1:60,label:"4.2346 Share(s)",sellLabel:"1.5 Share(s)"}]);
});
