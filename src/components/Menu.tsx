import { Layout, Menu } from "antd";
import React, { useState } from "react";
import { useNavigate } from "react-router";

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

const items: MenuItem[] = [
  getItem("Dashboard", "/home", <AreaChartOutlined />),
  getItem("Stock Finder", "/stocks", <SearchOutlined />),
  getItem("My Accounts", "/myaccounts", <FolderOpenOutlined />),
  getItem("My Stocks", "/mystocks", <StockOutlined />),
  getItem("Add Transaction", "/add", <PlusOutlined />),
];

const MenuComponent = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  function handleMenuClick(path: string) {
    if (path === null || path === "") {
      return;
    }
    return navigate(path);
  }

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={(value) => setCollapsed(value)}
    >
      <div style={{ height: 8, margin: 16 }} />
      <Menu
        defaultSelectedKeys={["1"]}
        defaultOpenKeys={["sub1"]}
        mode="inline"
        theme="dark"
        items={items}
        onClick={(item) => handleMenuClick(item.key)}
      />
    </Sider>
  );
};

export default MenuComponent;
