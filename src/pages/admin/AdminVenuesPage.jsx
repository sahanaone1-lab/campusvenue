import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Typography,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Modal,
  Form,
  InputNumber,
  Popconfirm,
  message,
  Tooltip,
  Descriptions,
  Divider,
  Empty,
  Alert,
} from 'antd';
import {
  BankOutlined,
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  StopOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  ToolOutlined,
  ApartmentOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import PageHeader from '../../components/PageHeader';
import {
  venueService,
  BUILDINGS_LIST,
  STANDARD_FACILITIES,
} from '../../services/venueService';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export const AdminVenuesPage = () => {
  // Venue list state
  const [venues, setVenues] = useState(() => venueService.getVenues());
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Search & Filter state
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [buildingFilter, setBuildingFilter] = useState('ALL');

  // Modal states
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null); // null = Add, object = Edit
  const [viewingVenue, setViewingVenue] = useState(null);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);

  // Form instance
  const [form] = Form.useForm();

  // Fetch all venues from backend on mount
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setFetchError(null);

    venueService
      .fetchVenues({ status: 'all', limit: 100 })
      .then((data) => {
        if (mounted) {
          setVenues(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setFetchError(err.message || 'Failed to load venues.');
          setLoading(false);
        }
      });

    const unsub = venueService.subscribe((updated) => {
      if (mounted) {
        setVenues(updated);
        if (viewingVenue) {
          const refreshed = updated.find((v) => String(v.id) === String(viewingVenue.id));
          if (refreshed) setViewingVenue(refreshed);
        }
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [viewingVenue]);

  // Derived KPI metrics
  const totalCount = venues.length;
  const activeCount = venues.filter((v) => v.status === 'Active').length;
  const inactiveCount = venues.filter((v) => v.status === 'Inactive').length;
  const maintenanceCount = venues.filter((v) => v.status === 'Maintenance').length;
  const totalCapacity = venues.reduce((acc, curr) => acc + (Number(curr.capacity) || 0), 0);

  // Filtered venues list
  const filteredVenues = useMemo(() => {
    return venues.filter((v) => {
      const matchesStatus =
        statusFilter === 'ALL' || v.status === statusFilter;

      const matchesBuilding =
        buildingFilter === 'ALL' ||
        (v.building && v.building.toLowerCase() === buildingFilter.toLowerCase());

      const query = searchText.toLowerCase().trim();
      const matchesSearch =
        !query ||
        v.name.toLowerCase().includes(query) ||
        (v.location && v.location.toLowerCase().includes(query)) ||
        (v.building && v.building.toLowerCase().includes(query)) ||
        (v.facilities && v.facilities.some((f) => f.toLowerCase().includes(query))) ||
        String(v.id).toLowerCase().includes(query);

      return matchesStatus && matchesBuilding && matchesSearch;
    });
  }, [venues, statusFilter, buildingFilter, searchText]);

  // Open Add Venue Modal
  const handleOpenAdd = () => {
    setEditingVenue(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'Active',
      building: BUILDINGS_LIST[0],
      capacity: 100,
      facilities: ['Projector', 'AC', 'Wi-Fi', 'Sound System'],
    });
    setIsFormModalVisible(true);
  };

  // Open Edit Venue Modal
  const handleOpenEdit = (record) => {
    setEditingVenue(record);
    form.resetFields();
    form.setFieldsValue({
      name: record.name,
      building: record.building || BUILDINGS_LIST[0],
      location: record.location,
      capacity: record.capacity,
      description: record.description,
      facilities: record.facilities || [],
      status: record.status || 'Active',
    });
    setIsFormModalVisible(true);
  };

  // Open View Details Modal
  const handleOpenView = (record) => {
    setViewingVenue(record);
    setIsViewModalVisible(true);
  };

  // Handle Form Submission (Create / Update)
  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingVenue) {
        // Edit existing venue
        await venueService.updateVenue(editingVenue.id, values);
        message.success(`Venue "${values.name}" updated successfully.`);
      } else {
        // Create new venue
        const created = await venueService.createVenue(values);
        message.success(`Venue "${created.name}" created successfully with ID ${created.id}.`);
      }

      setIsFormModalVisible(false);
      setEditingVenue(null);
      form.resetFields();
    } catch (err) {
      if (err.message && !err.errorFields) {
        message.error(err.message);
      }
    }
  };

  // Deactivate Venue Action (with confirmation)
  const handleDeactivateVenue = async (record) => {
    try {
      await venueService.deactivateVenue(record.id);
      message.warning(`Venue "${record.name}" has been deactivated. It will no longer be available for faculty reservation requests.`);
    } catch (err) {
      message.error(err.message || 'Failed to deactivate venue.');
    }
  };

  // Activate Venue Action
  const handleActivateVenue = async (record) => {
    try {
      await venueService.activateVenue(record.id);
      message.success(`Venue "${record.name}" is now Active and available for bookings.`);
    } catch (err) {
      message.error(err.message || 'Failed to activate venue.');
    }
  };

  // Status Badge Component
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Active
          </Tag>
        );
      case 'Inactive':
        return (
          <Tag color="error" icon={<StopOutlined />}>
            Inactive / Deactivated
          </Tag>
        );
      case 'Maintenance':
        return (
          <Tag color="warning" icon={<ToolOutlined />}>
            Maintenance
          </Tag>
        );
      default:
        return <Tag>{status}</Tag>;
    }
  };

  // Table Columns (Requirement 2: Venue Name, Location, Capacity, Facilities, Status, Actions)
  const columns = [
    {
      title: 'Venue Name',
      key: 'name',
      width: 250,
      render: (_, record) => (
        <div>
          <Space orientation="horizontal" size={8}>
            <BankOutlined style={{ color: '#1677ff', fontSize: 16 }} />
            <Text strong style={{ color: '#0f172a', fontSize: 14 }}>
              {record.name}
            </Text>
          </Space>
          <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
            <Text code style={{ fontSize: 11 }}>{record.id}</Text>
            {record.building && (
              <Tag color="geekblue" style={{ fontSize: 11, margin: 0 }}>
                {record.building}
              </Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      width: 220,
      render: (_, record) => (
        <Space orientation="horizontal" size={6} align="start">
          <EnvironmentOutlined style={{ color: '#64748b', marginTop: 3 }} />
          <div>
            <Text style={{ color: '#334155', fontSize: 13 }}>{record.location}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Capacity',
      dataIndex: 'capacity',
      key: 'capacity',
      width: 120,
      sorter: (a, b) => a.capacity - b.capacity,
      render: (cap) => (
        <Space orientation="horizontal" size={6}>
          <TeamOutlined style={{ color: '#64748b' }} />
          <Text strong style={{ color: '#1e293b' }}>{cap}</Text>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>seats</span>
        </Space>
      ),
    },
    {
      title: 'Facilities',
      dataIndex: 'facilities',
      key: 'facilities',
      width: 240,
      render: (facilities) => {
        if (!facilities || facilities.length === 0) {
          return <Text type="secondary" style={{ fontSize: 12 }}>Standard Setup</Text>;
        }
        const visible = facilities.slice(0, 3);
        const remaining = facilities.length - 3;
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {visible.map((fac, idx) => (
              <Tag key={idx} color="cyan" style={{ fontSize: 11 }}>
                {fac}
              </Tag>
            ))}
            {remaining > 0 && (
              <Tooltip title={facilities.slice(3).join(', ')}>
                <Tag style={{ fontSize: 11, cursor: 'pointer' }}>+{remaining} more</Tag>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 170,
      render: (status) => renderStatusBadge(status),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 240,
      render: (_, record) => {
        const isActive = record.status === 'Active';

        return (
          <Space orientation="horizontal" size={6}>
            <Tooltip title="View Venue Details">
              <Button
                size="small"
                type="default"
                icon={<EyeOutlined />}
                onClick={() => handleOpenView(record)}
              />
            </Tooltip>

            <Tooltip title="Edit Venue">
              <Button
                size="small"
                type="primary"
                ghost
                icon={<EditOutlined />}
                onClick={() => handleOpenEdit(record)}
              >
                Edit
              </Button>
            </Tooltip>

            {isActive ? (
              // Requirement 7: Confirmation before deactivating a venue
              <Popconfirm
                title="Deactivate Venue"
                description={
                  <div style={{ maxWidth: 280 }}>
                    <p style={{ margin: '4px 0 8px 0' }}>
                      Are you sure you want to deactivate <strong>{record.name}</strong>?
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: '#dc2626' }}>
                      Deactivated venues will NOT appear as available for new faculty requests.
                    </p>
                  </div>
                }
                okText="Yes, Deactivate"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
                onConfirm={() => handleDeactivateVenue(record)}
              >
                <Button size="small" danger icon={<StopOutlined />}>
                  Deactivate
                </Button>
              </Popconfirm>
            ) : (
              <Button
                size="small"
                style={{ borderColor: '#52c41a', color: '#52c41a' }}
                icon={<CheckCircleOutlined />}
                onClick={() => handleActivateVenue(record)}
              >
                Activate
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Campus Venues Management"
        subtitle="Configure university facilities, adjust capacities, toggle availability status, and manage amenities"
        breadcrumbItems={[
          { title: 'Admin', path: '/admin/dashboard' },
          { title: 'Venues' },
        ]}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="middle"
            onClick={handleOpenAdd}
            style={{ fontWeight: 600 }}
          >
            Add Venue
          </Button>
        }
      />

      {/* Error Alert on API Failure */}
      {fetchError && (
        <Alert
          message="Failed to load campus venues"
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
                venueService
                  .fetchVenues({ status: 'all', limit: 100 })
                  .then((data) => {
                    setVenues(data);
                    setLoading(false);
                  })
                  .catch((err) => {
                    setFetchError(err.message || 'Failed to load venues.');
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
              title={<span style={{ color: '#64748b', fontSize: 13 }}>Total Campus Venues</span>}
              value={totalCount}
              prefix={<BankOutlined style={{ color: '#1677ff', marginRight: 8 }} />}
              valueStyle={{ color: '#0f172a', fontWeight: 700 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 13 }}>Active & Available</span>}
              value={activeCount}
              prefix={<CheckCircleOutlined style={{ color: '#16a34a', marginRight: 8 }} />}
              valueStyle={{ color: '#16a34a', fontWeight: 700 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 13 }}>Inactive / Maintenance</span>}
              value={inactiveCount + maintenanceCount}
              prefix={<StopOutlined style={{ color: '#dc2626', marginRight: 8 }} />}
              valueStyle={{ color: '#dc2626', fontWeight: 700 }}
              suffix={
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  ({maintenanceCount} in maint.)
                </span>
              }
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 13 }}>Total Seating Capacity</span>}
              value={totalCapacity}
              prefix={<TeamOutlined style={{ color: '#7c3aed', marginRight: 8 }} />}
              valueStyle={{ color: '#7c3aed', fontWeight: 700 }}
              suffix={<span style={{ fontSize: 13, color: '#94a3b8' }}>seats</span>}
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
            <Col xs={24} md={8}>
              <Input
                placeholder="Search venue name, location, building, facilities..."
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>

            <Col xs={24} md={16} style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
              <Space wrap>
                <span style={{ fontSize: 13, color: '#64748b' }}>Building:</span>
                <Select
                  value={buildingFilter}
                  onChange={(val) => setBuildingFilter(val)}
                  style={{ width: 190 }}
                >
                  <Option value="ALL">All Campus Buildings</Option>
                  {BUILDINGS_LIST.map((b) => (
                    <Option key={b} value={b}>{b}</Option>
                  ))}
                </Select>

                <span style={{ fontSize: 13, color: '#64748b' }}>Status:</span>
                <Select
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  style={{ width: 140 }}
                >
                  <Option value="ALL">All Statuses</Option>
                  <Option value="Active">Active</Option>
                  <Option value="Inactive">Inactive</Option>
                  <Option value="Maintenance">Maintenance</Option>
                </Select>

                {(searchText || statusFilter !== 'ALL' || buildingFilter !== 'ALL') && (
                  <Button
                    type="link"
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      setSearchText('');
                      setStatusFilter('ALL');
                      setBuildingFilter('ALL');
                    }}
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
          dataSource={filteredVenues}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1250 }}
          pagination={{ pageSize: 8, showSizeChanger: true }}
          locale={{
            emptyText: (
              <Empty
                description="No campus venues found matching criteria"
                style={{ padding: '32px 0' }}
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
                  Add New Venue
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Add / Edit Venue Modal (Requirement 4 & 5) */}
      <Modal
        open={isFormModalVisible}
        title={
          <Space>
            <BankOutlined style={{ color: '#1677ff' }} />
            <span style={{ fontSize: 17, fontWeight: 600 }}>
              {editingVenue ? `Edit Venue: ${editingVenue.name}` : 'Add New Campus Venue'}
            </span>
          </Space>
        }
        width={680}
        onCancel={() => {
          setIsFormModalVisible(false);
          setEditingVenue(null);
          form.resetFields();
        }}
        onOk={handleFormSubmit}
        okText={editingVenue ? 'Save Changes' : 'Create Venue'}
        destroyOnClose
      >
        <Divider style={{ margin: '12px 0 20px' }} />
        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
          autoComplete="off"
        >
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item
                name="name"
                label="Venue Name"
                rules={[
                  { required: true, message: 'Please enter venue name' },
                  { min: 3, message: 'Venue name must be at least 3 characters' },
                ]}
              >
                <Input placeholder="e.g. Sir C.V. Raman Seminar Hall" size="large" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true, message: 'Please select operational status' }]}
              >
                <Select size="large">
                  <Option value="Active">Active</Option>
                  <Option value="Inactive">Inactive / Deactivated</Option>
                  <Option value="Maintenance">Maintenance</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="building"
                label="Building / Block"
                rules={[{ required: true, message: 'Please specify campus building/block' }]}
              >
                <Select
                  placeholder="Select or enter building block"
                  size="large"
                  showSearch
                  allowClear
                >
                  {BUILDINGS_LIST.map((b) => (
                    <Option key={b} value={b}>{b}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="capacity"
                label="Seating Capacity"
                rules={[
                  { required: true, message: 'Please enter seating capacity' },
                  { type: 'number', min: 1, message: 'Capacity must be at least 1 seat' },
                ]}
              >
                <InputNumber
                  min={1}
                  max={5000}
                  style={{ width: '100%' }}
                  size="large"
                  prefix={<TeamOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="e.g. 150"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="location"
            label="Location / Floor / Room"
            rules={[{ required: true, message: 'Please specify floor and room location' }]}
            extra="Example: 'Science Block B, 2nd Floor, Room 204'"
          >
            <Input
              placeholder="e.g. Academic Block C, 3rd Floor, West Wing"
              size="large"
              prefix={<EnvironmentOutlined style={{ color: '#94a3b8' }} />}
            />
          </Form.Item>

          {/* Requirement 5: Facilities (Projector, AC, Sound System, Microphone, Wi-Fi, Smart Board, Stage) */}
          <Form.Item
            name="facilities"
            label="Facilities & Equipment"
            extra="Select all audio-visual, network, and physical amenities equipped in this venue."
          >
            <Select
              mode="tags"
              placeholder="Select or type custom facilities..."
              size="large"
              style={{ width: '100%' }}
              tokenSeparators={[',']}
            >
              {STANDARD_FACILITIES.map((f) => (
                <Option key={f} value={f}>
                  {f}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[
              { required: true, message: 'Please provide venue description' },
              { min: 10, message: 'Description must be at least 10 characters' },
            ]}
          >
            <TextArea
              rows={3}
              placeholder="Describe venue purpose, acoustic setup, accessibility, and ideal event formats..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* View Venue Details Modal (Requirement 3: View venue) */}
      <Modal
        open={isViewModalVisible}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 600 }}>Venue Information</span>
            {viewingVenue && renderStatusBadge(viewingVenue.status)}
          </div>
        }
        width={700}
        onCancel={() => {
          setIsViewModalVisible(false);
          setViewingVenue(null);
        }}
        footer={[
          viewingVenue?.status === 'Active' ? (
            <Popconfirm
              key="deactivate"
              title="Deactivate Venue"
              description="Deactivating this venue will immediately hide it from faculty requests."
              okText="Yes, Deactivate"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              onConfirm={() => {
                handleDeactivateVenue(viewingVenue);
                setIsViewModalVisible(false);
              }}
            >
              <Button danger icon={<StopOutlined />}>
                Deactivate Venue
              </Button>
            </Popconfirm>
          ) : (
            <Button
              key="activate"
              style={{ borderColor: '#52c41a', color: '#52c41a' }}
              icon={<CheckCircleOutlined />}
              onClick={() => {
                handleActivateVenue(viewingVenue);
                setIsViewModalVisible(false);
              }}
            >
              Activate Venue
            </Button>
          ),
          <Button
            key="edit"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              const current = viewingVenue;
              setIsViewModalVisible(false);
              handleOpenEdit(current);
            }}
          >
            Edit Venue
          </Button>,
          <Button key="close" onClick={() => setIsViewModalVisible(false)}>
            Close
          </Button>,
        ]}
      >
        {viewingVenue && (
          <div style={{ marginTop: 12 }}>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Venue ID" span={1}>
                <Text code strong>{viewingVenue.id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status" span={1}>
                {renderStatusBadge(viewingVenue.status)}
              </Descriptions.Item>

              <Descriptions.Item label="Venue Name" span={2}>
                <Text strong style={{ fontSize: 16, color: '#0f172a' }}>
                  {viewingVenue.name}
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Building / Block">
                <Space>
                  <ApartmentOutlined style={{ color: '#1677ff' }} />
                  <span>{viewingVenue.building || 'Main Campus'}</span>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Capacity">
                <Space>
                  <TeamOutlined style={{ color: '#1677ff' }} />
                  <Text strong>{viewingVenue.capacity} Seats</Text>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Location" span={2}>
                <Space>
                  <EnvironmentOutlined style={{ color: '#64748b' }} />
                  <span>{viewingVenue.location}</span>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Description" span={2}>
                <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#334155' }}>
                  {viewingVenue.description || 'No description provided.'}
                </Paragraph>
              </Descriptions.Item>

              <Descriptions.Item label="Equipped Facilities" span={2}>
                {viewingVenue.facilities && viewingVenue.facilities.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {viewingVenue.facilities.map((fac, i) => (
                      <Tag key={i} color="cyan">
                        {fac}
                      </Tag>
                    ))}
                  </div>
                ) : (
                  <Text type="secondary">Standard lecture hall setup</Text>
                )}
              </Descriptions.Item>
            </Descriptions>

            {viewingVenue.status === 'Inactive' && (
              <Alert
                type="warning"
                showIcon
                message="Venue Deactivated"
                description="This venue is currently inactive. It will not be displayed as an option for faculty booking requests."
                style={{ marginTop: 16 }}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminVenuesPage;
