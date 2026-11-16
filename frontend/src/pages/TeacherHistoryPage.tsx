import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Typography, Space, Button, message, Input } from 'antd';
import { ReloadOutlined, SearchOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { apiClient } from '../api/client';
import { MessageLog } from '../types';

const { Title, Text } = Typography;

export const TeacherHistoryPage: React.FC = () => {
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/teachers/message-history');
      setMessages(res.data);
    } catch (err: any) {
      message.error('Failed to load your sent message history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const filteredMessages = messages.filter(m =>
    m.rendered_message?.toLowerCase().includes(searchText.toLowerCase()) ||
    m.template_category?.toLowerCase().includes(searchText.toLowerCase()) ||
    m.whatsapp_message_id?.toLowerCase().includes(searchText.toLowerCase())
  );

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
      case 'read':
        return <Tag color="green" icon={<CheckCircleOutlined />}>{status.toUpperCase()}</Tag>;
      case 'queued':
      case 'processing':
        return <Tag color="blue" icon={<ClockCircleOutlined />}>{status.toUpperCase()}</Tag>;
      case 'failed':
        return <Tag color="red" icon={<CloseCircleOutlined />}>FAILED</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (dateStr: string) => new Date(dateStr).toLocaleString(),
      width: 170
    },
    {
      title: 'Category',
      dataIndex: 'template_category',
      key: 'template_category',
      render: (cat: string) => <Tag color="blue">{cat.replace(/_/g, ' ').toUpperCase()}</Tag>
    },
    {
      title: 'Message Content',
      dataIndex: 'rendered_message',
      key: 'rendered_message',
      render: (text: string) => (
        <div style={{ maxHeight: 60, overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: 12, fontFamily: 'monospace' }}>
          {text}
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
      width: 120
    },
    {
      title: 'Delivery Reference',
      dataIndex: 'whatsapp_message_id',
      key: 'whatsapp_message_id',
      render: (wamid: string) => <Text code style={{ fontSize: 11 }}>{wamid || '-'}</Text>
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>My Sent Message History</Title>
          <Text type="secondary">Review delivery statuses of all WhatsApp notifications sent to your assigned students' parents.</Text>
        </div>
        <Space>
          <Input 
            placeholder="Search sent messages..." 
            prefix={<SearchOutlined />} 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 220 }}
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={fetchMessages} loading={loading}>
            Refresh
          </Button>
        </Space>
      </div>

      <Card>
        <Table 
          columns={columns} 
          dataSource={filteredMessages} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};
