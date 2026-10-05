import { ApolloLink, Observable } from "@apollo/client";
import { useLayoutEffect } from "react";

// Opt in per browser tab; never log variables, holdings, amounts or IDs.
export function performanceDiagnosticsEnabled() {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("performance") === "1";
}

function report(phase: string, label: string, started: number, rows?: number) {
  console.debug("[portfolio performance]", JSON.stringify({ phase, label, rows, milliseconds: Number((performance.now() - started).toFixed(2)) }));
}

export function startCalculationTiming(label: string, rows: number) {
  if (!performanceDiagnosticsEnabled()) return () => {};
  const started = performance.now();
  return () => report("calculation", label, started, rows);
}

export function useRenderTiming(label: string) {
  const enabled = performanceDiagnosticsEnabled();
  const started = enabled ? performance.now() : 0;
  useLayoutEffect(() => {
    // Measures this subtree's render/commit through its layout effect, not
    // browser paint or exclusive React CPU time; abandoned renders don't log.
    if (enabled) report("render-to-layout", label, started);
  });
}

export const performanceDiagnosticsLink = new ApolloLink((operation, forward) => {
  if (!performanceDiagnosticsEnabled()) return forward(operation);
  return new Observable(observer => {
    const started = performance.now();
    const subscription = forward(operation).subscribe({
      next: result => {
        report("network", operation.operationName || "anonymous query", started);
        observer.next(result);
      },
      error: error => { report("network-error", operation.operationName || "anonymous query", started); observer.error(error); },
      complete: () => observer.complete(),
    });
    return () => subscription.unsubscribe();
  });
});
