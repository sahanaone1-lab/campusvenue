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
  DatePicker,
  Row,
  Col,
  Statistic,
  Modal,
  Form,
  Descriptions,
  message,
  Empty,
  Alert,
  Tooltip,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  SearchOutlined,
  EyeOutlined,
  CalendarOutlined,
  BankOutlined,
  TeamOutlined,
  UserOutlined,
  ReloadOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSearchParams, useLocation } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../services/useAuth';
import {
  facultyVenueService,
  DEPARTMENTS,
} from '../../services/facultyVenueService';
import { venueService } from '../../services/venueService';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export const AdminRequestsPage = () => {
  const { user } = useAuth();
  const [rejectForm] = Form.useForm();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Requests & Loading state
  const [requests, setRequests] = useState(() => facultyVenueService.getRequests());
  const [loading, setLoading] = useState(true);

  // Venues list for filter
  const [venuesList, setVenuesList] = useState(() => venueService.getVenues());

  // Modals state
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

  // Filter States
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState(null);
  const [venueFilter, setVenueFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [fetchError, setFetchError] = useState(null);

  // Approval Modal States
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [requestToApprove, setRequestToApprove] = useState(null);
  const [approving, setApproving] = useState(false);
  const [approveClashCheck, setApproveClashCheck] = useState({ hasConflict: false, isSunday: false });

  // Rejection Modal States
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [requestToReject, setRequestToReject] = useState(null);
  const [rejecting, setRejecting] = useState(false);

  // Fetch real data on mount
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setFetchError(null);

    Promise.all([
      facultyVenueService.fetchAdminRequests(),
      venueService.fetchVenues({ status: 'all', limit: 100 }),
    ])
      .then(([fetchedRequests, fetchedVenues]) => {
        if (mounted) {
          if (fetchedRequests) setRequests(fetchedRequests);
          if (fetchedVenues) setVenuesList(fetchedVenues);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setFetchError(err.message || 'Failed to load booking requests.');
          setLoading(false);
        }
      });

    const unsubRequests = facultyVenueService.subscribe((updated) => {
      if (mounted) {
        setRequests(updated);
        if (selectedRequest) {
          const found = updated.find((r) => String(r.id) === String(selectedRequest.id));
          if (found) setSelectedRequest(found);
        }
      }
    });

    const unsubVenues = venueService.subscribe((updated) => {
      if (mounted) {
        setVenuesList(updated);
      }
    });

    return () => {
      mounted = false;
      unsubRequests();
      unsubVenues();
    };
  }, []);

  // Handle contextual notification navigation (?requestId=REQ-2041 or ?requestId=1)
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

  // Derived KPI metrics
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'Pending').length;
  const approvedCount = requests.filter((r) => r.status === 'Approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'Rejected').length;

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;

      // 2. Date Filter
      if (dateFilter) {
        const selectedDateStr = dateFilter.format('YYYY-MM-DD');
        if (r.date !== selectedDateStr) return false;
      }

      // 3. Venue Filter
      if (venueFilter !== 'ALL') {
        const targetVenue = venueFilter.toLowerCase();
        const reqVenue = (r.venue || '').toLowerCase();
        if (reqVenue !== targetVenue && r.venueId !== venueFilter) return false;
      }

      // 4. Department Filter
      if (departmentFilter !== 'ALL') {
        if ((r.department || '').toLowerCase() !== departmentFilter.toLowerCase()) return false;
      }

      // 5. Search Text
      const term = searchText.toLowerCase().trim();
      if (term) {
        const eventName = (r.eventName || r.eventTitle || '').toLowerCase();
        const facultyName = (r.facultyName || r.requestedBy || '').toLowerCase();
        const venueName = (r.venue || '').toLowerCase();
        const reqId = String(r.id || '').toLowerCase();
        const displayId = String(r.displayId || '').toLowerCase();
        const matches =
          eventName.includes(term) ||
          facultyName.includes(term) ||
          venueName.includes(term) ||
          reqId.includes(term) ||
          displayId.includes(term);
        if (!matches) return false;
      }

      return true;
    });
  }, [requests, statusFilter, dateFilter, venueFilter, departmentFilter, searchText]);

  // Open Details Modal (Requirement 4)
  const handleOpenDetails = (record) => {
    setSelectedRequest(record);
    setDetailsModalVisible(true);
  };

  // Open Approval Confirmation Modal (Requirement 8, 9, 10, 13)
  const handleOpenApproveModal = (record) => {
    setRequestToApprove(record);

    // Pre-check clash for immediate visual feedback in modal
    const check = facultyVenueService.checkAvailabilityForApproval({
      venue: record.venue,
      date: record.date,
      startTime: record.startTime,
      endTime: record.endTime,
      excludeRequestId: record.id,
    });
    setApproveClashCheck(check || { hasConflict: false, isSunday: false });
    setApproveModalVisible(true);
  };

  // Confirm Approval (Requirement 5, 8, 9, 10, 11)
  const handleConfirmApproval = async () => {
    if (!requestToApprove) return;

    // Requirement 8: Final validation before approval
    if (dayjs(requestToApprove.date).day() === 0) {
      message.error('Bookings are not allowed on Sundays.');
      Modal.error({
        title: 'Approval Blocked',
        content: 'Bookings are not allowed on Sundays.',
      });
      return;
    }

    setApproving(true);

    try {
      const adminName = user?.name || 'Academic Administration Office';
      await facultyVenueService.approveRequest(requestToApprove.id, adminName);
      message.success(`Request ${requestToApprove.id} has been approved successfully!`);
      setApproveModalVisible(false);
      setRequestToApprove(null);
    } catch (err) {
      // Requirement 10: "Cannot approve this request because the venue is no longer available for the selected time."
      Modal.error({
        title: 'Approval Blocked - Venue Unavailable',
        icon: <ExclamationCircleOutlined style={{ color: '#ef4444' }} />,
        content: (
          <div style={{ marginTop: 8 }}>
            <p style={{ fontWeight: 600, color: '#dc2626' }}>
              {err.message ||
                'Cannot approve this request because the venue is no longer available for the selected time.'}
            </p>
            <p style={{ color: '#475569', fontSize: 13 }}>
              Another event or reservation has already been confirmed for{' '}
              <strong>{requestToApprove.venue}</strong> on <strong>{requestToApprove.date}</strong> during this slot.
            </p>
          </div>
        ),
      });
    } finally {
      setApproving(false);
    }
  };

  // Open Rejection Confirmation Modal (Requirement 7, 14)
  const handleOpenRejectModal = (record) => {
    setRequestToReject(record);
    rejectForm.resetFields();
    setRejectModalVisible(true);
  };

  // Confirm Rejection (Requirement 6, 7, 12, 14)
  const handleConfirmRejection = async () => {
    if (!requestToReject) return;

    try {
      const values = await rejectForm.validateFields();
      setRejecting(true);

      const adminName = user?.name || 'Academic Administration Office';
      await facultyVenueService.rejectRequest(requestToReject.id, values.rejectionReason, adminName);

      message.success(`Request ${requestToReject.id} has been rejected.`);
      setRejectModalVisible(false);
      setRequestToReject(null);
      rejectForm.resetFields();
    } catch (err) {
      if (err.message && !err.errorFields) {
        message.error(err.message);
      }
    } finally {
      setRejecting(false);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setDateFilter(null);
    setVenueFilter('ALL');
    setDepartmentFilter('ALL');
    setSearchText('');
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

  // Table Columns (Requirement 2: Faculty name, Department, Event name, Venue, Date, Start time, End time, Participants, Status, Actions)
  const columns = [
    {
      title: 'Faculty Name',
      key: 'facultyName',
      width: 170,
      render: (_, record) => (
        <Space orientation="horizontal" size={6}>
          <UserOutlined style={{ color: '#1677ff' }} />
          <Text strong style={{ color: '#0f172a' }}>
            {record.facultyName || record.requestedBy || 'Faculty Member'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 180,
      ellipsis: true,
      render: (dept) => (
        <Tooltip title={dept}>
          <Text style={{ color: '#475569', fontSize: 13 }}>{dept || 'Academic Dept'}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Event Name',
      key: 'eventName',
      width: 220,
      render: (_, record) => (
        <div>
          <Text strong style={{ color: '#1e293b', fontSize: 14 }}>
            {record.eventName || record.eventTitle}
          </Text>
          <div style={{ marginTop: 2 }}>
            <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>
              {record.eventType || 'Academic Event'}
            </Tag>
            <Text code style={{ fontSize: 11, marginLeft: 6 }}>{record.id}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Venue',
      dataIndex: 'venue',
      key: 'venue',
      width: 190,
      render: (venue) => (
        <Space orientation="horizontal" size={6}>
          <BankOutlined style={{ color: '#1677ff' }} />
          <Text style={{ color: '#334155' }}>{venue}</Text>
        </Space>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
      render: (date) => (
        <Space orientation="horizontal" size={6}>
          <CalendarOutlined style={{ color: '#64748b' }} />
          <Text>{date}</Text>
        </Space>
      ),
    },
    {
      title: 'Start Time',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 110,
      render: (startTime) => (
        <Text style={{ color: '#334155' }}>{startTime}</Text>
      ),
    },
    {
      title: 'End Time',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 110,
      render: (endTime) => (
        <Text style={{ color: '#334155' }}>{endTime}</Text>
      ),
    },
    {
      title: 'Participants',
      dataIndex: 'expectedParticipants',
      key: 'expectedParticipants',
      width: 120,
      render: (participants) => (
        <Space orientation="horizontal" size={6}>
          <TeamOutlined style={{ color: '#64748b' }} />
          <Text strong>{participants || 1}</Text>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>pax</span>
        </Space>
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
      width: 220,
      fixed: 'right',
      render: (_, record) => {
        const isPending = record.status === 'Pending';

        return (
          <Space orientation="horizontal" size={6}>
            <Tooltip title="View Complete Details">
              <Button
                size="small"
                type="default"
                icon={<EyeOutlined />}
                onClick={() => handleOpenDetails(record)}
              />
            </Tooltip>

            {isPending && (
              <>
                <Tooltip title="Approve Request">
                  <Button
                    size="small"
                    type="primary"
                    style={{ background: '#16a34a', borderColor: '#16a34a' }}
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleOpenApproveModal(record)}
                  >
                    Approve
                  </Button>
                </Tooltip>

                <Tooltip title="Reject Request">
                  <Button
                    size="small"
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => handleOpenRejectModal(record)}
                  >
                    Reject
                  </Button>
                </Tooltip>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Faculty Booking Requests Management"
        subtitle="Review academic reservation requests, verify scheduling conflicts, approve or reject applications with administrative remarks"
        breadcrumbItems={[
          { title: 'Admin', path: '/admin/dashboard' },
          { title: 'Booking Requests' },
        ]}
      />

      {/* Error Alert on API Failure */}
      {fetchError && (
        <Alert
          message="Failed to load booking requests"
          description={fetchError}
          type="error"
          showIcon
          closable
          onClose={() => setFetchError(null)}
          action={
            <Button
              size="small"
              danger
              icon={<ReloadOutlined />}
              onClick={() => {
                setLoading(true);
                setFetchError(null);
                Promise.all([
                  facultyVenueService.fetchAdminRequests(),
                  venueService.fetchVenues({ status: 'all', limit: 100 }),
                ])
                  .then(([fetchedRequests, fetchedVenues]) => {
                    if (fetchedRequests) setRequests(fetchedRequests);
                    if (fetchedVenues) setVenuesList(fetchedVenues);
                    setLoading(false);
                  })
                  .catch((err) => {
                    setFetchError(err.message || 'Failed to load booking requests.');
                    setLoading(false);
                  });
              }}
            >
              Retry
            </Button>
          }
          style={{ marginBottom: 20 }}
        />
      )}

      {/* KPI Metric Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 13 }}>Total Submissions</span>}
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
              prefix={<CheckCircleOutlined style={{ color: '#16a34a', marginRight: 8 }} />}
              valueStyle={{ color: '#16a34a', fontWeight: 700 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 13 }}>Rejected Requests</span>}
              value={rejectedCount}
              prefix={<CloseCircleOutlined style={{ color: '#dc2626', marginRight: 8 }} />}
              valueStyle={{ color: '#dc2626', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Table Card with Search & Filters (Requirement 15: Status, Date, Venue, Department) */}
      <Card
        bordered
        style={{ borderRadius: 8, borderColor: '#e2e8f0' }}
        title={
          <Row gutter={[16, 12]} justify="space-between" align="middle" style={{ width: '100%' }}>
            <Col xs={24} md={6}>
              <Input
                placeholder="Search event, faculty, venue, ID..."
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>

            <Col xs={24} md={18} style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              <Space wrap>
                {/* Status Filter */}
                <span style={{ fontSize: 13, color: '#64748b' }}>Status:</span>
                <Select
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  style={{ width: 130 }}
                >
                  <Option value="ALL">All Statuses</Option>
                  <Option value="Pending">Pending</Option>
                  <Option value="Approved">Approved</Option>
                  <Option value="Rejected">Rejected</Option>
                </Select>

                {/* Venue Filter */}
                <span style={{ fontSize: 13, color: '#64748b' }}>Venue:</span>
                <Select
                  value={venueFilter}
                  onChange={(val) => setVenueFilter(val)}
                  style={{ width: 170 }}
                >
                  <Option value="ALL">All Venues</Option>
                  {venuesList.map((v) => (
                    <Option key={v.id} value={v.name}>{v.name}</Option>
                  ))}
                </Select>

                {/* Department Filter */}
                <span style={{ fontSize: 13, color: '#64748b' }}>Dept:</span>
                <Select
                  value={departmentFilter}
                  onChange={(val) => setDepartmentFilter(val)}
                  style={{ width: 180 }}
                >
                  <Option value="ALL">All Departments</Option>
                  {DEPARTMENTS.map((dept) => (
                    <Option key={dept} value={dept}>{dept}</Option>
                  ))}
                </Select>

                {/* Date Filter */}
                <span style={{ fontSize: 13, color: '#64748b' }}>Date:</span>
                <DatePicker
                  value={dateFilter}
                  onChange={(date) => setDateFilter(date)}
                  style={{ width: 135 }}
                  placeholder="Filter Date"
                  disabledDate={(current) => current && current.day() === 0}
                  allowClear
                />

                {(searchText || statusFilter !== 'ALL' || venueFilter !== 'ALL' || departmentFilter !== 'ALL' || dateFilter) && (
                  <Button
                    type="link"
                    icon={<ReloadOutlined />}
                    onClick={handleResetFilters}
                  >
                    Reset
                  </Button>
                )}
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
          pagination={{ pageSize: 8, showSizeChanger: true }}
          scroll={{ x: 1300 }}
          locale={{
            emptyText: (
              <Empty
                description="No faculty booking requests found matching criteria"
                style={{ padding: '32px 0' }}
              />
            ),
          }}
        />
      </Card>

      {/* Complete Details Modal (Requirement 4) */}
      <Modal
        open={detailsModalVisible}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 600 }}>Booking Request Details</span>
            {selectedRequest && renderStatusTag(selectedRequest.status)}
          </div>
        }
        width={760}
        onCancel={() => setDetailsModalVisible(false)}
        footer={[
          selectedRequest?.status === 'Pending' && (
            <Button
              key="reject"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => {
                const req = selectedRequest;
                setDetailsModalVisible(false);
                handleOpenRejectModal(req);
              }}
            >
              Reject Request
            </Button>
          ),
          selectedRequest?.status === 'Pending' && (
            <Button
              key="approve"
              type="primary"
              style={{ background: '#16a34a', borderColor: '#16a34a' }}
              icon={<CheckCircleOutlined />}
              onClick={() => {
                const req = selectedRequest;
                setDetailsModalVisible(false);
                handleOpenApproveModal(req);
              }}
            >
              Approve Request
            </Button>
          ),
          <Button key="close" onClick={() => setDetailsModalVisible(false)}>
            Close
          </Button>,
        ]}
      >
        {selectedRequest && (
          <div style={{ marginTop: 12 }}>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Request ID" span={1}>
                <Text code strong>{selectedRequest.id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Submission Date" span={1}>
                {selectedRequest.submittedOn || '—'}
              </Descriptions.Item>

              <Descriptions.Item label="Faculty Applicant">
                <Space>
                  <UserOutlined style={{ color: '#1677ff' }} />
                  <Text strong>{selectedRequest.facultyName || selectedRequest.requestedBy || 'Faculty Member'}</Text>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Department">
                <Space>
                  <ApartmentOutlined style={{ color: '#64748b' }} />
                  <span>{selectedRequest.department || '—'}</span>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Event Name" span={2}>
                <Text strong style={{ fontSize: 16, color: '#0f172a' }}>
                  {selectedRequest.eventName || selectedRequest.eventTitle}
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Event Type">
                <Tag color="blue">{selectedRequest.eventType || 'Academic Event'}</Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Expected Attendance">
                <Space>
                  <TeamOutlined style={{ color: '#1677ff' }} />
                  <Text strong>{selectedRequest.expectedParticipants || 1} Participants</Text>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Requested Venue" span={2}>
                <Space>
                  <BankOutlined style={{ color: '#1677ff' }} />
                  <Text strong style={{ color: '#0f172a' }}>{selectedRequest.venue}</Text>
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
                  <span>{selectedRequest.timeSlot || `${selectedRequest.startTime} - ${selectedRequest.endTime}`}</span>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Event Description" span={2}>
                <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#334155' }}>
                  {selectedRequest.description || 'No description provided.'}
                </Paragraph>
              </Descriptions.Item>

              <Descriptions.Item label="Requested Facilities" span={2}>
                {selectedRequest.requiredFacilities && selectedRequest.requiredFacilities.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedRequest.requiredFacilities.map((fac, i) => (
                      <Tag key={i} color="cyan">{fac}</Tag>
                    ))}
                  </div>
                ) : (
                  <Text type="secondary">Standard facilities only</Text>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Special Requirements" span={2}>
                <Text style={{ color: '#475569' }}>
                  {selectedRequest.additionalRequirements || 'None specified'}
                </Text>
              </Descriptions.Item>

              {/* Administrative Remarks / Rejection Reason (Requirement 12) */}
              {(selectedRequest.rejectionReason || selectedRequest.remark) && (
                <Descriptions.Item
                  label={selectedRequest.status === 'Rejected' ? 'Rejection Reason' : 'Admin Remarks'}
                  span={2}
                >
                  <Alert
                    type={selectedRequest.status === 'Approved' ? 'success' : selectedRequest.status === 'Rejected' ? 'error' : 'info'}
                    message={
                      selectedRequest.status === 'Rejected'
                        ? (selectedRequest.rejectionReason || selectedRequest.remark)
                        : (selectedRequest.remark || 'Approved by Administration')
                    }
                    description={
                      selectedRequest.reviewedBy && (
                        <div style={{ marginTop: 4, fontSize: 12 }}>
                          Reviewed by: <strong>{selectedRequest.reviewedBy}</strong>
                          {selectedRequest.approvedOn && ` on ${selectedRequest.approvedOn}`}
                          {selectedRequest.rejectedOn && ` on ${selectedRequest.rejectedOn}`}
                        </div>
                      )
                    }
                    showIcon
                  />
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* Confirmation Modal Before Approval (Requirement 8, 9, 10, 13) */}
      <Modal
        open={approveModalVisible}
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#16a34a' }} />
            <span style={{ fontSize: 17, fontWeight: 600 }}>Confirm Venue Request Approval</span>
          </Space>
        }
        width={600}
        onCancel={() => {
          setApproveModalVisible(false);
          setRequestToApprove(null);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setApproveModalVisible(false);
              setRequestToApprove(null);
            }}
          >
            Cancel
          </Button>,
          <Button
            key="confirm"
            type="primary"
            style={{ background: '#16a34a', borderColor: '#16a34a' }}
            loading={approving}
            disabled={Boolean(approveClashCheck?.hasConflict)}
            onClick={handleConfirmApproval}
          >
            Confirm & Approve
          </Button>,
        ]}
      >
        {requestToApprove && (
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 14, color: '#334155' }}>
              Are you sure you want to approve this venue reservation request?
            </p>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 16,
              }}
            >
              <Row gutter={[12, 8]}>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Event Name:</Text>
                  <div><Text strong>{requestToApprove.eventName || requestToApprove.eventTitle}</Text></div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Faculty Applicant:</Text>
                  <div><Text>{requestToApprove.facultyName || requestToApprove.requestedBy || 'Faculty Member'}</Text></div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Venue:</Text>
                  <div><Text strong style={{ color: '#1677ff' }}>{requestToApprove.venue}</Text></div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Date & Slot:</Text>
                  <div><Text>{requestToApprove.date} ({requestToApprove.timeSlot || `${requestToApprove.startTime} - ${requestToApprove.endTime}`})</Text></div>
                </Col>
              </Row>
            </div>

            {/* Final Clash Check Verification (Requirement 8, 9, 10) */}
            {approveClashCheck?.isSunday || dayjs(requestToApprove.date).day() === 0 ? (
              <Alert
                type="error"
                showIcon
                message="Sunday Booking Not Allowed"
                description="Bookings are not allowed on Sundays. In accordance with university policy, college venues are closed on Sundays."
              />
            ) : approveClashCheck?.hasConflict ? (
              <Alert
                type="error"
                showIcon
                message="Cannot approve this request because the venue is no longer available for the selected time."
                description={
                  <div style={{ marginTop: 4 }}>
                    <span>
                      A conflicting reservation already occupies this slot:
                      {approveClashCheck.conflictDetails?.existingEvent && (
                        <strong> {approveClashCheck.conflictDetails.existingEvent}</strong>
                      )}
                    </span>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>
                      Approval has been disabled to prevent double bookings.
                    </p>
                  </div>
                }
              />
            ) : (
              <Alert
                type="success"
                showIcon
                message="Slot Verified: Venue is Available"
                description={`No conflicting schedules exist for ${requestToApprove.venue} on ${requestToApprove.date}. Approving will officially confirm this reservation.`}
              />
            )}
          </div>
        )}
      </Modal>

      {/* Confirmation Modal Before Rejection (Requirement 7, 12, 14) */}
      <Modal
        open={rejectModalVisible}
        title={
          <Space>
            <CloseCircleOutlined style={{ color: '#dc2626' }} />
            <span style={{ fontSize: 17, fontWeight: 600 }}>Reject Booking Request</span>
          </Space>
        }
        width={580}
        onCancel={() => {
          setRejectModalVisible(false);
          setRequestToReject(null);
          rejectForm.resetFields();
        }}
        onOk={handleConfirmRejection}
        okText="Confirm Rejection"
        okButtonProps={{ danger: true, loading: rejecting }}
      >
        {requestToReject && (
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 14, color: '#334155' }}>
              Please provide the official reason for rejecting <strong>{requestToReject.id}</strong> (
              <em>{requestToReject.eventName || requestToReject.eventTitle}</em>). This explanation will be displayed to the faculty member.
            </p>

            <Form form={rejectForm} layout="vertical">
              <Form.Item
                name="rejectionReason"
                label={<strong>Rejection Reason *</strong>}
                rules={[
                  { required: true, message: 'Please provide a reason for rejecting this request' },
                  { min: 5, message: 'Rejection reason must be at least 5 characters' },
                ]}
              >
                <TextArea
                  rows={4}
                  placeholder="e.g. Venue undergoing unscheduled electrical maintenance / Priority reservation for State Accreditation Inspection / Alternative auditorium recommended..."
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminRequestsPage;
