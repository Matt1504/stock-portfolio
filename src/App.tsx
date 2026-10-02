import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useLocation
} from "react-router-dom";

import ProfileProvider from "./profiles/ProfileContext";

import AppTheme from "./theme/AppTheme";

import LayoutComponent from "./components/Layout";
import AccountOverviewView from "./views/AccountView";
import AddTransactionView from "./views/AddTransactionView";
import DashboardView from "./views/DashboardView";
import MyStocksView from "./views/MyStocksView";

// import StocksView from "./views/StocksView";

const HomeRedirect = () => {
  const { search } = useLocation();
  return <Navigate to={{ pathname: "/home", search }} replace />;
};

const App = () => {
  return (
    <AppTheme><Router><ProfileProvider>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route
          path="/home"
          element={
            <LayoutComponent
              title="Stock Portfolio Dashboard"
              view={<DashboardView />}
            />
          }
        />
        {/* <Route
          path="/stocks"
          element={
            <LayoutComponent title="Stock Finder" view={<StocksView />} />
          }
        /> */}
        <Route
          path="/add"
          element={
            <LayoutComponent title="Add Transaction" view={<AddTransactionView />} />
          }
        />
        <Route
          path="/mystocks"
          element={
            <LayoutComponent title="My Stocks" view={<MyStocksView />} />
          }
        />
        <Route
          path="/myaccounts"
          element={
            <LayoutComponent title="My Accounts" view={<AccountOverviewView />} />
          }
        />
      </Routes>
    </ProfileProvider></Router></AppTheme>
  );
};

export default App;
