import { fireEvent, render, screen } from "@testing-library/react";
import StatisticTitle, { accountStatisticDescriptions, stockStatisticDescription } from "./StatisticTitle";
import { stockStatistics } from "../views/MyStocksView/statistics";

test("every account and stock statistic has a calculation description", () => {
  expect(Object.keys(accountStatisticDescriptions)).toHaveLength(12);
  for (const description of Object.values(accountStatisticDescriptions)) expect(description.length).toBeGreaterThan(30);
  for (const detail of stockStatistics([]).details) expect(stockStatisticDescription(detail.title)?.length).toBeGreaterThan(30);
});
test("description can be opened by keyboard focus", async () => {
  render(<StatisticTitle title="Book Cost" description="Cost of remaining shares." />);
  fireEvent.focus(screen.getByRole("button", { name: "About Book Cost" }));
  expect(await screen.findByRole("tooltip")).toHaveTextContent("Cost of remaining shares.");
});
test("description can be opened by tapping the information button", async () => {
  render(<StatisticTitle title="Shares" description="Shares currently held." />);
  fireEvent.click(screen.getByRole("button", { name: "About Shares" }));
  expect(await screen.findByRole("tooltip")).toHaveTextContent("Shares currently held.");
});
