import React, { useState, useEffect, useMemo } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Tag,
  Typography,
  Button,
  Space,
  Select,
  DatePicker,
  Progress,
  Tooltip,
  Modal,
  Descriptions,
  Tabs,
  Badge,
  Input,
  message,
  Alert,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  BankOutlined,
  ApartmentOutlined,
  TeamOutlined,
  ReloadOutlined,
  DownloadOutlined,
  EyeOutlined,
  PieChartOutlined,
  LineChartOutlined,
  FieldTimeOutlined,
  FileDoneOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween.js';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import {
  facultyVenueService,
  DEPARTMENTS,
  parseTimeToMinutes,
} from '../../services/facultyVenueService';
import { venueService } from '../../services/venueService';
import { reportService } from '../../services/reportService';

dayjs.extend(isBetween);

const { Text, Title, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// Modern aesthetic palette for charts & visual elements
const DEPT_COLORS = [
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#0d9488', // Teal
  '#d97706', // Amber
  '#e11d48', // Rose
  '#059669', // Emerald
  '#4f46e5', // Indigo
  '#db2777', // Pink
  '#ea580c', // Orange
  '#0284c7', // Sky
];

export const AdminReportsPage = () => {
  // Master booking requests and venues state (reactively subscribed)
  const [requests, setRequests] = useState(() => facultyVenueService.getRequests());
  const [venues, setVenues] = useState(() => venueService.getVenues());

  // Filter states
  const [dateRange, setDateRange] = useState(null); // [Dayjs, Dayjs] or null
  const [selectedVenue, setSelectedVenue] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Drill-down details modal state
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Tab & Completion Reports state (Dean review)
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'completion-reports');
  const [completionReports, setCompletionReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportStatusFilter, setReportStatusFilter] = useState('ALL');
  const [reportSearchText, setReportSearchText] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [deanRemarks, setDeanRemarks] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Load completion reports from backend API
  const loadCompletionReports = async () => {
    try {
      setReportsLoading(true);
      const res = await reportService.getAllReportsAdmin({
        limit: 100,
        status: reportStatusFilter !== 'ALL' ? reportStatusFilter : undefined,
        search: reportSearchText.trim() || undefined,
      });
      if (res && res.reports) {
        setCompletionReports(res.reports);
      }
    } catch (err) {
      console.warn('Could not load completion reports:', err?.message || err);
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    loadCompletionReports();
  }, [reportStatusFilter, reportSearchText]);

  // Review handlers for Dean
  const handleApproveReport = async () => {
    if (!selectedReport) return;
    try {
      setReviewSubmitting(true);
      await reportService.reviewReport(selectedReport.id, {
        action: 'reviewed',
        dean_remarks: deanRemarks.trim() || 'Approved by Dean.',
      });
      message.success(`Completion report for "${selectedReport.booking?.event_name}" approved as Reviewed.`);
      setReviewModalVisible(false);
      setDeanRemarks('');
      await loadCompletionReports();
    } catch (err) {
      message.error(err?.message || 'Failed to approve report.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!selectedReport) return;
    if (!deanRemarks || deanRemarks.trim().length < 5) {
      message.error('Please enter revision remarks with at least 5 characters explaining what needs revision.');
      return;
    }
    try {
      setReviewSubmitting(true);
      await reportService.reviewReport(selectedReport.id, {
        action: 'revision_requested',
        dean_remarks: deanRemarks.trim(),
      });
      message.success(`Revision requested for "${selectedReport.booking?.event_name}". Faculty has been notified.`);
      setReviewModalVisible(false);
      setDeanRemarks('');
      await loadCompletionReports();
    } catch (err) {
      message.error(err?.message || 'Failed to request revision.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const pendingReportsCount = completionReports.filter((r) => r.status === 'submitted').length;

  // Subscribe to live reactive updates from services
  useEffect(() => {
    const unsubRequests = facultyVenueService.subscribe((updated) => {
      setRequests(updated);
    });
    const unsubVenues = venueService.subscribe((updated) => {
      setVenues(updated);
    });
    return () => {
      unsubRequests();
      unsubVenues();
    };
  }, []);

  // Filter application: applies Date Range, Venue, and Department filters
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // 1. Date Range Filter
      if (dateRange && dateRange[0] && dateRange[1]) {
        const startStr = dateRange[0].format('YYYY-MM-DD');
        const endStr = dateRange[1].format('YYYY-MM-DD');
        if (r.date < startStr || r.date > endStr) {
          return false;
        }
      }

      // 2. Venue Filter
      if (selectedVenue !== 'ALL') {
        const venueMatches =
          r.venueId === selectedVenue ||
          (r.venue && r.venue.toLowerCase().includes(selectedVenue.toLowerCase()));
        if (!venueMatches) return false;
      }

      // 3. Department Filter
      if (selectedDept !== 'ALL') {
        const deptMatches =
          r.department && r.department.toLowerCase() === selectedDept.toLowerCase();
        if (!deptMatches) return false;
      }

      return true;
    });
  }, [requests, dateRange, selectedVenue, selectedDept]);

  // Key KPI Statistics
  const totalBookings = filteredRequests.length;
  const approvedBookings = filteredRequests.filter((r) => r.status === 'Approved').length;
  const pendingRequests = filteredRequests.filter((r) => r.status === 'Pending').length;
  const rejectedBookings = filteredRequests.filter((r) => r.status === 'Rejected').length;
  const totalAttendees = filteredRequests.reduce(
    (sum, r) => sum + (Number(r.expectedParticipants) || 0),
    0
  );

  const approvalRate = totalBookings > 0 ? ((approvedBookings / totalBookings) * 100).toFixed(1) : 0;
  const rejectionRate = totalBookings > 0 ? ((rejectedBookings / totalBookings) * 100).toFixed(1) : 0;
  const pendingRate = totalBookings > 0 ? ((pendingRequests / totalBookings) * 100).toFixed(1) : 0;

  // Active filter count
  const activeFiltersCount =
    (dateRange ? 1 : 0) + (selectedVenue !== 'ALL' ? 1 : 0) + (selectedDept !== 'ALL' ? 1 : 0);

  // Reset all filters to default
  const handleResetFilters = () => {
    setDateRange(null);
    setSelectedVenue('ALL');
    setSelectedDept('ALL');
  };

  // Quick preset ranges
  const applyPreset = (presetType) => {
    const today = dayjs();
    if (presetType === 'ALL') {
      setDateRange(null);
    } else if (presetType === 'THIS_MONTH') {
      setDateRange([today.startOf('month'), today.endOf('month')]);
    } else if (presetType === 'LAST_30') {
      setDateRange([today.subtract(30, 'day'), today]);
    } else if (presetType === 'NEXT_60') {
      setDateRange([today, today.add(60, 'day')]);
    } else if (presetType === 'Q4_2026') {
      setDateRange([dayjs('2026-10-01'), dayjs('2026-12-31')]);
    }
  };

  // -------------------------------------------------------------
  // 5. VENUE UTILIZATION COMPUTATION
  // -------------------------------------------------------------
  const venueUtilizationData = useMemo(() => {
    return venues.map((v) => {
      // Find all filtered bookings scheduled at this venue
      const venueBookings = filteredRequests.filter(
        (r) =>
          r.venueId === v.id ||
          (r.venue && r.venue.toLowerCase().includes(v.name.toLowerCase()))
      );

      const approvedCount = venueBookings.filter((r) => r.status === 'Approved').length;
      const pendingCount = venueBookings.filter((r) => r.status === 'Pending').length;
      const rejectedCount = venueBookings.filter((r) => r.status === 'Rejected').length;

      // Estimate total duration in hours
      let totalBookedHours = 0;
      venueBookings.forEach((b) => {
        const startMin = parseTimeToMinutes(b.startTime) || 9 * 60;
        const endMin = parseTimeToMinutes(b.endTime) || 12 * 60;
        const diffHrs = Math.max(1, (endMin - startMin) / 60);
        totalBookedHours += diffHrs;
      });

      return {
        id: v.id,
        name: v.name,
        capacity: v.capacity,
        building: v.building || v.location,
        status: v.status,
        totalBookings: venueBookings.length,
        approvedCount,
        pendingCount,
        rejectedCount,
        totalBookedHours: Number(totalBookedHours.toFixed(1)),
        // Calculate relative utilization percentage (benchmark: 8 bookings = 100%)
        utilizationPct: Math.min(100, Math.round((venueBookings.length / 6) * 100)),
      };
    }).sort((a, b) => b.totalBookings - a.totalBookings);
  }, [venues, filteredRequests]);

  // Overall campus venue utilization benchmark
  const overallUtilizationRate = useMemo(() => {
    if (venueUtilizationData.length === 0) return 0;
    const avg =
      venueUtilizationData.reduce((acc, v) => acc + v.utilizationPct, 0) /
      venueUtilizationData.length;
    return Math.round(avg);
  }, [venueUtilizationData]);

  // -------------------------------------------------------------
  // 6. DEPARTMENT-WISE BOOKINGS COMPUTATION
  // -------------------------------------------------------------
  const departmentBookingData = useMemo(() => {
    const countsByDept = {};
    const approvedByDept = {};
    const pendingByDept = {};
    const rejectedByDept = {};

    filteredRequests.forEach((r) => {
      const dept = r.department || 'Unassigned Department';
      countsByDept[dept] = (countsByDept[dept] || 0) + 1;
      if (r.status === 'Approved') {
        approvedByDept[dept] = (approvedByDept[dept] || 0) + 1;
      } else if (r.status === 'Pending') {
        pendingByDept[dept] = (pendingByDept[dept] || 0) + 1;
      } else if (r.status === 'Rejected') {
        rejectedByDept[dept] = (rejectedByDept[dept] || 0) + 1;
      }
    });

    const entries = Object.keys(countsByDept).map((dept, index) => {
      const count = countsByDept[dept];
      const share = totalBookings > 0 ? Math.round((count / totalBookings) * 100) : 0;
      return {
        department: dept,
        count,
        share,
        approved: approvedByDept[dept] || 0,
        pending: pendingByDept[dept] || 0,
        rejected: rejectedByDept[dept] || 0,
        color: DEPT_COLORS[index % DEPT_COLORS.length],
      };
    });

    return entries.sort((a, b) => b.count - a.count);
  }, [filteredRequests, totalBookings]);

  // -------------------------------------------------------------
  // 7. MONTHLY BOOKING STATISTICS COMPUTATION
  // -------------------------------------------------------------
  const monthlyStatsData = useMemo(() => {
    const monthOrder = ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];
    const monthLabels = {
      '2026-08': 'Aug 2026',
      '2026-09': 'Sep 2026',
      '2026-10': 'Oct 2026',
      '2026-11': 'Nov 2026',
      '2026-12': 'Dec 2026',
    };

    const grouped = {};
    monthOrder.forEach((m) => {
      grouped[m] = {
        key: m,
        monthKey: m,
        monthLabel: monthLabels[m] || m,
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        attendees: 0,
      };
    });

    filteredRequests.forEach((r) => {
      if (!r.date) return;
      const mKey = r.date.slice(0, 7);
      if (!grouped[mKey]) {
        grouped[mKey] = {
          key: mKey,
          monthKey: mKey,
          monthLabel: dayjs(r.date).format('MMM YYYY'),
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          attendees: 0,
        };
      }
      grouped[mKey].total += 1;
      if (r.status === 'Approved') grouped[mKey].approved += 1;
      else if (r.status === 'Pending') grouped[mKey].pending += 1;
      else if (r.status === 'Rejected') grouped[mKey].rejected += 1;
      grouped[mKey].attendees += Number(r.expectedParticipants) || 0;
    });

    return Object.values(grouped).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [filteredRequests]);

  // Maximum monthly total count for SVG chart scaling
  const maxMonthlyCount = useMemo(() => {
    const maxVal = Math.max(...monthlyStatsData.map((m) => m.total), 1);
    return Math.max(maxVal, 8); // At least scale of 8 for proportional headroom
  }, [monthlyStatsData]);

  // Table Columns for Filtered Bookings Explorer Table
  const bookingTableColumns = [
    {
      title: 'Req ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id) => <Text code>{id}</Text>,
    },
    {
      title: 'Event & Purpose',
      key: 'event',
      width: 250,
      render: (_, r) => (
        <div>
          <Text strong style={{ color: '#0f172a' }}>
            {r.eventName || r.eventTitle}
          </Text>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            <TeamOutlined style={{ marginRight: 4 }} />
            {r.expectedParticipants} attendees • {r.eventType || 'Academic Event'}
          </div>
        </div>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 180,
      render: (dept) => (
        <span style={{ fontSize: 13, color: '#334155' }}>
          {dept.replace('Department of ', '')}
        </span>
      ),
    },
    {
      title: 'Venue',
      dataIndex: 'venue',
      key: 'venue',
      width: 180,
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Date & Time',
      key: 'schedule',
      width: 150,
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{dayjs(r.date).format('MMM D, YYYY')}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.timeSlot || `${r.startTime} - ${r.endTime}`}
          </Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        let color = 'default';
        let icon = null;
        if (status === 'Approved') {
          color = 'success';
          icon = <CheckCircleOutlined />;
        } else if (status === 'Pending') {
          color = 'warning';
          icon = <ClockCircleOutlined />;
        } else if (status === 'Rejected') {
          color = 'error';
          icon = <CloseCircleOutlined />;
        }
        return (
          <Tag icon={icon} color={color} style={{ fontWeight: 600 }}>
            {status}
          </Tag>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 90,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedBooking(record);
            setIsModalVisible(true);
          }}
        >
          Details
        </Button>
      ),
    },
  ];

  // Table columns for Dean Completion Reports
  const completionReportColumns = [
    {
      title: 'Report ID',
      dataIndex: 'id',
      key: 'id',
      width: 90,
      render: (id) => <Text code strong>{id}</Text>,
    },
    {
      title: 'Event & Department',
      key: 'event',
      width: 250,
      render: (_, record) => (
        <div>
          <Text strong style={{ color: '#0f172a', fontSize: 14 }}>
            {record.booking?.event_name}
          </Text>
          <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>
              {record.booking?.event_type || 'Academic'}
            </Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.booking?.department}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Faculty Submitter',
      key: 'faculty',
      width: 180,
      render: (_, record) => (
        <div>
          <Text strong style={{ color: '#334155' }}>
            {record.faculty?.name}
          </Text>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {record.faculty?.email}
          </div>
        </div>
      ),
    },
    {
      title: 'Venue & Date',
      key: 'venueDate',
      width: 200,
      render: (_, record) => (
        <div>
          <Space size={6}>
            <BankOutlined style={{ color: '#1677ff' }} />
            <Text>{record.booking?.venue_name}</Text>
          </Space>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            <CalendarOutlined style={{ marginRight: 4 }} />
            {record.booking?.event_date}
          </div>
        </div>
      ),
    },
    {
      title: 'Attendance (Actual / Expected)',
      key: 'attendance',
      width: 190,
      render: (_, record) => {
        const expected = record.booking?.expected_participants || 0;
        const actual = record.actual_participants;
        const pct = record.attendance_percentage;
        const color = pct >= 80 ? 'green' : pct >= 50 ? 'blue' : 'orange';

        return (
          <div>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>
              {actual} / {expected} Attendees
            </div>
            <div style={{ marginTop: 2 }}>
              <Tag color={color} style={{ fontSize: 11, fontWeight: 600 }}>
                {pct}% Attendance
              </Tag>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Submission Date',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 130,
      render: (d) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {d ? dayjs(d).format('YYYY-MM-DD') : '—'}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      render: (status) => {
        if (status === 'reviewed') {
          return <Tag color="success" icon={<CheckCircleOutlined />}>Reviewed</Tag>;
        }
        if (status === 'revision_requested') {
          return <Tag color="warning" icon={<ExclamationCircleOutlined />}>Revision Requested</Tag>;
        }
        return <Tag color="processing" icon={<ClockCircleOutlined />}>Submitted</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 130,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          ghost={record.status === 'reviewed'}
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedReport(record);
            setDeanRemarks(record.dean_remarks || '');
            setReviewModalVisible(true);
          }}
        >
          {record.status === 'reviewed' ? 'View Details' : 'Review Report'}
        </Button>
      ),
    },
  ];

  const completionReportsContent = (
    <div>
      {/* Metrics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 13 }}>Total Reports</span>}
              value={completionReports.length}
              prefix={<FileDoneOutlined style={{ color: '#1677ff', marginRight: 8 }} />}
              valueStyle={{ color: '#0f172a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 13 }}>Awaiting Dean Review</span>}
              value={pendingReportsCount}
              prefix={<ClockCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />}
              valueStyle={{ color: '#d97706', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 13 }}>Revisions Requested</span>}
              value={completionReports.filter((r) => r.status === 'revision_requested').length}
              prefix={<ExclamationCircleOutlined style={{ color: '#ea580c', marginRight: 8 }} />}
              valueStyle={{ color: '#ea580c', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 13 }}>Approved & Reviewed</span>}
              value={completionReports.filter((r) => r.status === 'reviewed').length}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />}
              valueStyle={{ color: '#16a34a', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Reports Table Card */}
      <Card
        bordered
        style={{ borderRadius: 8, borderColor: '#e2e8f0' }}
        title={
          <Row gutter={[16, 12]} justify="space-between" align="middle" style={{ width: '100%' }}>
            <Col xs={24} sm={12} md={8}>
              <Input
                placeholder="Search event, faculty, venue, department..."
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                value={reportSearchText}
                onChange={(e) => setReportSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={10} style={{ textAlign: 'right' }}>
              <Space>
                <Text style={{ fontSize: 13, color: '#64748b' }}>Status:</Text>
                <Select
                  value={reportStatusFilter}
                  onChange={(val) => setReportStatusFilter(val)}
                  style={{ width: 170 }}
                >
                  <Option value="ALL">All Statuses</Option>
                  <Option value="submitted">Submitted (Pending)</Option>
                  <Option value="revision_requested">Revision Requested</Option>
                  <Option value="reviewed">Reviewed & Approved</Option>
                </Select>
                <Button icon={<ReloadOutlined />} onClick={loadCompletionReports} loading={reportsLoading}>
                  Refresh
                </Button>
              </Space>
            </Col>
          </Row>
        }
      >
        <Table
          columns={completionReportColumns}
          dataSource={completionReports}
          rowKey="id"
          loading={reportsLoading}
          scroll={{ x: 1250 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          locale={{
            emptyText: 'No event completion reports found matching current criteria.',
          }}
        />
      </Card>
    </div>
  );

  return (
    <div>
      {/* 1. Header & Breadcrumbs */}
      <PageHeader
        title="Institutional Reports & Completion Review"
        subtitle="Review faculty event completion reports, track actual attendance, and monitor venue utilization analytics"
        breadcrumbItems={[
          { title: 'Home', path: '/' },
          { title: 'Admin', path: '/admin/dashboard' },
          { title: 'Reports' },
        ]}
        tags={
          activeFiltersCount > 0 ? (
            <Tag color="processing">{activeFiltersCount} Filters Active</Tag>
          ) : (
            <Tag color="default">All Historical Data</Tag>
          )
        }
        extra={
          <Space>
            {activeTab === 'analytics' && (
              <Button
                icon={<ReloadOutlined />}
                onClick={handleResetFilters}
                disabled={activeFiltersCount === 0}
              >
                Reset Filters
              </Button>
            )}
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => window.print()}
            >
              Print / Export Report
            </Button>
          </Space>
        }
      />

      {/* Tabs navigation between Completion Reports and Booking Analytics */}
      <Tabs
        activeKey={activeTab}
        onChange={(k) => {
          setActiveTab(k);
          setSearchParams({ tab: k });
        }}
        type="card"
        style={{ marginBottom: 20 }}
        items={[
          {
            key: 'completion-reports',
            label: (
              <Space size={6}>
                <FileDoneOutlined />
                <span>Faculty Event Completion Reports</span>
                {pendingReportsCount > 0 && (
                  <Badge count={pendingReportsCount} style={{ backgroundColor: '#f59e0b' }} />
                )}
              </Space>
            ),
            children: completionReportsContent,
          },
          {
            key: 'analytics',
            label: (
              <Space size={6}>
                <LineChartOutlined />
                <span>Venue Utilization & Booking Analytics</span>
              </Space>
            ),
            children: (
              <div>
                {/* 2. Interactive Filter Controls Card */}
                <Card
                  bordered
                  style={{
                    borderRadius: 10,
                    borderColor: '#e2e8f0',
          marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          {/* Date Range Picker */}
          <Col xs={24} md={10} lg={8}>
            <div style={{ marginBottom: 4, fontWeight: 600, color: '#475569', fontSize: 13 }}>
              <CalendarOutlined style={{ marginRight: 6, color: '#1677ff' }} />
              Date Range Filter:
            </div>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
              allowClear
              placeholder={['Start Date', 'End Date']}
              format="YYYY-MM-DD"
            />
          </Col>

          {/* Venue Dropdown Filter */}
          <Col xs={24} sm={12} md={7} lg={8}>
            <div style={{ marginBottom: 4, fontWeight: 600, color: '#475569', fontSize: 13 }}>
              <BankOutlined style={{ marginRight: 6, color: '#1677ff' }} />
              Venue Filter:
            </div>
            <Select
              value={selectedVenue}
              onChange={setSelectedVenue}
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="children"
            >
              <Option value="ALL">All Campus Venues ({venues.length})</Option>
              {venues.map((v) => (
                <Option key={v.id} value={v.id}>
                  {v.name} ({v.capacity} pax)
                </Option>
              ))}
            </Select>
          </Col>

          {/* Department Dropdown Filter */}
          <Col xs={24} sm={12} md={7} lg={8}>
            <div style={{ marginBottom: 4, fontWeight: 600, color: '#475569', fontSize: 13 }}>
              <ApartmentOutlined style={{ marginRight: 6, color: '#1677ff' }} />
              Department Filter:
            </div>
            <Select
              value={selectedDept}
              onChange={setSelectedDept}
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="children"
            >
              <Option value="ALL">All Departments ({DEPARTMENTS.length})</Option>
              {DEPARTMENTS.map((dept) => (
                <Option key={dept} value={dept}>
                  {dept}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>

        {/* Quick Date Range Preset Buttons */}
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <Space size={6} wrap>
            <span style={{ fontSize: 12, color: '#64748b', marginRight: 4 }}>
              Quick Presets:
            </span>
            <Button size="small" onClick={() => applyPreset('ALL')}>
              All Time
            </Button>
            <Button size="small" onClick={() => applyPreset('THIS_MONTH')}>
              Current Month
            </Button>
            <Button size="small" onClick={() => applyPreset('LAST_30')}>
              Last 30 Days
            </Button>
            <Button size="small" onClick={() => applyPreset('NEXT_60')}>
              Next 60 Days
            </Button>
            <Button size="small" onClick={() => applyPreset('Q4_2026')}>
              Q4 2026
            </Button>
          </Space>

          <Text type="secondary" style={{ fontSize: 12 }}>
            Showing <strong>{filteredRequests.length}</strong> matching records
          </Text>
        </div>
      </Card>

      {/* 3. Primary KPI Summary Cards (Items 1, 2, 3, 4) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Total Bookings */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered
            style={{
              borderRadius: 10,
              borderColor: '#e2e8f0',
              borderLeft: '4px solid #1677ff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <Statistic
              title={<span style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>1. Total Bookings</span>}
              value={totalBookings}
              prefix={<CalendarOutlined style={{ color: '#1677ff', marginRight: 8 }} />}
              valueStyle={{ fontWeight: 800, fontSize: 26, color: '#0f172a' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
              {totalAttendees.toLocaleString()} attendees represented
            </div>
          </Card>
        </Col>

        {/* Approved Bookings */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered
            style={{
              borderRadius: 10,
              borderColor: '#e2e8f0',
              borderLeft: '4px solid #16a34a',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <Statistic
              title={<span style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>2. Approved Bookings</span>}
              value={approvedBookings}
              prefix={<CheckCircleOutlined style={{ color: '#16a34a', marginRight: 8 }} />}
              valueStyle={{ fontWeight: 800, fontSize: 26, color: '#16a34a' }}
              suffix={
                <Tag color="success" style={{ marginLeft: 8, fontSize: 11, fontWeight: 600 }}>
                  {approvalRate}%
                </Tag>
              }
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
              Confirmed on campus calendar
            </div>
          </Card>
        </Col>

        {/* Pending Requests */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered
            style={{
              borderRadius: 10,
              borderColor: '#e2e8f0',
              borderLeft: '4px solid #d97706',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <Statistic
              title={<span style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>3. Pending Requests</span>}
              value={pendingRequests}
              prefix={<ClockCircleOutlined style={{ color: '#d97706', marginRight: 8 }} />}
              valueStyle={{ fontWeight: 800, fontSize: 26, color: '#d97706' }}
              suffix={
                <Tag color="warning" style={{ marginLeft: 8, fontSize: 11, fontWeight: 600 }}>
                  {pendingRate}%
                </Tag>
              }
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
              Requires administrative review
            </div>
          </Card>
        </Col>

        {/* Rejected Bookings */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered
            style={{
              borderRadius: 10,
              borderColor: '#e2e8f0',
              borderLeft: '4px solid #dc2626',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <Statistic
              title={<span style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>4. Rejected Bookings</span>}
              value={rejectedBookings}
              prefix={<CloseCircleOutlined style={{ color: '#dc2626', marginRight: 8 }} />}
              valueStyle={{ fontWeight: 800, fontSize: 26, color: '#dc2626' }}
              suffix={
                <Tag color="error" style={{ marginLeft: 8, fontSize: 11, fontWeight: 600 }}>
                  {rejectionRate}%
                </Tag>
              }
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
              Declined with remarks
            </div>
          </Card>
        </Col>
      </Row>

      {/* 4. Monthly Booking Statistics (Item 7) */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div>
              <Title level={5} style={{ margin: 0, color: '#0f172a' }}>
                <LineChartOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                7. Monthly Booking Statistics & Trend Analysis
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Month-by-month volume breakdown of total, approved, pending, and rejected bookings
              </Text>
            </div>
            {/* Legend */}
            <Space size={14} style={{ marginTop: 4 }}>
              <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, background: '#16a34a', borderRadius: 2 }} />
                Approved
              </span>
              <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, background: '#d97706', borderRadius: 2 }} />
                Pending
              </span>
              <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, background: '#dc2626', borderRadius: 2 }} />
                Rejected
              </span>
            </Space>
          </div>
        }
        bordered
        style={{ borderRadius: 10, borderColor: '#e2e8f0', marginBottom: 20 }}
      >
        {/* SVG Interactive Multi-Bar Monthly Chart */}
        <div style={{ width: '100%', overflowX: 'auto', padding: '16px 8px 8px 8px' }}>
          <div style={{ minWidth: 640 }}>
            <svg viewBox="0 0 740 220" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
              {/* Background Grid Lines & Y-Axis Labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = 170 - ratio * 140;
                const val = Math.round(ratio * maxMonthlyCount);
                return (
                  <g key={ratio}>
                    <line x1="45" y1={y} x2="720" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                    <text x="35" y={y + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Baseline */}
              <line x1="45" y1="170" x2="720" y2="170" stroke="#cbd5e1" strokeWidth="1.5" />

              {/* Monthly Grouped Columns */}
              {monthlyStatsData.map((m, index) => {
                const groupWidth = 110;
                const groupX = 60 + index * 135;
                const barWidth = 24;

                const approvedHeight = (m.approved / maxMonthlyCount) * 140;
                const pendingHeight = (m.pending / maxMonthlyCount) * 140;
                const rejectedHeight = (m.rejected / maxMonthlyCount) * 140;

                const yApproved = 170 - approvedHeight;
                const yPending = 170 - pendingHeight;
                const yRejected = 170 - rejectedHeight;

                return (
                  <g key={m.monthKey} style={{ cursor: 'pointer' }}>
                    {/* Month Column Container Highlight */}
                    <rect
                      x={groupX - 10}
                      y="20"
                      width={groupWidth}
                      height="150"
                      fill="transparent"
                      rx="4"
                    />

                    {/* Approved Bar */}
                    <Tooltip
                      title={`${m.monthLabel}: ${m.approved} Approved Booking${
                        m.approved === 1 ? '' : 's'
                      }`}
                    >
                      <rect
                        x={groupX}
                        y={yApproved}
                        width={barWidth}
                        height={Math.max(approvedHeight, 3)}
                        fill="#16a34a"
                        rx="3"
                      />
                    </Tooltip>
                    {m.approved > 0 && (
                      <text
                        x={groupX + barWidth / 2}
                        y={yApproved - 4}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="600"
                        fill="#16a34a"
                      >
                        {m.approved}
                      </text>
                    )}

                    {/* Pending Bar */}
                    <Tooltip
                      title={`${m.monthLabel}: ${m.pending} Pending Request${
                        m.pending === 1 ? '' : 's'
                      }`}
                    >
                      <rect
                        x={groupX + barWidth + 6}
                        y={yPending}
                        width={barWidth}
                        height={Math.max(pendingHeight, 3)}
                        fill="#d97706"
                        rx="3"
                      />
                    </Tooltip>
                    {m.pending > 0 && (
                      <text
                        x={groupX + barWidth + 6 + barWidth / 2}
                        y={yPending - 4}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="600"
                        fill="#d97706"
                      >
                        {m.pending}
                      </text>
                    )}

                    {/* Rejected Bar */}
                    <Tooltip
                      title={`${m.monthLabel}: ${m.rejected} Rejected Booking${
                        m.rejected === 1 ? '' : 's'
                      }`}
                    >
                      <rect
                        x={groupX + (barWidth + 6) * 2}
                        y={yRejected}
                        width={barWidth}
                        height={Math.max(rejectedHeight, 3)}
                        fill="#dc2626"
                        rx="3"
                      />
                    </Tooltip>
                    {m.rejected > 0 && (
                      <text
                        x={groupX + (barWidth + 6) * 2 + barWidth / 2}
                        y={yRejected - 4}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="600"
                        fill="#dc2626"
                      >
                        {m.rejected}
                      </text>
                    )}

                    {/* X-Axis Month Label */}
                    <text
                      x={groupX + 40}
                      y="192"
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="600"
                      fill="#334155"
                    >
                      {m.monthLabel}
                    </text>

                    {/* Total pill below */}
                    <text
                      x={groupX + 40}
                      y="208"
                      textAnchor="middle"
                      fontSize="11"
                      fill="#64748b"
                    >
                      {m.total} total
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Monthly Summary Breakdown Table */}
        <div style={{ marginTop: 16 }}>
          <Table
            size="small"
            pagination={false}
            dataSource={monthlyStatsData}
            columns={[
              {
                title: 'Billing Period',
                dataIndex: 'monthLabel',
                key: 'monthLabel',
                render: (m) => <Text strong>{m}</Text>,
              },
              {
                title: 'Total Requests',
                dataIndex: 'total',
                key: 'total',
                align: 'center',
                render: (t) => <Text strong>{t}</Text>,
              },
              {
                title: 'Approved',
                dataIndex: 'approved',
                key: 'approved',
                align: 'center',
                render: (a) => (
                  <Tag color="success" style={{ fontWeight: 600 }}>
                    {a}
                  </Tag>
                ),
              },
              {
                title: 'Pending',
                dataIndex: 'pending',
                key: 'pending',
                align: 'center',
                render: (p) => (
                  <Tag color="warning" style={{ fontWeight: 600 }}>
                    {p}
                  </Tag>
                ),
              },
              {
                title: 'Rejected',
                dataIndex: 'rejected',
                key: 'rejected',
                align: 'center',
                render: (r) => (
                  <Tag color="error" style={{ fontWeight: 600 }}>
                    {r}
                  </Tag>
                ),
              },
              {
                title: 'Approval Rate',
                key: 'rate',
                align: 'center',
                render: (_, r) => {
                  const rate = r.total > 0 ? ((r.approved / r.total) * 100).toFixed(0) : 0;
                  return `${rate}%`;
                },
              },
              {
                title: 'Expected Attendees',
                dataIndex: 'attendees',
                key: 'attendees',
                align: 'right',
                render: (att) => `${att.toLocaleString()} pax`,
              },
            ]}
          />
        </div>
      </Card>

      {/* 5. Venue Utilization (Item 5) & 6. Department-Wise Bookings (Item 6) */}
      <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
        {/* Item 5: Venue Utilization */}
        <Col xs={24} xl={13}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div>
                  <Title level={5} style={{ margin: 0, color: '#0f172a' }}>
                    <BankOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                    5. Campus Venue Utilization Matrix
                  </Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Facility occupancy volume, estimated booked hours, and capacity allocation
                  </Text>
                </div>
                <Tag color="blue" style={{ fontWeight: 600 }}>
                  {overallUtilizationRate}% Campus Index
                </Tag>
              </div>
            }
            bordered
            style={{ borderRadius: 10, borderColor: '#e2e8f0', height: '100%' }}
          >
            {/* Top Utilization Indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '12px 16px',
                background: '#f8fafc',
                borderRadius: 8,
                marginBottom: 16,
                border: '1px solid #f1f5f9',
              }}
            >
              <Progress
                type="dashboard"
                percent={overallUtilizationRate}
                size={70}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
              <div>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>
                  Overall Campus Facility Utilization
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Based on {totalBookings} total reservations across {venues.length} active university venues.
                </div>
              </div>
            </div>

            {/* List of Venues with Utilization Progress */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {venueUtilizationData.map((v) => (
                <div
                  key={v.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: '#ffffff',
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Text strong style={{ color: '#0f172a', fontSize: 13 }}>
                        {v.name}
                      </Text>
                      <Tag style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>
                        {v.capacity} pax
                      </Tag>
                    </div>
                    <Space size={6}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1677ff' }}>
                        {v.totalBookings} Bookings
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        ({v.totalBookedHours} hrs)
                      </span>
                    </Space>
                  </div>

                  <Progress
                    percent={v.utilizationPct}
                    status={v.totalBookings > 0 ? 'active' : 'normal'}
                    strokeColor={
                      v.utilizationPct >= 70
                        ? '#1677ff'
                        : v.utilizationPct >= 40
                        ? '#0d9488'
                        : '#94a3b8'
                    }
                    format={(percent) => `${percent}% demand`}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    <span>{v.building}</span>
                    <Space size={8}>
                      <span style={{ color: '#16a34a' }}>✓ {v.approvedCount} Confirmed</span>
                      {v.pendingCount > 0 && <span style={{ color: '#d97706' }}>• {v.pendingCount} Pending</span>}
                    </Space>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* Item 6: Department-Wise Bookings */}
        <Col xs={24} xl={11}>
          <Card
            title={
              <div>
                <Title level={5} style={{ margin: 0, color: '#0f172a' }}>
                  <ApartmentOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                  6. Department-Wise Booking Distribution
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Facility reservation share and allocation by academic department
                </Text>
              </div>
            }
            bordered
            style={{ borderRadius: 10, borderColor: '#e2e8f0', height: '100%' }}
          >
            {/* Top Requesting Department Spotlight */}
            {departmentBookingData.length > 0 && (
              <div
                style={{
                  padding: '12px 16px',
                  background: '#f0fdf4',
                  borderRadius: 8,
                  marginBottom: 16,
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <PieChartOutlined style={{ fontSize: 24, color: '#16a34a' }} />
                <div>
                  <div style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>
                    Leading Faculty Department
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#14532d' }}>
                    {departmentBookingData[0].department}
                  </div>
                  <div style={{ fontSize: 11, color: '#15803d', marginTop: 2 }}>
                    Originating <strong>{departmentBookingData[0].count} bookings</strong> ({departmentBookingData[0].share}% of all requests).
                  </div>
                </div>
              </div>
            )}

            {/* Department Horizontal Ranking Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {departmentBookingData.map((d) => (
                <div
                  key={d.department}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: d.color,
                        }}
                      />
                      <Text strong style={{ fontSize: 12, color: '#1e293b' }}>
                        {d.department.replace('Department of ', '')}
                      </Text>
                    </div>
                    <Space size={6}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: d.color }}>
                        {d.count} ({d.share}%)
                      </span>
                    </Space>
                  </div>

                  <Progress
                    percent={d.share}
                    showInfo={false}
                    strokeColor={d.color}
                    size="small"
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 3 }}>
                    <span style={{ color: '#16a34a' }}>{d.approved} approved</span>
                    {d.pending > 0 && <span style={{ color: '#d97706' }}>{d.pending} pending</span>}
                    {d.rejected > 0 && <span style={{ color: '#dc2626' }}>{d.rejected} rejected</span>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 8. Filtered Booking Data Explorer Table */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <Title level={5} style={{ margin: 0, color: '#0f172a' }}>
                <FieldTimeOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                Filtered Booking Records ({filteredRequests.length})
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Live records from the application's booking engine feeding the above reports
              </Text>
            </div>
            <Space>
              <Tag color="blue">{totalBookings} Total</Tag>
              <Tag color="green">{approvedBookings} Approved</Tag>
              <Tag color="gold">{pendingRequests} Pending</Tag>
              <Tag color="red">{rejectedBookings} Rejected</Tag>
            </Space>
          </div>
        }
        bordered
        style={{ borderRadius: 10, borderColor: '#e2e8f0' }}
      >
        <Table
          dataSource={filteredRequests}
          columns={bookingTableColumns}
          rowKey="id"
          scroll={{ x: 1070 }}
          pagination={{ pageSize: 8, showSizeChanger: true }}
          size="middle"
        />
      </Card>
              </div>
            ),
          },
        ]}
      />

      {/* Dean Review Modal */}
      <Modal
        open={reviewModalVisible}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileDoneOutlined style={{ color: '#1677ff', fontSize: 18 }} />
            <span style={{ fontSize: 17, fontWeight: 600 }}>Review Event Completion Report</span>
            {selectedReport && (
              <Tag color={selectedReport.status === 'reviewed' ? 'success' : selectedReport.status === 'revision_requested' ? 'warning' : 'processing'}>
                {selectedReport.status === 'reviewed' ? 'Reviewed' : selectedReport.status === 'revision_requested' ? 'Revision Requested' : 'Submitted (Awaiting Review)'}
              </Tag>
            )}
          </div>
        }
        width={760}
        onCancel={() => {
          setReviewModalVisible(false);
          setDeanRemarks('');
        }}
        footer={
          selectedReport?.status === 'reviewed'
            ? [
                <Button key="close" type="primary" onClick={() => setReviewModalVisible(false)}>
                  Close
                </Button>,
              ]
            : [
                <Button
                  key="cancel"
                  onClick={() => {
                    setReviewModalVisible(false);
                    setDeanRemarks('');
                  }}
                >
                  Cancel
                </Button>,
                <Button
                  key="revision"
                  danger
                  loading={reviewSubmitting}
                  icon={<EditOutlined />}
                  onClick={handleRequestRevision}
                >
                  Request Revision
                </Button>,
                <Button
                  key="approve"
                  type="primary"
                  loading={reviewSubmitting}
                  icon={<CheckOutlined />}
                  onClick={handleApproveReport}
                >
                  Mark as Reviewed
                </Button>,
              ]
        }
      >
        {selectedReport && (
          <div style={{ marginTop: 8 }}>
            {/* Header info */}
            <Card size="small" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', marginBottom: 16 }}>
              <Row gutter={[16, 8]} align="middle">
                <Col xs={24} sm={16}>
                  <Text strong style={{ fontSize: 16, color: '#0f172a' }}>
                    {selectedReport.booking?.event_name}
                  </Text>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                    <BankOutlined style={{ marginRight: 5, color: '#1677ff' }} />
                    {selectedReport.booking?.venue_name} &bull; <CalendarOutlined style={{ margin: '0 5px' }} />
                    {selectedReport.booking?.event_date} ({selectedReport.booking?.start_time} - {selectedReport.booking?.end_time})
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                    <strong>Faculty:</strong> {selectedReport.faculty?.name} ({selectedReport.faculty?.email}) &bull; {selectedReport.booking?.department}
                  </div>
                </Col>
                <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
                  <Tag color="blue" style={{ fontSize: 12, padding: '2px 8px' }}>
                    {selectedReport.booking?.event_type || 'Academic Event'}
                  </Tag>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                    Report ID: <Text code>{selectedReport.id}</Text>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Attendance Analytics Card */}
            <Card size="small" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', marginBottom: 16 }}>
              <Row gutter={[16, 8]} align="middle">
                <Col xs={8}>
                  <Statistic
                    title={<span style={{ fontSize: 12, color: '#166534' }}>Planned Attendance</span>}
                    value={selectedReport.booking?.expected_participants || 0}
                    valueStyle={{ fontSize: 18, fontWeight: 700, color: '#14532d' }}
                    suffix="expected"
                  />
                </Col>
                <Col xs={8}>
                  <Statistic
                    title={<span style={{ fontSize: 12, color: '#166534' }}>Actual Attendance</span>}
                    value={selectedReport.actual_participants}
                    valueStyle={{ fontSize: 18, fontWeight: 700, color: '#15803d' }}
                    suffix="actual"
                  />
                </Col>
                <Col xs={8}>
                  <Statistic
                    title={<span style={{ fontSize: 12, color: '#166534' }}>Attendance Rate</span>}
                    value={selectedReport.attendance_percentage}
                    valueStyle={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}
                    suffix="%"
                  />
                </Col>
              </Row>
            </Card>

            {/* Existing Review Status Banner */}
            {selectedReport.status === 'reviewed' && (
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                message={<Text strong style={{ color: '#166534' }}>Report Reviewed & Approved</Text>}
                description={
                  <div style={{ color: '#14532d', marginTop: 4 }}>
                    Reviewed by <strong>{selectedReport.reviewer?.name || 'Dean'}</strong> on{' '}
                    {dayjs(selectedReport.reviewed_at).format('YYYY-MM-DD hh:mm A')}.
                    {selectedReport.dean_remarks && (
                      <div style={{ marginTop: 4 }}>
                        <strong>Dean Remarks:</strong> {selectedReport.dean_remarks}
                      </div>
                    )}
                  </div>
                }
                style={{ marginBottom: 16 }}
              />
            )}

            {selectedReport.status === 'revision_requested' && (
              <Alert
                type="warning"
                showIcon
                icon={<ExclamationCircleOutlined />}
                message={<Text strong style={{ color: '#92400e' }}>Revision Requested</Text>}
                description={
                  <div style={{ color: '#78350f', marginTop: 4 }}>
                    Requested on {dayjs(selectedReport.reviewed_at).format('YYYY-MM-DD hh:mm A')}.
                    <div style={{ marginTop: 4 }}>
                      <strong>Current Remarks:</strong> {selectedReport.dean_remarks}
                    </div>
                  </div>
                }
                style={{ marginBottom: 16 }}
              />
            )}

            {/* Report Content Descriptions */}
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Event Summary">
                <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#334155' }}>
                  {selectedReport.event_summary}
                </Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label="Activities Conducted">
                <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#334155' }}>
                  {selectedReport.activities_conducted}
                </Paragraph>
              </Descriptions.Item>
              {selectedReport.challenges_faced && (
                <Descriptions.Item label="Challenges Faced">
                  <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#334155' }}>
                    {selectedReport.challenges_faced}
                  </Paragraph>
                </Descriptions.Item>
              )}
              {selectedReport.suggestions_for_future && (
                <Descriptions.Item label="Suggestions for Future">
                  <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#334155' }}>
                    {selectedReport.suggestions_for_future}
                  </Paragraph>
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Review Action Controls */}
            {selectedReport.status !== 'reviewed' && (
              <Card size="small" style={{ backgroundColor: '#fffbeb', borderColor: '#fef3c7' }}>
                <div style={{ marginBottom: 6 }}>
                  <Text strong style={{ color: '#92400e' }}>
                    Dean Remarks / Review Feedback
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                    (Required when requesting a revision; optional for approval)
                  </Text>
                </div>
                <Input.TextArea
                  rows={3}
                  maxLength={2000}
                  showCount
                  placeholder="Enter remarks for the faculty member. If requesting a revision, specify exactly what needs adjustment (minimum 5 characters)..."
                  value={deanRemarks}
                  onChange={(e) => setDeanRemarks(e.target.value)}
                />
              </Card>
            )}
          </div>
        )}
      </Modal>

      {/* Details Modal */}
      <Modal
        title={
          <Space>
            <BankOutlined style={{ color: '#1677ff' }} />
            <span>Booking Request Details</span>
            {selectedBooking?.id && <Tag>{selectedBooking.id}</Tag>}
          </Space>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={680}
      >
        {selectedBooking && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="Event Title" span={2}>
              <Text strong>{selectedBooking.eventName || selectedBooking.eventTitle}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Department" span={2}>
              {selectedBooking.department}
            </Descriptions.Item>
            <Descriptions.Item label="Faculty In-Charge">
              {selectedBooking.facultyName || 'Faculty Member'}
            </Descriptions.Item>
            <Descriptions.Item label="Event Category">
              {selectedBooking.eventType || 'Academic Event'}
            </Descriptions.Item>
            <Descriptions.Item label="Venue">
              <Tag color="blue">{selectedBooking.venue}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Date & Time Slot">
              {selectedBooking.date} • {selectedBooking.timeSlot}
            </Descriptions.Item>
            <Descriptions.Item label="Expected Attendees">
              {selectedBooking.expectedParticipants} participants
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag
                color={
                  selectedBooking.status === 'Approved'
                    ? 'success'
                    : selectedBooking.status === 'Pending'
                    ? 'warning'
                    : 'error'
                }
                style={{ fontWeight: 600 }}
              >
                {selectedBooking.status}
              </Tag>
            </Descriptions.Item>
            {selectedBooking.description && (
              <Descriptions.Item label="Event Description" span={2}>
                <Paragraph style={{ margin: 0 }}>{selectedBooking.description}</Paragraph>
              </Descriptions.Item>
            )}
            {selectedBooking.rejectionReason && (
              <Descriptions.Item label="Rejection Reason" span={2}>
                <Text type="danger">{selectedBooking.rejectionReason}</Text>
              </Descriptions.Item>
            )}
            {selectedBooking.reviewedBy && (
              <Descriptions.Item label="Reviewed By">
                {selectedBooking.reviewedBy}
              </Descriptions.Item>
            )}
            {selectedBooking.submittedOn && (
              <Descriptions.Item label="Submission Date">
                {selectedBooking.submittedOn}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default AdminReportsPage;
