import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, Alert, Space, Divider } from 'antd';
import { LockOutlined, MailOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { User } from '../types';

const { Title, Text } = Typography;

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await apiClient.post('/auth/login', values);
      
      // Fetch verified user details
      const userRes = await apiClient.get('/auth/me');
      const user: User = userRes.data;
      
      onLoginSuccess(user);
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/teacher');
      }
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setErrorMsg(err.response.data.detail);
      } else {
        setErrorMsg('Authentication failed. Please verify your credentials or server connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f0f2f5',
      padding: '20px'
    }}>
      <Card
        style={{ width: 440, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', borderRadius: 8 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏫</div>
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>NextSchool</Title>
          <Text type="secondary">WhatsApp Communication Management System</Text>
        </div>

        {errorMsg && (
          <Alert
            message={errorMsg}
            type="error"
            showIcon
            closable
            style={{ marginBottom: 16 }}
            onClose={() => setErrorMsg(null)}
          />
        )}

        <Form layout="vertical" onFinish={handleLogin}>
          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: 'Please input your school email!' },
              { type: 'email', message: 'Enter a valid email address!' }
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="e.g. teacher1@nextschool.internal" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Enter your password" size="large" />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ margin: '16px 0' }} />

        <div style={{ backgroundColor: '#fafafa', padding: 12, borderRadius: 6, fontSize: 12 }}>
          <Space direction="vertical" size={2}>
            <Text strong><SafetyOutlined /> Configured Test Credentials:</Text>
            <Text type="secondary">• <strong>Principal/Admin:</strong> admin@nextschool.internal / AdminSecurePass2026!</Text>
            <Text type="secondary">• <strong>Teacher:</strong> teacher1@nextschool.internal / TeacherSecurePass2026!</Text>
            <Text type="secondary"><em>(Protected by HttpOnly JWT cookies & CSRF verification)</em></Text>
          </Space>
        </div>
      </Card>
    </div>
  );
};
