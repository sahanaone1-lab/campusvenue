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
  FileDoneOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { facultyVenueService } from '../../services/facultyVenueService';
import { reportService, calculatePreviewPercentage } from '../../services/reportService';

const { Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export const MyRequestsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Requests state
  const [requests, setRequests] = useState(() => facultyVenueService.getRequests());
  const [loading, setLoading] = useState(true);

  // Completion Reports state
  const [reports, setReports] = useState([]);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportModalMode, setReportModalMode] = useState('submit'); // 'submit' | 'revise' | 'view'
  const [activeBooking, setActiveBooking] = useState(null);
  const [activeReport, setActiveReport] = useState(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Form state for Completion Report
  const [reportForm, setReportForm] = useState({
    actualParticipants: '',
    eventSummary: '',
    activitiesConducted: '',
    challengesFaced: '',
    suggestionsForFuture: '',
  });
  const [formErrors, setFormErrors] = useState({});

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

  // Fetch reports from backend
  const loadReports = async () => {
    try {
      const res = await reportService.getFacultyReports({ limit: 100 });
      if (res && res.reports) {
        setReports(res.reports);
      }
    } catch (err) {
      console.warn('Could not load faculty reports:', err?.message || err);
    }
  };

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

    loadReports();

    const unsubscribe = facultyVenueService.subscribe((updated) => {
      if (mounted) {
        setRequests(updated);
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

  // Handle contextual notification navigation
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

  // Map reports by booking_id
  const reportsByBooking = useMemo(() => {
    const map = {};
    reports.forEach((r) => {
      if (r.booking_id) map[r.booking_id] = r;
    });
    return map;
  }, [reports]);

  // Helper: Determine if booking event has concluded
  const isEventConcluded = (record) => {
    if (!record || !record.date) return false;
    try {
      const timeStr = record.end_time || record.endTime || '23:59:59';
      const datePart = record.date.slice(0, 10);
      const endMoment = dayjs(`${datePart} ${timeStr}`);
      if (endMoment.isValid()) {
        return endMoment.isBefore(dayjs());
      }
      return dayjs(datePart).isBefore(dayjs(), 'day');
    } catch {
      return false;
    }
  };

  // Open Report Modal
  const handleOpenReportModal = (booking, report, mode) => {
    setActiveBooking(booking);
    setActiveReport(report || (booking ? reportsByBooking[booking.id] : null));
    setReportModalMode(mode);
    setFormErrors({});

    const currentRep = report || (booking ? reportsByBooking[booking.id] : null);

    if (mode === 'submit') {
      setReportForm({
        actualParticipants: '',
        eventSummary: '',
        activitiesConducted: '',
        challengesFaced: '',
        suggestionsForFuture: '',
      });
    } else if (mode === 'revise' && currentRep) {
      setReportForm({
        actualParticipants: currentRep.actual_participants !== undefined ? currentRep.actual_participants : '',
        eventSummary: currentRep.event_summary || '',
        activitiesConducted: currentRep.activities_conducted || '',
        challengesFaced: currentRep.challenges_faced || '',
        suggestionsForFuture: currentRep.suggestions_for_future || '',
      });
    }
    setReportModalVisible(true);
  };

  // Handle Report Form Submit / Revise
  const handleReportSubmit = async () => {
    const errors = {};
    const expected = Number(activeBooking?.expectedParticipants) || 0;
    const actual = parseInt(reportForm.actualParticipants, 10);

    if (reportForm.actualParticipants === '' || isNaN(actual)) {
      errors.actualParticipants = 'Actual participant count is required.';
    } else if (actual < 0) {
      errors.actualParticipants = 'Actual attendance cannot be negative.';
    } else if (actual > expected) {
      errors.actualParticipants = `Actual attendance (${actual}) cannot exceed expected count (${expected}).`;
    }

    if (!reportForm.eventSummary || reportForm.eventSummary.trim().length < 10) {
      errors.eventSummary = 'Event summary is required and must be at least 10 characters.';
    }

    if (!reportForm.activitiesConducted || reportForm.activitiesConducted.trim().length < 10) {
      errors.activitiesConducted = 'Activities conducted is required and must be at least 10 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setReportSubmitting(true);
    try {
      if (reportModalMode === 'submit') {
        await reportService.submitReport({
          booking_id: activeBooking.id,
          actual_participants: actual,
          event_summary: reportForm.eventSummary.trim(),
          activities_conducted: reportForm.activitiesConducted.trim(),
          challenges_faced: reportForm.challengesFaced ? reportForm.challengesFaced.trim() : '',
          suggestions_for_future: reportForm.suggestionsForFuture ? reportForm.suggestionsForFuture.trim() : '',
        });
        message.success('Event completion report submitted successfully!');
      } else if (reportModalMode === 'revise' && activeReport) {
        await reportService.updateReport(activeReport.id, {
          actual_participants: actual,
          event_summary: reportForm.eventSummary.trim(),
          activities_conducted: reportForm.activitiesConducted.trim(),
          challenges_faced: reportForm.challengesFaced ? reportForm.challengesFaced.trim() : '',
          suggestions_for_future: reportForm.suggestionsForFuture ? reportForm.suggestionsForFuture.trim() : '',
        });
        message.success('Event completion report updated and resubmitted for Dean review.');
      }

      setReportModalVisible(false);
      await loadReports();
    } catch (err) {
      message.error(err.message || 'Failed to submit completion report.');
    } finally {
      setReportSubmitting(false);
    }
  };

  // Statistics calculation
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'Pending').length;
  const approvedCount = requests.filter((r) => r.status === 'Approved').length;
  const _rejectedCount = requests.filter((r) => r.status === 'Rejected').length;

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
      setRequests(facultyVenueService.getRequests());
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

  // Table Columns
  const columns = [
    {
      title: 'Request ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id) => <Text code strong>{id}</Text>,
    },
    {
      title: 'Event',
      key: 'event',
      width: 250,
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
      width: 200,
      render: (venue) => (
        <Space orientation="horizontal" size={6} align="start" style={{ lineHeight: 1.4 }}>
          <BankOutlined style={{ color: '#1677ff', marginTop: 3 }} />
          <Text style={{ color: '#334155' }}>{venue}</Text>
        </Space>
      ),
    },
    {
      title: 'Date & Time',
      key: 'datetime',
      width: 190,
      render: (_, record) => (
        <div>
          <Space size={6}>
            <CalendarOutlined style={{ color: '#64748b' }} />
            <Text strong>{record.date}</Text>
          </Space>
          <div style={{ marginTop: 2 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {record.timeSlot || `${record.startTime} - ${record.endTime}`}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Booking Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => renderStatusTag(status),
    },
    {
      title: 'Completion Report',
      key: 'completionReport',
      width: 200,
      render: (_, record) => {
        const isApproved = record.status === 'Approved';
        const report = reportsByBooking[record.id];
        const hasEnded = isEventConcluded(record);

        if (!isApproved) {
          return (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.status === 'Pending' ? 'Pending Approval' : '—'}
            </Text>
          );
        }

        if (report) {
          if (report.status === 'submitted') {
            return (
              <Space size={6} wrap>
                <Tag color="processing" icon={<ClockCircleOutlined />}>Submitted</Tag>
                <Button
                  size="small"
                  type="link"
                  style={{ padding: 0 }}
                  icon={<EyeOutlined />}
                  onClick={() => handleOpenReportModal(record, report, 'view')}
                >
                  View Report
                </Button>
              </Space>
            );
          }
          if (report.status === 'revision_requested') {
            return (
              <Space size={6} wrap>
                <Tag color="warning" icon={<ExclamationCircleOutlined />}>Revision Needed</Tag>
                <Button
                  size="small"
                  type="primary"
                  danger
                  icon={<EditOutlined />}
                  onClick={() => handleOpenReportModal(record, report, 'revise')}
                >
                  Revise
                </Button>
              </Space>
            );
          }
          if (report.status === 'reviewed') {
            return (
              <Space size={6} wrap>
                <Tag color="success" icon={<CheckCircleOutlined />}>Reviewed</Tag>
                <Button
                  size="small"
                  type="link"
                  style={{ padding: 0 }}
                  icon={<EyeOutlined />}
                  onClick={() => handleOpenReportModal(record, report, 'view')}
                >
                  View Report
                </Button>
              </Space>
            );
          }
        }

        if (hasEnded) {
          return (
            <Button
              size="small"
              type="primary"
              icon={<FileDoneOutlined />}
              onClick={() => handleOpenReportModal(record, null, 'submit')}
            >
              Submit Report
            </Button>
          );
        }

        return (
          <Tag color="default" style={{ fontSize: 11 }}>
            Event Not Ended
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_, record) => {
        const isPending = record.status === 'Pending';
        return (
          <Space orientation="horizontal" size={8}>
            <Button
              size="small"
              type="default"
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

  // Calculated preview percentage for the form
  const previewPercentage = calculatePreviewPercentage(
    reportForm.actualParticipants,
    activeBooking?.expectedParticipants
  );

  return (
    <div>
      <PageHeader
        title="My Booking Requests"
        subtitle="Track submitted venue reservations, view approvals, and complete event reports upon conclusion"
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
              title={<span style={{ color: '#64748b', fontSize: 13 }}>Reports Handled</span>}
              value={reports.length}
              prefix={<FileDoneOutlined style={{ color: '#7c3aed', marginRight: 8 }} />}
              valueStyle={{ color: '#7c3aed', fontWeight: 700 }}
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
          scroll={{ x: 1300 }}
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

      {/* Request Details Modal */}
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

              {/* Completion Report Status Section in Details Modal */}
              {selectedRequest.status === 'Approved' && (
                <Descriptions.Item label="Completion Report" span={2}>
                  {reportsByBooking[selectedRequest.id] ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div>
                        {reportsByBooking[selectedRequest.id].status === 'submitted' && (
                          <Tag color="processing" icon={<ClockCircleOutlined />}>Submitted — Pending Dean Review</Tag>
                        )}
                        {reportsByBooking[selectedRequest.id].status === 'revision_requested' && (
                          <Tag color="warning" icon={<ExclamationCircleOutlined />}>Revision Requested</Tag>
                        )}
                        {reportsByBooking[selectedRequest.id].status === 'reviewed' && (
                          <Tag color="success" icon={<CheckCircleOutlined />}>Reviewed & Approved</Tag>
                        )}
                        <span style={{ marginLeft: 8, fontSize: 13, color: '#64748b' }}>
                          ({reportsByBooking[selectedRequest.id].actual_participants} attended, {reportsByBooking[selectedRequest.id].attendance_percentage}%)
                        </span>
                      </div>
                      <Button
                        size="small"
                        type={reportsByBooking[selectedRequest.id].status === 'revision_requested' ? 'primary' : 'default'}
                        danger={reportsByBooking[selectedRequest.id].status === 'revision_requested'}
                        onClick={() => {
                          setDetailsModalVisible(false);
                          handleOpenReportModal(
                            selectedRequest,
                            reportsByBooking[selectedRequest.id],
                            reportsByBooking[selectedRequest.id].status === 'revision_requested' ? 'revise' : 'view'
                          );
                        }}
                      >
                        {reportsByBooking[selectedRequest.id].status === 'revision_requested' ? 'Revise Report' : 'View Report'}
                      </Button>
                    </div>
                  ) : isEventConcluded(selectedRequest) ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <Text type="warning">Event concluded. Completion report is pending submission.</Text>
                      <Button
                        size="small"
                        type="primary"
                        icon={<FileDoneOutlined />}
                        onClick={() => {
                          setDetailsModalVisible(false);
                          handleOpenReportModal(selectedRequest, null, 'submit');
                        }}
                      >
                        Submit Report
                      </Button>
                    </div>
                  ) : (
                    <Text type="secondary">Event has not concluded yet. Report opens upon event completion.</Text>
                  )}
                </Descriptions.Item>
              )}

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
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* Completion Report Modal (Submit / Revise / View) */}
      <Modal
        open={reportModalVisible}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {reportModalMode === 'submit' && <FileDoneOutlined style={{ color: '#1677ff', fontSize: 18 }} />}
            {reportModalMode === 'revise' && <EditOutlined style={{ color: '#d97706', fontSize: 18 }} />}
            {reportModalMode === 'view' && <FileTextOutlined style={{ color: '#52c41a', fontSize: 18 }} />}
            <span style={{ fontSize: 17, fontWeight: 600 }}>
              {reportModalMode === 'submit' && 'Submit Event Completion Report'}
              {reportModalMode === 'revise' && 'Revise Event Completion Report'}
              {reportModalMode === 'view' && 'Event Completion Report Details'}
            </span>
            {activeReport && reportModalMode === 'view' && (
              <Tag color={activeReport.status === 'reviewed' ? 'success' : activeReport.status === 'revision_requested' ? 'warning' : 'processing'}>
                {activeReport.status === 'reviewed' ? 'Reviewed' : activeReport.status === 'revision_requested' ? 'Revision Requested' : 'Submitted'}
              </Tag>
            )}
          </div>
        }
        width={760}
        onCancel={() => setReportModalVisible(false)}
        footer={
          reportModalMode === 'view'
            ? [
                activeReport?.status === 'revision_requested' && (
                  <Button
                    key="revise"
                    type="primary"
                    danger
                    icon={<EditOutlined />}
                    onClick={() => handleOpenReportModal(activeBooking, activeReport, 'revise')}
                  >
                    Revise Report Now
                  </Button>
                ),
                <Button key="close" type="primary" onClick={() => setReportModalVisible(false)}>
                  Close
                </Button>,
              ]
            : [
                <Button key="cancel" onClick={() => setReportModalVisible(false)}>
                  Cancel
                </Button>,
                <Button
                  key="submit"
                  type="primary"
                  loading={reportSubmitting}
                  icon={reportModalMode === 'revise' ? <EditOutlined /> : <CheckOutlined />}
                  onClick={handleReportSubmit}
                >
                  {reportModalMode === 'revise' ? 'Update & Resubmit Report' : 'Submit Completion Report'}
                </Button>,
              ]
        }
      >
        {activeBooking && (
          <div style={{ marginTop: 8 }}>
            {/* Header booking info banner */}
            <Card
              size="small"
              style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', marginBottom: 16 }}
            >
              <Row gutter={[16, 8]} align="middle">
                <Col xs={24} sm={16}>
                  <Text strong style={{ fontSize: 15, color: '#0f172a' }}>
                    {activeBooking.eventName || activeBooking.eventTitle}
                  </Text>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                    <BankOutlined style={{ marginRight: 5, color: '#1677ff' }} />
                    {activeBooking.venue} &bull; <CalendarOutlined style={{ margin: '0 5px', color: '#64748b' }} />
                    {activeBooking.date} ({activeBooking.timeSlot || `${activeBooking.startTime} - ${activeBooking.endTime}`})
                  </div>
                </Col>
                <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
                  <Statistic
                    title={<span style={{ fontSize: 12, color: '#64748b' }}>Expected Participants</span>}
                    value={activeBooking.expectedParticipants || 0}
                    valueStyle={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}
                    prefix={<TeamOutlined style={{ color: '#1677ff' }} />}
                  />
                </Col>
              </Row>
            </Card>

            {/* If in Revise mode, display the Dean's Remarks prominently */}
            {reportModalMode === 'revise' && activeReport?.dean_remarks && (
              <Alert
                type="warning"
                showIcon
                icon={<ExclamationCircleOutlined />}
                message={<Text strong style={{ color: '#92400e' }}>Dean's Revision Remarks</Text>}
                description={
                  <div style={{ color: '#78350f', marginTop: 4 }}>
                    {activeReport.dean_remarks}
                  </div>
                }
                style={{ marginBottom: 16, backgroundColor: '#fffbeb', borderColor: '#fef3c7' }}
              />
            )}

            {/* VIEW MODE: Read-Only Overview */}
            {reportModalMode === 'view' && activeReport && (
              <div>
                {activeReport.status === 'revision_requested' && activeReport.dean_remarks && (
                  <Alert
                    type="warning"
                    showIcon
                    icon={<ExclamationCircleOutlined />}
                    message={<Text strong style={{ color: '#92400e' }}>Revision Requested by Dean</Text>}
                    description={<Paragraph style={{ margin: '4px 0 0 0', color: '#78350f' }}>{activeReport.dean_remarks}</Paragraph>}
                    style={{ marginBottom: 16 }}
                  />
                )}

                {activeReport.status === 'reviewed' && (
                  <Alert
                    type="success"
                    showIcon
                    icon={<CheckCircleOutlined />}
                    message={<Text strong style={{ color: '#166534' }}>Report Approved & Reviewed</Text>}
                    description={
                      <div style={{ marginTop: 4, color: '#14532d' }}>
                        Reviewed by <strong>{activeReport.reviewer?.name || 'The Dean'}</strong>
                        {activeReport.reviewed_at && ` on ${dayjs(activeReport.reviewed_at).format('YYYY-MM-DD hh:mm A')}`}.
                        {activeReport.dean_remarks && (
                          <div style={{ marginTop: 4 }}><strong>Dean Remarks:</strong> {activeReport.dean_remarks}</div>
                        )}
                      </div>
                    }
                    style={{ marginBottom: 16 }}
                  />
                )}

                <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="Expected Attendees">
                    <Text strong>{activeBooking.expectedParticipants || 0}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Actual Attendance">
                    <Text strong style={{ color: '#1677ff' }}>{activeReport.actual_participants}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Attendance Rate" span={2}>
                    <Tag color="blue" style={{ fontSize: 13, padding: '2px 8px' }}>
                      {activeReport.attendance_percentage}%
                    </Tag>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      ({activeReport.actual_participants} attended out of {activeBooking.expectedParticipants || 0} planned)
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="Submission Date" span={2}>
                    {activeReport.created_at ? dayjs(activeReport.created_at).format('YYYY-MM-DD hh:mm A') : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Event Summary" span={2}>
                    <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#334155' }}>
                      {activeReport.event_summary}
                    </Paragraph>
                  </Descriptions.Item>
                  <Descriptions.Item label="Activities Conducted" span={2}>
                    <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#334155' }}>
                      {activeReport.activities_conducted}
                    </Paragraph>
                  </Descriptions.Item>
                  {activeReport.challenges_faced && (
                    <Descriptions.Item label="Challenges Faced" span={2}>
                      <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#334155' }}>
                        {activeReport.challenges_faced}
                      </Paragraph>
                    </Descriptions.Item>
                  )}
                  {activeReport.suggestions_for_future && (
                    <Descriptions.Item label="Suggestions for Future" span={2}>
                      <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#334155' }}>
                        {activeReport.suggestions_for_future}
                      </Paragraph>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </div>
            )}

            {/* EDIT / SUBMIT MODE: Interactive Form */}
            {(reportModalMode === 'submit' || reportModalMode === 'revise') && (
              <div>
                {/* Row: Attendance Input & Calculated Percentage Preview */}
                <Card size="small" style={{ backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', marginBottom: 16 }}>
                  <Row gutter={[16, 12]} align="middle">
                    <Col xs={24} sm={12}>
                      <div style={{ marginBottom: 4 }}>
                        <Text strong style={{ color: '#0f172a' }}>Actual Number of Participants *</Text>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={activeBooking.expectedParticipants || 0}
                        placeholder={`0 to ${activeBooking.expectedParticipants || 0}`}
                        value={reportForm.actualParticipants}
                        onChange={(e) => {
                          const val = e.target.value;
                          setReportForm((prev) => ({ ...prev, actualParticipants: val }));
                          if (formErrors.actualParticipants) {
                            setFormErrors((prev) => ({ ...prev, actualParticipants: null }));
                          }
                        }}
                        status={formErrors.actualParticipants ? 'error' : ''}
                        style={{ width: '100%' }}
                      />
                      {formErrors.actualParticipants && (
                        <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>
                          {formErrors.actualParticipants}
                        </div>
                      )}
                    </Col>

                    <Col xs={24} sm={12}>
                      <div style={{ marginBottom: 4 }}>
                        <Text type="secondary" style={{ fontSize: 13 }}>Calculated Attendance Rate</Text>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Tag color="blue" style={{ fontSize: 15, padding: '4px 12px', fontWeight: 600 }}>
                          {previewPercentage}%
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          ({reportForm.actualParticipants !== '' ? reportForm.actualParticipants : 0} / {activeBooking.expectedParticipants || 0})
                        </Text>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                        * Validated strictly on backend server before saving.
                      </div>
                    </Col>
                  </Row>
                </Card>

                {/* Event Summary */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ marginBottom: 4 }}>
                    <Text strong style={{ color: '#0f172a' }}>Event Summary *</Text>
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>(Minimum 10 characters)</Text>
                  </div>
                  <TextArea
                    rows={3}
                    maxLength={5000}
                    showCount
                    placeholder="Describe the overall event, speaker sessions, audience engagement, and key highlights..."
                    value={reportForm.eventSummary}
                    onChange={(e) => {
                      const val = e.target.value;
                      setReportForm((prev) => ({ ...prev, eventSummary: val }));
                      if (formErrors.eventSummary) {
                        setFormErrors((prev) => ({ ...prev, eventSummary: null }));
                      }
                    }}
                    status={formErrors.eventSummary ? 'error' : ''}
                  />
                  {formErrors.eventSummary && (
                    <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>
                      {formErrors.eventSummary}
                    </div>
                  )}
                </div>

                {/* Activities Conducted */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ marginBottom: 4 }}>
                    <Text strong style={{ color: '#0f172a' }}>Activities Conducted *</Text>
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>(Minimum 10 characters)</Text>
                  </div>
                  <TextArea
                    rows={3}
                    maxLength={5000}
                    showCount
                    placeholder="List specific workshops, presentations, hands-on labs, Q&A rounds, or competitions conducted..."
                    value={reportForm.activitiesConducted}
                    onChange={(e) => {
                      const val = e.target.value;
                      setReportForm((prev) => ({ ...prev, activitiesConducted: val }));
                      if (formErrors.activitiesConducted) {
                        setFormErrors((prev) => ({ ...prev, activitiesConducted: null }));
                      }
                    }}
                    status={formErrors.activitiesConducted ? 'error' : ''}
                  />
                  {formErrors.activitiesConducted && (
                    <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>
                      {formErrors.activitiesConducted}
                    </div>
                  )}
                </div>

                {/* Challenges Faced (Optional) */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ marginBottom: 4 }}>
                    <Text strong style={{ color: '#0f172a' }}>Challenges Faced</Text>
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>(Optional)</Text>
                  </div>
                  <TextArea
                    rows={2}
                    maxLength={2500}
                    showCount
                    placeholder="Note any AV equipment, power, internet, crowd management, or facility challenges encountered..."
                    value={reportForm.challengesFaced}
                    onChange={(e) => setReportForm((prev) => ({ ...prev, challengesFaced: e.target.value }))}
                  />
                </div>

                {/* Suggestions for Future Events (Optional) */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ marginBottom: 4 }}>
                    <Text strong style={{ color: '#0f172a' }}>Suggestions for Future Events</Text>
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>(Optional)</Text>
                  </div>
                  <TextArea
                    rows={2}
                    maxLength={2500}
                    showCount
                    placeholder="Recommendations for future sessions, venue scheduling improvements, or equipment requests..."
                    value={reportForm.suggestionsForFuture}
                    onChange={(e) => setReportForm((prev) => ({ ...prev, suggestionsForFuture: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyRequestsPage;
