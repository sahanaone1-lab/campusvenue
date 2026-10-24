import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { HomeOutlined } from '@ant-design/icons';
import { useAuth } from '../services/useAuth';
import { ROLE_HOME_ROUTES } from '../utils/constants';

export const NotFoundPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const handleReturnHome = () => {
    if (isAuthenticated && user?.role && ROLE_HOME_ROUTES[user.role]) {
      navigate(ROLE_HOME_ROUTES[user.role]);
    } else {
      navigate('/');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: 24,
      }}
    >
      <Result
        status="404"
        title="404"
        subTitle="Sorry, the campus page or facility resource you visited does not exist."
        extra={
          <Button type="primary" icon={<HomeOutlined />} onClick={handleReturnHome} size="large">
            Return to Homepage
          </Button>
        }
      />
    </div>
  );
};

export default NotFoundPage;
