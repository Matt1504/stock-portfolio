import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import MenuComponent from "./Menu";

function Location() {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{pathname}{search}</div>;
}

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }) });
});

test("sidebar uses links that retain the profile and respect modified clicks", () => {
  render(<MemoryRouter initialEntries={["/home?profile=owner"]}>
    <MenuComponent collapsed={false} setCollapsed={() => {}} /><Location />
  </MemoryRouter>);
  const link = screen.getByRole("link", { name: "My Accounts" });
  expect(link).toHaveAttribute("href", "/myaccounts?profile=owner");
  fireEvent.click(link, { ctrlKey: true });
  expect(screen.getByTestId("location")).toHaveTextContent("/home?profile=owner");
  fireEvent.click(link);
  expect(screen.getByTestId("location")).toHaveTextContent("/myaccounts?profile=owner");
  expect(link.closest("li")).toHaveClass("ant-menu-item-selected");
});
