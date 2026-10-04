import { render, screen } from "@testing-library/react";
import { RenderActiveShape } from "./PieChartShape";

test("distribution groups both the amount and share count", () => {
  render(<svg><RenderActiveShape cx={100} cy={100} midAngle={0} innerRadius={20} outerRadius={40} startAngle={0} endAngle={90} fill="red" payload={{ name: "Holding", label: "1234.56789" }} percent={1} value={12345.6} /></svg>);
  expect(screen.getByText("$12,345.60 or 1,234.5679 Share(s)")).toBeInTheDocument();
});

test.each([
  ["23", "$100.00 or 23 Share(s)"],
  ["23.123456789", "$100.00 or 23.1235 Share(s)"],
  ["23.0000000001", "$100.00 or 23 Share(s)"],
  [undefined, "$100.00"],
])("distribution formats shares without changing the underlying value: %s", (label, expected) => {
  render(<svg><RenderActiveShape cx={100} cy={100} midAngle={0} innerRadius={20} outerRadius={40} startAngle={0} endAngle={90} fill="red" payload={{ name: "Holding", label }} percent={1} value={100} /></svg>);
  expect(screen.getByText(expected)).toBeInTheDocument();
});
