import { contributionBarColor } from "./ContributionBars";

test("a fully funded account stays green despite floating-point summation noise", () => {
  expect(contributionBarColor({ name: "FHSA", contribution: 32000.00000000002, limit: 32000 })).toBe("#22c55e");
  expect(contributionBarColor({ name: "TFSA", contribution: 62500, limit: 62500 })).toBe("#22c55e");
});

test("a genuine one-cent overage is red and one cent below the limit is purple", () => {
  expect(contributionBarColor({ name: "FHSA", contribution: 32000.01, limit: 32000 })).toBe("#ef4444");
  expect(contributionBarColor({ name: "FHSA", contribution: 31999.99, limit: 32000 })).toBe("#8b5cf6");
});

test("unlimited accounts and an unfunded zero limit stay purple", () => {
  expect(contributionBarColor({ name: "NRSA", contribution: 100000 })).toBe("#8b5cf6");
  expect(contributionBarColor({ name: "FHSA", contribution: 0, limit: 0 })).toBe("#8b5cf6");
});
