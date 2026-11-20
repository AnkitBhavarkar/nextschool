import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Typography, Space, Button, message, Input } from 'antd';
import { ReloadOutlined, SearchOutlined, WhatsAppOutlined } from '@ant-design/icons';
import { apiClient } from '../api/client';
import { Student } from '../types';
import { maskPhoneNumber } from '../utils/maskPhone';

const { Title, Text } = Typography;

export const AdminStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/all-students');
      setStudents(res.data);
    } catch (err: any) {
      message.error('Failed to load students list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = students.filter(s =>
    s.full_name?.toLowerCase().includes(searchText.toLowerCase()) ||
    s.admission_no?.toLowerCase().includes(searchText.toLowerCase()) ||
    s.grade?.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: 'Roll / Adm No',
      dataIndex: 'admission_no',
      key: 'admission_no',
      render: (adm: string, record: Student) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.roll_no || '-'}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{adm}</Text>
        </Space>
      ),
      width: 140
    },
    {
      title: 'Student Name',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (name: string, record: Student) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary">{record.grade} • Sec {record.section}</Text>
        </Space>
      )
    },
    {
      title: 'Parent WhatsApp Contacts & Consent',
      key: 'parents',
      render: (_: any, record: Student) => (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          {record.parents.map((p) => {
            const hasConsent = p.consent_status === 'given';
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa', padding: '4px 8px', borderRadius: 4, border: '1px solid #f0f0f0' }}>
                <Space>
                  <WhatsAppOutlined style={{ color: hasConsent ? '#52c41a' : '#bfbfbf' }} />
                  <Text>{p.full_name} <span style={{ fontSize: 11, color: '#8c8c8c' }}>({p.relationship_type})</span></Text>
                  <Text code>{maskPhoneNumber(p.whatsapp_number)}</Text>
                </Space>
                <Tag color={hasConsent ? 'green' : 'red'}>
                  {hasConsent ? 'Consent Active' : 'Opted Out'}
                </Tag>
              </div>
            );
          })}
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>All Students & Parent Directory</Title>
          <Text type="secondary">School-wide directory of enrolled students and verified parent WhatsApp contacts.</Text>
        </div>
        <Space>
          <Input 
            placeholder="Search students..." 
            prefix={<SearchOutlined />} 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 220 }}
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={fetchStudents} loading={loading}>
            Refresh
          </Button>
        </Space>
      </div>

      <Card>
        <Table 
          columns={columns} 
          dataSource={filteredStudents} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};
