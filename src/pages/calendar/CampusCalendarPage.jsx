import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Card,
  Row,
  Col,
  Select,
  DatePicker,
  Button,
  Tag,
  Typography,
  Modal,
  Descriptions,
  Space,
  Radio,
  Empty,
  Alert,
  message,
} from 'antd';
import {
  CalendarOutlined,
  BankOutlined,
  ApartmentOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  FilterOutlined,
  LockOutlined,
  ArrowRightOutlined,
  PlusCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../services/useAuth';
import {
  calendarService,
  CALENDAR_STATUS,
  STATUS_COLORS,
} from '../../services/calendarService';
import { DEPARTMENTS } from '../../services/facultyVenueService';
import { ROLES } from '../../utils/constants';
import './CampusCalendar.css';

const { Text, Paragraph } = Typography;

export const CampusCalendarPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || ROLES.STUDENT;

  // Active bookings from calendar service
  const [allBookings, setAllBookings] = useState(() => calendarService.getAllBookings());
  const [venuesList, setVenuesList] = useState(() => calendarService.getVenuesList());

  // Filter States
  const [selectedVenue, setSelectedVenue] = useState('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  // Faculty view mode: 'AVAILABILITY' (View venue availability) or 'MY_BOOKINGS' (View own approved bookings)
  const [facultyViewMode, setFacultyViewMode] = useState(
    role === ROLES.FACULTY ? 'MY_BOOKINGS' : 'AVAILABILITY'
  );

  // Calendar Date State (defaults to October 2026 where rich bookings exist)
  const [calendarDate, setCalendarDate] = useState(() => dayjs('2026-10-01'));
  // Selected date for day agenda view
  const [selectedDate, setSelectedDate] = useState(() => dayjs('2026-10-01'));

  // Booking Details Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Subscribe to live updates across faculty requests and venue updates
  useEffect(() => {
    const unsubscribe = calendarService.subscribe((updated) => {
      setAllBookings(updated);
      setVenuesList(calendarService.getVenuesList());
    });
    return () => unsubscribe();
  }, []);

  // Compute filtered bookings according to user role and active filters
  const filteredBookings = useMemo(() => {
    return calendarService.getFilteredBookings({
      bookings: allBookings,
      venue: selectedVenue,
      department: selectedDepartment,
      status: statusFilter,
      role: role,
      facultyUser: user,
      viewMyOnly: role === ROLES.FACULTY && facultyViewMode === 'MY_BOOKINGS',
    });
  }, [allBookings, selectedVenue, selectedDepartment, statusFilter, role, user, facultyViewMode]);

  // Map of bookings grouped by Date (YYYY-MM-DD)
  const bookingsByDate = useMemo(() => {
    const map = new Map();
    filteredBookings.forEach((b) => {
      if (!map.has(b.date)) {
        map.set(b.date, []);
      }
      map.get(b.date).push(b);
    });
    return map;
  }, [filteredBookings]);

  // Statistics Summary
  const stats = useMemo(() => {
    const bookedCount = filteredBookings.filter((b) => b.status === CALENDAR_STATUS.BOOKED).length;
    const pendingCount = filteredBookings.filter((b) => b.status === CALENDAR_STATUS.PENDING).length;
    const totalCount = filteredBookings.length;
    return { bookedCount, pendingCount, totalCount };
  }, [filteredBookings]);

  // Handle clicking a booking item to open modal
  const handleOpenBookingModal = (booking) => {
    setSelectedBooking(booking);
    setModalVisible(true);
  };

  // Handle clicking a calendar cell
  const handleDateSelect = (date) => {
    if (date && date.day() === 0) {
      message.warning('Venue booking is not available on Sundays. Please select another date.');
    }
    setSelectedDate(date);
    setCalendarDate(date);
  };

  // Handle jump-to date filter
  const handleDatePickerChange = (date) => {
    if (date) {
      if (date.day() === 0) {
        message.warning('Venue booking is not available on Sundays. Please select another date.');
        return;
      }
      setSelectedDate(date);
      setCalendarDate(date);
    }
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    setSelectedVenue('ALL');
    setSelectedDepartment('ALL');
    setStatusFilter('ALL');
    if (role === ROLES.FACULTY) {
      setFacultyViewMode('MY_BOOKINGS');
    }
  };

  // Ant Design Calendar Custom Cell Render
  const dateCellRender = (current) => {
    // Requirement 1 & 7: College venues are NOT available on Sundays
    if (current.day() === 0) {
      return (
        <div className="calendar-cell-events">
          <div className="calendar-event-pill status-sunday-closed">
            <span className="pill-title">Closed on Sundays</span>
          </div>
        </div>
      );
    }

    const dateStr = current.format('YYYY-MM-DD');
    let items = bookingsByDate.get(dateStr) || [];

    // If venue is filtered or Faculty is viewing venue availability, inject available slot indicators
    const isSingleVenueSelected = selectedVenue && selectedVenue !== 'ALL';
    const showAvailabilitySlots =
      (role === ROLES.FACULTY && facultyViewMode === 'AVAILABILITY') ||
      isSingleVenueSelected;

    if (showAvailabilitySlots && isSingleVenueSelected) {
      const avail = calendarService.getVenueAvailabilityForDate(selectedVenue, dateStr);
      // Only append if matching status filter
      if (statusFilter === 'ALL' || statusFilter === CALENDAR_STATUS.AVAILABLE) {
        items = [...items, ...avail];
      }
    }

    if (items.length === 0) {
      return null;
    }

    return (
      <div className="calendar-cell-events">
        {items.slice(0, 3).map((item) => {
          const statusClass =
            item.status === CALENDAR_STATUS.AVAILABLE
              ? 'status-available'
              : item.status === CALENDAR_STATUS.PENDING
              ? 'status-pending'
              : 'status-booked';

          return (
            <div
              key={item.id}
              className={`calendar-event-pill ${statusClass}`}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenBookingModal(item);
              }}
              title={`${item.event} (${item.venue}) - ${item.status}`}
            >
              <span className="pill-time">
                {item.startTime ? item.startTime.split(' ')[0] : ''}
              </span>
              <span className="pill-title">{item.event}</span>
            </div>
          );
        })}

        {items.length > 3 && (
          <div
            className="calendar-more-pill"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDate(current);
            }}
          >
            +{items.length - 3} more
          </div>
        )}
      </div>
    );
  };

  const calendarCellRender = (current, info) => {
    if (info.type === 'date') {
      return dateCellRender(current);
    }
    return info.originNode;
  };

  // Items for the selected day agenda
  const selectedDateStr = selectedDate ? selectedDate.format('YYYY-MM-DD') : '';
  const dayScheduleItems = useMemo(() => {
    if (!selectedDateStr) return [];

    // Requirement 1 & 7: Venues are closed on Sundays
    if (selectedDate && selectedDate.day() === 0) {
      return [];
    }

    let items = bookingsByDate.get(selectedDateStr) || [];

    // Include venue availability if single venue or availability mode
    const isSingleVenueSelected = selectedVenue && selectedVenue !== 'ALL';
    if (
      (role === ROLES.FACULTY && facultyViewMode === 'AVAILABILITY') ||
      isSingleVenueSelected
    ) {
      const targetVenueId = isSingleVenueSelected
        ? selectedVenue
        : venuesList[0]?.id;
      if (targetVenueId) {
        const avail = calendarService.getVenueAvailabilityForDate(targetVenueId, selectedDateStr);
        if (statusFilter === 'ALL' || statusFilter === CALENDAR_STATUS.AVAILABLE) {
          items = [...items, ...avail];
        }
      }
    }

    return items;
  }, [bookingsByDate, selectedDateStr, selectedDate, selectedVenue, role, facultyViewMode, venuesList, statusFilter]);

  // Page Header Details based on Role
  const getHeaderProps = () => {
    if (role === ROLES.ADMIN) {
      return {
        title: 'Master Campus Booking Calendar',
        subtitle:
          'University-wide centralized calendar of confirmed bookings, pending requests, and venue schedules',
        breadcrumbItems: [
          { title: 'Home', path: '/' },
          { title: 'Admin', path: '/admin/dashboard' },
          { title: 'Calendar' },
        ],
        badge: <Tag color="purple">Campus Administrator View</Tag>,
      };
    }
    if (role === ROLES.FACULTY) {
      return {
        title: 'Academic Venue & Availability Calendar',
        subtitle:
          'View your approved bookings, verify live venue availability, and locate vacant booking slots',
        breadcrumbItems: [
          { title: 'Home', path: '/' },
          { title: 'Faculty', path: '/faculty/dashboard' },
          { title: 'Calendar' },
        ],
        badge: <Tag color="blue">Faculty Portal</Tag>,
      };
    }
    return {
      title: 'Public Campus Venue Schedule & Events',
      subtitle:
        'Explore confirmed academic events, departmental workshops, hackathons, and public venue schedules',
      breadcrumbItems: [
        { title: 'Home', path: '/' },
        { title: 'Student', path: '/student/dashboard' },
        { title: 'Calendar' },
      ],
      badge: <Tag color="green">Student Public View (Read-Only)</Tag>,
    };
  };

  const headerProps = getHeaderProps();

  return (
    <div className="campus-calendar-wrapper">
      <PageHeader
        title={headerProps.title}
        subtitle={headerProps.subtitle}
        breadcrumbItems={headerProps.breadcrumbItems}
        tags={headerProps.badge}
      />

      {/* Role Notice Banners */}
      {role === ROLES.STUDENT && (
        <Alert
          message="Public Schedule - Read Only"
          description="Students have view-only access to published venue schedules and university events. You cannot edit or create bookings."
          type="info"
          showIcon
          icon={<LockOutlined />}
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      {/* Filter Toolbar */}
      <Card
        bordered
        className="calendar-card"
        style={{ marginBottom: 16 }}
      >
        <div style={{ marginBottom: 14 }}>
          <Space align="center" style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Space align="center">
              <FilterOutlined style={{ color: '#1677ff' }} />
              <Text strong style={{ color: '#0f172a' }}>
                Calendar Filters & Controls:
              </Text>
            </Space>

            {/* FACULTY MODE TOGGLE: "View their own approved bookings" vs "View venue availability" */}
            {role === ROLES.FACULTY && (
              <Radio.Group
                value={facultyViewMode}
                onChange={(e) => setFacultyViewMode(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="MY_BOOKINGS">
                  <CheckCircleOutlined style={{ marginRight: 6 }} />
                  My Approved Bookings
                </Radio.Button>
                <Radio.Button value="AVAILABILITY">
                  <BankOutlined style={{ marginRight: 6 }} />
                  Check Venue Availability
                </Radio.Button>
              </Radio.Group>
            )}
          </Space>
        </div>

        <Row gutter={[16, 16]} align="middle">
          {/* Filter 1: Venue */}
          <Col xs={24} sm={12} md={6}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                Venue:
              </Text>
              <Select
                value={selectedVenue}
                onChange={setSelectedVenue}
                style={{ width: '100%' }}
                options={[
                  { value: 'ALL', label: 'All Campus Venues' },
                  ...venuesList.map((v) => ({
                    value: v.id,
                    label: `${v.name} (${v.capacity} pax)`,
                  })),
                ]}
              />
            </div>
          </Col>

          {/* Filter 2: Date Jump */}
          <Col xs={24} sm={12} md={6}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                Jump to Date:
              </Text>
              <DatePicker
                value={calendarDate}
                onChange={handleDatePickerChange}
                format="YYYY-MM-DD"
                disabledDate={(current) => current && current.day() === 0}
                allowClear={false}
                style={{ width: '100%' }}
              />
            </div>
          </Col>

          {/* Filter 3: Department */}
          <Col xs={24} sm={12} md={6}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                Department:
              </Text>
              <Select
                value={selectedDepartment}
                onChange={setSelectedDepartment}
                style={{ width: '100%' }}
                options={[
                  { value: 'ALL', label: 'All Departments' },
                  ...DEPARTMENTS.map((dept) => ({
                    value: dept,
                    label: dept,
                  })),
                ]}
              />
            </div>
          </Col>

          {/* Filter 4: Status Filter */}
          <Col xs={24} sm={12} md={6}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                Status:
              </Text>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '100%' }}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: CALENDAR_STATUS.BOOKED, label: 'Booked (Confirmed)' },
                  { value: CALENDAR_STATUS.PENDING, label: 'Pending (Under Review)' },
                  { value: CALENDAR_STATUS.AVAILABLE, label: 'Available (Open)' },
                ]}
              />
            </div>
          </Col>
        </Row>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <Button size="small" onClick={handleResetFilters}>
            Reset Filters
          </Button>
        </div>
      </Card>

      {/* Calendar Legend & Live Stats Bar */}
      <Card
        bordered
        className="calendar-card"
        style={{ marginBottom: 16, padding: '12px 16px' }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={14}>
            <div className="calendar-legend-box">
              <span style={{ fontWeight: 600, color: '#334155', marginRight: 4 }}>
                Legend:
              </span>
              <div className="legend-item">
                <span className="legend-dot available" />
                <span style={{ color: '#237804' }}>Available (Open)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot pending" />
                <span style={{ color: '#ad6800' }}>Pending (Under Review)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot booked" />
                <span style={{ color: '#cf1322' }}>Booked (Confirmed)</span>
              </div>
            </div>
          </Col>

          <Col xs={24} md={10}>
            <Space style={{ width: '100%', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Tag color="red" style={{ padding: '4px 10px', fontSize: 12 }}>
                Confirmed: <strong>{stats.bookedCount}</strong>
              </Tag>
              {role !== ROLES.STUDENT && (
                <Tag color="gold" style={{ padding: '4px 10px', fontSize: 12 }}>
                  Pending: <strong>{stats.pendingCount}</strong>
                </Tag>
              )}
              <Tag color="blue" style={{ padding: '4px 10px', fontSize: 12 }}>
                Total Filtered: <strong>{stats.totalCount}</strong>
              </Tag>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main Grid: Ant Design Calendar + Day Agenda */}
      <Row gutter={[20, 20]}>
        {/* Left / Center: Ant Design Calendar Component */}
        <Col xs={24} xl={17}>
          <Card
            bordered
            className="calendar-card"
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space>
                  <CalendarOutlined style={{ color: '#1677ff' }} />
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>
                    {calendarDate.format('MMMM YYYY')}
                  </span>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Click date to view schedule • Click badge to view details
                </Text>
              </div>
            }
          >
            <Calendar
              value={calendarDate}
              onSelect={handleDateSelect}
              cellRender={calendarCellRender}
              disabledDate={(current) => current && current.day() === 0}
            />
          </Card>
        </Col>

        {/* Right Column: Selected Day Agenda */}
        <Col xs={24} xl={7}>
          <Card
            bordered
            className="calendar-card"
            title={
              <div>
                <span style={{ fontWeight: 600, color: '#0f172a', display: 'block' }}>
                  Schedule for Selected Date
                </span>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {selectedDate ? selectedDate.format('dddd, MMMM D, YYYY') : ''}
                </Text>
              </div>
            }
            extra={
              role === ROLES.FACULTY && selectedDate && selectedDate.day() !== 0 ? (
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusCircleOutlined />}
                  onClick={() =>
                    navigate(
                      `/faculty/request-venue?date=${selectedDate.format('YYYY-MM-DD')}`
                    )
                  }
                >
                  Book Slot
                </Button>
              ) : null
            }
          >
            {selectedDate && selectedDate.day() === 0 ? (
              <Alert
                type="info"
                showIcon
                message="Campus Venues Closed on Sundays"
                description="College venues are not available for booking on Sundays. Please select a working day (Monday – Saturday)."
                style={{ borderRadius: 8, margin: '12px 0' }}
              />
            ) : dayScheduleItems.length === 0 ? (
              <Empty
                description={`No scheduled bookings for ${selectedDate.format('MMM DD')}.`}
                style={{ padding: '30px 0' }}
              >
                {role === ROLES.FACULTY && selectedDate.day() !== 0 && (
                  <Button
                    type="dashed"
                    size="small"
                    onClick={() =>
                      navigate(
                        `/faculty/request-venue?date=${selectedDate.format('YYYY-MM-DD')}`
                      )
                    }
                  >
                    Request a Venue on this Date
                  </Button>
                )}
              </Empty>
            ) : (
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                  {dayScheduleItems.length} event(s) and slot(s) found:
                </Text>
                {dayScheduleItems.map((item) => {
                  const statusConfig = STATUS_COLORS[item.status] || STATUS_COLORS.Booked;

                  return (
                    <div
                      key={item.id}
                      className={`agenda-list-item status-${item.status.toLowerCase()}`}
                      onClick={() => handleOpenBookingModal(item)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <Text strong style={{ color: '#0f172a', fontSize: 13, flex: 1, paddingRight: 6 }}>
                          {item.event}
                        </Text>
                        <Tag color={statusConfig.badge} style={{ margin: 0, fontSize: 11 }}>
                          {item.status}
                        </Tag>
                      </div>

                      <div style={{ fontSize: 12, color: '#475569', marginBottom: 2 }}>
                        <BankOutlined style={{ marginRight: 5, color: '#64748b' }} />
                        {item.venue}
                      </div>

                      <div style={{ fontSize: 12, color: '#64748b', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <span>
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          {item.time}
                        </span>
                        <Button
                          type="link"
                          size="small"
                          style={{ padding: 0, height: 'auto', fontSize: 11 }}
                          icon={<EyeOutlined />}
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* BOOKING DETAILS MODAL */}
      <Modal
        title={
          <Space>
            <CalendarOutlined style={{ color: '#1677ff' }} />
            <span>Booking Details</span>
            {selectedBooking && (
              <Tag
                color={
                  selectedBooking.status === CALENDAR_STATUS.AVAILABLE
                    ? 'success'
                    : selectedBooking.status === CALENDAR_STATUS.PENDING
                    ? 'warning'
                    : 'error'
                }
                style={{ fontWeight: 600 }}
              >
                {selectedBooking.status}
              </Tag>
            )}
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSelectedBooking(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setModalVisible(false);
              setSelectedBooking(null);
            }}
          >
            Close
          </Button>,
          // For Faculty viewing an Available slot: direct "Request Venue" action
          role === ROLES.FACULTY &&
            selectedBooking?.status === CALENDAR_STATUS.AVAILABLE && (
              <Button
                key="request"
                type="primary"
                icon={<ArrowRightOutlined />}
                onClick={() => {
                  setModalVisible(false);
                  navigate(
                    `/faculty/request-venue?venueId=${selectedBooking.venueId}&date=${selectedBooking.date}`
                  );
                }}
              >
                Request This Venue
              </Button>
            ),
          // For Admin viewing a Pending request: direct review button
          role === ROLES.ADMIN &&
            selectedBooking?.status === CALENDAR_STATUS.PENDING && (
              <Button
                key="review"
                type="primary"
                icon={<ArrowRightOutlined />}
                onClick={() => {
                  setModalVisible(false);
                  navigate('/admin/requests');
                }}
              >
                Review in Requests Desk
              </Button>
            ),
        ]}
        width={620}
      >
        {selectedBooking && (
          <div>
            {/* Permission Constraint Warnings */}
            {/* Rule 1: Do not allow Students to edit anything */}
            {role === ROLES.STUDENT && (
              <Alert
                message="Student View - Non-Editable"
                description="This official venue schedule is published for information only. Students do not have permission to edit or cancel reservations."
                type="info"
                showIcon
                icon={<LockOutlined />}
                style={{ marginBottom: 16 }}
              />
            )}

            {/* Rule 2: Do not allow Faculty to edit Admin-approved bookings */}
            {role === ROLES.FACULTY &&
              (selectedBooking.status === CALENDAR_STATUS.BOOKED ||
                selectedBooking.isApproved) && (
                <Alert
                  message="Admin-Approved Booking (Locked / Read-Only)"
                  description="This reservation has been officially confirmed and approved by campus administration. In accordance with university policies, Faculty cannot edit or modify approved bookings."
                  type="warning"
                  showIcon
                  icon={<LockOutlined />}
                  style={{ marginBottom: 16 }}
                />
              )}

            {/* 8 Mandatory Fields Display in Modal */}
            <Descriptions
              bordered
              column={1}
              size="middle"
              labelStyle={{ width: '160px', fontWeight: 600, background: '#f8fafc' }}
            >
              {/* 1. Event */}
              <Descriptions.Item label="Event">
                <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                  {selectedBooking.event}
                </Text>
                {selectedBooking.description && (
                  <Paragraph
                    type="secondary"
                    style={{ fontSize: 12, margin: '4px 0 0 0' }}
                  >
                    {selectedBooking.description}
                  </Paragraph>
                )}
              </Descriptions.Item>

              {/* 2. Venue */}
              <Descriptions.Item label="Venue">
                <Space>
                  <BankOutlined style={{ color: '#1677ff' }} />
                  <Text strong>{selectedBooking.venue}</Text>
                </Space>
              </Descriptions.Item>

              {/* 3. Faculty */}
              <Descriptions.Item label="Faculty">
                <Space>
                  <UserOutlined style={{ color: '#1677ff' }} />
                  <span>{selectedBooking.faculty || 'Campus Academic Faculty'}</span>
                </Space>
              </Descriptions.Item>

              {/* 4. Department */}
              <Descriptions.Item label="Department">
                <Space>
                  <ApartmentOutlined style={{ color: '#1677ff' }} />
                  <span>{selectedBooking.department || 'Academic Department'}</span>
                </Space>
              </Descriptions.Item>

              {/* 5. Date */}
              <Descriptions.Item label="Date">
                <Space>
                  <CalendarOutlined style={{ color: '#1677ff' }} />
                  <Text strong>
                    {dayjs(selectedBooking.date).format('dddd, MMMM D, YYYY')}
                  </Text>
                </Space>
              </Descriptions.Item>

              {/* 6. Time */}
              <Descriptions.Item label="Time">
                <Space>
                  <ClockCircleOutlined style={{ color: '#1677ff' }} />
                  <Text strong>{selectedBooking.time}</Text>
                </Space>
              </Descriptions.Item>

              {/* 7. Participants */}
              <Descriptions.Item label="Participants">
                <Space>
                  <TeamOutlined style={{ color: '#1677ff' }} />
                  <span>{selectedBooking.participants} Expected Attendees</span>
                </Space>
              </Descriptions.Item>

              {/* 8. Status */}
              <Descriptions.Item label="Status">
                <Tag
                  color={
                    selectedBooking.status === CALENDAR_STATUS.AVAILABLE
                      ? 'success'
                      : selectedBooking.status === CALENDAR_STATUS.PENDING
                      ? 'warning'
                      : 'error'
                  }
                  style={{ fontWeight: 600, padding: '2px 8px' }}
                >
                  {selectedBooking.status}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CampusCalendarPage;
