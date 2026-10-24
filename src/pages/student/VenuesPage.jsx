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
  Input,
  Select,
  Segmented,
  Empty,
  Badge,
  Spin,
} from 'antd';
import {
  EnvironmentOutlined,
  TeamOutlined,
  SearchOutlined,
  AppstoreOutlined,
  BarsOutlined,
  EyeOutlined,
  ToolOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { venueService } from '../../services/venueService';

const { Text } = Typography;

export const VenuesPage = () => {
  const navigate = useNavigate();
  const [venues, setVenues] = useState(() => venueService.getVenues());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    let mounted = true;
    venueService
      .fetchVenues()
      .then((data) => {
        if (mounted) setVenues(data);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const unsubscribe = venueService.subscribe((updated) => {
      if (mounted) setVenues(updated);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Filter venues based on search query and status
  const filteredVenues = useMemo(() => {
    return venues.filter((venue) => {
      const matchesSearch =
        venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        venue.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (venue.facilities && venue.facilities.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase())));

      const currentStat = venue.currentStatus || (venue.status === 'Active' ? 'Available' : venue.status);
      const matchesStatus =
        statusFilter === 'ALL' || currentStat.toUpperCase() === statusFilter.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [venues, searchQuery, statusFilter]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Available':
        return <Badge status="success" text={<Text strong style={{ color: '#16a34a' }}>Available</Text>} />;
      case 'Occupied':
        return <Badge status="error" text={<Text strong style={{ color: '#dc2626' }}>Occupied</Text>} />;
      case 'Maintenance':
        return <Badge status="warning" text={<Text strong style={{ color: '#d97706' }}>Maintenance</Text>} />;
      default:
        return <Badge status="default" text={status} />;
    }
  };

  const tableColumns = [
    {
      title: 'Venue Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <Text strong style={{ color: '#0f172a', fontSize: 14 }}>
            {name}
          </Text>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
            <EnvironmentOutlined style={{ marginRight: 4 }} />
            {record.location}
          </div>
        </div>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      responsive: ['md'],
      render: (loc) => <Text style={{ color: '#475569', fontSize: 13 }}>{loc}</Text>,
    },
    {
      title: 'Capacity',
      dataIndex: 'capacity',
      key: 'capacity',
      sorter: (a, b) => a.capacity - b.capacity,
      render: (cap) => (
        <Space orientation="horizontal" size={4}>
          <TeamOutlined style={{ color: '#1677ff' }} />
          <Text strong>{cap}</Text>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>seats</span>
        </Space>
      ),
    },
    {
      title: 'Facilities',
      dataIndex: 'facilities',
      key: 'facilities',
      responsive: ['lg'],
      render: (facilities) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 280 }}>
          {facilities.slice(0, 3).map((f) => (
            <Tag key={f} color="blue" style={{ fontSize: 11, margin: 0 }}>
              {f}
            </Tag>
          ))}
          {facilities.length > 3 && (
            <Tag style={{ fontSize: 11, margin: 0 }}>+{facilities.length - 3} more</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Current Status',
      dataIndex: 'currentStatus',
      key: 'currentStatus',
      render: (status) => getStatusBadge(status),
    },
    {
      title: 'Current Event (If Occupied)',
      key: 'currentEvent',
      render: (_, record) => {
        if (record.currentStatus === 'Occupied' && record.currentEvent) {
          return (
            <div style={{ maxWidth: 220 }}>
              <Text strong style={{ fontSize: 12, color: '#dc2626', display: 'block' }}>
                {record.currentEvent.name}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.currentEvent.department} ({record.currentEvent.startTime} - {record.currentEvent.endTime})
              </Text>
            </div>
          );
        }
        if (record.currentStatus === 'Maintenance') {
          return <Text type="secondary" style={{ fontSize: 12 }}>Under Maintenance</Text>;
        }
        return <Text type="secondary" style={{ fontSize: 12, color: '#16a34a' }}>No ongoing session</Text>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/student/venues/${record.id}`)}
        >
          Details
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Campus Venues Directory"
        subtitle="Explore university auditoriums, seminar halls, computer labs, and sports arenas"
        breadcrumbItems={[
          { title: 'Home', path: '/' },
          { title: 'Student', path: '/student/dashboard' },
          { title: 'Venues' },
        ]}
        extra={
          <Segmented
            value={viewMode}
            onChange={setViewMode}
            options={[
              { label: 'Card View', value: 'cards', icon: <AppstoreOutlined /> },
              { label: 'Table View', value: 'table', icon: <BarsOutlined /> },
            ]}
          />
        }
      />

      {/* Filter and Search Bar */}
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
          <Col xs={24} sm={12} md={10}>
            <Input
              placeholder="Search by venue name, location, or facility..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              size="middle"
            />
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Space style={{ width: '100%' }}>
              <span style={{ fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>
                Status Filter:
              </span>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 160 }}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'AVAILABLE', label: 'Available Only' },
                  { value: 'OCCUPIED', label: 'Occupied' },
                  { value: 'MAINTENANCE', label: 'Maintenance' },
                ]}
              />
            </Space>
          </Col>

          <Col xs={24} md={6} style={{ textAlign: 'right' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Showing <Text strong>{filteredVenues.length}</Text> of {venues.length} venues
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Main Content Area */}
      <Spin spinning={loading} tip="Loading venues...">
      {filteredVenues.length === 0 && !loading ? (
        <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0', padding: 32 }}>
          <Empty
            description={
              <span>
                No campus venues matched your search criteria{' '}
                <Text code>{searchQuery || statusFilter}</Text>
              </span>
            }
          >
            <Button
              type="primary"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
            >
              Reset Filters
            </Button>
          </Empty>
        </Card>
      ) : viewMode === 'table' ? (
        <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
          <Table
            dataSource={filteredVenues}
            columns={tableColumns}
            rowKey="id"
            scroll={{ x: 1000 }}
            pagination={{ pageSize: 8 }}
          />
        </Card>
      ) : (
        <Row gutter={[20, 20]}>
          {filteredVenues.map((venue) => {
            const isOccupied = venue.currentStatus === 'Occupied';
            const isMaintenance = venue.currentStatus === 'Maintenance';

            return (
              <Col xs={24} sm={12} lg={8} key={venue.id}>
                <Card
                  hoverable
                  bordered
                  onClick={() => navigate(`/student/venues/${venue.id}`)}
                  style={{
                    borderRadius: 10,
                    borderColor: '#e2e8f0',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                  bodyStyle={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 20 }}
                >
                  <div>
                    {/* Header: Venue Name & Status */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: 16, color: '#0f172a', lineHeight: 1.3 }}>
                          {venue.name}
                        </Text>
                      </div>
                      <Tag
                        color={
                          venue.currentStatus === 'Available'
                            ? 'success'
                            : isOccupied
                            ? 'error'
                            : 'warning'
                        }
                        style={{ margin: 0, fontWeight: 600 }}
                      >
                        {venue.currentStatus}
                      </Tag>
                    </div>

                    {/* Location */}
                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                      <EnvironmentOutlined style={{ marginRight: 6, color: '#1677ff' }} />
                      {venue.location}
                    </div>

                    {/* Capacity */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 14,
                        padding: '6px 12px',
                        background: '#f8fafc',
                        borderRadius: 6,
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <TeamOutlined style={{ color: '#0284c7' }} />
                      <Text style={{ fontSize: 13, color: '#334155' }}>
                        Seating Capacity: <Text strong>{venue.capacity}</Text> attendees
                      </Text>
                    </div>

                    {/* Current Event banner if occupied */}
                    {isOccupied && venue.currentEvent && (
                      <div
                        style={{
                          background: '#fff1f2',
                          border: '1px solid #fecdd3',
                          borderRadius: 6,
                          padding: '10px 12px',
                          marginBottom: 14,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <ClockCircleOutlined style={{ color: '#e11d48', fontSize: 12 }} />
                          <Text strong style={{ fontSize: 12, color: '#9f1239' }}>
                            Currently Occupied
                          </Text>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                          {venue.currentEvent.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          {venue.currentEvent.department}
                        </div>
                        <div style={{ fontSize: 11, color: '#be123c', marginTop: 2, fontWeight: 500 }}>
                          Slot: {venue.currentEvent.startTime} - {venue.currentEvent.endTime}
                        </div>
                      </div>
                    )}

                    {/* Maintenance notice */}
                    {isMaintenance && (
                      <div
                        style={{
                          background: '#fffbeb',
                          border: '1px solid #fef3c7',
                          borderRadius: 6,
                          padding: '10px 12px',
                          marginBottom: 14,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ToolOutlined style={{ color: '#d97706', fontSize: 12 }} />
                          <Text strong style={{ fontSize: 12, color: '#92400e' }}>
                            Under Scheduled Maintenance
                          </Text>
                        </div>
                        <div style={{ fontSize: 11, color: '#78350f', marginTop: 2 }}>
                          Temporarily closed for equipment calibration and upgrades.
                        </div>
                      </div>
                    )}

                    {/* Facilities Tags */}
                    <div style={{ marginBottom: 16 }}>
                      <Text
                        type="secondary"
                        style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}
                      >
                        Available Facilities:
                      </Text>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {venue.facilities.slice(0, 4).map((facility) => (
                          <Tag
                            key={facility}
                            style={{
                              margin: 0,
                              fontSize: 11,
                              background: '#f1f5f9',
                              borderColor: '#e2e8f0',
                              color: '#334155',
                            }}
                          >
                            {facility}
                          </Tag>
                        ))}
                        {venue.facilities.length > 4 && (
                          <Tag style={{ margin: 0, fontSize: 11 }}>
                            +{venue.facilities.length - 4} more
                          </Tag>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Action */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 'auto' }}>
                    <Button
                      type="primary"
                      ghost
                      block
                      icon={<EyeOutlined />}
                      onClick={() => navigate(`/student/venues/${venue.id}`)}
                    >
                      View Venue Details
                    </Button>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
      </Spin>
    </div>
  );
};

export default VenuesPage;
