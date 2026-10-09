import { Layout, Menu } from "antd";
import React from "react";
import { Link, useLocation } from "react-router-dom";

import {
  AreaChartOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  SearchOutlined,
  StockOutlined
} from "@ant-design/icons";

import type { MenuProps } from "antd";
const { Sider } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

function getItem(
  label: React.ReactNode,
  key?: React.Key | null,
  icon?: React.ReactNode,
  children?: MenuItem[],
  type?: "group"
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
    type,
  } as MenuItem;
}

type MProps = {
  collapsed: boolean, 
  setCollapsed: Function,
}

const MenuComponent = (props: MProps) => {
  const { collapsed, setCollapsed } = props;
  const { pathname, search } = useLocation();
  const profile = new URLSearchParams(search).get("profile");
  const profileSearch = profile ? `?${new URLSearchParams({ profile }).toString()}` : "";
  const navItem = (label: string, path: string, icon: React.ReactNode) =>
    getItem(<Link to={`${path}${profileSearch}`}>{label}</Link>, path, icon);
  const items: MenuItem[] = [
    navItem("Dashboard", "/home", <AreaChartOutlined />),
    navItem("My Accounts", "/myaccounts", <FolderOpenOutlined />),
    navItem("My Stocks", "/mystocks", <StockOutlined />),
    navItem("Transactions", "/transactions", <SearchOutlined />),
    navItem("Add Transaction", "/add", <PlusOutlined />),
  ];

  return (
    <Sider
      className="portfolio-sidebar"
      width={224}
      collapsedWidth={72}
      breakpoint="lg"
      style={{
        overflow: "auto",
        height: "100vh",
        position: "fixed",
        left: 0,
      }}
      collapsible
      collapsed={collapsed}
      onCollapse={(value) => setCollapsed(value)}
    >
      <div className="portfolio-brand"><span className="portfolio-brand-mark"><StockOutlined /></span>{!collapsed && <div><strong>Stock Portfolio</strong><span>INVESTMENT TRACKER</span></div>}</div>
      <Menu
        selectedKeys={[pathname]}
        mode="inline"
        theme="dark"
        items={items}
      />
    </Sider>
  );
};

export default MenuComponent;
