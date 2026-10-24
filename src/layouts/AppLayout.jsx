import React, { useState, useEffect } from 'react';
import { Layout, Drawer } from 'antd';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const { Content } = Layout;

export const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggle = () => {
    if (isMobile) {
      setMobileDrawerVisible(!mobileDrawerVisible);
    } else {
      setCollapsed(!collapsed);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sidebar collapsed={collapsed} isMobile={false} />
      )}

      {/* Mobile Drawer Sidebar */}
      {isMobile && (
        <Drawer
          placement="left"
          open={mobileDrawerVisible}
          onClose={() => setMobileDrawerVisible(false)}
          styles={{ body: { padding: 0, background: '#0f172a' } }}
          width={240}
        >
          <Sidebar
            collapsed={false}
            isMobile={true}
            onCloseMobile={() => setMobileDrawerVisible(false)}
          />
        </Drawer>
      )}

      <Layout style={{ background: '#f5f7fa' }}>
        <Header
          collapsed={isMobile ? !mobileDrawerVisible : collapsed}
          setCollapsed={handleToggle}
          isMobile={isMobile}
        />
        <Content
          style={{
            padding: isMobile ? '16px' : '24px',
            margin: 0,
            minHeight: 280,
            overflowX: 'hidden',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
