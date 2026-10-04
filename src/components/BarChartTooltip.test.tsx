import { render, screen } from "@testing-library/react";
import { CustomTooltip } from "./BarChartTooltip";

test("chart tooltip groups large amounts, including negative values", () => {
  render(<CustomTooltip active payload={[{ name: "Buy Total", value: 12345.6 }, { name: "Net Deposits", value: -2345.67 }]} />);
  expect(screen.getByText("$12,345.60")).toBeInTheDocument();
  expect(screen.getByText("$-2,345.67")).toBeInTheDocument();
});

test.each([[0, 50, "Sale Proceeds", "Buy Total"], [100, 0, "Buy Total", "Sale Proceeds"]])("transaction tooltip omits the zero series (%s, %s)", (buy, sell, shown, omitted) => {
  render(<CustomTooltip active label="2026-01-01" hideZeroValues payload={[{ name: "Buy Total", value: buy }, { name: "Sale Proceeds", value: sell }]} />);
  expect(screen.getByText(`${shown}:`)).toBeInTheDocument();
  expect(screen.queryByText(`${omitted}:`)).not.toBeInTheDocument();
});
test("same-date purchases and sales retain both nonzero totals", () => {
  render(<CustomTooltip active hideZeroValues payload={[{ name: "Buy Total", value: 100 }, { name: "Sale Proceeds", value: 50 }]} />);
  expect(screen.getByText("Buy Total:")).toBeInTheDocument();
  expect(screen.getByText("Sale Proceeds:")).toBeInTheDocument();
});
