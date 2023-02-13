/* eslint-disable */
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /**
   * The `DateTime` scalar type represents a DateTime
   * value as specified by
   * [iso8601](https://en.wikipedia.org/wiki/ISO_8601).
   */
  DateTime: any;
};

/** Accounts */
export type Accounts = Node & {
  __typename?: 'Accounts';
  code?: Maybe<Scalars['String']>;
  /** The ID of the object. */
  id: Scalars['ID'];
  name?: Maybe<Scalars['String']>;
};

export type AccountsConnection = {
  __typename?: 'AccountsConnection';
  /** Contains the nodes in this connection. */
  edges: Array<Maybe<AccountsEdge>>;
  /** Pagination data for this connection. */
  pageInfo: PageInfo;
};

/** A Relay edge containing a `Accounts` and its cursor. */
export type AccountsEdge = {
  __typename?: 'AccountsEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String'];
  /** The item at the end of the edge */
  node?: Maybe<Accounts>;
};

/** Activities */
export type Activities = Node & {
  __typename?: 'Activities';
  /** The ID of the object. */
  id: Scalars['ID'];
  name?: Maybe<Scalars['String']>;
};

export type ActivitiesConnection = {
  __typename?: 'ActivitiesConnection';
  /** Contains the nodes in this connection. */
  edges: Array<Maybe<ActivitiesEdge>>;
  /** Pagination data for this connection. */
  pageInfo: PageInfo;
};

/** A Relay edge containing a `Activities` and its cursor. */
export type ActivitiesEdge = {
  __typename?: 'ActivitiesEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String'];
  /** The item at the end of the edge */
  node?: Maybe<Activities>;
};

/** Currencies */
export type Currencies = Node & {
  __typename?: 'Currencies';
  code?: Maybe<Scalars['String']>;
  /** The ID of the object. */
  id: Scalars['ID'];
  name?: Maybe<Scalars['String']>;
};

export type CurrenciesConnection = {
  __typename?: 'CurrenciesConnection';
  /** Contains the nodes in this connection. */
  edges: Array<Maybe<CurrenciesEdge>>;
  /** Pagination data for this connection. */
  pageInfo: PageInfo;
};

/** A Relay edge containing a `Currencies` and its cursor. */
export type CurrenciesEdge = {
  __typename?: 'CurrenciesEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String'];
  /** The item at the end of the edge */
  node?: Maybe<Currencies>;
};

/** An object with an ID */
export type Node = {
  /** The ID of the object. */
  id: Scalars['ID'];
};

/** The Relay compliant `PageInfo` type, containing data necessary to paginate this connection. */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['String']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean'];
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['String']>;
};

/** Platforms */
export type Platforms = Node & {
  __typename?: 'Platforms';
  account?: Maybe<Accounts>;
  currency?: Maybe<Currencies>;
  /** The ID of the object. */
  id: Scalars['ID'];
  name?: Maybe<Scalars['String']>;
};

export type PlatformsConnection = {
  __typename?: 'PlatformsConnection';
  /** Contains the nodes in this connection. */
  edges: Array<Maybe<PlatformsEdge>>;
  /** Pagination data for this connection. */
  pageInfo: PageInfo;
};

/** A Relay edge containing a `Platforms` and its cursor. */
export type PlatformsEdge = {
  __typename?: 'PlatformsEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String'];
  /** The item at the end of the edge */
  node?: Maybe<Platforms>;
};

export type Query = {
  __typename?: 'Query';
  accounts?: Maybe<AccountsConnection>;
  activities?: Maybe<ActivitiesConnection>;
  currencies?: Maybe<CurrenciesConnection>;
  platforms?: Maybe<PlatformsConnection>;
  stocks?: Maybe<StocksConnection>;
  transactions?: Maybe<TransactionsConnection>;
};


export type QueryAccountsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  code?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['ID']>;
  last?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
};


export type QueryActivitiesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['ID']>;
  last?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
};


export type QueryCurrenciesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  code?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['ID']>;
  last?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
};


export type QueryPlatformsArgs = {
  account?: InputMaybe<Scalars['ID']>;
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  currency?: InputMaybe<Scalars['ID']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['ID']>;
  last?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
};


export type QueryStocksArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['ID']>;
  last?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  ticker?: InputMaybe<Scalars['String']>;
};


export type QueryTransactionsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  fee?: InputMaybe<Scalars['Float']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['ID']>;
  last?: InputMaybe<Scalars['Int']>;
  price?: InputMaybe<Scalars['Float']>;
  shares?: InputMaybe<Scalars['Int']>;
  total?: InputMaybe<Scalars['Float']>;
  transactionDate?: InputMaybe<Scalars['DateTime']>;
};

/** Stocks */
export type Stocks = Node & {
  __typename?: 'Stocks';
  /** The ID of the object. */
  id: Scalars['ID'];
  name?: Maybe<Scalars['String']>;
  ticker?: Maybe<Scalars['String']>;
};

export type StocksConnection = {
  __typename?: 'StocksConnection';
  /** Contains the nodes in this connection. */
  edges: Array<Maybe<StocksEdge>>;
  /** Pagination data for this connection. */
  pageInfo: PageInfo;
};

/** A Relay edge containing a `Stocks` and its cursor. */
export type StocksEdge = {
  __typename?: 'StocksEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String'];
  /** The item at the end of the edge */
  node?: Maybe<Stocks>;
};

/** Transactions */
export type Transactions = Node & {
  __typename?: 'Transactions';
  fee?: Maybe<Scalars['Float']>;
  /** The ID of the object. */
  id: Scalars['ID'];
  price?: Maybe<Scalars['Float']>;
  shares?: Maybe<Scalars['Int']>;
  total?: Maybe<Scalars['Float']>;
  transactionDate?: Maybe<Scalars['DateTime']>;
};

export type TransactionsConnection = {
  __typename?: 'TransactionsConnection';
  /** Contains the nodes in this connection. */
  edges: Array<Maybe<TransactionsEdge>>;
  /** Pagination data for this connection. */
  pageInfo: PageInfo;
};

/** A Relay edge containing a `Transactions` and its cursor. */
export type TransactionsEdge = {
  __typename?: 'TransactionsEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String'];
  /** The item at the end of the edge */
  node?: Maybe<Transactions>;
};
