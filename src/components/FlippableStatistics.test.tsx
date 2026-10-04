import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FlippableStatistics, { accountCardPairs } from "./FlippableStatistics";
import { accountStatisticDescriptions } from "./StatisticTitle";

const details = Object.keys(accountStatisticDescriptions).map(title => ({ title, value: 10, prefix: "$", precision: 2, colour: "" }));
beforeEach(() => Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }) }));

test("five green pairs and three neutral defaults flip independently", async () => {
  render(<FlippableStatistics details={details} descriptions={accountStatisticDescriptions} />);
  expect(screen.getAllByRole("group")).toHaveLength(4);
  fireEvent.click(screen.getByRole("button", { name: "Show more statistics" }));
  expect(screen.getAllByRole("group")).toHaveLength(8);
  expect(screen.getAllByRole("group").filter(card => card.classList.contains("flip-statistic--green"))).toHaveLength(5);
  for (const title of ["Total Share(s) Owned", "Unique Share(s) Owned", "Largest Holding"]) expect(screen.getByRole("group", { name: title })).toHaveClass("flip-statistic--default");
  for (const [front, back] of [["Amount Transferred In", "Amount Transferred Out"], ["Amount Contributed", "Amount Withdrawn"], ["Dividends/Interest Earned", "Fees Paid"], ["Net Deposits", "Total Book Cost"], ["Realized Profit", "Realized Gain/Loss"]]) {
    const trigger = screen.getByRole("button", { name: `Show ${back}` });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    const card = screen.getByRole("group", { name: back });
    expect(card).toHaveClass(back === "Realized Gain/Loss" ? "flip-statistic--green" : "flip-statistic--red");
    expect(screen.queryByRole("group", { name: front })).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole("button", { name: `Show ${front}` }));
    expect(screen.getByRole("group", { name: front })).toHaveClass("flip-statistic--green");
  }
});

test("clicking the card flips it but opening a tooltip does not", async () => {
  render(<FlippableStatistics details={details} descriptions={accountStatisticDescriptions} />);
  fireEvent.click(screen.getByRole("button", { name: "About Net Deposits" }));
  expect(await screen.findByRole("tooltip")).toHaveTextContent("Lifetime contributions");
  expect(screen.getByRole("group", { name: "Net Deposits" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("group", { name: "Net Deposits" }));
  expect(screen.getByRole("group", { name: "Total Book Cost" })).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole("button", { name: "About Total Book Cost" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Show Net Deposits" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "About Net Deposits" })).toBeEnabled());
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  fireEvent.focus(screen.getByRole("button", { name: "About Net Deposits" }));
  expect(await screen.findByRole("tooltip")).toHaveTextContent("Lifetime contributions");
});


test("collapsing statistics removes lower-row tooltips and keeps the first row", async () => {
  render(<FlippableStatistics details={details} descriptions={accountStatisticDescriptions} />);
  fireEvent.click(screen.getByRole("button", { name: "Show more statistics" }));
  fireEvent.click(screen.getByRole("button", { name: "Show Smallest Holding" }));
  expect(screen.getByRole("group", { name: "Smallest Holding" })).toHaveClass("flip-statistic--default");
  await waitFor(() => expect(screen.getByRole("button", { name: "About Smallest Holding" })).toBeEnabled());
  fireEvent.focus(screen.getByRole("button", { name: "About Smallest Holding" }));
  expect(await screen.findByRole("tooltip")).toHaveTextContent("lowest positive remaining book cost");
  fireEvent.click(screen.getByRole("button", { name: "Show fewer statistics" }));
  expect(screen.getAllByRole("group")).toHaveLength(4);
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Show more statistics" })).toHaveAttribute("aria-expanded", "false");
});

test("a flipped red face has only one information button and tooltip", async () => {
  render(<FlippableStatistics details={details} descriptions={accountStatisticDescriptions} />);
  fireEvent.focus(screen.getByRole("button", { name: "About Net Deposits" }));
  expect(await screen.findByRole("tooltip")).toHaveTextContent("Lifetime contributions");
  fireEvent.click(screen.getByRole("button", { name: "Show Total Book Cost" }));
  expect(screen.queryByRole("button", { name: "About Net Deposits", hidden: true })).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("button", { name: "About Total Book Cost" })).toBeEnabled());
  fireEvent.focus(screen.getByRole("button", { name: "About Total Book Cost" }));
  expect(await screen.findByRole("tooltip")).toHaveTextContent("Recorded cost of stock shares");
  expect(screen.getAllByRole("tooltip", { hidden: true })).toHaveLength(1);
});


test("larger numeric values and newer dates appear first, with their own colours", () => {
  const values = [
    { title: "Net Deposits", value: 100 }, { title: "Total Book Cost", value: 200 },
    { title: "Realized Profit", value: -20 }, { title: "Realized Gain/Loss", value: -5 },
    { title: "Last Sell Date", value: "—" }, { title: "Last Buy Date", value: "2026-01-02" },
    { title: "Largest Holding", value: "ABC | $1,000.00" }, { title: "Smallest Holding", value: "XYZ | $20.00" },
  ].map(detail => ({ ...detail, colour: "", prefix: undefined, precision: undefined }));
  render(<FlippableStatistics details={values} descriptions={{}} pairs={[["Net Deposits", "Total Book Cost"], ["Realized Profit", "Realized Gain/Loss"], ["Last Sell Date", "Last Buy Date"], ["Largest Holding", "Smallest Holding"]]} />);
  expect(screen.getByRole("group", { name: "Total Book Cost" })).toHaveClass("flip-statistic--red");
  expect(screen.getByRole("group", { name: "Realized Gain/Loss" })).toHaveClass("flip-statistic--green");
  expect(screen.getByRole("group", { name: "Last Buy Date" })).toHaveClass("flip-statistic--red");
  expect(screen.getByRole("group", { name: "Largest Holding" })).toHaveClass("flip-statistic--default");
  fireEvent.click(screen.getByRole("button", { name: "Show Net Deposits" }));
  expect(screen.getByRole("group", { name: "Net Deposits" })).toBeInTheDocument();
});


test("account cash leads eight cards and share counts share one neutral tile", () => {
  render(<FlippableStatistics details={details} descriptions={accountStatisticDescriptions} pairs={accountCardPairs} />);
  expect(screen.getAllByRole("group").map(card => card.getAttribute("aria-label"))).toEqual([
    "Cash Balance", "Total Book Cost", "Realized Profit", "Amount Contributed",
  ]);
  expect(screen.getByRole("group", { name: "Cash Balance" })).toHaveClass("flip-statistic--default");
  fireEvent.click(screen.getByRole("button", { name: "Show more statistics" }));
  expect(screen.getAllByRole("group").map(card => card.getAttribute("aria-label"))).toEqual([
    "Cash Balance", "Total Book Cost", "Realized Profit", "Amount Contributed",
    "Amount Transferred In", "Dividends/Interest Earned", "Total Share(s) Owned", "Largest Holding",
  ]);
  fireEvent.click(screen.getByRole("button", { name: "Show Unique Share(s) Owned" }));
  expect(screen.getByRole("group", { name: "Unique Share(s) Owned" })).toHaveClass("flip-statistic--default");
  expect(screen.getAllByRole("group")).toHaveLength(8);
});
