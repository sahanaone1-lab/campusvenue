import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Tag,
  Button,
  Card,
  Space,
  Typography,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Modal,
  Descriptions,
  Popconfirm,
  message,
  Empty,
  Alert,
} from 'antd';
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  StopOutlined,
  CalendarOutlined,
  BankOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { facultyVenueService } from '../../services/facultyVenueService';

const { Text, Paragraph } = Typography;
const { Option } = Select;

export const MyRequestsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Requests state
  const [requests, setRequests] = useState(() => facultyVenueService.getRequests());
  const [loading, setLoading] = useState(true);

  // Filter & Search state
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchText, setSearchText] = useState('');

  // Details Modal state
  const [selectedRequest, setSelectedRequest] = useState(() => {
    const targetRequestId = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('requestId')
      : null;
    if (targetRequestId) {
      const cleanId = String(targetRequestId).replace(/^REQ-/, '');
      return facultyVenueService.getRequests().find((r) => String(r.id) === cleanId || r.displayId === targetRequestId) || null;
    }
    return null;
  });
  const [detailsModalVisible, setDetailsModalVisible] = useState(() => {
    return typeof window !== 'undefined'
      ? Boolean(new URLSearchParams(window.location.search).get('requestId'))
      : false;
  });

  // Fetch real faculty requests on mount
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    facultyVenueService.fetchFacultyRequests()
      .then((data) => {
        if (mounted) {
          setRequests(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    const unsubscribe = facultyVenueService.subscribe((updated) => {
      if (mounted) {
        setRequests(updated);
        // Also update currently viewed request in modal if open
        if (selectedRequest) {
          const found = updated.find((r) => String(r.id) === String(selectedRequest.id));
          if (found) setSelectedRequest(found);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Handle contextual notification navigation (e.g. ?requestId=REQ-2030 or ?requestId=1)
  useEffect(() => {
    const targetRequestId = searchParams.get('requestId') || location.state?.requestId;
    if (targetRequestId) {
      const cleanId = String(targetRequestId).replace(/^REQ-/, '');
      const found = requests.find((r) => String(r.id) === cleanId || String(r.id) === String(targetRequestId) || r.displayId === targetRequestId);
      if (found) {
        setSelectedRequest(found);
        setDetailsModalVisible(true);
      } else {
        facultyVenueService.getBookingById(cleanId)
          .then((item) => {
            if (item) {
              setSelectedRequest(item);
              setDetailsModalVisible(true);
            }
          })
          .catch(() => {});
      }
    }
  }, [searchParams, location.state, requests]);

  // Statistics calculation
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'Pending').length;
  const approvedCount = requests.filter((r) => r.status === 'Approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'Rejected').length;

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const term = searchText.toLowerCase().trim();
      const eventName = (r.eventName || r.eventTitle || '').toLowerCase();
      const venueName = (r.venue || '').toLowerCase();
      const reqId = String(r.id || '').toLowerCase();
      const displayId = String(r.displayId || '').toLowerCase();
      const matchesSearch =
        !term ||
        eventName.includes(term) ||
        venueName.includes(term) ||
        reqId.includes(term) ||
        displayId.includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [requests, statusFilter, searchText]);

  // Open Details Modal
  const handleOpenDetails = (record) => {
    setSelectedRequest(record);
    setDetailsModalVisible(true);
  };

  // Cancel Request Action
  const handleCancelRequest = (requestId) => {
    try {
      facultyVenueService.cancelRequest(requestId);
      message.success(`Request ${requestId} has been cancelled.`);
      // Refresh local list
      setRequests(facultyVenueService.getRequests());
      // If modal is open for this request, close it or update it
      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest((prev) => ({ ...prev, status: 'Cancelled' }));
      }
    } catch (err) {
      message.error(err.message || 'Failed to cancel request.');
    }
  };

  // Status tag helper
  const renderStatusTag = (status) => {
    switch (status) {
      case 'Approved':
        return (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Approved
          </Tag>
        );
      case 'Pending':
        return (
          <Tag color="processing" icon={<ClockCircleOutlined />}>
            Pending
          </Tag>
        );
      case 'Rejected':
        return (
          <Tag color="error" icon={<CloseCircleOutlined />}>
            Rejected
          </Tag>
        );
      case 'Cancelled':
        return (
          <Tag color="default" icon={<StopOutlined />}>
            Cancelled
          </Tag>
        );
      default:
        return <Tag>{status}</Tag>;
    }
  };

  // Table Columns with appropriate widths and proportions
  const columns = [
    {
      title: 'Request ID',
      dataIndex: 'id',
      key: 'id',
      width: 110,
      render: (id) => <Text code strong>{id}</Text>,
    },
    {
      title: 'Event',
      key: 'event',
      width: 280,
      render: (_, record) => (
        <div style={{ lineHeight: 1.4 }}>
          <Text strong style={{ color: '#0f172a', fontSize: 14 }}>
            {record.eventName || record.eventTitle}
          </Text>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>
              {record.eventType || 'Academic Event'}
            </Tag>
            {record.department && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.department}
              </Text>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Venue',
      dataIndex: 'venue',
      key: 'venue',
      width: 230,
      render: (venue) => (
        <Space orientation="horizontal" size={6} align="start" style={{ lineHeight: 1.4 }}>
          <BankOutlined style={{ color: '#1677ff', marginTop: 3 }} />
          <Text style={{ color: '#334155' }}>{venue}</Text>
        </Space>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 130,
      render: (date) => (
        <Space orientation="horizontal" size={6}>
          <CalendarOutlined style={{ color: '#64748b' }} />
          <Text>{date}</Text>
        </Space>
      ),
    },
    {
      title: 'Time',
      key: 'time',
      width: 180,
      render: (_, record) => (
        <Space orientation="horizontal" size={6}>
          <ClockCircleOutlined style={{ color: '#64748b' }} />
          <Text>{record.timeSlot || `${record.startTime} - ${record.endTime}`}</Text>
        </Space>
      ),
    },
    {
      title: 'Request Date',
      dataIndex: 'submittedOn',
      key: 'submittedOn',
      width: 120,
      render: (subDate) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {subDate || '—'}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => renderStatusTag(status),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 170,
      render: (_, record) => {
        const isPending = record.status === 'Pending';
        return (
          <Space orientation="horizontal" size={8}>
            <Button
              size="small"
              type="primary"
              ghost
              icon={<EyeOutlined />}
              onClick={() => handleOpenDetails(record)}
            >
              Details
            </Button>

            {isPending && (
              <Popconfirm
                title="Cancel Request"
                description="Are you sure you want to cancel this pending reservation request?"
                okText="Yes, Cancel"
                cancelText="No"
                okButtonProps={{ danger: true }}
                onConfirm={() => handleCancelRequest(record.id)}
              >
                <Button size="small" danger icon={<StopOutlined />}>
                  Cancel
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="My Booking Requests"
        subtitle="Track submitted venue reservation requests, approval statuses, and manage active applications"
        breadcrumbItems={[
          { title: 'Faculty', path: '/faculty/dashboard' },
          { title: 'My Requests' },
        ]}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/faculty/request-venue')}
          >
            Request Venue
          </Button>
        }
      />

      {/* Metrics Summary Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 13 }}>Total Requests</span>}
              value={totalCount}
              prefix={<FileTextOutlined style={{ color: '#1677ff', marginRight: 8 }} />}
              valueStyle={{ color: '#0f172a', fontWeight: 700 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 13 }}>Pending Review</span>}
              value={pendingCount}
              prefix={<ClockCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />}
              valueStyle={{ color: '#d97706', fontWeight: 700 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 13 }}>Approved Bookings</span>}
              value={approvedCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />}
              valueStyle={{ color: '#16a34a', fontWeight: 700 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 13 }}>Rejected</span>}
              value={rejectedCount}
              prefix={<CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />}
              valueStyle={{ color: '#dc2626', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Table Card with Search & Filters */}
      <Card
        bordered
        style={{ borderRadius: 8, borderColor: '#e2e8f0' }}
        title={
          <Row gutter={[16, 12]} justify="space-between" align="middle" style={{ width: '100%' }}>
            <Col xs={24} sm={12} md={8}>
              <Input
                placeholder="Search by event, venue, or request ID..."
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>

            <Col xs={24} sm={12} md={8} style={{ textAlign: 'right' }}>
              <Space>
                <Text style={{ fontSize: 13, color: '#64748b' }}>Status:</Text>
                <Select
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  style={{ width: 140 }}
                >
                  <Option value="ALL">All Statuses</Option>
                  <Option value="Pending">Pending</Option>
                  <Option value="Approved">Approved</Option>
                  <Option value="Rejected">Rejected</Option>
                  <Option value="Cancelled">Cancelled</Option>
                </Select>
              </Space>
            </Col>
          </Row>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredRequests}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1250 }}
          pagination={{ pageSize: 8, showSizeChanger: true }}
          locale={{
            emptyText: (
              <Empty
                description="No venue reservation requests found"
                style={{ padding: '32px 0' }}
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/faculty/request-venue')}
                >
                  Create Your First Request
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Request Details Modal (Requirement 10) */}
      <Modal
        open={detailsModalVisible}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 600 }}>Reservation Request Details</span>
            {selectedRequest && renderStatusTag(selectedRequest.status)}
          </div>
        }
        width={720}
        onCancel={() => setDetailsModalVisible(false)}
        footer={[
          selectedRequest?.status === 'Pending' && (
            <Popconfirm
              key="cancel"
              title="Cancel Request"
              description="Are you sure you want to cancel this pending reservation request?"
              okText="Yes, Cancel"
              cancelText="No"
              okButtonProps={{ danger: true }}
              onConfirm={() => {
                handleCancelRequest(selectedRequest.id);
                setDetailsModalVisible(false);
              }}
            >
              <Button danger icon={<StopOutlined />}>
                Cancel Request
              </Button>
            </Popconfirm>
          ),
          <Button key="close" type="primary" onClick={() => setDetailsModalVisible(false)}>
            Close
          </Button>,
        ]}
      >
        {selectedRequest && (
          <div style={{ marginTop: 8 }}>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Request ID" span={1}>
                <Text code strong>{selectedRequest.id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Submission Date" span={1}>
                {selectedRequest.submittedOn || '—'}
              </Descriptions.Item>

              <Descriptions.Item label="Event Name" span={2}>
                <Text strong style={{ fontSize: 15, color: '#0f172a' }}>
                  {selectedRequest.eventName || selectedRequest.eventTitle}
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Event Type">
                <Tag color="blue">{selectedRequest.eventType || 'Academic'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Department">
                {selectedRequest.department || '—'}
              </Descriptions.Item>

              <Descriptions.Item label="Venue" span={2}>
                <Space>
                  <BankOutlined style={{ color: '#1677ff' }} />
                  <Text strong>{selectedRequest.venue}</Text>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Reserved Date">
                <Space>
                  <CalendarOutlined style={{ color: '#64748b' }} />
                  <span>{selectedRequest.date}</span>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Time Window">
                <Space>
                  <ClockCircleOutlined style={{ color: '#64748b' }} />
                  <span>
                    {selectedRequest.timeSlot ||
                      `${selectedRequest.startTime} - ${selectedRequest.endTime}`}
                  </span>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Expected Participants" span={2}>
                <Space>
                  <TeamOutlined style={{ color: '#64748b' }} />
                  <span>{selectedRequest.expectedParticipants || '—'} Attendees</span>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Event Description" span={2}>
                <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#334155' }}>
                  {selectedRequest.description || 'No description provided.'}
                </Paragraph>
              </Descriptions.Item>

              <Descriptions.Item label="Required Facilities" span={2}>
                {selectedRequest.requiredFacilities && selectedRequest.requiredFacilities.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedRequest.requiredFacilities.map((fac, i) => (
                      <Tag key={i} color="cyan">
                        {fac}
                      </Tag>
                    ))}
                  </div>
                ) : (
                  <Text type="secondary">Standard venue facilities only</Text>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Additional Requirements" span={2}>
                <Text style={{ color: '#475569' }}>
                  {selectedRequest.additionalRequirements || 'None specified'}
                </Text>
              </Descriptions.Item>

              {(selectedRequest.rejectionReason || selectedRequest.remark) && (
                <Descriptions.Item label={selectedRequest.status === 'Rejected' ? 'Rejection Reason' : 'Admin Remarks'} span={2}>
                  <Alert
                    type={selectedRequest.status === 'Approved' ? 'success' : selectedRequest.status === 'Rejected' ? 'error' : 'info'}
                    message={
                      selectedRequest.status === 'Rejected'
                        ? (selectedRequest.rejectionReason || selectedRequest.remark)
                        : (selectedRequest.remark || 'Approved by Administration')
                    }
                    showIcon
                    style={{ margin: 0 }}
                  />
                </Descriptions.Item>
              )}

              {selectedRequest.cancelledOn && (
                <Descriptions.Item label="Cancellation Info" span={2}>
                  <Text type="secondary">Cancelled by Faculty on {selectedRequest.cancelledOn}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyRequestsPage;
