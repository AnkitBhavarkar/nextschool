import React from 'react';
import { Layout, Menu, Button, Space, Typography, Tag } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  TeamOutlined,
  MessageOutlined,
  SafetyCertificateOutlined,
  FileExcelOutlined,
  WhatsAppOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '../../types';
import { apiClient } from '../../api/client';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

interface MainLayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ user, onLogout, children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      onLogout();
      navigate('/login');
    }
  };

  const adminMenuItems = [
    { key: '/admin', icon: <DashboardOutlined />, label: 'Overview' },
    { key: '/admin/whatsapp-connect', icon: <WhatsAppOutlined />, label: 'Connect WhatsApp' },
    { key: '/admin/import-data', icon: <FileExcelOutlined />, label: 'Import CSV Data' },
    { key: '/admin/teachers', icon: <TeamOutlined />, label: 'Teachers' },
    { key: '/admin/students', icon: <UserOutlined />, label: 'Students & Parents' },
    { key: '/admin/messages', icon: <MessageOutlined />, label: 'Communication Logs' },
  ];

  const teacherMenuItems = [
    { key: '/teacher', icon: <TeamOutlined />, label: 'My Assigned Students' },
    { key: '/teacher/history', icon: <MessageOutlined />, label: 'Sent Message History' },
  ];

  const menuItems = user.role === 'admin' ? adminMenuItems : teacherMenuItems;

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#001529',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 24, marginRight: 10 }}>🏫</span>
          <Text strong style={{ color: '#fff', fontSize: 18, marginRight: 24 }}>
            NextSchool <span style={{ fontSize: 12, fontWeight: 'normal', color: '#8c8c8c' }}>WhatsApp Hub</span>
          </Text>

          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ minWidth: 550, borderBottom: 'none' }}
          />
        </div>

        <Space size="middle">
          <Tag color={user.role === 'admin' ? 'gold' : 'blue'} style={{ padding: '2px 8px' }}>
            <SafetyCertificateOutlined /> {user.role === 'admin' ? 'Principal / Admin' : 'Teacher'}
          </Tag>
          <Text style={{ color: '#e6f7ff' }}>{user.full_name}</Text>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{ color: '#ff7875' }}
          >
            Logout
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {children}
      </Content>

      <Footer style={{ textAlign: 'center', color: '#8c8c8c', background: '#f5f7fa' }}>
        NextSchool WhatsApp Communication Management Platform © 2026. Phase 1 Foundation.
      </Footer>
    </Layout>
  );
};
