import { formatNumber, formatNumberAsCurrency } from "./utils";

test("amounts have grouping separators and retain two decimal places", () => {
  expect(formatNumberAsCurrency(12345.6)).toBe("$12,345.60");
  expect(formatNumberAsCurrency(-12345.6, false)).toBe("-12,345.60");
  expect(formatNumber(0, 2, 2)).toBe("0.00");
  expect(formatNumberAsCurrency(undefined)).toBe("-");
});

test("shares keep up to four decimals and exchange rates retain their precision", () => {
  expect(formatNumber(1234)).toBe("1,234");
  expect(formatNumber(1234.56789)).toBe("1,234.5679");
  expect(formatNumber(1234.5)).toBe("1,234.5");
  expect(formatNumber(1.390618, 8)).toBe("1.390618");
});
