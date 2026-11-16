import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Typography, Space, Button, message, Input } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { apiClient } from '../api/client';

const { Title, Text } = Typography;

export const AdminTeachersPage: React.FC = () => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/teachers');
      setTeachers(res.data);
    } catch (err: any) {
      message.error('Failed to load teachers list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const filteredTeachers = teachers.filter(t => 
    t.full_name?.toLowerCase().includes(searchText.toLowerCase()) ||
    t.employee_code?.toLowerCase().includes(searchText.toLowerCase()) ||
    t.email?.toLowerCase().includes(searchText.toLowerCase()) ||
    t.department?.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: 'Teacher Name',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (name: string, record: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
        </Space>
      )
    },
    {
      title: 'Employee Code',
      dataIndex: 'employee_code',
      key: 'employee_code',
      render: (code: string) => <Tag color="blue">{code}</Tag>
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department'
    },
    {
      title: 'Phone Number',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => <Text code>{phone || '-'}</Text>
    },
    {
      title: 'Assigned Students',
      dataIndex: 'assigned_students_count',
      key: 'assigned_students_count',
      render: (count: number) => <Tag color="green">{count} Assigned</Tag>
    },
    {
      title: 'Account Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'error'}>
          {active ? 'Active' : 'Inactive'}
        </Tag>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Teachers & Class Assignments</Title>
          <Text type="secondary">Manage all registered school teachers and their active student allotments.</Text>
        </div>
        <Space>
          <Input 
            placeholder="Search teachers..." 
            prefix={<SearchOutlined />} 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 220 }}
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={fetchTeachers} loading={loading}>
            Refresh
          </Button>
        </Space>
      </div>

      <Card>
        <Table 
          columns={columns} 
          dataSource={filteredTeachers} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};
