import React, { useState, useEffect, useMemo } from 'react';
import {
  Row,
  Col,
  Card,
  Table,
  Tag,
  Typography,
  Button,
  Space,
  Select,
  DatePicker,
  Badge,
  Empty,
  Statistic,
  message,
  Alert,
} from 'antd';
import {
  ScheduleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FilterOutlined,
  EyeOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import {
  AVAILABILITY_TIME_SLOTS,
  getVenueSlotsForDate,
} from '../../data/studentData';
import { venueService } from '../../services/venueService';

const { Text } = Typography;

export const AvailabilityPage = () => {
  const navigate = useNavigate();

  // Filters: Date, Venue, Time
  const [selectedDate, setSelectedDate] = useState(dayjs('2026-09-28'));
  const [selectedVenue, setSelectedVenue] = useState('ALL');
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('ALL');
  const [venues, setVenues] = useState(() => venueService.getActiveVenues());

  useEffect(() => {
    venueService.fetchVenues().then((v) => {
      if (v?.length) setVenues(venueService.getActiveVenues());
    }).catch(() => {});

    return venueService.subscribe(() => {
      setVenues(venueService.getActiveVenues());
    });
  }, []);

  const formattedDate = selectedDate ? selectedDate.format('YYYY-MM-DD') : '2026-09-28';

  // Compute table rows based on date, venue, and time filters
  const scheduleData = useMemo(() => {
    const venuesPool = venues;
    const venuesToInclude =
      selectedVenue === 'ALL'
        ? venuesPool
        : venuesPool.filter((v) => String(v.id) === String(selectedVenue));

    const rows = [];

    venuesToInclude.forEach((venue) => {
      const slots = getVenueSlotsForDate(venue.id, formattedDate);

      slots.forEach((slot) => {
        // Filter by time period if specified
        let matchesTime = true;
        if (selectedTimePeriod === 'Morning') {
          matchesTime = slot.period === 'Morning';
        } else if (selectedTimePeriod === 'Afternoon') {
          matchesTime = slot.period === 'Afternoon';
        } else if (selectedTimePeriod === 'Evening') {
          matchesTime = slot.period === 'Evening';
        } else if (selectedTimePeriod !== 'ALL') {
          matchesTime = slot.slotKey === selectedTimePeriod;
        }

        if (matchesTime) {
          rows.push({
            key: `${venue.id}-${slot.slotKey}-${formattedDate}`,
            venueId: venue.id,
            venueName: venue.name,
            location: venue.location,
            capacity: venue.capacity,
            slotKey: slot.slotKey,
            timeSlot: slot.label,
            period: slot.period,
            status: slot.status,
            event: slot.event || slot.reason || null,
          });
        }
      });
    });

    return rows;
  }, [selectedVenue, formattedDate, selectedTimePeriod]);

  // Statistics
  const totalSlotsCount = scheduleData.length;
  const availableSlotsCount = scheduleData.filter((s) => s.status === 'Available').length;
  const bookedSlotsCount = scheduleData.filter((s) => s.status === 'Booked').length;

  const columns = [
    {
      title: 'Venue',
      dataIndex: 'venueName',
      key: 'venueName',
      width: 230,
      render: (name, record) => (
        <div>
          <Text strong style={{ color: '#0f172a', fontSize: 14 }}>
            {name}
          </Text>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            <EnvironmentOutlined style={{ marginRight: 4 }} />
            {record.location}
          </div>
        </div>
      ),
    },
    {
      title: 'Time Slot',
      dataIndex: 'timeSlot',
      key: 'timeSlot',
      width: 200,
      render: (slot, record) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#1677ff' }} />
          <Text strong>{slot}</Text>
          <Tag style={{ fontSize: 11, marginLeft: 4 }}>{record.period}</Tag>
        </Space>
      ),
    },
    {
      title: 'Availability Status',
      dataIndex: 'status',
      key: 'status',
      width: 170,
      render: (status) => {
        if (status === 'Available') {
          return (
            <Badge
              status="success"
              text={
                <Tag color="success" style={{ fontWeight: 600 }}>
                  Available
                </Tag>
              }
            />
          );
        }
        if (status === 'Booked') {
          return (
            <Badge
              status="error"
              text={
                <Tag color="error" style={{ fontWeight: 600 }}>
                  Booked
                </Tag>
              }
            />
          );
        }
        if (status === 'Unavailable') {
          return (
            <Badge
              status="default"
              text={
                <Tag color="default" style={{ fontWeight: 600 }}>
                  Closed (Sunday)
                </Tag>
              }
            />
          );
        }
        return (
          <Badge
            status="warning"
            text={
              <Tag color="warning" style={{ fontWeight: 600 }}>
                {status}
              </Tag>
            }
          />
        );
      },
    },
    {
      title: 'Booking Details / Reservation',
      dataIndex: 'event',
      key: 'event',
      width: 250,
      render: (event, record) => {
        if (record.status === 'Booked') {
          return (
            <div>
              <Text strong style={{ color: '#dc2626', fontSize: 13, display: 'block' }}>
                {event || 'Reserved for Official Academic Session'}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Restricted access during reserved interval
              </Text>
            </div>
          );
        }
        if (record.status === 'Maintenance') {
          return (
            <Text type="secondary" style={{ fontSize: 12, color: '#d97706' }}>
              Facility Maintenance & Calibration
            </Text>
          );
        }
        return (
          <Text style={{ fontSize: 12, color: '#16a34a' }}>
            Open / Vacant for student access & study
          </Text>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/student/venues/${record.venueId}`)}
        >
          Venue Info
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Live Venue Availability & Slot Matrix"
        subtitle="Real-time venue availability schedules, booked reservations, and vacant study slots"
        breadcrumbItems={[
          { title: 'Home', path: '/' },
          { title: 'Student', path: '/student/dashboard' },
          { title: 'Availability' },
        ]}
      />

      {/* Sunday Closure Banner */}
      {selectedDate && selectedDate.day() === 0 && (
        <Alert
          type="info"
          showIcon
          message="College Venues Closed on Sundays"
          description="Campus venues and facilities are not operational or available for booking on Sundays. Please select a working day (Monday – Saturday)."
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      {/* Filter Toolbar: Date, Venue, Time */}
      <Card
        bordered
        style={{
          borderRadius: 8,
          borderColor: '#e2e8f0',
          marginBottom: 20,
          background: '#ffffff',
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <Space align="center">
            <FilterOutlined style={{ color: '#1677ff' }} />
            <Text strong style={{ color: '#0f172a' }}>
              Filter Availability Matrix:
            </Text>
          </Space>
        </div>

        <Row gutter={[16, 16]} align="middle">
          {/* Date Filter */}
          <Col xs={24} sm={8} md={8}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                1. Select Date:
              </Text>
              <DatePicker
                value={selectedDate}
                onChange={(date) => {
                  if (date && date.day() === 0) {
                    message.warning('Venue booking is not available on Sundays. Please select another date.');
                  }
                  setSelectedDate(date);
                }}
                disabledDate={(current) => current && current.day() === 0}
                format="YYYY-MM-DD"
                allowClear={false}
                style={{ width: '100%' }}
              />
            </div>
          </Col>

          {/* Venue Filter */}
          <Col xs={24} sm={8} md={8}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                2. Select Venue:
              </Text>
              <Select
                value={selectedVenue}
                onChange={setSelectedVenue}
                style={{ width: '100%' }}
                options={[
                  { value: 'ALL', label: 'All Campus Venues' },
                  ...venues.map((v) => ({
                    value: String(v.id),
                    label: `${v.name} (${v.capacity} pax)`,
                  })),
                ]}
              />
            </div>
          </Col>

          {/* Time Filter */}
          <Col xs={24} sm={8} md={8}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                3. Select Time / Slot:
              </Text>
              <Select
                value={selectedTimePeriod}
                onChange={setSelectedTimePeriod}
                style={{ width: '100%' }}
                options={[
                  { value: 'ALL', label: 'All Time Slots' },
                  { value: 'Morning', label: 'Morning (08:00 AM - 12:00 PM)' },
                  { value: 'Afternoon', label: 'Afternoon (12:00 PM - 04:00 PM)' },
                  { value: 'Evening', label: 'Evening (04:00 PM - 08:00 PM)' },
                  ...AVAILABILITY_TIME_SLOTS.map((s) => ({
                    value: s.key,
                    label: s.label,
                  })),
                ]}
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* Summary KPI Badges */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card bordered size="small" style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: '#64748b' }}>Total Slots Evaluated</span>}
              value={totalSlotsCount}
              prefix={<ScheduleOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ fontWeight: 700, fontSize: 20 }}
            />
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              For {selectedDate ? selectedDate.format('MMM DD, YYYY') : 'Selected Date'}
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card bordered size="small" style={{ borderRadius: 8, borderColor: '#bbf7d0', background: '#f0fdf4' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: '#16a34a' }}>Available Slots (Open)</span>}
              value={availableSlotsCount}
              prefix={<CheckCircleOutlined style={{ color: '#16a34a' }} />}
              valueStyle={{ color: '#16a34a', fontWeight: 700, fontSize: 20 }}
            />
            <div style={{ fontSize: 12, color: '#15803d', marginTop: 4 }}>
              Available for access
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card bordered size="small" style={{ borderRadius: 8, borderColor: '#fecdd3', background: '#fff1f2' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: '#dc2626' }}>Booked Slots (Occupied)</span>}
              value={bookedSlotsCount}
              prefix={<CloseCircleOutlined style={{ color: '#dc2626' }} />}
              valueStyle={{ color: '#dc2626', fontWeight: 700, fontSize: 20 }}
            />
            <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>
              Confirmed reservations
            </div>
          </Card>
        </Col>
      </Row>

      {/* Availability Table */}
      {scheduleData.length === 0 ? (
        <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0', padding: 40 }}>
          <Empty description="No availability slots found matching your criteria. Try adjusting date or time filters.">
            <Button
              type="primary"
              onClick={() => {
                setSelectedVenue('ALL');
                setSelectedTimePeriod('ALL');
              }}
            >
              Reset Filters
            </Button>
          </Empty>
        </Card>
      ) : (
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>
                Availability Schedule for {selectedDate ? selectedDate.format('dddd, MMMM D, YYYY') : ''}
              </span>
              <Space>
                <Badge status="success" text="Available" />
                <Badge status="error" text="Booked" />
                <Badge status="warning" text="Maintenance" />
              </Space>
            </div>
          }
          bordered
          style={{ borderRadius: 8, borderColor: '#e2e8f0' }}
        >
          <Table
            dataSource={scheduleData}
            columns={columns}
            scroll={{ x: 970 }}
            pagination={{ pageSize: 10 }}
            size="middle"
          />
        </Card>
      )}
    </div>
  );
};

export default AvailabilityPage;
