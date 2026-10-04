import { fireEvent, render, screen } from "@testing-library/react";
import { BarChart } from "recharts";
import BookCostDistribution, { distributionColour, DistributionTooltip } from "./BookCostDistribution";
import { GraphData } from "../models/GraphData";

jest.mock("recharts", () => {
  const React = jest.requireActual("react");
  const charts = jest.requireActual("recharts");
  return { ...charts, BarChart: jest.fn((props: any) => React.createElement(charts.BarChart, props)), ResponsiveContainer: ({ children }: any) => React.cloneElement(children, { width: 800, height: 400 }) };
});

test("pie and horizontal bars share the same holdings and book-cost totals", () => {
  const data = [new GraphData("EX", 1234.56, undefined, "1234.5678"), new GraphData("FUND", 200, undefined, undefined), new GraphData("Sold", 0, undefined, undefined)];
  render(<BookCostDistribution data={data} />);
  expect(screen.getByRole("heading", { name: "Book Cost Distribution" })).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Pie" })).toBeChecked();
  fireEvent.click(screen.getByRole("radio", { name: "Bar" }));
  expect(screen.getByRole("radio", { name: "Bar" })).toBeChecked();
  expect(BarChart).toHaveBeenLastCalledWith(expect.objectContaining({ layout: "vertical", data: data.slice(0, 2) }), expect.anything());
  fireEvent.click(screen.getByRole("radio", { name: "Pie" }));
  expect(screen.getByRole("radio", { name: "Pie" })).toBeChecked();
});

test("purple shades are distinct for every holding", () => {
  const colours = Array.from({ length: 20 }, (_, index) => distributionColour(index, 20));
  expect(new Set(colours).size).toBe(20);
  expect(colours.every(colour => colour.startsWith("hsl(265, 68%,"))).toBe(true);
  expect(distributionColour(0, 1)).toBe("hsl(265, 68%, 50%)");
});

test("bar tooltip shows formatted cost, proportion and optional fractional shares", () => {
  const { rerender } = render(<DistributionTooltip active total={2000} payload={[{ payload: new GraphData("EX", 1234.56, undefined, "1234.56789") }]} />);
  expect(screen.getByText("Book Cost: $1,234.56")).toBeInTheDocument();
  expect(screen.getByText("61.73% of book cost")).toBeInTheDocument();
  expect(screen.getByText("1,234.5679 Share(s)")).toBeInTheDocument();
  rerender(<DistributionTooltip active total={2000} payload={[{ payload: new GraphData("Fund", 2000, undefined, undefined) }]} />);
  expect(screen.queryByText(/Share\(s\)/)).not.toBeInTheDocument();
});
