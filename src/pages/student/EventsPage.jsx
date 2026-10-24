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
  Segmented,
  Calendar,
  Badge,
  Modal,
  Empty,
  Descriptions,
  message,
} from 'antd';
import {
  CalendarOutlined,
  TableOutlined,
  AppstoreOutlined,
  BankOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { STUDENT_EVENTS } from '../../data/studentData';
import { venueService } from '../../services/venueService';

const { Title, Text, Paragraph } = Typography;

export const EventsPage = () => {
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'table' | 'cards'
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedVenue, setSelectedVenue] = useState('ALL');
  const [venues, setVenues] = useState(() => venueService.getActiveVenues());

  useEffect(() => {
    venueService.fetchVenues().then((data) => {
      if (data) setVenues(venueService.getActiveVenues());
    }).catch(() => {});

    return venueService.subscribe(() => {
      setVenues(venueService.getActiveVenues());
    });
  }, []);

  // Modal State for viewing event details
  const [activeEvent, setActiveEvent] = useState(() => {
    const eventId = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('eventId')
      : null;
    if (eventId) {
      const cleanId = String(eventId).trim().toLowerCase();
      return STUDENT_EVENTS.find((e) => String(e.id).trim().toLowerCase() === cleanId) || null;
    }
    return null;
  });
  const [isModalVisible, setIsModalVisible] = useState(() => {
    return typeof window !== 'undefined'
      ? Boolean(new URLSearchParams(window.location.search).get('eventId'))
      : false;
  });

  // Auto-open event modal if eventId is in URL query parameters
  useEffect(() => {
    const eventId = searchParams.get('eventId');
    if (eventId) {
      const cleanId = String(eventId).trim().toLowerCase();
      if (!activeEvent || String(activeEvent.id).trim().toLowerCase() !== cleanId) {
        const found = STUDENT_EVENTS.find(
          (e) => String(e.id).trim().toLowerCase() === cleanId
        );
        if (found) {
          const timer = setTimeout(() => {
            setActiveEvent(found);
            setIsModalVisible(true);
          }, 0);
          return () => clearTimeout(timer);
        } else {
          message.warning(`Campus event ${eventId} was not found.`);
        }
      }
    }
  }, [searchParams, activeEvent]);

  // Selected date in calendar view (default to working Monday 2026-09-28)
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(dayjs('2026-09-28'));

  // Get unique departments for filter
  const departmentsList = useMemo(() => {
    const set = new Set(STUDENT_EVENTS.map((e) => e.department));
    return Array.from(set);
  }, []);

  // Filter events
  const filteredEvents = useMemo(() => {
    return STUDENT_EVENTS.filter((event) => {
      const matchesDept =
        selectedDepartment === 'ALL' || event.department === selectedDepartment;
      const matchesVenue =
        selectedVenue === 'ALL' || event.venue === selectedVenue;
      return matchesDept && matchesVenue;
    });
  }, [selectedDepartment, selectedVenue]);

  // Events on the selected calendar date
  const eventsOnSelectedDate = useMemo(() => {
    const dateStr = calendarSelectedDate.format('YYYY-MM-DD');
    return filteredEvents.filter((e) => e.date === dateStr);
  }, [calendarSelectedDate, filteredEvents]);

  const handleOpenModal = (event) => {
    setActiveEvent(event);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setActiveEvent(null);
  };

  // Ant Design Calendar cellRender function
  const dateCellRender = (value) => {
    const dateStr = value.format('YYYY-MM-DD');
    const dayEvents = filteredEvents.filter((e) => e.date === dateStr);

    if (dayEvents.length === 0) return null;

    return (
      <div style={{ marginTop: 4 }}>
        {dayEvents.map((item) => (
          <div
            key={item.id}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenModal(item);
            }}
            style={{
              cursor: 'pointer',
              marginBottom: 2,
              padding: '2px 4px',
              borderRadius: 4,
              background: item.status === 'Ongoing' ? '#e6f4ff' : '#f6ffed',
              border: `1px solid ${item.status === 'Ongoing' ? '#91caff' : '#b7eb8f'}`,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: 11,
            }}
            title={`${item.name} (${item.startTime})`}
          >
            <Badge
              status={item.status === 'Ongoing' ? 'processing' : 'success'}
              text={
                <span style={{ fontWeight: 500, color: '#1e293b' }}>
                  {item.name}
                </span>
              }
            />
          </div>
        ))}
      </div>
    );
  };

  const calendarCellRender = (current, info) => {
    if (info.type === 'date') {
      return dateCellRender(current);
    }
    return info.originNode;
  };

  // Table Columns
  const tableColumns = [
    {
      title: 'Event Name',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (name, record) => (
        <div>
          <Text strong style={{ color: '#0f172a', fontSize: 14 }}>
            {name}
          </Text>
          <div style={{ marginTop: 4 }}>
            <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>
              {record.category}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 190,
      render: (dept) => <Text style={{ color: '#475569', fontSize: 13 }}>{dept}</Text>,
    },
    {
      title: 'Venue',
      dataIndex: 'venue',
      key: 'venue',
      width: 190,
      render: (venue) => (
        <Space>
          <BankOutlined style={{ color: '#1677ff' }} />
          <Text strong style={{ color: '#1e293b' }}>{venue}</Text>
        </Space>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 130,
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
      render: (date) => (
        <Space>
          <CalendarOutlined style={{ color: '#64748b' }} />
          <span>{date}</span>
        </Space>
      ),
    },
    {
      title: 'Start Time',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 110,
      render: (start) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#16a34a' }} />
          <span>{start}</span>
        </Space>
      ),
    },
    {
      title: 'End Time',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 110,
      render: (end) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#dc2626' }} />
          <span>{end}</span>
        </Space>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
      render: (desc) => (
        <Text type="secondary" style={{ fontSize: 12 }} title={desc}>
          {desc}
        </Text>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleOpenModal(record)}
        >
          Details
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Campus Events & Timetable"
        subtitle="Explore upcoming university seminars, student club hackathons, workshops, and convocations"
        breadcrumbItems={[
          { title: 'Home', path: '/' },
          { title: 'Student', path: '/student/dashboard' },
          { title: 'Events' },
        ]}
        extra={
          <Segmented
            value={viewMode}
            onChange={setViewMode}
            options={[
              { label: 'Calendar View', value: 'calendar', icon: <CalendarOutlined /> },
              { label: 'Table View', value: 'table', icon: <TableOutlined /> },
              { label: 'Card Grid', value: 'cards', icon: <AppstoreOutlined /> },
            ]}
          />
        }
      />

      {/* Filter Toolbar: Department & Venue */}
      <Card
        bordered
        style={{
          borderRadius: 8,
          borderColor: '#e2e8f0',
          marginBottom: 20,
          background: '#ffffff',
        }}
      >
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} sm={12} md={9}>
            <Space style={{ width: '100%' }}>
              <span style={{ fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>
                Filter Department:
              </span>
              <Select
                value={selectedDepartment}
                onChange={setSelectedDepartment}
                style={{ width: '100%', minWidth: 200 }}
                options={[
                  { value: 'ALL', label: 'All Departments' },
                  ...departmentsList.map((dept) => ({ value: dept, label: dept })),
                ]}
              />
            </Space>
          </Col>

          <Col xs={24} sm={12} md={9}>
            <Space style={{ width: '100%' }}>
              <span style={{ fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>
                Filter Venue:
              </span>
              <Select
                value={selectedVenue}
                onChange={setSelectedVenue}
                style={{ width: '100%', minWidth: 200 }}
                options={[
                  { value: 'ALL', label: 'All Venues' },
                  ...venues.map((v) => ({ value: v.name, label: v.name })),
                ]}
              />
            </Space>
          </Col>

          <Col xs={24} md={6} style={{ textAlign: 'right' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Total <Text strong>{filteredEvents.length}</Text> events found
            </Text>
          </Col>
        </Row>
      </Card>

      {/* View Mode 1: Ant Design Calendar View */}
      {viewMode === 'calendar' && (
        <div>
          <Card
            bordered
            style={{ borderRadius: 8, borderColor: '#e2e8f0', marginBottom: 24 }}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  Interactive University Event Calendar
                </span>
                <Space>
                  <Badge status="processing" text="Ongoing Today" />
                  <Badge status="success" text="Upcoming Event" />
                </Space>
              </div>
            }
          >
            <Calendar
              value={calendarSelectedDate}
              onSelect={(date) => setCalendarSelectedDate(date)}
              cellRender={calendarCellRender}
              disabledDate={(current) => current && current.day() === 0}
            />
          </Card>

          {/* Details for Selected Calendar Date */}
          <Card
            title={
              <Space>
                <CalendarOutlined style={{ color: '#1677ff' }} />
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  Events Scheduled on {calendarSelectedDate.format('dddd, MMMM D, YYYY')}
                </span>
              </Space>
            }
            bordered
            style={{ borderRadius: 8, borderColor: '#e2e8f0' }}
          >
            {eventsOnSelectedDate.length === 0 ? (
              <Empty
                description={
                  <span>
                    No public campus events scheduled on {calendarSelectedDate.format('YYYY-MM-DD')}.
                  </span>
                }
              />
            ) : (
              <Row gutter={[16, 16]}>
                {eventsOnSelectedDate.map((event) => (
                  <Col xs={24} md={12} key={event.id}>
                    <Card
                      size="small"
                      bordered
                      style={{
                        borderRadius: 8,
                        borderColor: '#e2e8f0',
                        background: '#f8fafc',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                          {event.name}
                        </Text>
                        <Tag color={event.status === 'Ongoing' ? 'processing' : 'blue'}>
                          {event.status}
                        </Tag>
                      </div>

                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                        <TeamOutlined style={{ marginRight: 6 }} />
                        {event.department}
                      </div>

                      <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>
                        <BankOutlined style={{ marginRight: 6, color: '#1677ff' }} />
                        {event.venue}
                      </div>

                      <div style={{ fontSize: 12, color: '#0f172a', fontWeight: 500, marginBottom: 8 }}>
                        <ClockCircleOutlined style={{ marginRight: 6 }} />
                        {event.startTime} - {event.endTime}
                      </div>

                      <Paragraph
                        ellipsis={{ rows: 2 }}
                        style={{ fontSize: 12, color: '#334155', marginBottom: 8 }}
                      >
                        {event.description}
                      </Paragraph>

                      <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        style={{ padding: 0 }}
                        onClick={() => handleOpenModal(event)}
                      >
                        View Full Event Details &rarr;
                      </Button>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card>
        </div>
      )}

      {/* View Mode 2: Table View */}
      {viewMode === 'table' && (
        <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
          {filteredEvents.length === 0 ? (
            <Empty description="No events match the selected filters." />
          ) : (
            <Table
              dataSource={filteredEvents}
              columns={tableColumns}
              rowKey="id"
              scroll={{ x: 1190 }}
              pagination={{ pageSize: 8 }}
              size="middle"
            />
          )}
        </Card>
      )}

      {/* View Mode 3: Card Grid View */}
      {viewMode === 'cards' && (
        <div>
          {filteredEvents.length === 0 ? (
            <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0', padding: 40 }}>
              <Empty description="No events found for the selected filters." />
            </Card>
          ) : (
            <Row gutter={[20, 20]}>
              {filteredEvents.map((event) => (
                <Col xs={24} sm={12} lg={8} key={event.id}>
                  <Card
                    hoverable
                    bordered
                    style={{
                      borderRadius: 8,
                      borderColor: '#e2e8f0',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                    bodyStyle={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 20 }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <Tag color="blue" style={{ margin: 0 }}>
                          {event.category}
                        </Tag>
                        <Badge
                          status={event.status === 'Ongoing' ? 'processing' : 'success'}
                          text={event.status}
                        />
                      </div>

                      <Text strong style={{ fontSize: 16, color: '#0f172a', display: 'block', marginBottom: 8, lineHeight: 1.3 }}>
                        {event.name}
                      </Text>

                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                        <TeamOutlined style={{ marginRight: 6 }} />
                        {event.department}
                      </div>

                      <div style={{ fontSize: 13, color: '#1e293b', marginBottom: 6, fontWeight: 500 }}>
                        <BankOutlined style={{ marginRight: 6, color: '#1677ff' }} />
                        {event.venue}
                      </div>

                      <div
                        style={{
                          background: '#f8fafc',
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: '1px solid #f1f5f9',
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ fontSize: 12, color: '#475569' }}>
                          <CalendarOutlined style={{ marginRight: 6, color: '#1677ff' }} />
                          {event.date}
                        </div>
                        <div style={{ fontSize: 12, color: '#0f172a', fontWeight: 600, marginTop: 2 }}>
                          <ClockCircleOutlined style={{ marginRight: 6, color: '#16a34a' }} />
                          {event.startTime} - {event.endTime}
                        </div>
                      </div>

                      <Paragraph
                        ellipsis={{ rows: 3 }}
                        style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}
                      >
                        {event.description}
                      </Paragraph>
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 'auto' }}>
                      <Button
                        type="primary"
                        ghost
                        block
                        icon={<EyeOutlined />}
                        onClick={() => handleOpenModal(event)}
                      >
                        View Event Details
                      </Button>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      )}

      {/* Ant Design Modal: Event Details Modal */}
      <Modal
        open={isModalVisible}
        onCancel={handleCloseModal}
        footer={[
          <Button key="close" type="primary" onClick={handleCloseModal}>
            Close
          </Button>,
        ]}
        title={
          <Space>
            <CalendarOutlined style={{ color: '#1677ff' }} />
            <span>Event Information & Schedule</span>
          </Space>
        }
        width={680}
      >
        {activeEvent && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Tag color="blue">{activeEvent.category}</Tag>
                <Tag color={activeEvent.status === 'Ongoing' ? 'processing' : 'success'}>
                  {activeEvent.status}
                </Tag>
              </div>
              <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
                {activeEvent.name}
              </Title>
            </div>

            <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Department">
                <Text strong>{activeEvent.department}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Venue">
                <Space>
                  <BankOutlined style={{ color: '#1677ff' }} />
                  <Text strong>{activeEvent.venue}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Date">
                <Space>
                  <CalendarOutlined style={{ color: '#1677ff' }} />
                  <span>{activeEvent.date}</span>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Timing">
                <Space>
                  <ClockCircleOutlined style={{ color: '#16a34a' }} />
                  <span>
                    {activeEvent.startTime} to {activeEvent.endTime}
                  </span>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Organizer / Club">
                {activeEvent.organizer}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 6, color: '#0f172a' }}>
                Event Description:
              </Text>
              <Paragraph style={{ color: '#334155', lineHeight: 1.7, fontSize: 13 }}>
                {activeEvent.description}
              </Paragraph>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EventsPage;
