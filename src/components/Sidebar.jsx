import React from 'react';
import { Layout, Menu, Typography, Button } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  DashboardOutlined,
  BankOutlined,
  CalendarOutlined,
  ScheduleOutlined,
  FormOutlined,
  UnorderedListOutlined,
  FileDoneOutlined,
  TeamOutlined,
  BarChartOutlined,
  LogoutOutlined,
  EnvironmentOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { ROLES, ROLE_LABELS } from '../utils/constants';
import { useAuth } from '../services/useAuth';

const { Sider } = Layout;
const { Title, Text } = Typography;

export const Sidebar = ({ collapsed, isMobile, onCloseMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getMenuItems = () => {
    const role = user?.role;

    if (role === ROLES.STUDENT) {
      return [
        {
          key: '/student/dashboard',
          icon: <DashboardOutlined />,
          label: 'Dashboard',
        },
        {
          key: '/student/venues',
          icon: <BankOutlined />,
          label: 'Venues',
        },
        {
          key: '/student/events',
          icon: <CalendarOutlined />,
          label: 'Events',
        },
        {
          key: '/student/availability',
          icon: <ScheduleOutlined />,
          label: 'Availability',
        },
        {
          key: '/student/calendar',
          icon: <CalendarOutlined />,
          label: 'Calendar',
        },
        {
          key: '/student/notifications',
          icon: <BellOutlined />,
          label: 'Notifications',
        },
      ];
    }

    if (role === ROLES.FACULTY) {
      return [
        {
          key: '/faculty/dashboard',
          icon: <DashboardOutlined />,
          label: 'Dashboard',
        },
        {
          key: '/faculty/request-venue',
          icon: <FormOutlined />,
          label: 'Request Venue',
        },
        {
          key: '/faculty/my-requests',
          icon: <UnorderedListOutlined />,
          label: 'My Requests',
        },
        {
          key: '/faculty/calendar',
          icon: <CalendarOutlined />,
          label: 'Calendar',
        },
        {
          key: '/faculty/notifications',
          icon: <BellOutlined />,
          label: 'Notifications',
        },
      ];
    }

    if (role === ROLES.ADMIN) {
      return [
        {
          key: '/admin/dashboard',
          icon: <DashboardOutlined />,
          label: 'Dashboard',
        },
        {
          key: '/admin/venues',
          icon: <BankOutlined />,
          label: 'Venues',
        },
        {
          key: '/admin/requests',
          icon: <FileDoneOutlined />,
          label: 'Booking Requests',
        },
        {
          key: '/admin/calendar',
          icon: <CalendarOutlined />,
          label: 'Calendar',
        },
        {
          key: '/admin/notifications',
          icon: <BellOutlined />,
          label: 'Notifications',
        },
        {
          key: '/admin/events',
          icon: <EnvironmentOutlined />,
          label: 'Events',
        },
        {
          key: '/admin/users',
          icon: <TeamOutlined />,
          label: 'Users',
        },
        {
          key: '/admin/reports',
          icon: <BarChartOutlined />,
          label: 'Reports',
        },
      ];
    }

    return [];
  };

  const menuItems = getMenuItems();

  const handleMenuClick = ({ key }) => {
    navigate(key);
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={240}
      collapsedWidth={isMobile ? 0 : 80}
      style={{
        height: '100vh',
        position: 'sticky',
        top: 0,
        left: 0,
        background: '#0f172a',
        borderRight: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
      }}
    >
      {/* Brand logo area */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 20px',
          borderBottom: '1px solid #1e293b',
          gap: 12,
        }}
      >
        <BankOutlined style={{ fontSize: 24, color: '#38bdf8' }} />
        {!collapsed && (
          <div style={{ lineHeight: 1.2 }}>
            <Title
              level={5}
              style={{
                color: '#ffffff',
                margin: 0,
                fontWeight: 700,
                letterSpacing: '0.3px',
              }}
            >
              CampusVenue
            </Title>
            <Text style={{ fontSize: 11, color: '#94a3b8' }}>
              {ROLE_LABELS[user?.role] || 'Portal'}
            </Text>
          </div>
        )}
      </div>

      {/* Menu Area */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 12 }}>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            background: 'transparent',
            borderRight: 0,
          }}
        />
      </div>

      {/* Logout button at bottom of sidebar */}
      <div
        style={{
          padding: collapsed ? '12px 8px' : '16px 20px',
          borderTop: '1px solid #1e293b',
        }}
      >
        <Button
          type="text"
          danger
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          block={!collapsed}
          style={{
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          {!collapsed && 'Sign Out'}
        </Button>
      </div>
    </Sider>
  );
};

export default Sidebar;
