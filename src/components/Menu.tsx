import React, { useState } from 'react';
import {
  FolderOpenOutlined,
  SearchOutlined,
  AreaChartOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router';
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
  getItem('Dashboard', '/home', <AreaChartOutlined />),
  getItem('Stock Finder', '/stocks', <SearchOutlined />),

  getItem('TFSA Portfolio', null, <FolderOpenOutlined />, [
    getItem('TFSA Portfolio', null, null, [
      getItem('Overview', '/tfsa/overview'),
      getItem('TD Direct Investing', '/tfsa/di'),
      getItem('TD Easy Trade', '/tfsa/et'),
      getItem('Wealthsimple', '/tfsa/ws'),
    ], 'group'),
  ]),

  getItem('RRSP Portfolio', null, <FolderOpenOutlined />, [
    getItem('RRSP Portfolio', null, null, [
      getItem('Overview', '/rrsp/overview'),
      getItem('TD Easy Trade', '/rrsp/et'),
      getItem('Wealthsimple', '/rrsp/ws'),
      getItem('Canada Life', '/rrsp/cl'),
    ], 'group'),
  ]),
];

const items: MenuItem[] = [
  getItem('Home', '/home', <AreaChartOutlined />),
  getItem('Stock Finder', '/stocks', <SearchOutlined />),
  getItem('TFSA Portfolio', null, <FolderOpenOutlined />, [
    getItem('Overview', '/tfsa/overview'),
    getItem('TD Direct Investing', '/tfsa/di'),
    getItem('TD Easy Trade', '/tfsa/et'),
    getItem('Wealthsimple', '/tfsa/ws'),
  ]),
  getItem('RRSP Portfolio', null, <FolderOpenOutlined />, [
    getItem('Overview', '/rrsp/overview'),
    getItem('TD Easy Trade', '/rrsp/et'),
    getItem('Wealthsimple', '/rrsp/ws'),
    getItem('Canada Life', '/rrsp/cl'),
  ]),
];

const MenuComponent = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  function handleMenuClick (path:string) {
    if (path === null || path === "") {
      return;
    }
    return navigate(path);
  }
  
  return (
    <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div style={{ height: 8, margin: 16 }} />
        <Menu
          defaultSelectedKeys={['1']}
          defaultOpenKeys={['sub1']}
          mode="inline"
          theme="dark"
          items={collapsed ? itemsCollapsed  : items}
          onClick={(item) => handleMenuClick(item.key)}
        />
    </Sider>
  );
};

export default MenuComponent;