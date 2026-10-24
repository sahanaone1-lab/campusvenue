import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Typography, Button, Space } from 'antd';
import {
  BankOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  ArrowRightOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { MOCK_STUDENT_EVENTS } from '../../data/mockData';
import { venueService } from '../../services/venueService';
import { facultyVenueService } from '../../services/facultyVenueService';

const { Text } = Typography;

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [venues, setVenues] = useState(() => venueService.getVenues());
  const [requests, setRequests] = useState(() => facultyVenueService.getRequests());

  useEffect(() => {
    venueService.fetchVenues().then((v) => {
      if (v) setVenues(v);
    }).catch(() => {});

    facultyVenueService.fetchAdminRequests().then((r) => {
      if (r) setRequests(r);
    }).catch(() => {});

    const unsubVenues = venueService.subscribe((updated) => {
      setVenues(updated);
    });
    const unsubRequests = facultyVenueService.subscribe((updated) => {
      setRequests(updated);
    });
    return () => {
      unsubVenues();
      unsubRequests();
    };
  }, []);

  const totalVenuesCount = venues.length;
  const pendingRequestsCount = requests.filter((r) => r.status === 'Pending').length;
  const approvedBookingsCount = requests.filter((r) => r.status === 'Approved').length;
  const upcomingEventsCount = MOCK_STUDENT_EVENTS.length;

  const adminRequestColumns = [
    {
      title: 'Req ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id) => <Text code strong>{id}</Text>,
    },
    {
      title: 'Faculty / Dept',
      key: 'facultyDept',
      width: 200,
      render: (_, record) => (
        <div>
          <Text strong style={{ color: '#1e293b' }}>
            {record.facultyName || record.requestedBy || 'Faculty Member'}
          </Text>
          <div style={{ fontSize: 11, color: '#64748b' }}>{record.department}</div>
        </div>
      ),
    },
    {
      title: 'Event Title',
      dataIndex: 'eventTitle',
      key: 'eventTitle',
      width: 220,
      render: (text) => <span style={{ color: '#475569' }}>{text}</span>,
    },
    {
      title: 'Venue',
      dataIndex: 'venue',
      key: 'venue',
      width: 160,
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Date & Time Slot',
      key: 'schedule',
      width: 150,
      render: (_, record) => (
        <div>
          <div>{record.date}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.timeSlot}</Text>
        </div>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      render: (priority) => (
        <Tag color={priority === 'High' ? 'volcano' : 'default'}>{priority}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const color = status === 'Approved' ? 'success' : 'processing';
        return <Tag color={color}>{status}</Tag>;
      },
    },
  ];

  const venueColumns = [
    {
      title: 'Venue',
      dataIndex: 'name',
      key: 'name',
      width: 170,
      render: (name) => <Text strong>{name}</Text>,
    },
    {
      title: 'Block',
      key: 'block',
      width: 140,
      render: (_, r) => r.building || r.block || 'Main Campus',
    },
    {
      title: 'Capacity',
      dataIndex: 'capacity',
      key: 'capacity',
      width: 90,
      render: (c) => `${c} pax`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status) => {
        const color = status === 'Active' ? 'green' : status === 'Inactive' ? 'red' : 'gold';
        return <Tag color={color}>{status}</Tag>;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Estate & Facility Administration Dashboard"
        subtitle="Campus-wide venue allocation, booking approvals, and facility management overview"
        breadcrumbItems={[
          { title: 'Home', path: '/' },
          { title: 'Admin', path: '/admin/dashboard' },
          { title: 'Dashboard' },
        ]}
        extra={
          <Space>
            <Button
              type="primary"
              icon={<SettingOutlined />}
              onClick={() => navigate('/admin/venues')}
            >
              Manage Venues
            </Button>
          </Space>
        }
      />

      {/* Requirement 12: Admin dashboard sample cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 14 }}>Total Venues</span>}
              value={totalVenuesCount}
              prefix={<BankOutlined style={{ color: '#1677ff', marginRight: 8 }} />}
              valueStyle={{ color: '#0f172a', fontWeight: 700 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
              Campus infrastructure
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 14 }}>Pending Requests</span>}
              value={pendingRequestsCount}
              prefix={<ClockCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />}
              valueStyle={{ color: '#d97706', fontWeight: 700 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
              Requires admin decision
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 14 }}>Approved Bookings</span>}
              value={approvedBookingsCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />}
              valueStyle={{ color: '#16a34a', fontWeight: 700 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
              Confirmed college schedules
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 14 }}>Upcoming Events</span>}
              value={upcomingEventsCount}
              prefix={<CalendarOutlined style={{ color: '#003a8c', marginRight: 8 }} />}
              valueStyle={{ color: '#003a8c', fontWeight: 700 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
              Active on public calendar
            </div>
          </Card>
        </Col>
      </Row>

      {/* Booking Requests Table */}
      <div style={{ marginTop: 24 }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} xl={16}>
            <Card
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>
                    Recent Booking Approval Requests
                  </span>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => navigate('/admin/requests')}
                    icon={<ArrowRightOutlined />}
                  >
                    View All
                  </Button>
                </div>
              }
              bordered
              style={{ borderRadius: 8, borderColor: '#e2e8f0' }}
            >
              <Table
                dataSource={requests.slice(0, 5)}
                columns={adminRequestColumns}
                rowKey="id"
                scroll={{ x: 950 }}
                pagination={false}
                size="middle"
              />
            </Card>
          </Col>

          <Col xs={24} xl={8}>
            <Card
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>Venue Inventory</span>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => navigate('/admin/venues')}
                    icon={<ArrowRightOutlined />}
                  >
                    Configure
                  </Button>
                </div>
              }
              bordered
              style={{ borderRadius: 8, borderColor: '#e2e8f0' }}
            >
              <Table
                dataSource={venues.slice(0, 5)}
                columns={venueColumns}
                rowKey="id"
                scroll={{ x: 490 }}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default AdminDashboard;
