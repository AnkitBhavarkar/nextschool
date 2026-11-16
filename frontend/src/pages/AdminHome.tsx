import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Table, Tag, Button, Space, message, Upload, Alert } from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  MessageOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { apiClient } from '../api/client';

const { Title, Text, Paragraph } = Typography;

export const AdminHome: React.FC = () => {
  const [stats, setStats] = useState<any>({
    teachers_count: 0,
    students_count: 0,
    parents_count: 0,
    total_messages: 0,
    sent_count: 0,
    failed_count: 0,
    queued_count: 0
  });
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const [overviewRes, teachersRes] = await Promise.all([
        apiClient.get('/admin/overview'),
        apiClient.get('/admin/teachers')
      ]);
      setStats(overviewRes.data);
      setTeachers(teachersRes.data);
    } catch (err: any) {
      message.error('Failed to load Principal dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleCustomUpload = async (endpoint: string, file: File, label: string) => {
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      const res = await apiClient.post(`/admin/import/${endpoint}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      message.success(res.data.message || `${label} imported successfully!`);
      fetchOverview();
    } catch (err: any) {
      message.error(err.response?.data?.detail || `Failed to import ${label}`);
    } finally {
      setUploading(false);
    }
    return false; // prevent default upload
  };

  const downloadSampleCsv = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sampleStudentsCsv = `admission_no,full_name,grade,section,roll_no,parent_name,parent_whatsapp,relationship,consent
NS-2026-201,Ishaan Sharma,Grade 10,A,1005,Sunil Sharma,+919876501111,Father,given
NS-2026-202,Sara Khan,Grade 10,B,1006,Imran Khan,+919876502222,Father,given
NS-2026-203,Advait Roy,Grade 9,A,905,Priya Roy,+919876503333,Mother,given`;

  const sampleTeachersCsv = `employee_code,full_name,email,phone,department,temp_password
TCH-003,Deepak Joshi,deepak.joshi@nextschool.internal,+919876599901,Social Science,NextSchool2026!
TCH-004,Sunita Rao,sunita.rao@nextschool.internal,+919876599902,Hindi,NextSchool2026!`;

  const sampleAssignmentsCsv = `employee_code,admission_no,subject
TCH-003,NS-2026-201,History
TCH-004,NS-2026-202,Hindi`;

  const teacherColumns = [
    {
      title: 'Teacher Name',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (name: string, record: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary">{record.email}</Text>
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
      title: 'Assigned Students',
      dataIndex: 'assigned_students_count',
      key: 'assigned_students_count',
      render: (count: number) => <Tag color="green">{count} Students</Tag>
    },
    {
      title: 'Account Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'error'}>
          {active ? 'Active' : 'Deactivated'}
        </Tag>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Principal & Admin Monitoring Console</Title>
          <Text type="secondary">Centralized overview of teachers, student data, and real school data importation.</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchOverview} loading={loading}>
          Refresh Metrics
        </Button>
      </div>

      {/* Metric Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false}>
            <Statistic
              title="Registered Teachers"
              value={stats.teachers_count}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false}>
            <Statistic
              title="Total Enrolled Students"
              value={stats.students_count}
              prefix={<UserOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false}>
            <Statistic
              title="Parent WhatsApp Contacts"
              value={stats.parents_count}
              prefix={<MessageOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false}>
            <Statistic
              title="Total Notifications Sent"
              value={stats.sent_count}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* School Real Data Import Section */}
      <Card
        title={
          <Space>
            <FileExcelOutlined style={{ color: '#52c41a' }} />
            <span>School Real Data Import (Excel / CSV)</span>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Alert
          message="Upload Real School Records"
          description="Import real students, parent WhatsApp numbers, teachers, and student-teacher assignment mapping directly via CSV sheets."
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
        />

        <Row gutter={[24, 24]}>
          {/* 1. Students & Parents Import */}
          <Col xs={24} md={8}>
            <Card type="inner" title="1. Students & Parents CSV" size="small">
              <Paragraph type="secondary" style={{ fontSize: 12 }}>
                Upload students with roll no, admission no, and parent WhatsApp numbers.
              </Paragraph>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Upload
                  beforeUpload={(file) => handleCustomUpload('import-students-csv', file, 'Students')}
                  showUploadList={false}
                  accept=".csv"
                >
                  <Button icon={<UploadOutlined />} type="primary" loading={uploading} block>
                    Upload Students CSV
                  </Button>
                </Upload>
                <Button
                  type="link"
                  icon={<DownloadOutlined />}
                  size="small"
                  onClick={() => downloadSampleCsv('sample_students.csv', sampleStudentsCsv)}
                >
                  Download Sample CSV
                </Button>
              </Space>
            </Card>
          </Col>

          {/* 2. Teachers Import */}
          <Col xs={24} md={8}>
            <Card type="inner" title="2. Teachers CSV" size="small">
              <Paragraph type="secondary" style={{ fontSize: 12 }}>
                Upload teachers with employee code, department, and auto-generated login credentials.
              </Paragraph>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Upload
                  beforeUpload={(file) => handleCustomUpload('import-teachers-csv', file, 'Teachers')}
                  showUploadList={false}
                  accept=".csv"
                >
                  <Button icon={<UploadOutlined />} type="primary" loading={uploading} block>
                    Upload Teachers CSV
                  </Button>
                </Upload>
                <Button
                  type="link"
                  icon={<DownloadOutlined />}
                  size="small"
                  onClick={() => downloadSampleCsv('sample_teachers.csv', sampleTeachersCsv)}
                >
                  Download Sample CSV
                </Button>
              </Space>
            </Card>
          </Col>

          {/* 3. Teacher-Student Mapping */}
          <Col xs={24} md={8}>
            <Card type="inner" title="3. Teacher-Student Assignments" size="small">
              <Paragraph type="secondary" style={{ fontSize: 12 }}>
                Map which teacher teaches which student (Many-to-Many junction mapping).
              </Paragraph>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Upload
                  beforeUpload={(file) => handleCustomUpload('import-assignments-csv', file, 'Assignments')}
                  showUploadList={false}
                  accept=".csv"
                >
                  <Button icon={<UploadOutlined />} type="primary" loading={uploading} block>
                    Upload Assignments CSV
                  </Button>
                </Upload>
                <Button
                  type="link"
                  icon={<DownloadOutlined />}
                  size="small"
                  onClick={() => downloadSampleCsv('sample_assignments.csv', sampleAssignmentsCsv)}
                >
                  Download Sample CSV
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Teachers Directory */}
      <Card title="Teacher Accounts & Class Assignments">
        <Table
          columns={teacherColumns}
          dataSource={teachers}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>
    </div>
  );
};
