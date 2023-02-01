import { ReactNode } from 'react';
import { Layout, theme } from 'antd';
import MenuComponent from './Menu';
import Title from './Title';

const { Header, Content, Footer } = Layout;

type LcProps = {
    title: String,
    children: ReactNode,
};

const LayoutComponent = (props: LcProps) => {
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const {title, children} = props;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <MenuComponent/>
      <Layout className="site-layout">
        <Header style={{ height: 48, padding: 0, background: colorBgContainer }}>
          <Title title={title}/>
        </Header>
        <Content style={{ margin: 16, padding: 24 }}>
          {children}
        </Content>
        <Footer style={{ textAlign: 'center' }}>Stock Portfolio ©2023 Created by Matthew Lee</Footer>
      </Layout>
    </Layout>
  );
};

export default LayoutComponent;