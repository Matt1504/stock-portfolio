import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import DashboardView from "./views/DashboardView";
import LayoutComponent from "./components/Layout";
import AccountOverviewView from "./views/AccountView";
import StocksView from "./views/StocksView";
import AddActivityView from "./views/AddActivityView";

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
            <LayoutComponent
              title="Add Activity"
              view={<AddActivityView />}
            />
          }
        />
        <Route
          path="/:account/:platform"
          element={
            <LayoutComponent title="Account" view={<AccountOverviewView />} />
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
