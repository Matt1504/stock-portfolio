import { Layout, Menu } from "antd";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  AreaChartOutlined,
  FolderOpenOutlined,
  PlusOutlined,
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

const items: MenuItem[] = [
  getItem("Dashboard", "/home", <AreaChartOutlined />),
  getItem("My Accounts", "/myaccounts", <FolderOpenOutlined />),
  getItem("My Stocks", "/mystocks", <StockOutlined />),
  getItem("Add Transaction", "/add", <PlusOutlined />),
];

type MProps = {
  collapsed: boolean, 
  setCollapsed: Function,
}

const MenuComponent = (props: MProps) => {
  const { collapsed, setCollapsed } = props;
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  function handleMenuClick(path: string) {
    if (path === null || path === "") {
      return;
    }
    const profile = new URLSearchParams(search).get("profile");
    return navigate({ pathname: path, search: profile ? new URLSearchParams({ profile }).toString() : "" });
  }

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
        onClick={(item) => handleMenuClick(item.key)}
      />
    </Sider>
  );
};

export default MenuComponent;
