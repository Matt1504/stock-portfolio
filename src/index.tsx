import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloClient,
  createHttpLink,
  InMemoryCache,
  ApolloProvider } from "@apollo/client";

import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

async function bootStrap() {
  const link = createHttpLink({
    uri: "http://127.0.0.1:5002/graphql",
  });

  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link,
  });

  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );

  const appBundle = (
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  )

  root.render(appBundle);
}

bootStrap();
