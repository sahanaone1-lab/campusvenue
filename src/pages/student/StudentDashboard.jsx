import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Typography, Button, Space, Badge } from 'antd';
import {
  BankOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  FieldTimeOutlined,
  ArrowRightOutlined,
  EyeOutlined,
  EnvironmentOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { STUDENT_EVENTS } from '../../data/studentData';
import { venueService } from '../../services/venueService';

const { Text } = Typography;

export const StudentDashboard = () => {
  const navigate = useNavigate();
  const [venues, setVenues] = useState(() => venueService.getActiveVenues());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    venueService
      .fetchVenues()
      .then(() => {
        if (mounted) {
          setVenues(venueService.getActiveVenues());
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    const unsub = venueService.subscribe(() => {
      if (mounted) setVenues(venueService.getActiveVenues());
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const totalVenuesCount = venues.length;
  const availableTodayCount = venues.filter((v) => v.currentStatus === 'Available' || v.is_active).length;
  const upcomingEventsCount = STUDENT_EVENTS.filter((e) => e.status === 'Upcoming').length;
  const occupiedVenuesCount = venues.filter((v) => v.currentStatus === 'Occupied').length;

  const occupiedVenuesList = venues.filter((v) => v.currentStatus === 'Occupied');

  const eventColumns = [
    {
      title: 'Event Name',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (name, record) => (
        <div>
          <Text strong style={{ color: '#0f172a', display: 'block' }}>
            {name}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.category}
          </Text>
        </div>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 170,
      render: (dept) => (
        <Text style={{ color: '#475569', fontSize: 13 }}>
          {dept}
        </Text>
      ),
    },
    {
      title: 'Venue',
      dataIndex: 'venue',
      key: 'venue',
      width: 170,
      render: (venue) => (
        <Tag color="geekblue" icon={<BankOutlined />}>
          {venue}
        </Tag>
      ),
    },
    {
      title: 'Date & Time',
      key: 'dateTime',
      width: 150,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.date}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.startTime} - {record.endTime}
          </Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status) => {
        const color = status === 'Ongoing' ? 'processing' : 'success';
        return <Badge status={color} text={status} />;
      },
    },
  ];

  const venueSnapshotColumns = [
    {
      title: 'Venue Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name, record) => (
        <div>
          <Text strong style={{ color: '#1e293b' }}>
            {name}
          </Text>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            <EnvironmentOutlined style={{ marginRight: 4 }} />
            {record.location}
          </div>
        </div>
      ),
    },
    {
      title: 'Capacity',
      dataIndex: 'capacity',
      key: 'capacity',
      width: 100,
      render: (cap) => `${cap} seats`,
    },
    {
      title: 'Status Today',
      dataIndex: 'currentStatus',
      key: 'currentStatus',
      width: 120,
      render: (status) => {
        const color =
          status === 'Available' ? 'success' : status === 'Occupied' ? 'error' : 'warning';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/student/venues/${record.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Student Portal Dashboard"
        subtitle="Live campus venue availability, ongoing sessions, and upcoming university event directory"
        breadcrumbItems={[
          { title: 'Home', path: '/' },
          { title: 'Student', path: '/student/dashboard' },
          { title: 'Dashboard' },
        ]}
        extra={
          <Space>
            <Button
              type="default"
              icon={<CalendarOutlined />}
              onClick={() => navigate('/student/events')}
            >
              Event Calendar
            </Button>
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => navigate('/student/venues')}
            >
              Browse Venues
            </Button>
          </Space>
        }
      />

      {/* 4 Required Metric Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0', height: '100%' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 14 }}>Total Venues</span>}
              value={totalVenuesCount}
              prefix={<BankOutlined style={{ color: '#1677ff', marginRight: 8 }} />}
              valueStyle={{ color: '#0f172a', fontWeight: 700 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
              Across 5 campus sectors
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0', height: '100%' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 14 }}>Available Venues Today</span>}
              value={availableTodayCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />}
              valueStyle={{ color: '#16a34a', fontWeight: 700 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
              Open for student access & study
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0', height: '100%' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 14 }}>Upcoming Events</span>}
              value={upcomingEventsCount}
              prefix={<CalendarOutlined style={{ color: '#722ed1', marginRight: 8 }} />}
              valueStyle={{ color: '#722ed1', fontWeight: 700 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
              Scheduled public campus activities
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0', height: '100%' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 14 }}>Currently Occupied Venues</span>}
              value={occupiedVenuesCount}
              prefix={<FieldTimeOutlined style={{ color: '#fa8c16', marginRight: 8 }} />}
              valueStyle={{ color: '#d46b08', fontWeight: 700 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
              In-session classes & conferences
            </div>
          </Card>
        </Col>
      </Row>

      {/* Currently Occupied Venues Spotlight */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge status="processing" color="#fa8c16" />
            <span style={{ fontWeight: 600, color: '#0f172a' }}>
              Currently Occupied Venues & Active Sessions
            </span>
          </div>
        }
        bordered
        style={{ borderRadius: 8, borderColor: '#fed7aa', marginBottom: 24, background: '#fffbeb' }}
      >
        <Row gutter={[16, 16]}>
          {occupiedVenuesList.map((venue) => (
            <Col xs={24} md={8} key={venue.id}>
              <Card
                size="small"
                bordered
                style={{
                  borderRadius: 8,
                  borderColor: '#fde68a',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 14, color: '#1e293b' }}>
                    {venue.name}
                  </Text>
                  <Tag color="error">Occupied</Tag>
                </div>

                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                  <EnvironmentOutlined style={{ marginRight: 4 }} />
                  {venue.location}
                </div>

                {venue.currentEvent && (
                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid #e2e8f0',
                      marginTop: 8,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 12, color: '#0f172a' }}>
                      {venue.currentEvent.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                      <UserOutlined style={{ marginRight: 4 }} />
                      {venue.currentEvent.department}
                    </div>
                    <div style={{ fontSize: 11, color: '#d97706', marginTop: 4, fontWeight: 500 }}>
                      <FieldTimeOutlined style={{ marginRight: 4 }} />
                      {venue.currentEvent.startTime} - {venue.currentEvent.endTime}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 10, textAlign: 'right' }}>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => navigate(`/student/venues/${venue.id}`)}
                  >
                    Venue Info &rarr;
                  </Button>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Tables section: Upcoming Events & Venues Snapshot */}
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={14}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>Upcoming Campus Events</span>
                <Button
                  type="link"
                  size="small"
                  onClick={() => navigate('/student/events')}
                  icon={<ArrowRightOutlined />}
                >
                  View All Events
                </Button>
              </div>
            }
            bordered
            style={{ borderRadius: 8, borderColor: '#e2e8f0' }}
          >
            <Table
              dataSource={STUDENT_EVENTS.slice(0, 5)}
              columns={eventColumns}
              rowKey="id"
              scroll={{ x: 750 }}
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>Campus Venues Snapshot</span>
                <Button
                  type="link"
                  size="small"
                  onClick={() => navigate('/student/venues')}
                  icon={<ArrowRightOutlined />}
                >
                  Full Directory
                </Button>
              </div>
            }
            bordered
            style={{ borderRadius: 8, borderColor: '#e2e8f0' }}
          >
            <Table
              dataSource={venues.slice(0, 5)}
              columns={venueSnapshotColumns}
              rowKey="id"
              loading={loading}
              scroll={{ x: 500 }}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudentDashboard;
