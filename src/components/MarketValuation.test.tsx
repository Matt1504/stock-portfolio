import { fireEvent, render, screen, within } from "@testing-library/react";
import { ValuationDisplay } from "./MarketValuation";

const value = {
  currency: "CAD", complete: true, marketValue: "1200.00", pricedMarketValue: "1200.00",
  unrealizedGain: "200.00", unrealizedReturn: "20.00", annualizedReturn: "12.34", annualizedStartDate: "2023-01-01", annualizedReturnNote: null, totalValue: "1250.00",
  currentPrice: "120.00", priceCurrency: "USD", quoteTime: "2026-10-08T20:00:00+00:00",
  lastUpdated: "2026-10-08T21:00:00+00:00", missingTickers: [], warnings: [],
};

test("displays account valuation and its timestamps", () => {
  render(<ValuationDisplay value={value} loading={false} currency="CAD" />);
  expect(screen.getByText("Account Value")).toBeInTheDocument();
  expect(screen.getByText("1,250").parentElement).toHaveTextContent("1,250.00");
  expect(screen.getByText(/Prices as of/)).toBeInTheDocument();
});

test("stock price uses its native currency and omits account value", () => {
  render(<ValuationDisplay value={value} loading={false} stock currency="CAD" />);
  expect(screen.getByText("Current Price")).toBeInTheDocument();
  expect(screen.getByText("USD $")).toBeInTheDocument();
  expect(screen.queryByText("Account Value")).not.toBeInTheDocument();
});

test("missing quotes show an incomplete valuation instead of a zero total", () => {
  render(<ValuationDisplay value={{ ...value, complete: false, marketValue: null,
    totalValue: null, unrealizedGain: null, unrealizedReturn: null, missingTickers: ["XEQT"] }} loading={false} currency="CAD" />);
  expect(screen.getByText("Valuation incomplete")).toBeInTheDocument();
  expect(screen.getByText(/Price or FX unavailable: XEQT/)).toBeInTheDocument();
  expect(screen.queryByText("0.00")).not.toBeInTheDocument();
});


test("return card flips without duplicating tooltip controls", () => {
  render(<ValuationDisplay value={value} loading={false} currency="CAD" />);
  expect(screen.getByRole("group", { name: "Unrealized Return" })).toHaveTextContent("20.00%");
  fireEvent.click(screen.getByRole("button", { name: "Show Annualized Return" }));
  const card = screen.getByRole("group", { name: "Annualized Return" });
  expect(card).toHaveTextContent("12.34%");
  expect(within(card).getAllByRole("button", { name: /^About / })).toHaveLength(1);
  expect(screen.queryByRole("button", { name: "About Unrealized Return" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Show Unrealized Return" }));
  expect(screen.getByRole("group", { name: "Unrealized Return" })).toBeInTheDocument();
});

test("incomplete annualized return retains the dash and existing warning", () => {
  render(<ValuationDisplay value={{ ...value, complete: false, unrealizedReturn: null,
    annualizedReturn: null, marketValue: null, totalValue: null, unrealizedGain: null, missingTickers: ["FUND"] }} loading={false} currency="CAD" />);
  fireEvent.click(screen.getByRole("button", { name: "Show Annualized Return" }));
  expect(screen.getByRole("group", { name: "Annualized Return" })).toHaveTextContent("—");
  expect(screen.getByText("Valuation incomplete")).toBeInTheDocument();
  expect(screen.queryByText("Unavailable")).not.toBeInTheDocument();
});
