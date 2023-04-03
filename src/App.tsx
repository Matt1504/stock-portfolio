import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes
} from "react-router-dom";

import LayoutComponent from "./components/Layout";
import AccountOverviewView from "./views/AccountView";
import AddTransactionView from "./views/AddTransactionView";
import DashboardView from "./views/DashboardView";
import MyStocksView from "./views/MyStocksView";
import StocksView from "./views/StocksView";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/home" />} />
        <Route
          path="/home"
          element={
            <LayoutComponent
              title="Stock Portfolio Dashboard"
              view={<DashboardView />}
            />
          }
        />
        <Route
          path="/stocks"
          element={
            <LayoutComponent title="Stock Finder" view={<StocksView />} />
          }
        />
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
    </Router>
  );
};

export default App;
