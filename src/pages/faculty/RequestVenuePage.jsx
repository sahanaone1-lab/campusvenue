import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  Alert,
  Space,
  Typography,
  message,
  Divider,
  Tag,
  Descriptions,
  Modal,
} from 'antd';
import {
  CheckCircleOutlined,
  BankOutlined,
  TeamOutlined,
  SendOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  FileDoneOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../services/useAuth';
import {
  facultyVenueService,
  EVENT_TYPES,
  DEPARTMENTS,
  FACILITY_OPTIONS,
} from '../../services/facultyVenueService';
import { venueService } from '../../services/venueService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export const RequestVenuePage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Availability / Conflict Check State
  // { status: 'idle' | 'checking' | 'available' | 'conflict', details: Object | null, message: string }
  const [checkResult, setCheckResult] = useState({
    status: 'idle',
    details: null,
    message: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [createdRequest, setCreatedRequest] = useState(null);

  // Set default initial values from logged-in faculty
  useEffect(() => {
    form.setFieldsValue({
      department: user?.department || 'Department of Computer Science & Engineering',
      date: dayjs('2026-10-15'),
      startTime: dayjs('09:00', 'HH:mm'),
      endTime: dayjs('12:00', 'HH:mm'),
      expectedParticipants: 80,
      eventType: 'Workshop',
      requiredFacilities: [
        'Dual 4K Laser Projectors & Screens',
        'Central Air Conditioning',
        'High-Speed Wi-Fi 6 & Gigabit LAN',
      ],
    });
  }, [user, form]);

  const [venues, setVenues] = useState(() => venueService.getActiveVenues());

  // Subscribe to venue changes (e.g. admin deactivates/adds/edits a venue)
  useEffect(() => {
    venueService.fetchVenues().then(() => {
      setVenues(venueService.getActiveVenues());
    }).catch(() => {});

    return venueService.subscribe(() => {
      setVenues(venueService.getActiveVenues());
    });
  }, []);

  // Selected venue details object
  const selectedVenue = venues.find((v) => String(v.id) === String(selectedVenueId)) || null;

  // Handle venue selection change
  const handleVenueChange = (venueId) => {
    setSelectedVenueId(venueId);
    // Invalidate previous check result on change
    setCheckResult({ status: 'idle', details: null, message: '' });
  };

  // Reset check result when date or time fields change
  const handleTimingChange = () => {
    if (checkResult.status !== 'idle') {
      setCheckResult({ status: 'idle', details: null, message: '' });
    }
  };

  // Execute Availability & Conflict Check
  const handleCheckAvailability = async () => {
    try {
      // Validate only relevant timing and venue fields first
      const values = await form.validateFields(['venue', 'date', 'startTime', 'endTime']);

      setCheckResult({ status: 'checking', details: null, message: 'Checking availability...' });

      const venueId = values.venue;
      const dateStr = values.date ? values.date.format('YYYY-MM-DD') : '';
      const startStr = values.startTime ? values.startTime.format('hh:mm A') : '';
      const endStr = values.endTime ? values.endTime.format('hh:mm A') : '';

      const matchedVenue = venues.find((v) => v.id === venueId) || (await venueService.getVenueById(venueId));
      const venueName = matchedVenue ? matchedVenue.name : venueId;

      if (values.date && values.date.day() === 0) {
        message.warning('Venue booking is not available on Sundays. Please select another date.');
        setCheckResult({
          status: 'conflict',
          details: {
            venueName,
            existingEvent: 'Campus Closed on Sundays',
            existingDate: dateStr,
            existingTime: 'All Day',
            reason: 'Venue booking is not available on Sundays. Please select another date.',
          },
          message: 'Venue booking is not available on Sundays. Please select another date.',
        });
        return;
      }

      const result = await facultyVenueService.checkAvailability({
        venue: venueName,
        venueId,
        date: dateStr,
        startTime: startStr,
        endTime: endStr,
      });

      if (result.hasConflict) {
        setCheckResult({
          status: 'conflict',
          details: result.conflictDetails,
          message: result.message || 'Venue Unavailable',
        });
        message.error('Venue Unavailable! A conflicting booking was detected.');
      } else {
        setCheckResult({
          status: 'available',
          details: {
            venueName,
            date: dateStr,
            timeSlot: `${startStr} - ${endStr}`,
          },
          message: 'Venue is available.',
        });
        message.success('Venue is available! You can proceed to submit your request.');
      }
    } catch (err) {
      if (err.errorFields) {
        message.warning('Please select Venue, Date, Start Time, and End Time to check availability.');
      }
    }
  };

  // Quick Preset Test Scenarios for Pair Programming / Review
  const loadTestScenario = (type) => {
    if (type === 'conflict') {
      // Conflict: Sir C.V. Raman Seminar Hall on 2026-09-28 between 09:00 AM - 04:30 PM
      form.setFieldsValue({
        eventName: 'AI Ethics Symposium 2026',
        eventType: 'Seminar',
        department: 'Department of Computer Science & Engineering',
        venue: 'V2', // Sir C.V. Raman Seminar Hall
        date: dayjs('2026-09-28'),
        startTime: dayjs('10:00', 'HH:mm'),
        endTime: dayjs('13:00', 'HH:mm'),
        expectedParticipants: 120,
        eventDescription: 'Testing clash detection with existing Renewable Energy Conference',
        requiredFacilities: ['Dual 4K Laser Projectors & Screens', 'Central Air Conditioning'],
        additionalRequirements: 'Test booking with known conflict',
      });
      setSelectedVenueId('V2');
      setCheckResult({ status: 'idle', details: null, message: '' });
      message.info('Loaded Conflicting Test Scenario: Sir C.V. Raman Hall on 2026-09-28 (10 AM - 1 PM)');
    } else if (type === 'available') {
      // Available: Main University Auditorium on 2026-10-20 (Free date)
      form.setFieldsValue({
        eventName: 'International Cybersecurity Summit 2026',
        eventType: 'National Conference',
        department: 'Department of Computer Science & Engineering',
        venue: 'V1', // Main University Auditorium
        date: dayjs('2026-10-20'),
        startTime: dayjs('09:30', 'HH:mm'),
        endTime: dayjs('13:30', 'HH:mm'),
        expectedParticipants: 450,
        eventDescription:
          'Keynote addresses and industry panels on zero-trust architectures and cloud incident response.',
        requiredFacilities: [
          'Dual 4K Laser Projectors & Screens',
          'Dolby Surround Sound & Stage Acoustics',
          'Wireless Handheld & Collar Mics',
          'High-Speed Wi-Fi 6 & Gigabit LAN',
        ],
        additionalRequirements: 'Stage podium with two wired backup mics and live recording setup.',
      });
      setSelectedVenueId('V1');
      setCheckResult({ status: 'idle', details: null, message: '' });
      message.info('Loaded Non-Conflicting Test Scenario: Auditorium on 2026-10-20 (9:30 AM - 1:30 PM)');
    }
  };

  // Form submission handler
  const onFinish = async (values) => {
    const venueId = values.venue;
    const dateStr = values.date.format('YYYY-MM-DD');
    const startStr = values.startTime.format('hh:mm A');
    const endStr = values.endTime.format('hh:mm A');

    // Requirement 3 & 4: Prevent submission on Sundays and display warning message
    if (values.date.day() === 0) {
      message.warning('Venue booking is not available on Sundays. Please select another date.');
      return;
    }

    const matchedVenue = venues.find((v) => v.id === venueId) || (await venueService.getVenueById(venueId));
    const venueName = matchedVenue ? matchedVenue.name : venueId;

    // Check availability
    const check = await facultyVenueService.checkAvailability({
      venue: venueName,
      venueId,
      date: dateStr,
      startTime: startStr,
      endTime: endStr,
    });

    if (check.hasConflict) {
      setCheckResult({
        status: 'conflict',
        details: check.conflictDetails,
        message: check.message || 'Venue Unavailable',
      });
      Modal.error({
        title: 'Submission Blocked - Venue Unavailable',
        content: (
          <div>
            <p>Your request cannot be submitted due to a schedule clash:</p>
            <ul>
              <li><strong>Venue:</strong> {check.conflictDetails?.venueName || venueName}</li>
              <li><strong>Clashing Event:</strong> {check.conflictDetails?.existingEvent || 'Booked Slot'}</li>
              <li><strong>Existing Date:</strong> {check.conflictDetails?.existingDate || dateStr}</li>
              <li><strong>Existing Time:</strong> {check.conflictDetails?.existingTime || 'Full Slot'}</li>
            </ul>
            <p style={{ color: '#ef4444' }}>Please select another venue or change the date/time slot.</p>
          </div>
        ),
      });
      return;
    }

    // Submit Request
    setSubmitting(true);
    try {
      const created = await facultyVenueService.createRequest({
        eventName: values.eventName,
        eventType: values.eventType,
        facultyName: user?.name,
        department: values.department,
        venue: venueName,
        venueId: venueId,
        date: dateStr,
        startTime: startStr,
        endTime: endStr,
        expectedParticipants: values.expectedParticipants,
        description: values.eventDescription,
        requiredFacilities: values.requiredFacilities || [],
        additionalRequirements: values.additionalRequirements || '',
      });

      setCreatedRequest(created);
      setSuccessModalVisible(true);
      message.success('Venue request submitted successfully!');
    } catch (err) {
      if (err.statusCode === 409 || err.conflicts) {
        Modal.error({
          title: 'Booking Conflict Detected (HTTP 409)',
          content: (
            <div>
              <p>{err.message || 'The selected venue already has an overlapping booking or pending request.'}</p>
              {err.conflicts && err.conflicts.length > 0 && (
                <ul style={{ marginTop: 8 }}>
                  {err.conflicts.map((c, i) => (
                    <li key={i}>
                      <strong>{c.event_name || 'Existing Event'}</strong> ({c.status}) from {c.start_time} to {c.end_time}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ),
        });
      } else {
        message.error(err.message || 'Failed to submit request.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Request Venue Reservation"
        subtitle="Submit academic venue reservation requests for departmental seminars, workshops, and symposiums"
        breadcrumbItems={[
          { title: 'Faculty', path: '/faculty/dashboard' },
          { title: 'Request Venue' },
        ]}
        extra={
          <Space>
            <Button
              icon={<ThunderboltOutlined />}
              onClick={() => loadTestScenario('conflict')}
            >
              Test Conflict Scenario
            </Button>
            <Button
              icon={<CheckCircleOutlined />}
              onClick={() => loadTestScenario('available')}
            >
              Test Available Scenario
            </Button>
            <Button
              icon={<FileDoneOutlined />}
              onClick={() => navigate('/faculty/my-requests')}
            >
              My Requests
            </Button>
          </Space>
        }
      />

      <Row gutter={[24, 24]}>
        {/* Main Request Form */}
        <Col xs={24} lg={16}>
          <Card
            bordered
            style={{ borderRadius: 8, borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            {/* Real-time Conflict / Availability Banner */}
            {checkResult.status === 'conflict' && (
              <div style={{ marginBottom: 24 }}>
                <Alert
                  type="error"
                  showIcon
                  message={<span style={{ fontWeight: 700, fontSize: 16 }}>Venue Unavailable</span>}
                  description={
                    <div style={{ marginTop: 8 }}>
                      <p style={{ margin: '4px 0', fontSize: 14 }}>
                        A conflicting reservation already occupies this venue during the selected time:
                      </p>
                      <div
                        style={{
                          background: '#fff1f2',
                          border: '1px solid #fecdd3',
                          borderRadius: 6,
                          padding: '10px 14px',
                          marginTop: 8,
                        }}
                      >
                        <p style={{ margin: '3px 0' }}>
                          <strong>Existing Event:</strong>{' '}
                          <span style={{ color: '#991b1b' }}>
                            {checkResult.details?.existingEvent || 'Pre-scheduled Booking'}
                          </span>
                        </p>
                        <p style={{ margin: '3px 0' }}>
                          <strong>Existing Date:</strong>{' '}
                          <span>{checkResult.details?.existingDate}</span>
                        </p>
                        <p style={{ margin: '3px 0' }}>
                          <strong>Existing Time:</strong>{' '}
                          <span>{checkResult.details?.existingTime}</span>
                        </p>
                        <p style={{ margin: '3px 0' }}>
                          <strong>Venue Name:</strong>{' '}
                          <span style={{ fontWeight: 600 }}>{checkResult.details?.venueName}</span>
                        </p>
                      </div>
                      <p style={{ margin: '8px 0 0 0', fontSize: 13, color: '#b91c1c' }}>
                        Submission is blocked. Please select another time slot, date, or alternative venue.
                      </p>
                    </div>
                  }
                />
              </div>
            )}

            {checkResult.status === 'available' && (
              <div style={{ marginBottom: 24 }}>
                <Alert
                  type="success"
                  showIcon
                  message={<span style={{ fontWeight: 700, fontSize: 16 }}>Venue is available.</span>}
                  description={
                    <div style={{ marginTop: 4 }}>
                      <span>
                        No conflicts detected for <strong>{checkResult.details?.venueName}</strong> on{' '}
                        <strong>{checkResult.details?.date}</strong> during{' '}
                        <strong>{checkResult.details?.timeSlot}</strong>. You may now submit your booking request.
                      </span>
                    </div>
                  }
                />
              </div>
            )}

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              requiredMark="optional"
              autoComplete="off"
            >
              {/* Event Details Section */}
              <Title level={5} style={{ color: '#0f172a', marginBottom: 16 }}>
                1. Event Information
              </Title>

              <Row gutter={16}>
                <Col xs={24} md={16}>
                  <Form.Item
                    name="eventName"
                    label="Event Name"
                    rules={[
                      { required: true, message: 'Please enter the event name' },
                      { min: 3, message: 'Event name must be at least 3 characters' },
                    ]}
                  >
                    <Input
                      placeholder="e.g. National Conference on Machine Intelligence"
                      size="large"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    name="eventType"
                    label="Event Type"
                    rules={[{ required: true, message: 'Please select event type' }]}
                  >
                    <Select placeholder="Select event type" size="large">
                      {EVENT_TYPES.map((type) => (
                        <Option key={type} value={type}>
                          {type}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={16}>
                  <Form.Item
                    name="department"
                    label="Department"
                    rules={[{ required: true, message: 'Please select or enter department' }]}
                  >
                    <Select placeholder="Select Academic Department" size="large">
                      {DEPARTMENTS.map((dept) => (
                        <Option key={dept} value={dept}>
                          {dept}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    name="expectedParticipants"
                    label="Expected Participants"
                    rules={[
                      { required: true, message: 'Please provide expected count' },
                      { type: 'number', min: 1, message: 'Must be at least 1 participant' },
                    ]}
                  >
                    <InputNumber
                      min={1}
                      max={2000}
                      style={{ width: '100%' }}
                      size="large"
                      placeholder="e.g. 150"
                      prefix={<TeamOutlined style={{ color: '#94a3b8' }} />}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider style={{ margin: '16px 0 24px' }} />

              {/* Venue & Schedule Section */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <Title level={5} style={{ color: '#0f172a', margin: 0 }}>
                  2. Venue & Scheduling
                </Title>
                <Button
                  type="default"
                  icon={<ThunderboltOutlined />}
                  onClick={handleCheckAvailability}
                  style={{
                    borderColor: '#1677ff',
                    color: '#1677ff',
                    fontWeight: 600,
                  }}
                >
                  Check Availability
                </Button>
              </div>

              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item
                    name="venue"
                    label="Venue"
                    rules={[{ required: true, message: 'Please select a venue' }]}
                  >
                    <Select
                      placeholder="Choose campus venue..."
                      size="large"
                      onChange={handleVenueChange}
                    >
                      {venues.map((v) => (
                        <Option key={v.id} value={v.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>
                              <strong>{v.name}</strong> ({v.location})
                            </span>
                            <span>
                              <Tag color={v.currentStatus === 'Maintenance' ? 'error' : 'blue'}>
                                Cap: {v.capacity} pax
                              </Tag>
                              {v.currentStatus === 'Maintenance' && (
                                <Tag color="error">Maintenance</Tag>
                              )}
                            </span>
                          </div>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="date"
                    label="Date"
                    rules={[
                      { required: true, message: 'Please select event date' },
                      () => ({
                        validator(_, value) {
                          if (!value) return Promise.resolve();
                          if (value.day() === 0) {
                            message.warning('Venue booking is not available on Sundays. Please select another date.');
                            return Promise.reject(
                              new Error('Venue booking is not available on Sundays. Please select another date.')
                            );
                          }
                          return Promise.resolve();
                        },
                      }),
                    ]}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      size="large"
                      format="YYYY-MM-DD"
                      disabledDate={(current) => current && current.day() === 0}
                      onChange={(date) => {
                        if (date && date.day() === 0) {
                          message.warning('Venue booking is not available on Sundays. Please select another date.');
                          form.setFieldsValue({ date: null });
                          return;
                        }
                        handleTimingChange();
                      }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={8}>
                  <Form.Item
                    name="startTime"
                    label="Start Time"
                    rules={[{ required: true, message: 'Please select start time' }]}
                  >
                    <TimePicker
                      style={{ width: '100%' }}
                      size="large"
                      format="hh:mm A"
                      use12Hours
                      minuteStep={15}
                      onChange={handleTimingChange}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={8}>
                  <Form.Item
                    name="endTime"
                    label="End Time"
                    rules={[
                      { required: true, message: 'Please select end time' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          const start = getFieldValue('startTime');
                          if (!value || !start) return Promise.resolve();
                          if (value.isBefore(start) || value.isSame(start)) {
                            return Promise.reject(new Error('End time must be after start time'));
                          }
                          return Promise.resolve();
                        },
                      }),
                    ]}
                  >
                    <TimePicker
                      style={{ width: '100%' }}
                      size="large"
                      format="hh:mm A"
                      use12Hours
                      minuteStep={15}
                      onChange={handleTimingChange}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider style={{ margin: '16px 0 24px' }} />

              {/* Facilities & Details Section */}
              <Title level={5} style={{ color: '#0f172a', marginBottom: 16 }}>
                3. Requirements & Description
              </Title>

              <Form.Item
                name="requiredFacilities"
                label="Required Facilities"
                extra="Select all audio-visual, seating, or network infrastructure needed for the event."
              >
                <Select
                  mode="multiple"
                  placeholder="Select required facilities..."
                  size="large"
                  allowClear
                  style={{ width: '100%' }}
                >
                  {FACILITY_OPTIONS.map((facility) => (
                    <Option key={facility} value={facility}>
                      {facility}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="eventDescription"
                label="Event Description"
                rules={[
                  { required: true, message: 'Please provide brief description of the event' },
                  { min: 10, message: 'Description must be at least 10 characters' },
                ]}
              >
                <TextArea
                  rows={3}
                  placeholder="Summarize the purpose, agenda, guest speakers, and target audience..."
                />
              </Form.Item>

              <Form.Item
                name="additionalRequirements"
                label="Additional Requirements (Optional)"
              >
                <TextArea
                  rows={2}
                  placeholder="Special security, refreshment pantry, VIP green room setup, parking allocation, etc."
                />
              </Form.Item>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 12,
                  marginTop: 24,
                  paddingTop: 16,
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <Button onClick={() => form.resetFields()}>Reset</Button>

                <Button
                  type="default"
                  icon={<ThunderboltOutlined />}
                  onClick={handleCheckAvailability}
                >
                  Check Availability
                </Button>

                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SendOutlined />}
                  loading={submitting}
                  disabled={checkResult.status === 'conflict'}
                  style={{
                    fontWeight: 600,
                    padding: '0 24px',
                  }}
                >
                  Submit Request
                </Button>
              </div>
            </Form>
          </Card>
        </Col>

        {/* Selected Venue Preview & Guidelines Sidebar */}
        <Col xs={24} lg={8}>
          {selectedVenue ? (
            <Card
              title={
                <Space>
                  <BankOutlined style={{ color: '#1677ff' }} />
                  <span>Selected Venue Information</span>
                </Space>
              }
              bordered
              style={{ borderRadius: 8, borderColor: '#e2e8f0', marginBottom: 16 }}
            >
              <Title level={5} style={{ margin: '0 0 4px', color: '#0f172a' }}>
                {selectedVenue.name}
              </Title>
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
                {selectedVenue.location}
              </Text>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <Tag color="cyan">Capacity: {selectedVenue.capacity} Seats</Tag>
                <Tag color={selectedVenue.currentStatus === 'Maintenance' ? 'error' : 'green'}>
                  {selectedVenue.currentStatus}
                </Tag>
              </div>

              <Paragraph style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
                {selectedVenue.description}
              </Paragraph>

              <div style={{ marginBottom: 12 }}>
                <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
                  Standard Amenities:
                </Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(selectedVenue.facilities || []).map((fac, idx) => (
                    <Tag key={idx} style={{ margin: 0, fontSize: 11 }}>
                      {fac}
                    </Tag>
                  ))}
                </div>
              </div>
            </Card>
          ) : (
            <Card
              bordered
              style={{
                borderRadius: 8,
                borderColor: '#e2e8f0',
                marginBottom: 16,
                background: '#f8fafc',
                textAlign: 'center',
                padding: '24px 12px',
              }}
            >
              <BankOutlined style={{ fontSize: 36, color: '#94a3b8', marginBottom: 12 }} />
              <Title level={5} style={{ color: '#475569', margin: '0 0 6px' }}>
                No Venue Selected
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Choose a venue from the dropdown to preview capacity, equipped amenities, and real-time status.
              </Text>
            </Card>
          )}

          {/* Booking Guidelines Card */}
          <Card
            title={
              <Space>
                <InfoCircleOutlined style={{ color: '#faad14' }} />
                <span>Reservation Policy & Conflict Rule</span>
              </Space>
            }
            bordered
            style={{ borderRadius: 8, borderColor: '#e2e8f0' }}
          >
            <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
              <li>
                <strong>Conflict Rule:</strong> Bookings cannot overlap on the same venue, same date, where requested start time &lt; existing end time and requested end time &gt; existing start time.
              </li>
              <li>
                <strong>Automatic Conflict Checking:</strong> You can click "Check Availability" at any time or submit directly; conflicting submissions will be strictly prevented.
              </li>
              <li>
                <strong>Lifecycle:</strong> Once submitted, your request enters <code>Pending</code> status.
              </li>
              <li>
                <strong>Cancellation:</strong> You can cancel any <code>Pending</code> request at any time from the "My Requests" page.
              </li>
            </ul>
          </Card>
        </Col>
      </Row>

      {/* Success Modal */}
      <Modal
        open={successModalVisible}
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>Venue Request Submitted!</span>
          </Space>
        }
        onCancel={() => setSuccessModalVisible(false)}
        footer={[
          <Button key="another" onClick={() => {
            setSuccessModalVisible(false);
            form.resetFields();
            setCheckResult({ status: 'idle', details: null, message: '' });
          }}>
            Submit Another Request
          </Button>,
          <Button
            key="view"
            type="primary"
            onClick={() => navigate('/faculty/my-requests')}
          >
            Go to My Requests
          </Button>,
        ]}
      >
        <div style={{ padding: '8px 0' }}>
          <Paragraph>
            Your venue reservation request has been created and logged. It is now awaiting administrative review.
          </Paragraph>

          {createdRequest && (
            <Descriptions bordered size="small" column={1} style={{ marginTop: 12 }}>
              <Descriptions.Item label="Request ID">
                <Text code strong>{createdRequest.id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Event">
                {createdRequest.eventName}
              </Descriptions.Item>
              <Descriptions.Item label="Venue">
                {createdRequest.venue}
              </Descriptions.Item>
              <Descriptions.Item label="Date & Time">
                {createdRequest.date} ({createdRequest.timeSlot})
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color="processing">Pending</Tag>
              </Descriptions.Item>
            </Descriptions>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default RequestVenuePage;
