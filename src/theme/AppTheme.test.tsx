import { fireEvent, render, screen } from "@testing-library/react";
import AppTheme, { useAppTheme } from "./AppTheme";
import { useTheme } from "@mui/material";
import { theme } from "antd";

function Controls() {
  const { mode, toggleTheme } = useAppTheme();
  const mui = useTheme();
  const { token } = theme.useToken();
  return <><button onClick={toggleTheme}>Toggle theme</button><output data-testid="theme">{mode}:{mui.palette.mode}:{token.colorBgContainer}</output></>;
}
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }) });
});
test("toggle updates both libraries and persists through a remount", () => {
  const view = render(<AppTheme><Controls /></AppTheme>);
  expect(screen.getByTestId("theme")).toHaveTextContent("light:light:#ffffff");
  fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));
  expect(screen.getByTestId("theme")).toHaveTextContent("dark:dark:#192532");
  expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  expect(localStorage.getItem("stock-portfolio-theme")).toBe("dark");
  view.unmount();
  render(<AppTheme><Controls /></AppTheme>);
  expect(screen.getByTestId("theme")).toHaveTextContent("dark:dark");
});
test("uses system preference when no saved selection exists", () => {
  window.matchMedia = (() => ({ matches: true })) as unknown as typeof window.matchMedia;
  render(<AppTheme><Controls /></AppTheme>);
  expect(screen.getByTestId("theme")).toHaveTextContent("dark:dark");
});
test("saved preference overrides system and changes from other tabs synchronize", () => {
  localStorage.setItem("stock-portfolio-theme", "light");
  render(<AppTheme><Controls /></AppTheme>);
  fireEvent(window, new StorageEvent("storage", { key: "stock-portfolio-theme", newValue: "dark" }));
  expect(screen.getByTestId("theme")).toHaveTextContent("dark:dark");
});
