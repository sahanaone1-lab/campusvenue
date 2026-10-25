import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  Typography,
  message,
  Modal,
  Alert,
  Space,
  Divider,
  Segmented,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  BankOutlined,
  InfoCircleOutlined,
  CrownOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../services/useAuth';
import { ROLES, ROLE_LABELS, ROLE_HOME_ROUTES } from '../../utils/constants';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export const LoginPage = () => {
  const [form] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, login, register } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to user's dashboard
  useEffect(() => {
    if (isAuthenticated && user?.role) {
      const targetRoute = ROLE_HOME_ROUTES[user.role.toLowerCase()] || '/';
      navigate(targetRoute, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Handle URL query param for role pre-selection
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam && Object.values(ROLES).includes(roleParam)) {
      form.setFieldsValue({
        role: roleParam,
      });
    } else {
      form.setFieldsValue({
        role: ROLES.STUDENT,
      });
    }
  }, [searchParams, form]);

  const handleRoleChange = () => {
    setAuthError(null);
  };

  const onFinishLogin = async (values) => {
    setLoading(true);
    setAuthError(null);

    try {
      const sessionUser = await login({
        email: values.identifier,
        identifier: values.identifier,
        password: values.password,
        role: values.role,
      });

      message.success(`Welcome, ${sessionUser.name}! Logged in as ${ROLE_LABELS[sessionUser.role] || sessionUser.role}.`);
      const targetRoute = ROLE_HOME_ROUTES[sessionUser.role] || '/';
      navigate(targetRoute, { replace: true });
    } catch (err) {
      const errorMsg = err.message || 'Authentication failed. Please verify credentials.';
      setAuthError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onFinishRegister = async (values) => {
    setLoading(true);
    setAuthError(null);

    try {
      await register({
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
        department: values.department,
        college_id: values.college_id,
      });

      message.success('Account registered successfully! Signing you in...');

      // Auto login after registration
      const sessionUser = await login({
        email: values.email,
        password: values.password,
      });

      const targetRoute = ROLE_HOME_ROUTES[sessionUser.role] || '/';
      navigate(targetRoute, { replace: true });
    } catch (err) {
      const errorMsg = err.message || 'Registration failed. Please check inputs.';
      setAuthError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px 16px',
      }}
    >
      <div style={{ maxWidth: 460, width: '100%' }}>
        {/* Top Header/Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              textDecoration: 'none',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                background: 'linear-gradient(135deg, #0958d9 0%, #003a8c 100%)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: 26,
                boxShadow: '0 4px 12px rgba(9, 88, 217, 0.25)',
              }}
            >
              <BankOutlined />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#0f172a',
                  lineHeight: 1.2,
                  letterSpacing: '-0.3px',
                }}
              >
                CampusVenue
              </div>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                College Venue Booking System
              </div>
            </div>
          </Link>
        </div>

        {/* Login Card */}
        <Card
          bordered
          style={{
            borderRadius: 12,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
            background: '#ffffff',
            borderColor: '#e2e8f0',
          }}
          styles={{ body: { padding: '32px 28px' } }}
        >
          <div style={{ marginBottom: 20 }}>
            <Title level={4} style={{ color: '#0f172a', margin: 0, fontWeight: 700 }}>
              {authMode === 'login' ? 'Sign In to Your Workspace' : 'Create Your Campus Account'}
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {authMode === 'login'
                ? 'Enter your credentials to securely access your college portal'
                : 'Register as a Student or Faculty member to access campus services'}
            </Text>
          </div>

          <Segmented
            block
            size="large"
            value={authMode}
            onChange={(val) => {
              setAuthMode(val);
              setAuthError(null);
            }}
            options={[
              { label: 'Sign In', value: 'login' },
              { label: 'Register Account', value: 'register' },
            ]}
            style={{ marginBottom: 20 }}
          />

          {/* Error Alert */}
          {authError && (
            <Alert
              message="Authentication Notice"
              description={authError}
              type="error"
              showIcon
              closable
              onClose={() => setAuthError(null)}
              style={{ marginBottom: 20, fontSize: 13 }}
            />
          )}

          {authMode === 'login' ? (
            <Form
              form={form}
              name="loginForm"
              layout="vertical"
              onFinish={onFinishLogin}
              onValuesChange={() => {
                if (authError) setAuthError(null);
              }}
              requiredMark={false}
              initialValues={{ role: ROLES.STUDENT }}
            >
              {/* 1. Role Selection */}
              <Form.Item
                name="role"
                label={<span style={{ fontWeight: 600, color: '#334155' }}>Intended Portal Role</span>}
                rules={[{ required: true, message: 'Please select your role' }]}
              >
                <Select
                  size="large"
                  onChange={handleRoleChange}
                  placeholder="Choose your role"
                  style={{ width: '100%' }}
                >
                  <Option value={ROLES.STUDENT}>
                    <Space>
                      <UserOutlined style={{ color: '#1677ff' }} />
                      <span style={{ fontWeight: 500 }}>Student</span>
                    </Space>
                  </Option>
                  <Option value={ROLES.FACULTY}>
                    <Space>
                      <TeamOutlined style={{ color: '#0958d9' }} />
                      <span style={{ fontWeight: 500 }}>Faculty</span>
                    </Space>
                  </Option>
                  <Option value={ROLES.ADMIN}>
                    <Space>
                      <CrownOutlined style={{ color: '#722ed1' }} />
                      <span style={{ fontWeight: 500 }}>Administrator</span>
                    </Space>
                  </Option>
                </Select>
              </Form.Item>

              {/* 2. College ID / Email */}
              <Form.Item
                name="identifier"
                label={<span style={{ fontWeight: 600, color: '#334155' }}>Email Address</span>}
                rules={[
                  { required: true, message: 'Please enter your email address' },
                  { type: 'email', message: 'Please enter a valid email address' },
                ]}
              >
                <Input
                  size="large"
                  prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="e.g. student@college.edu"
                  allowClear
                />
              </Form.Item>

              {/* 3. Password */}
              <Form.Item
                name="password"
                label={<span style={{ fontWeight: 600, color: '#334155' }}>Password</span>}
                rules={[
                  { required: true, message: 'Please enter your password' },
                ]}
              >
                <Input.Password
                  size="large"
                  prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Enter password"
                />
              </Form.Item>

              {/* Forgot Password Link */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                <Button
                  type="link"
                  onClick={() => setForgotModalVisible(true)}
                  style={{ padding: 0, fontSize: 13, color: '#1677ff' }}
                >
                  Need help signing in?
                </Button>
              </div>

              {/* Submit Button */}
              <Form.Item style={{ marginBottom: 12 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={loading}
                  style={{
                    background: '#1677ff',
                    borderColor: '#1677ff',
                    fontWeight: 600,
                    height: 44,
                    fontSize: 15,
                    borderRadius: 8,
                  }}
                >
                  Sign In
                </Button>
              </Form.Item>
            </Form>
          ) : (
            <Form
              form={registerForm}
              name="registerForm"
              layout="vertical"
              onFinish={onFinishRegister}
              onValuesChange={() => {
                if (authError) setAuthError(null);
              }}
              requiredMark={false}
              initialValues={{ role: ROLES.STUDENT }}
            >
              {/* Full Name */}
              <Form.Item
                name="name"
                label={<span style={{ fontWeight: 600, color: '#334155' }}>Full Name</span>}
                rules={[{ required: true, message: 'Please enter your full name (minimum 2 characters)', min: 2 }]}
              >
                <Input
                  size="large"
                  placeholder="e.g. Dr. Jane Doe or Alex Smith"
                  prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                />
              </Form.Item>

              {/* Role: Only Student and Faculty are allowed */}
              <Form.Item
                name="role"
                label={<span style={{ fontWeight: 600, color: '#334155' }}>Account Role</span>}
                rules={[{ required: true, message: 'Please select an account role' }]}
              >
                <Select size="large" placeholder="Select role">
                  <Option value={ROLES.STUDENT}>
                    <Space>
                      <UserOutlined style={{ color: '#1677ff' }} />
                      <span>Student</span>
                    </Space>
                  </Option>
                  <Option value={ROLES.FACULTY}>
                    <Space>
                      <TeamOutlined style={{ color: '#0958d9' }} />
                      <span>Faculty</span>
                    </Space>
                  </Option>
                </Select>
              </Form.Item>

              {/* Email */}
              <Form.Item
                name="email"
                label={<span style={{ fontWeight: 600, color: '#334155' }}>College Email</span>}
                rules={[
                  { required: true, message: 'Please enter a valid email address' },
                  { type: 'email', message: 'Please enter a valid email format' },
                ]}
              >
                <Input
                  size="large"
                  placeholder="e.g. jdoe@campusvenue.edu"
                />
              </Form.Item>

              {/* College ID */}
              <Form.Item
                name="college_id"
                label={<span style={{ fontWeight: 600, color: '#334155' }}>College / Student ID (Optional)</span>}
              >
                <Input size="large" placeholder="e.g. STU1001 or FAC2001" />
              </Form.Item>

              {/* Department */}
              <Form.Item
                name="department"
                label={<span style={{ fontWeight: 600, color: '#334155' }}>Department (Optional)</span>}
              >
                <Input size="large" placeholder="e.g. Computer Science & Engineering" />
              </Form.Item>

              {/* Password */}
              <Form.Item
                name="password"
                label={<span style={{ fontWeight: 600, color: '#334155' }}>Password</span>}
                rules={[
                  { required: true, message: 'Password is required' },
                  { min: 8, message: 'Password must be at least 8 characters long' },
                ]}
              >
                <Input.Password
                  size="large"
                  placeholder="Minimum 8 characters"
                  prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                />
              </Form.Item>

              {/* Submit Register Button */}
              <Form.Item style={{ marginBottom: 12 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={loading}
                  style={{
                    background: '#1677ff',
                    borderColor: '#1677ff',
                    fontWeight: 600,
                    height: 44,
                    fontSize: 15,
                    borderRadius: 8,
                  }}
                >
                  Create Account & Sign In
                </Button>
              </Form.Item>
            </Form>
          )}

          <Divider style={{ margin: '16px 0', borderColor: '#f1f5f9' }} />

          <div style={{ textAlign: 'center' }}>
            {authMode === 'login' ? (
              <Button
                type="link"
                onClick={() => {
                  setAuthMode('register');
                  setAuthError(null);
                }}
                style={{ fontSize: 13, color: '#1677ff' }}
              >
                Don't have an account? Register as Student or Faculty
              </Button>
            ) : (
              <Button
                type="link"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError(null);
                }}
                style={{ fontSize: 13, color: '#1677ff' }}
              >
                Already have an account? Sign In
              </Button>
            )}
            <div style={{ marginTop: 8 }}>
              <Link to="/" style={{ fontSize: 13, color: '#64748b' }}>
                ← Return to Campus Home
              </Link>
            </div>
          </div>
        </Card>

        {/* Footer info */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#64748b' }}>
          College Venue Booking System • Secure Access Gateway
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#1677ff' }} />
            <span>Account Access Assistance</span>
          </Space>
        }
        open={forgotModalVisible}
        onOk={() => setForgotModalVisible(false)}
        onCancel={() => setForgotModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setForgotModalVisible(false)}>
            Close
          </Button>,
        ]}
      >
        <Paragraph style={{ marginTop: 12, color: '#334155' }}>
          For security and identity verification within the College Venue Booking System:
        </Paragraph>
        <ul style={{ paddingLeft: 20, color: '#475569', fontSize: 14, lineHeight: 1.8 }}>
          <li>
            <strong>Students:</strong> Log in using your college email (<code>student@college.edu</code>) or Student ID (<code>STU1001</code>).
          </li>
          <li>
            <strong>Faculty:</strong> Log in using your faculty email (<code>faculty@college.edu</code>) or Faculty ID (<code>FAC2001</code>).
          </li>
          <li>
            <strong>Administrators:</strong> Log in using your admin email (<code>admin@college.edu</code>) or Admin ID (<code>ADM3001</code>).
          </li>
        </ul>
        <Paragraph type="secondary" style={{ fontSize: 13, marginTop: 16 }}>
          Development demo password for all accounts: <code>password123</code>
        </Paragraph>
      </Modal>
    </div>
  );
};

export default LoginPage;
