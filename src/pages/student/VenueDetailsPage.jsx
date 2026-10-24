import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Row,
  Col,
  Card,
  Table,
  Tag,
  Typography,
  Button,
  Space,
  Badge,
  Descriptions,
  Divider,
  Empty,
  Alert,
  Result,
  Spin,
} from 'antd';
import {
  ArrowLeftOutlined,
  BankOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import PageHeader from '../../components/PageHeader';
import { venueService } from '../../services/venueService';
import { calendarService } from '../../services/calendarService';

const { Title, Text, Paragraph } = Typography;

export const VenueDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [relevantBookings, setRelevantBookings] = useState([]);

  // Fetch venue profile and active availability from backend API
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setNotFound(false);

    const loadData = async () => {
      try {
        const data = await venueService.getVenueById(id);
        if (!data) {
          if (mounted) {
            setNotFound(true);
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          setVenue(data);
        }

        // Fetch today's slot schedule and bookings for this venue
        try {
          const today = dayjs().format('YYYY-MM-DD');
          const avail = await venueService.checkAvailability(id, today);
          if (mounted && avail && Array.isArray(avail.bookings)) {
            const mapped = avail.bookings.map((b) => ({
              id: b.id,
              eventName: b.event_name || 'Academic Event',
              department: b.department || 'Campus Department',
              date: b.event_date
                ? (typeof b.event_date === 'string' ? b.event_date.split('T')[0] : dayjs(b.event_date).format('YYYY-MM-DD'))
                : today,
              timeSlot: `${b.start_time} - ${b.end_time}`,
              startTime: b.start_time,
              endTime: b.end_time,
              status: b.status === 'approved' ? 'Booked' : 'Pending',
              type: b.event_type || 'Reserved Booking',
            }));
            setRelevantBookings(mapped);
          }
        } catch {
          // If availability query fails, retain empty bookings list
        }
      } catch (err) {
        if (mounted) {
          setNotFound(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [id]);

  // Smart Back navigation
  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/student/venues');
    }
  };

  // Safely infer building name if not explicitly provided
  const venueBuilding = useMemo(() => {
    if (!venue) return 'Campus Facility';
    if (venue.building) return venue.building;
    if (venue.location && typeof venue.location === 'string') {
      const parts = venue.location.split(',');
      return parts[0].trim();
    }
    return 'Campus Building';
  }, [venue]);

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Loading Venue Details..."
          subtitle="Connecting to campus facilities directory"
          breadcrumbItems={[
            { title: 'Home', path: '/' },
            { title: 'Student', path: '/student/dashboard' },
            { title: 'Venues', path: '/student/venues' },
            { title: 'Loading...' },
          ]}
        />
        <Card bordered style={{ textAlign: 'center', padding: '60px 24px', borderRadius: 8 }}>
          <Spin size="large" tip="Loading venue details..." />
        </Card>
      </div>
    );
  }

  // If venue not found, render standard Ant Design 404 Result state
  if (notFound || !venue) {
    return (
      <div>
        <PageHeader
          title="Venue Not Found"
          subtitle="The requested venue profile does not exist in the campus directory"
          breadcrumbItems={[
            { title: 'Home', path: '/' },
            { title: 'Student', path: '/student/dashboard' },
            { title: 'Venues', path: '/student/venues' },
            { title: 'Not Found' },
          ]}
        />
        <Card
          bordered
          style={{
            borderRadius: 8,
            borderColor: '#e2e8f0',
            textAlign: 'center',
            padding: '40px 24px',
            background: '#ffffff',
          }}
        >
          <Result
            status="404"
            title="Venue Not Found"
            subTitle={`No venue was found matching the identifier "${id || ''}". It may have been removed, deactivated, or renamed.`}
            extra={
              <Button type="primary" icon={<ArrowLeftOutlined />} onClick={handleBack}>
                Back to Venues Directory
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const isOccupied = venue.currentStatus === 'Occupied';
  const isAvailable = venue.currentStatus === 'Available';
  const isMaintenance = venue.currentStatus === 'Maintenance';
  const facilitiesList = Array.isArray(venue.facilities) ? venue.facilities : [];

  const getStatusBadge = () => {
    if (isAvailable) {
      return (
        <Badge
          status="success"
          text={
            <Text strong style={{ color: '#16a34a', fontSize: 14 }}>
              Available for Access
            </Text>
          }
        />
      );
    }
    if (isOccupied) {
      return (
        <Badge
          status="error"
          text={
            <Text strong style={{ color: '#dc2626', fontSize: 14 }}>
              Currently Occupied
            </Text>
          }
        />
      );
    }
    return (
      <Badge
        status="warning"
        text={
          <Text strong style={{ color: '#d97706', fontSize: 14 }}>
            Under Maintenance
          </Text>
        }
      />
    );
  };

  const bookingColumns = [
    {
      title: 'Booking ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (bid) => <Text code>{bid}</Text>,
    },
    {
      title: 'Event Name',
      dataIndex: 'eventName',
      key: 'eventName',
      width: 250,
      render: (name, record) => (
        <div>
          <Text strong style={{ color: '#0f172a' }}>
            {name}
          </Text>
          {record.type && (
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              <Tag style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>
                {record.type}
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Department / Organizer',
      dataIndex: 'department',
      key: 'department',
      width: 200,
      render: (dept) => <span style={{ color: '#475569', fontSize: 13 }}>{dept}</span>,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 130,
      render: (date) => (
        <Space>
          <CalendarOutlined style={{ color: '#1677ff' }} />
          <span>{date}</span>
        </Space>
      ),
    },
    {
      title: 'Time Slot',
      key: 'timeSlot',
      width: 170,
      render: (_, record) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#64748b' }} />
          <Text>{record.timeSlot || `${record.startTime} - ${record.endTime}`}</Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status) => (
        <Badge
          status={status === 'Booked' ? 'error' : 'default'}
          text={<Tag color={status === 'Booked' ? 'red' : 'default'}>{status}</Tag>}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={venue.name}
        subtitle="Detailed campus facility specifications, operational amenities, and booking timetable"
        breadcrumbItems={[
          { title: 'Home', path: '/' },
          { title: 'Student', path: '/student/dashboard' },
          { title: 'Venues', path: '/student/venues' },
          { title: venue.name },
        ]}
        tags={
          <Tag
            color={isAvailable ? 'success' : isOccupied ? 'error' : 'warning'}
            style={{ fontSize: 13, padding: '2px 8px', fontWeight: 600 }}
          >
            {venue.currentStatus || 'Available'}
          </Tag>
        }
        extra={
          <Button
            type="primary"
            ghost
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
          >
            Back to Venues
          </Button>
        }
      />

      {/* Live Status Notification Banner */}
      {isOccupied && venue.currentEvent && (
        <Alert
          message={
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <span style={{ fontWeight: 600 }}>
                Currently Occupied: {venue.currentEvent.name}
              </span>
              <Tag color="volcano">
                {venue.currentEvent.startTime} - {venue.currentEvent.endTime}
              </Tag>
            </div>
          }
          description={
            <div style={{ marginTop: 4 }}>
              Organized by <Text strong>{venue.currentEvent.department}</Text>{' '}
              ({venue.currentEvent.organizer || 'Faculty Organizers'}). Speaker:{' '}
              {venue.currentEvent.speaker || 'Designated faculty'}.
            </div>
          }
          type="error"
          showIcon
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      {isAvailable && (
        <Alert
          message="Venue is Available Today"
          description="This venue currently has no ongoing reservations. Regular university study hours and faculty consultations apply."
          type="success"
          showIcon
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      {isMaintenance && (
        <Alert
          message="Facility Temporarily Under Maintenance"
          description="Scheduled technical recalibration and physical upgrades are underway. Student entry is restricted."
          type="warning"
          showIcon
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      <Row gutter={[24, 24]}>
        {/* Left Column: Venue Information & Facilities */}
        <Col xs={24} lg={15}>
          {/* Overview Card */}
          <Card
            title={
              <Space>
                <BankOutlined style={{ color: '#1677ff' }} />
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  Venue Overview & Description
                </span>
              </Space>
            }
            bordered
            style={{ borderRadius: 8, borderColor: '#e2e8f0', marginBottom: 24 }}
          >
            <Paragraph style={{ fontSize: 14, lineHeight: 1.7, color: '#334155' }}>
              {venue.description || 'Comprehensive collegiate multi-purpose facility equipped for institutional seminars, academic classes, and student gatherings.'}
            </Paragraph>

            <Divider style={{ margin: '16px 0' }} />

            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="middle">
              <Descriptions.Item label="Venue Name">
                <Text strong>{venue.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Building">
                <Space>
                  <BankOutlined style={{ color: '#1677ff' }} />
                  <Text strong>{venueBuilding}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Location & Floor">
                <Space>
                  <EnvironmentOutlined style={{ color: '#1677ff' }} />
                  <span>{venue.location || 'Campus'}</span>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Seating Capacity">
                <Space>
                  <TeamOutlined style={{ color: '#1677ff' }} />
                  <Text strong>{venue.capacity || 50}</Text> attendees
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Live Status" span={2}>
                {getStatusBadge()}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Facilities Card */}
          <Card
            title={
              <Space>
                <AppstoreOutlined style={{ color: '#1677ff' }} />
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  Available Facilities & Amenities
                </span>
              </Space>
            }
            bordered
            style={{ borderRadius: 8, borderColor: '#e2e8f0' }}
          >
            {facilitiesList.length > 0 ? (
              <Row gutter={[12, 12]}>
                {facilitiesList.map((facility, index) => (
                  <Col xs={24} sm={12} key={index}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 14px',
                        background: '#f8fafc',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 14 }} />
                      <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
                        {facility}
                      </span>
                    </div>
                  </Col>
                ))}
              </Row>
            ) : (
              <Empty description="Standard campus audio-visual and seating amenities provided." />
            )}
          </Card>
        </Col>

        {/* Right Column: Quick Status & Info */}
        <Col xs={24} lg={9}>
          <Card
            title={
              <Space>
                <InfoCircleOutlined style={{ color: '#1677ff' }} />
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  Live Availability Information
                </span>
              </Space>
            }
            bordered
            style={{ borderRadius: 8, borderColor: '#e2e8f0', marginBottom: 24 }}
          >
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: isAvailable
                    ? '#dcfce7'
                    : isOccupied
                    ? '#fee2e2'
                    : '#fef3c7',
                  marginBottom: 12,
                }}
              >
                {isAvailable && (
                  <CheckCircleOutlined style={{ fontSize: 36, color: '#16a34a' }} />
                )}
                {isOccupied && (
                  <ClockCircleOutlined style={{ fontSize: 36, color: '#dc2626' }} />
                )}
                {isMaintenance && (
                  <ToolOutlined style={{ fontSize: 36, color: '#d97706' }} />
                )}
              </div>
              <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
                {venue.currentStatus || 'Available'}
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {isAvailable
                  ? 'Open for student study and departmental access'
                  : isOccupied
                  ? 'Currently reserved for college event'
                  : 'Facility under scheduled servicing'}
              </Text>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div style={{ fontSize: 13, color: '#64748b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Campus Building:</span>
                <Text strong>{venueBuilding}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Confirmed Bookings:</span>
                <Text strong>{relevantBookings.length}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Access Permission:</span>
                <Text strong>Student View-Only</Text>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <Button
                type="default"
                block
                icon={<CalendarOutlined />}
                onClick={() => navigate('/student/availability')}
              >
                Check Slot Availability
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Current and Upcoming Confirmed Bookings Table */}
      <div style={{ marginTop: 24 }}>
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <CalendarOutlined style={{ color: '#1677ff' }} />
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  Current & Upcoming Bookings Schedule
                </span>
              </Space>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Confirmed Institutional Reservations
              </Text>
            </div>
          }
          bordered
          style={{ borderRadius: 8, borderColor: '#e2e8f0' }}
        >
          {relevantBookings.length > 0 ? (
            <Table
              dataSource={relevantBookings}
              columns={bookingColumns}
              rowKey={(rec) => rec.id || `${rec.date}_${rec.startTime}`}
              scroll={{ x: 800 }}
              pagination={{ pageSize: 5 }}
              size="middle"
            />
          ) : (
            <Empty description="No upcoming bookings scheduled for this venue." />
          )}
        </Card>
      </div>
    </div>
  );
};

export default VenueDetailsPage;
