import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  List,
  Tag,
  Button,
  Space,
  Typography,
  Badge,
  Tabs,
  Popconfirm,
  message,
  Empty,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  BellOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  CheckOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
  FileTextOutlined,
  BankOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../services/useAuth';
import { notificationService } from '../../services/notificationService';
import { ROLES } from '../../utils/constants';

dayjs.extend(relativeTime);

const { Text, Paragraph } = Typography;

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState(() =>
    notificationService.getUserNotifications(user)
  );
  const [activeTab, setActiveTab] = useState('ALL');

  useEffect(() => {
    const unsubscribe = notificationService.subscribe(() => {
      setNotifications(notificationService.getUserNotifications(user));
    });
    return () => unsubscribe();
  }, [user]);

  // Statistics
  const totalCount = notifications.length;
  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.filter((n) => n.read).length;

  // Filtered notifications
  const filteredList = useMemo(() => {
    return notifications.filter((n) => {
      if (activeTab === 'UNREAD') return !n.read;
      if (activeTab === 'APPROVED') return n.type === 'request_approved';
      if (activeTab === 'REJECTED') return n.type === 'request_rejected';
      if (activeTab === 'REQUESTS')
        return n.type === 'new_request' || n.type === 'request_submitted';
      return true;
    });
  }, [notifications, activeTab]);

  // Action: Mark single notification as read
  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      message.success('Notification marked as read.');
    } catch {
      // Ignored
    }
  };

  // Action: Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      message.success('All notifications marked as read.');
    } catch {
      // Ignored
    }
  };

  // Action: Delete single notification
  const handleDelete = (id) => {
    notificationService.deleteNotification(id);
    message.info('Notification removed.');
  };

  // Action: Clear all read notifications
  const handleClearRead = () => {
    notificationService.clearReadNotifications();
    message.success('Cleared all read notifications.');
  };

  // Helper for notification icon and tag
  const getNotificationVisuals = (type) => {
    switch (type) {
      case 'request_approved':
        return {
          icon: <CheckCircleOutlined style={{ fontSize: 20, color: '#16a34a' }} />,
          tagColor: 'success',
          tagText: 'Approved',
          bg: '#f0fdf4',
          border: '#bbf7d0',
        };
      case 'request_rejected':
        return {
          icon: <CloseCircleOutlined style={{ fontSize: 20, color: '#dc2626' }} />,
          tagColor: 'error',
          tagText: 'Rejected',
          bg: '#fef2f2',
          border: '#fecaca',
        };
      case 'new_request':
        return {
          icon: <FileTextOutlined style={{ fontSize: 20, color: '#7c3aed' }} />,
          tagColor: 'purple',
          tagText: 'New Request',
          bg: '#f5f3ff',
          border: '#ddd6fe',
        };
      case 'request_submitted':
        return {
          icon: <ClockCircleOutlined style={{ fontSize: 20, color: '#2563eb' }} />,
          tagColor: 'processing',
          tagText: 'Under Review',
          bg: '#eff6ff',
          border: '#bfdbfe',
        };
      case 'booking_cancelled':
        return {
          icon: <StopOutlined style={{ fontSize: 20, color: '#d97706' }} />,
          tagColor: 'warning',
          tagText: 'Cancelled',
          bg: '#fffbeb',
          border: '#fde68a',
        };
      default:
        return {
          icon: <BellOutlined style={{ fontSize: 20, color: '#475569' }} />,
          tagColor: 'default',
          tagText: 'Notice',
          bg: '#f8fafc',
          border: '#e2e8f0',
        };
    }
  };

  // Handle click on item action (e.g. view request in portal)
  const handleItemNavigation = async (item) => {
    try {
      await notificationService.markAsRead(item.id);
    } catch {
      // Ignored
    }

    const targetRoute = notificationService.resolveNotificationRoute(item, user?.role);
    navigate(targetRoute);
  };

  const getBreadcrumbs = () => {
    const rolePrefix =
      user?.role === ROLES.ADMIN
        ? { title: 'Admin', path: '/admin/dashboard' }
        : user?.role === ROLES.FACULTY
        ? { title: 'Faculty', path: '/faculty/dashboard' }
        : { title: 'Student', path: '/student/dashboard' };

    return [
      { title: 'Home', path: '/' },
      rolePrefix,
      { title: 'Notifications' },
    ];
  };

  return (
    <div>
      <PageHeader
        title="Notifications Center"
        subtitle="Live alerts for venue reservation submissions, administrative approvals, and schedule cancellations"
        breadcrumbItems={getBreadcrumbs()}
        tags={
          unreadCount > 0 ? (
            <Tag color="red" style={{ fontWeight: 600 }}>
              {unreadCount} Unread
            </Tag>
          ) : (
            <Tag color="green">All Caught Up</Tag>
          )
        }
      />

      {/* Summary KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card bordered size="small" style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: '#64748b' }}>Total Alerts</span>}
              value={totalCount}
              prefix={<BellOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ fontWeight: 700, fontSize: 22 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            bordered
            size="small"
            style={{
              borderRadius: 8,
              borderColor: unreadCount > 0 ? '#fecaca' : '#e2e8f0',
              background: unreadCount > 0 ? '#fff5f5' : '#ffffff',
            }}
          >
            <Statistic
              title={<span style={{ fontSize: 13, color: '#dc2626' }}>Unread Notifications</span>}
              value={unreadCount}
              prefix={<Badge status="error" />}
              valueStyle={{ color: unreadCount > 0 ? '#dc2626' : '#16a34a', fontWeight: 700, fontSize: 22 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card bordered size="small" style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: '#16a34a' }}>Read & Processed</span>}
              value={readCount}
              prefix={<CheckOutlined style={{ color: '#16a34a' }} />}
              valueStyle={{ color: '#16a34a', fontWeight: 700, fontSize: 22 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Notifications Card */}
      <Card
        bordered
        style={{ borderRadius: 10, borderColor: '#e2e8f0' }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              style={{ marginBottom: -16 }}
              items={[
                { key: 'ALL', label: `All (${totalCount})` },
                {
                  key: 'UNREAD',
                  label: (
                    <span>
                      Unread{' '}
                      {unreadCount > 0 && (
                        <Badge count={unreadCount} size="small" style={{ marginLeft: 4 }} />
                      )}
                    </span>
                  ),
                },
                { key: 'REQUESTS', label: 'Requests' },
                { key: 'APPROVED', label: 'Approved' },
                { key: 'REJECTED', label: 'Rejected' },
              ]}
            />

            <Space>
              {unreadCount > 0 && (
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={handleMarkAllAsRead}
                >
                  Mark All as Read
                </Button>
              )}
              {readCount > 0 && (
                <Popconfirm
                  title="Clear read notifications?"
                  description="This will remove all notifications that you have already read."
                  onConfirm={handleClearRead}
                  okText="Clear"
                  cancelText="Cancel"
                >
                  <Button size="small" icon={<DeleteOutlined />}>
                    Clear Read
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </div>
        }
      >
        {filteredList.length === 0 ? (
          <Empty
            description={
              activeTab === 'UNREAD'
                ? 'No unread notifications. You are completely up to date!'
                : 'No notifications found in this category.'
            }
            style={{ padding: '40px 0' }}
          />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={filteredList}
            renderItem={(item) => {
              const visuals = getNotificationVisuals(item.type);
              const relativeTimeString = item.createdAt
                ? dayjs(item.createdAt).fromNow()
                : 'Recently';

              return (
                <List.Item
                  key={item.id}
                  style={{
                    padding: '16px 20px',
                    borderRadius: 8,
                    marginBottom: 10,
                    background: item.read ? '#ffffff' : visuals.bg,
                    border: `1px solid ${item.read ? '#e2e8f0' : visuals.border}`,
                    transition: 'all 0.2s',
                  }}
                  actions={[
                    !item.read && (
                      <Button
                        key="read"
                        type="link"
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={() => handleMarkAsRead(item.id)}
                      >
                        Mark as read
                      </Button>
                    ),
                    item.requestId && (
                      <Button
                        key="view"
                        type="primary"
                        ghost
                        size="small"
                        icon={<ArrowRightOutlined />}
                        onClick={() => handleItemNavigation(item)}
                      >
                        View Request
                      </Button>
                    ),
                    <Button
                      key="delete"
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(item.id)}
                    />,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `1px solid ${visuals.border}`,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        }}
                      >
                        {visuals.icon}
                      </div>
                    }
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {!item.read && (
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: '#2563eb',
                              display: 'inline-block',
                            }}
                          />
                        )}
                        <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                          {item.title}
                        </Text>
                        <Tag color={visuals.tagColor} style={{ fontSize: 11, margin: 0 }}>
                          {visuals.tagText}
                        </Tag>
                        {item.requestId && (
                          <Tag style={{ fontSize: 11, margin: 0 }}>
                            {item.requestId}
                          </Tag>
                        )}
                        <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>
                          {relativeTimeString}
                        </Text>
                      </div>
                    }
                    description={
                      <div style={{ marginTop: 4 }}>
                        <Paragraph
                          style={{
                            margin: 0,
                            color: '#334155',
                            fontSize: 13,
                            lineHeight: 1.5,
                          }}
                        >
                          {item.message}
                        </Paragraph>

                        {item.venue && (
                          <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                            <BankOutlined style={{ marginRight: 4 }} />
                            {item.venue}
                          </div>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default NotificationsPage;
