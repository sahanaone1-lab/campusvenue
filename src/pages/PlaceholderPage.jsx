import React from 'react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { Tag } from 'antd';
import { useNavigate } from 'react-router-dom';

export const PlaceholderPage = ({
  title,
  subtitle,
  breadcrumbItems,
  statusTag = 'In Development',
}) => {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbItems={breadcrumbItems}
        tags={<Tag color="blue">{statusTag}</Tag>}
      />
      <EmptyState
        title={`${title} Module`}
        description="This module is currently in development as part of the campus facility management system roadmap."
        actionText="Back to Dashboard"
        onAction={() => navigate(-1)}
      />
    </div>
  );
};

export default PlaceholderPage;
