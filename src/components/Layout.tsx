import { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { Layout, theme } from "antd";
import MenuComponent from "./Menu";
import Title from "./Title";

const { Header, Content, Footer } = Layout;

type LcProps = {
  title: String;
  view: ReactNode;
};

const titleDict: {[dir:string]: string} = {
  "di": "TD Direct Investing",
  "et": "TD Easy Trade",
  "ws": "Wealthsimple",
  "cl": "Canada Life",
  "overview": "",
  "": "",
};

const LayoutComponent = (props: LcProps) => {
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const { title, view } = props;
  const { account, platform } = useParams();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <MenuComponent />
      <Layout className="site-layout">
        <Header
          style={{ height: 48, padding: 0, background: colorBgContainer }}
        >
          <Title title={`${account ? `${account.toUpperCase()} ${titleDict[platform ?? ""]} ` : ''}${title}`} />
        </Header>
        <Content style={{ margin: 16, padding: 24 }}>{view}</Content>
        <Footer style={{ textAlign: "center" }}>
          Stock Portfolio ©2023 Created by Matthew Lee
        </Footer>
      </Layout>
    </Layout>
  );
};

export default LayoutComponent;
