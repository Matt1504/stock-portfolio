import { ApolloClient, ApolloLink, gql, InMemoryCache, Observable } from "@apollo/client";
import { render } from "@testing-library/react";
import { performanceDiagnosticsLink, startCalculationTiming, useRenderTiming } from "./performanceDiagnostics";

let debug: jest.SpyInstance;
beforeEach(() => { debug = jest.spyOn(console, "debug").mockImplementation(() => {}); window.history.replaceState({}, "", "/"); });
afterEach(() => { debug.mockRestore(); window.history.replaceState({}, "", "/"); });

test("diagnostics stay silent by default", () => {
  startCalculationTiming("statistics", 250)();
  expect(debug).not.toHaveBeenCalled();
});

test("opt-in calculation and committed-render timings report counts without data", () => {
  window.history.replaceState({}, "", "/?performance=1");
  startCalculationTiming("statistics", 250)();
  const Probe = () => { useRenderTiming("details"); return null; };
  render(<Probe />);
  expect(debug.mock.calls.map(call => JSON.parse(call[1]).phase)).toEqual(["calculation", "render-to-layout"]);
  expect(JSON.parse(debug.mock.calls[0][1])).toEqual({ phase: "calculation", label: "statistics", rows: 250, milliseconds: expect.any(Number) });
});

test("network timing preserves results and omits query variables", async () => {
  window.history.replaceState({}, "", "/?performance=1");
  const terminal = new ApolloLink(() => new Observable(observer => { observer.next({ data: { hello: "ok" } }); observer.complete(); }));
  const client = new ApolloClient({ cache: new InMemoryCache(), link: performanceDiagnosticsLink.concat(terminal) });
  const result = await client.query({ query: gql`query Diagnostics($secret: String) { hello }`, variables: { secret: "private" }, fetchPolicy: "no-cache" });
  expect(result.data).toEqual({ hello: "ok" });
  expect(JSON.parse(debug.mock.calls[0][1]).phase).toBe("network");
  expect(JSON.stringify(debug.mock.calls)).not.toContain("private");
});
