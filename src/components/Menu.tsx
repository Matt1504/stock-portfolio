import React, { useState } from 'react';
import {
  AppstoreOutlined,
  DesktopOutlined,
  MailOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Layout, Menu } from 'antd';

const { Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key?: React.Key | null,
  icon?: React.ReactNode,
  children?: MenuItem[],
  type?: 'group',
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
    type,
  } as MenuItem;
}

const itemsCollapsed: MenuItem[] = [
  getItem('Home', '1', <PieChartOutlined />),
  getItem('Stock Finder', '2', <DesktopOutlined />),

  getItem('TFSA Portfolio', 'sub1', <MailOutlined />, [
    getItem('TFSA Portfolio', null, null, [
      getItem('Overview', '3'),
      getItem('TD Direct Investing', '4'),
      getItem('TD Easy Trade', '5'),
      getItem('Wealthsimple', '6'),
    ], 'group'),
  ]),

  getItem('RRSP Portfolio', 'sub2', <AppstoreOutlined />, [
    getItem('RRSP Portfolio', null, null, [
      getItem('RRSP Overview', '7'),
      getItem('TD Easy Trade', '8'),
      getItem('Wealthsimple', '9  '),
    ], 'group'),
  ]),
];

const items: MenuItem[] = [
  getItem('Home', '1', <PieChartOutlined />),
  getItem('Stock Finder', '2', <DesktopOutlined />),
  getItem('TFSA Portfolio', 'sub1', <MailOutlined />, [
    getItem('Overview', '3'),
    getItem('TD Direct Investing', '4'),
    getItem('TD Easy Trade', '5'),
    getItem('Wealthsimple', '6'),
  ]),
  getItem('RRSP Portfolio', 'sub2', <AppstoreOutlined />, [
    getItem('RRSP Overview', '7'),
    getItem('TD Easy Trade', '8'),
    getItem('Wealthsimple', '9  '),
  ]),
];

const MenuComponent = () => {
  const [collapsed, setCollapsed] = useState(false);
  
  return (
    <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div style={{ height: 8, margin: 16 }} />
        <Menu
          defaultSelectedKeys={['1']}
          defaultOpenKeys={['sub1']}
          mode="inline"
          theme="dark"
          items={collapsed ? itemsCollapsed  : items}
        />
    </Sider>
  );
};

export default MenuComponent;