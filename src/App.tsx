import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useQuery, gql} from "@apollo/client";

import DashboardView from "./views/DashboardView";
import LayoutComponent from "./components/Layout";
import AccountOverviewView from "./views/AccountView";
import StocksView from "./views/StocksView";

const GET_PLATFORM_INFO = gql(`
  query {
    platforms {
      edges {
        node {
          id
          name
          account {
            id
            code
            name
          }
          currency {
            id
            code
            name
          }
        }
      }
    }
  }
`);

const App = () => {

  const { loading, error, data } = useQuery(GET_PLATFORM_INFO);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/home" />} />
        <Route path="/home" element={<LayoutComponent title="Stock Portfolio Dashboard" view={<DashboardView />} />} />
        <Route path="/stocks" element={<LayoutComponent title="Stock Finder" view={<StocksView />} />} />
        <Route path="/:account/:platform" element={<LayoutComponent title="Account" view={<AccountOverviewView />} />} />
      </Routes>
    </Router>
  );
};

export default App;
