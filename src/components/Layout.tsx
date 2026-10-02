import { BulbOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { Button, Layout, Tooltip, Typography } from "antd";
import { ReactNode, useState } from "react";
import { useAppTheme } from "../theme/AppTheme";
import ProfileSelector from "../profiles/ProfileSelector";
import { ProfileContent } from "../profiles/ProfileContext";
import MenuComponent from "./Menu";

const { Header, Content, Footer } = Layout;
const descriptions: Record<string, string> = {
  "Stock Portfolio Dashboard": "Your portfolio at a glance",
  "My Accounts": "Explore your accounts, holdings, and contributions",
  "My Stocks": "Track your holdings and understand their performance",
  "Add Transaction": "Keep your investment history up to date",
};

const LayoutComponent = ({ title, view }: { title: string; view: ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { mode, toggleTheme } = useAppTheme();
  return <Layout className="portfolio-layout">
    <MenuComponent collapsed={collapsed} setCollapsed={setCollapsed} />
    <Layout className={`portfolio-main ${collapsed ? "sidebar-collapsed" : ""}`}>
      <Header className="portfolio-header">
        <div className="portfolio-heading">
          <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(value => !value)} />
          <div><Typography.Title level={3}>{title}</Typography.Title><Typography.Text type="secondary">{descriptions[title]}</Typography.Text></div>
        </div>
        <div className="portfolio-header-actions"><ProfileSelector />
        <Tooltip title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}>
          <Button className="theme-toggle" icon={<BulbOutlined aria-hidden />} onClick={toggleTheme} aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}>
            <span>{mode === "light" ? "Dark mode" : "Light mode"}</span>
          </Button>
        </Tooltip></div>
      </Header>
      <Content className="portfolio-content"><ProfileContent>{view}</ProfileContent></Content>
      <Footer className="portfolio-footer">Stock Portfolio · Your investment record</Footer>
    </Layout>
  </Layout>;
};
export default LayoutComponent;
