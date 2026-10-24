import React from 'react';
import { Card, Button, Row, Col, Typography, Space, Tag } from 'antd';
import {
  BankOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  UserOutlined,
  TeamOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ROLES } from '../utils/constants';

const { Title, Paragraph, Text } = Typography;

export const LandingPage = () => {
  const navigate = useNavigate();

  const handleGoToLogin = (role) => {
    if (role) {
      navigate(`/login?role=${role}`);
    } else {
      navigate('/login');
    }
  };

  const portalCards = [
    {
      title: 'Student Portal',
      role: ROLES.STUDENT,
      icon: <UserOutlined style={{ fontSize: 28, color: '#1677ff' }} />,
      tag: 'Students & Clubs',
      description:
        'Browse campus facilities, check real-time availability of auditoriums and halls, and view upcoming college events.',
      buttonText: 'Enter Student Portal',
    },
    {
      title: 'Faculty Portal',
      role: ROLES.FACULTY,
      icon: <TeamOutlined style={{ fontSize: 28, color: '#0958d9' }} />,
      tag: 'Faculty & Staff',
      description:
        'Submit official venue reservation requests for seminars, exams, guest lectures, and departmental symposiums.',
      buttonText: 'Enter Faculty Portal',
    },
    {
      title: 'Admin Portal',
      role: ROLES.ADMIN,
      icon: <CrownOutlined style={{ fontSize: 28, color: '#003a8c' }} />,
      tag: 'Estate & Facility Office',
      description:
        'Oversee venue allocations, approve or reject booking requests, coordinate maintenance schedules, and generate reports.',
      buttonText: 'Enter Admin Portal',
    },
  ];

  const highlights = [
    {
      icon: <CalendarOutlined style={{ fontSize: 24, color: '#1677ff' }} />,
      title: 'Centralized Venue Schedule',
      desc: 'Eliminates duplicate bookings and scheduling clashes across all campus departments.',
    },
    {
      icon: <SafetyCertificateOutlined style={{ fontSize: 24, color: '#1677ff' }} />,
      title: 'Role-Based Access Control',
      desc: 'Dedicated interfaces tailored specifically for students, faculty, and estate administrators.',
    },
    {
      icon: <CheckCircleOutlined style={{ fontSize: 24, color: '#1677ff' }} />,
      title: 'Streamlined Approval Workflow',
      desc: 'Transparent multi-level approvals with instant notifications and status tracking.',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              background: '#0958d9',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 22,
            }}
          >
            <BankOutlined />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
              CampusVenue
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>College Venue Booking System</div>
          </div>
        </div>

        <Space size="middle">
          <Button type="primary" size="large" onClick={() => handleGoToLogin()} style={{ fontWeight: 500 }}>
            Sign In to Portal
          </Button>
        </Space>
      </header>

      {/* Hero Section */}
      <section
        style={{
          background: '#0f172a',
          color: '#ffffff',
          padding: '64px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <Tag color="blue" style={{ padding: '4px 12px', fontSize: 13, marginBottom: 16 }}>
            Official Campus Facility Management Portal
          </Tag>
          <Title
            level={1}
            style={{
              color: '#ffffff',
              fontSize: '36px',
              fontWeight: 700,
              marginBottom: 16,
              letterSpacing: '-0.5px',
            }}
          >
            Streamlined Venue & Event Booking for Our College Campus
          </Title>
          <Paragraph
            style={{
              color: '#94a3b8',
              fontSize: 16,
              lineHeight: 1.6,
              marginBottom: 32,
              maxWidth: 700,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Centralized reservation management for auditoriums, seminar halls, high-tech labs,
            and sports complexes. Check live availability and manage approvals seamlessly.
          </Paragraph>

          <Space size="middle" wrap>
            <Button
              type="primary"
              size="large"
              icon={<ArrowRightOutlined />}
              onClick={() => handleGoToLogin()}
              style={{
                height: 44,
                padding: '0 28px',
                fontSize: 15,
                background: '#1677ff',
                borderColor: '#1677ff',
              }}
            >
              Access Booking Portal
            </Button>
            <Button
              size="large"
              onClick={() => handleGoToLogin(ROLES.STUDENT)}
              style={{
                height: 44,
                padding: '0 24px',
                fontSize: 15,
                background: '#1e293b',
                color: '#ffffff',
                borderColor: '#334155',
              }}
            >
              Browse as Student
            </Button>
          </Space>
        </div>
      </section>

      {/* Portals Section */}
      <section style={{ maxWidth: 1200, margin: '-32px auto 48px auto', padding: '0 24px', width: '100%' }}>
        <Row gutter={[24, 24]}>
          {portalCards.map((portal) => (
            <Col xs={24} md={8} key={portal.role}>
              <Card
                hoverable
                style={{
                  height: '100%',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                styles={{
                  body: {
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    justifyContent: 'space-between',
                  },
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        background: '#eff6ff',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {portal.icon}
                    </div>
                    <Tag color="blue">{portal.tag}</Tag>
                  </div>
                  <Title level={4} style={{ color: '#0f172a', marginBottom: 8 }}>
                    {portal.title}
                  </Title>
                  <Paragraph style={{ color: '#64748b', fontSize: 14, minHeight: 64 }}>
                    {portal.description}
                  </Paragraph>
                </div>
                <Button
                  type="default"
                  block
                  icon={<ArrowRightOutlined />}
                  onClick={() => handleGoToLogin(portal.role)}
                  style={{
                    marginTop: 16,
                    borderColor: '#1677ff',
                    color: '#1677ff',
                    fontWeight: 500,
                  }}
                >
                  {portal.buttonText}
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* Feature Highlights */}
      <section style={{ maxWidth: 1200, margin: '0 auto 64px auto', padding: '0 24px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Title level={3} style={{ color: '#0f172a', marginBottom: 8 }}>
            Designed for Campus Administrative Excellence
          </Title>
          <Text style={{ color: '#64748b', fontSize: 15 }}>
            A dependable, clear, and structured venue allocation platform for college operations.
          </Text>
        </div>

        <Row gutter={[32, 32]}>
          {highlights.map((h, i) => (
            <Col xs={24} md={8} key={i}>
              <Card
                bordered={false}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  height: '100%',
                }}
              >
                <div style={{ marginBottom: 16 }}>{h.icon}</div>
                <Title level={5} style={{ color: '#0f172a', marginBottom: 8 }}>
                  {h.title}
                </Title>
                <Paragraph style={{ color: '#64748b', margin: 0, fontSize: 14 }}>
                  {h.desc}
                </Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* Footer */}
      <footer
        style={{
          marginTop: 'auto',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '24px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: 13,
        }}
      >
        <Space orientation="vertical" size={4}>
          <Text strong style={{ color: '#0f172a' }}>
            CampusVenue • College Venue Booking System
          </Text>
          <Text type="secondary">
            Estate & Campus Resource Planning Division • All rights reserved
          </Text>
        </Space>
      </footer>
    </div>
  );
};

export default LandingPage;
