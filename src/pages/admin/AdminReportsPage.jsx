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
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween.js';
import PageHeader from '../../components/PageHeader';
import {
  facultyVenueService,
  DEPARTMENTS,
  parseTimeToMinutes,
} from '../../services/facultyVenueService';
import { venueService } from '../../services/venueService';

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

  return (
    <div>
      {/* 1. Header & Breadcrumbs */}
      <PageHeader
        title="Campus Venue Utilization & Booking Analytics"
        subtitle="Institutional intelligence, departmental allocation metrics, and facility utilization reports"
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
            <Button
              icon={<ReloadOutlined />}
              onClick={handleResetFilters}
              disabled={activeFiltersCount === 0}
            >
              Reset Filters
            </Button>
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
