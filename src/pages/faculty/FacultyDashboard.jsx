import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Typography, Button, Space } from 'antd';
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { facultyVenueService } from '../../services/facultyVenueService';

const { Text } = Typography;

export const FacultyDashboard = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState(() => facultyVenueService.getRequests());

  useEffect(() => {
    facultyVenueService.fetchFacultyRequests().then((data) => {
      if (data) setRequests(data);
    }).catch(() => {});

    return facultyVenueService.subscribe((updated) => {
      setRequests(updated);
    });
  }, []);

  const totalMyRequests = requests.length;
  const pendingRequests = requests.filter((r) => r.status === 'Pending').length;
  const approvedBookings = requests.filter((r) => r.status === 'Approved').length;
  const rejectedRequests = requests.filter((r) => r.status === 'Rejected').length;

  const requestColumns = [
    {
      title: 'Req ID',
      dataIndex: 'id',
      key: 'id',
      width: 110,
      render: (id) => <Text code strong>{id}</Text>,
    },
    {
      title: 'Event Title',
      dataIndex: 'eventTitle',
      key: 'eventTitle',
      width: 240,
      render: (title) => <Text strong style={{ color: '#1e293b' }}>{title}</Text>,
    },
    {
      title: 'Venue',
      dataIndex: 'venue',
      key: 'venue',
      width: 190,
      render: (venue) => <Text style={{ color: '#475569' }}>{venue}</Text>,
    },
    {
      title: 'Date & Slot',
      key: 'dateSlot',
      width: 170,
      render: (_, record) => (
        <div>
          <div>{record.date}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.timeSlot}</Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const color =
          status === 'Approved'
            ? 'success'
            : status === 'Pending'
            ? 'processing'
            : status === 'Cancelled'
            ? 'default'
            : 'error';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Notes / Remarks',
      dataIndex: 'remark',
      key: 'remark',
      width: 160,
      render: (remark) => (
        <span style={{ fontSize: 12, color: remark ? '#dc2626' : '#94a3b8' }}>
          {remark || 'Standard booking'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Faculty Portal Dashboard"
        subtitle="Manage academic venue requests, check approval updates, and reserve departmental facilities"
        breadcrumbItems={[
          { title: 'Home', path: '/' },
          { title: 'Faculty', path: '/faculty/dashboard' },
          { title: 'Dashboard' },
        ]}
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/faculty/request-venue')}
            >
              Request Venue
            </Button>
          </Space>
        }
      />

      {/* Requirement 12: Faculty dashboard sample cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 14 }}>My Requests</span>}
              value={totalMyRequests}
              prefix={<FileTextOutlined style={{ color: '#1677ff', marginRight: 8 }} />}
              valueStyle={{ color: '#0f172a', fontWeight: 700 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
              All submitted requests
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 14 }}>Pending Requests</span>}
              value={pendingRequests}
              prefix={<ClockCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />}
              valueStyle={{ color: '#d97706', fontWeight: 700 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
              Awaiting admin review
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 14 }}>Approved Bookings</span>}
              value={approvedBookings}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />}
              valueStyle={{ color: '#16a34a', fontWeight: 700 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
              Confirmed reservations
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 14 }}>Rejected Requests</span>}
              value={rejectedRequests}
              prefix={<CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />}
              valueStyle={{ color: '#dc2626', fontWeight: 700 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
              Due to clashes / maintenance
            </div>
          </Card>
        </Col>
      </Row>

      {/* Recent Requests Section */}
      <div style={{ marginTop: 24 }}>
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>My Recent Booking Requests</span>
              <Button
                type="link"
                size="small"
                onClick={() => navigate('/faculty/my-requests')}
                icon={<ArrowRightOutlined />}
              >
                View History
              </Button>
            </div>
          }
          bordered
          style={{ borderRadius: 8, borderColor: '#e2e8f0' }}
        >
          <Table
            dataSource={requests.slice(0, 5)}
            columns={requestColumns}
            rowKey="id"
            scroll={{ x: 970 }}
            pagination={false}
            size="middle"
          />
        </Card>
      </div>
    </div>
  );
};

export default FacultyDashboard;
