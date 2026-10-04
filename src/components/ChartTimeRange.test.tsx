import { fireEvent, render, screen } from "@testing-library/react";
import dayjs from "dayjs";
import { useState } from "react";
import { GraphData } from "../models/GraphData";
import ChartTimeRange, { ChartRange, chartHistoryInRange, availableBarRanges, barHistoryInRange } from "./ChartTimeRange";

const now = dayjs("2026-10-01");
const points = [
  new GraphData("2023-01-01", 10, 20, undefined),
  new GraphData("2024-11-01", 30, 40, undefined),
  new GraphData("2025-12-01", 50, 60, undefined),
  new GraphData("2026-09-01", 70, 80, undefined),
  new GraphData("2027-01-01", 90, 100, undefined),
];

test.each([
  ["3m", "2026-07-01", 50, 60],
  ["1y", "2025-10-01", 30, 40],
  ["2y", "2024-10-01", 10, 20],
] as const)("%s carries opening balances forward and ends today", (range, start, bookCost, deposits) => {
  const result = chartHistoryInRange(points, range, now);
  expect(result[0]).toEqual(new GraphData(start, bookCost, deposits, undefined));
  expect(result[result.length - 1]).toEqual(new GraphData("2026-10-01", 70, 80, undefined));
  expect(result.some(point => point.name === "2027-01-01")).toBe(false);
});

test("a quiet period still shows the carried balances, and all time keeps full history", () => {
  expect(chartHistoryInRange(points.slice(0, 1), "3m", now)).toEqual([
    new GraphData("2026-07-01", 10, 20, undefined), new GraphData("2026-10-01", 10, 20, undefined),
  ]);
  expect(chartHistoryInRange(points, "all", now)).toEqual(points);
  expect(chartHistoryInRange([], "1y", now)).toEqual([]);
  expect(points[0].name).toBe("2023-01-01");
});

function Chart() {
  const [range, setRange] = useState<ChartRange>("all");
  return <><ChartTimeRange value={range} onChange={setRange} label="History time range" /><output>{JSON.stringify(chartHistoryInRange(points, range, now))}</output></>;
}
test("all four horizon controls change the visible history", () => {
  render(<Chart />);
  expect(screen.getByRole("radio", { name: "All time" })).toBeChecked();
  for (const label of ["3 months", "1 year", "2 years"]) {
    fireEvent.click(screen.getByRole("radio", { name: label }));
    expect(screen.getByRole("radio", { name: label })).toBeChecked();
    expect(screen.getByRole("status")).not.toHaveTextContent("2023-01-01");
  }
  fireEvent.click(screen.getByRole("radio", { name: "All time" }));
  expect(screen.getByRole("status")).toHaveTextContent("2023-01-01");
});


test("bar ranges retain only real activities without carried balances or synthetic dates", () => {
  expect(barHistoryInRange(points, "3m", now)).toEqual([points[3]]);
  expect(barHistoryInRange(points, "all", now)).toEqual(points);
  expect(barHistoryInRange(points.slice(0, 1), "1y", now)).toEqual([]);
});

test("only useful, nonduplicate horizons are offered for ongoing histories", () => {
  expect(availableBarRanges(points.slice(0, 4), now)).toEqual(["3m", "1y", "2y", "all"]);
  expect(availableBarRanges([points[0], points[3]], now)).toEqual(["3m", "all"]);
  expect(availableBarRanges([points[3]], now)).toEqual(["all"]);
  expect(availableBarRanges([new GraphData("2024-01-01", 5, undefined, undefined), new GraphData("2024-05-01", 6, undefined, undefined)], now)).toEqual(["all"]);
  expect(availableBarRanges([], now)).toEqual(["all"]);
});
