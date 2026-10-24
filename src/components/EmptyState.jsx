import React from 'react';
import { Empty, Card, Button } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';

export const EmptyState = ({
  title = 'No Data Available',
  description = 'This section will display active records once data is available.',
  actionText,
  onAction,
  icon,
}) => {
  return (
    <Card
      style={{
        textAlign: 'center',
        padding: '32px 16px',
        borderRadius: 8,
        border: '1px dashed #d9d9d9',
        background: '#ffffff',
      }}
    >
      <Empty
        image={icon || <FolderOpenOutlined style={{ fontSize: 48, color: '#1677ff' }} />}
        imageStyle={{ height: 60, marginBottom: 16 }}
        description={
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#1f2937', marginBottom: 4 }}>
              {title}
            </div>
            <div style={{ color: '#6b7280', fontSize: 14, maxWidth: 420, margin: '0 auto' }}>
              {description}
            </div>
          </div>
        }
      >
        {actionText && (
          <Button orientation="horizontal" type="primary" onClick={onAction} style={{ marginTop: 12 }}>
            {actionText}
          </Button>
        )}
      </Empty>
    </Card>
  );
};

export default EmptyState;
