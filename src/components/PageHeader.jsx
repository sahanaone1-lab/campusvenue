import React from 'react';
import { Breadcrumb, Typography, Space } from 'antd';
import { Link } from 'react-router-dom';

const { Title, Text } = Typography;

export const PageHeader = ({
  title,
  subtitle,
  breadcrumbItems = [],
  extra,
  tags,
}) => {
  return (
    <div
      style={{
        background: '#ffffff',
        padding: '16px 24px',
        borderBottom: '1px solid #e8ebee',
        marginBottom: 20,
      }}
    >
      {breadcrumbItems.length > 0 && (
        <Breadcrumb
          style={{ marginBottom: 8, fontSize: 13 }}
          items={breadcrumbItems.map((item) => ({
            title: item.path ? <Link to={item.path}>{item.title}</Link> : item.title,
          }))}
        />
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <Space align="center" size={12}>
            <Title level={4} style={{ margin: 0, color: '#102a43', fontWeight: 600 }}>
              {title}
            </Title>
            {tags}
          </Space>
          {subtitle && (
            <div>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {subtitle}
              </Text>
            </div>
          )}
        </div>
        {extra && <div>{extra}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
