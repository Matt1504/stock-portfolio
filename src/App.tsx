import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  redirect
} from "react-router-dom";
import DashboardView from './views/DashboardView';

const App = () => {

  return (
    <Router>
      <Routes>
          <Route path="/" element={<DashboardView/>}/>
        </Routes>
    </Router>
  );
};

export default App;