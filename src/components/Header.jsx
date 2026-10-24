import React, { useState, useEffect } from 'react';
import {
  Layout,
  Badge,
  Avatar,
  Dropdown,
  Space,
  Typography,
  Button,
  List,
  Tag,
  Tooltip,
  Empty,
  message,
} from 'antd';
import {
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  BankOutlined,
  IdcardOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  FileTextOutlined,
  CheckOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/useAuth';
import { ROLES, ROLE_LABELS } from '../utils/constants';
import { notificationService } from '../services/notificationService';

dayjs.extend(relativeTime);

const { Header: AntHeader } = Layout;
const { Text } = Typography;

export const Header = ({ collapsed, setCollapsed, isMobile }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState(() =>
    notificationService.getUserNotifications(user)
  );
  const [unreadCount, setUnreadCount] = useState(() =>
    notificationService.getUnreadCount(user)
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      setNotifications(notificationService.getUserNotifications(user));
      setUnreadCount(notificationService.getUnreadCount(user));
    };

    update();
    const unsubscribe = notificationService.subscribe(update);
    return () => unsubscribe();
  }, [user]);

  const handleLogout = () => {
    logout();
    message.info('Logged out successfully.');
    navigate('/login', { replace: true });
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      message.success('Notification marked as read.');
    } catch {
      // Ignored
    }
  };

  const handleMarkAllAsRead = async (e) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.markAllAsRead();
      message.success('All notifications marked as read.');
    } catch {
      // Ignored
    }
  };

  const handleNotificationClick = async (item) => {
    try {
      await notificationService.markAsRead(item.id);
    } catch {
      // Ignored
    }
    setDropdownOpen(false);

    const targetRoute = notificationService.resolveNotificationRoute(item, user?.role);
    navigate(targetRoute);
  };

  const handleViewAllNotifications = () => {
    setDropdownOpen(false);
    const rolePath = user?.role || 'student';
    navigate(`/${rolePath}/notifications`);
  };

  const getRoleTagColor = (role) => {
    switch (role) {
      case ROLES.ADMIN:
        return 'purple';
      case ROLES.FACULTY:
        return 'blue';
      case ROLES.STUDENT:
        return 'green';
      default:
        return 'default';
    }
  };

  const getVisualsForType = (type) => {
    switch (type) {
      case 'request_approved':
        return {
          icon: <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 16 }} />,
          bg: '#f0fdf4',
          tag: 'Approved',
          tagColor: 'success',
        };
      case 'request_rejected':
        return {
          icon: <CloseCircleOutlined style={{ color: '#dc2626', fontSize: 16 }} />,
          bg: '#fef2f2',
          tag: 'Rejected',
          tagColor: 'error',
        };
      case 'new_request':
        return {
          icon: <FileTextOutlined style={{ color: '#7c3aed', fontSize: 16 }} />,
          bg: '#f5f3ff',
          tag: 'New Request',
          tagColor: 'purple',
        };
      case 'booking_cancelled':
        return {
          icon: <StopOutlined style={{ color: '#d97706', fontSize: 16 }} />,
          bg: '#fffbeb',
          tag: 'Cancelled',
          tagColor: 'warning',
        };
      case 'request_submitted':
        return {
          icon: <ClockCircleOutlined style={{ color: '#2563eb', fontSize: 16 }} />,
          bg: '#eff6ff',
          tag: 'Submitted',
          tagColor: 'processing',
        };
      default:
        return {
          icon: <BellOutlined style={{ color: '#64748b', fontSize: 16 }} />,
          bg: '#f8fafc',
          tag: 'Alert',
          tagColor: 'default',
        };
    }
  };

  const userMenuItems = [
    {
      key: 'user-info',
      disabled: true,
      label: (
        <div style={{ padding: '6px 4px', minWidth: 220 }}>
          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>
            {user?.name || 'User'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {user?.email || 'No email provided'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <Tag color={getRoleTagColor(user?.role)} style={{ margin: 0, fontWeight: 500 }}>
              {ROLE_LABELS[user?.role] || user?.role}
            </Tag>
            {(user?.userId || user?.id) && (
              <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 2 }}>
                <IdcardOutlined /> {user?.userId || user?.id}
              </span>
            )}
          </div>
          {user?.department && (
            <div style={{ fontSize: 11, color: '#475569', marginTop: 6, fontStyle: 'italic' }}>
              {user.department}
            </div>
          )}
        </div>
      ),
    },
    {
      type: 'divider',
    },
    {
      key: 'view-notifications',
      icon: <BellOutlined style={{ color: '#1677ff' }} />,
      label: 'Notifications',
      onClick: handleViewAllNotifications,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined style={{ color: '#ef4444' }} />,
      label: <span style={{ color: '#ef4444', fontWeight: 500 }}>Sign Out</span>,
      onClick: handleLogout,
    },
  ];

  const notificationDropdownContent = (
    <div
      style={{
        width: 360,
        maxWidth: '92vw',
        background: '#ffffff',
        borderRadius: 12,
        boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.15), 0 4px 10px -2px rgba(15, 23, 42, 0.05)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #f1f5f9',
          background: '#f8fafc',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
            Notifications
          </Text>
          {unreadCount > 0 ? (
            <Badge count={unreadCount} size="small" style={{ backgroundColor: '#ef4444' }} />
          ) : (
            <Tag color="green" style={{ fontSize: 11, margin: 0 }}>
              All read
            </Tag>
          )}
        </div>

        {unreadCount > 0 && (
          <Button
            type="link"
            size="small"
            icon={<CheckOutlined />}
            onClick={handleMarkAllAsRead}
            style={{ fontSize: 12, padding: 0, height: 'auto', color: '#2563eb' }}
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No notifications yet"
            style={{ padding: '24px 0' }}
          />
        ) : (
          <List
            size="small"
            dataSource={notifications.slice(0, 6)}
            renderItem={(item) => {
              const visuals = getVisualsForType(item.type);
              const timeString = item.createdAt ? dayjs(item.createdAt).fromNow() : 'Recently';

              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    background: item.read ? '#ffffff' : '#f8faff',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = item.read ? '#f8fafc' : '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = item.read ? '#ffffff' : '#f8faff';
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {/* Visual Icon */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: visuals.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {visuals.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: item.read ? 500 : 700,
                            color: item.read ? '#334155' : '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.title}
                        </span>

                        {!item.read && (
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              backgroundColor: '#2563eb',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: '#64748b',
                          marginTop: 2,
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {item.message}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: 6,
                        }}
                      >
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{timeString}</span>

                        {!item.read && (
                          <Tooltip title="Mark as read">
                            <Button
                              type="text"
                              size="small"
                              icon={<CheckOutlined style={{ fontSize: 11 }} />}
                              onClick={(e) => handleMarkAsRead(item.id, e)}
                              style={{
                                height: 20,
                                padding: '0 6px',
                                fontSize: 11,
                                color: '#64748b',
                              }}
                            >
                              Read
                            </Button>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid #f1f5f9',
          background: '#f8fafc',
          textAlign: 'center',
        }}
      >
        <Button
          type="link"
          block
          size="small"
          onClick={handleViewAllNotifications}
          style={{
            fontWeight: 600,
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          View All Notifications <ArrowRightOutlined style={{ fontSize: 12 }} />
        </Button>
      </div>
    </div>
  );

  return (
    <AntHeader
      style={{
        padding: '0 20px',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e5e7eb',
        height: 64,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed(!collapsed)}
          style={{
            fontSize: '16px',
            width: 40,
            height: 40,
            color: '#1f2937',
          }}
          aria-label="Toggle sidebar"
        />

        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BankOutlined style={{ fontSize: 20, color: '#1677ff' }} />
            <Text strong style={{ color: '#003a8c', fontSize: 16 }}>
              CampusVenue
            </Text>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Notification Icon with Ant Design Dropdown */}
        <Dropdown
          dropdownRender={() => notificationDropdownContent}
          trigger={['click']}
          open={dropdownOpen}
          onOpenChange={setDropdownOpen}
          placement="bottomRight"
        >
          <Badge count={unreadCount} overflowCount={99} size="small" offset={[-2, 4]}>
            <Button
              type="text"
              shape="circle"
              icon={<BellOutlined style={{ fontSize: 19, color: unreadCount > 0 ? '#1e293b' : '#64748b' }} />}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                backgroundColor: dropdownOpen ? '#f1f5f9' : 'transparent',
              }}
              aria-label="Notifications"
            />
          </Badge>
        </Dropdown>

        {/* User Profile Area */}
        <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
          <Space
            style={{
              cursor: 'pointer',
              padding: '4px 10px',
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              transition: 'background-color 0.2s',
            }}
          >
            <Avatar
              style={{
                backgroundColor:
                  user?.role === ROLES.ADMIN
                    ? '#722ed1'
                    : user?.role === ROLES.FACULTY
                    ? '#0958d9'
                    : '#1677ff',
              }}
              icon={<UserOutlined />}
              size="small"
            />
            {!isMobile && (
              <div style={{ lineHeight: 1.25, textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                  {user?.name || 'User'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginTop: 1 }}>
                  <span style={{ color: '#0958d9', fontWeight: 500 }}>
                    {ROLE_LABELS[user?.role] || user?.role || 'Guest'}
                  </span>
                  {(user?.userId || user?.id) && (
                    <span style={{ color: '#94a3b8' }}>• {user?.userId || user?.id}</span>
                  )}
                </div>
              </div>
            )}
          </Space>
        </Dropdown>
      </div>
    </AntHeader>
  );
};

export default Header;
