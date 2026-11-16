import React, { useState } from 'react';
import { Card, Row, Col, Typography, Button, Space, message, Upload, Alert, Tag } from 'antd';
import {
  UploadOutlined,
  FileExcelOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { apiClient } from '../api/client';

const { Title, Text, Paragraph } = Typography;

export const AdminImportDataPage: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleCustomUpload = async (endpoint: string, file: File, label: string) => {
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    setStatusMsg(null);
    try {
      const res = await apiClient.post(`/admin/import/${endpoint}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      message.success(res.data.message || `${label} imported successfully!`);
      setStatusMsg(res.data.message);
    } catch (err: any) {
      message.error(err.response?.data?.detail || `Failed to import ${label}`);
    } finally {
      setUploading(false);
    }
    return false;
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

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>
          <FileExcelOutlined style={{ color: '#52c41a', marginRight: 8 }} />
          Import School Data (Excel / CSV)
        </Title>
        <Text type="secondary">
          Upload school spreadsheets to automatically register students, teachers, parents, and assign classes.
        </Text>
      </div>

      {statusMsg && (
        <Alert
          message={statusMsg}
          type="success"
          showIcon
          closable
          style={{ marginBottom: 20 }}
          onClose={() => setStatusMsg(null)}
        />
      )}

      <Row gutter={[24, 24]}>
        {/* Step 1: Students & Parents */}
        <Col xs={24} md={8}>
          <Card
            title="Step 1: Students & Parents"
            extra={<Tag color="blue">Mandatory</Tag>}
            style={{ height: '100%' }}
          >
            <Paragraph type="secondary" style={{ fontSize: 13, minHeight: 40 }}>
              Imports student admission details, class, section, along with parent names and verified WhatsApp numbers.
            </Paragraph>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Upload
                beforeUpload={(file) => handleCustomUpload('import-students-csv', file, 'Students')}
                showUploadList={false}
                accept=".csv"
              >
                <Button icon={<UploadOutlined />} type="primary" size="large" loading={uploading} block>
                  Upload Students CSV
                </Button>
              </Upload>
              <Button
                type="link"
                icon={<DownloadOutlined />}
                onClick={() => downloadSampleCsv('sample_students.csv', sampleStudentsCsv)}
                block
              >
                Download Sample CSV
              </Button>
            </Space>
          </Card>
        </Col>

        {/* Step 2: Teachers */}
        <Col xs={24} md={8}>
          <Card
            title="Step 2: Teachers"
            extra={<Tag color="purple">Mandatory</Tag>}
            style={{ height: '100%' }}
          >
            <Paragraph type="secondary" style={{ fontSize: 13, minHeight: 40 }}>
              Imports teacher staff details, departments, and automatically initializes their dashboard login accounts.
            </Paragraph>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Upload
                beforeUpload={(file) => handleCustomUpload('import-teachers-csv', file, 'Teachers')}
                showUploadList={false}
                accept=".csv"
              >
                <Button icon={<UploadOutlined />} type="primary" size="large" loading={uploading} block>
                  Upload Teachers CSV
                </Button>
              </Upload>
              <Button
                type="link"
                icon={<DownloadOutlined />}
                onClick={() => downloadSampleCsv('sample_teachers.csv', sampleTeachersCsv)}
                block
              >
                Download Sample CSV
              </Button>
            </Space>
          </Card>
        </Col>

        {/* Step 3: Teacher-Student Assignments */}
        <Col xs={24} md={8}>
          <Card
            title="Step 3: Assignments Mapping"
            extra={<Tag color="green">Mapping</Tag>}
            style={{ height: '100%' }}
          >
            <Paragraph type="secondary" style={{ fontSize: 13, minHeight: 40 }}>
              Links teachers to their students based on employee code and admission numbers (Many-to-Many).
            </Paragraph>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Upload
                beforeUpload={(file) => handleCustomUpload('import-assignments-csv', file, 'Assignments')}
                showUploadList={false}
                accept=".csv"
              >
                <Button icon={<UploadOutlined />} type="primary" size="large" loading={uploading} block>
                  Upload Assignments CSV
                </Button>
              </Upload>
              <Button
                type="link"
                icon={<DownloadOutlined />}
                onClick={() => downloadSampleCsv('sample_assignments.csv', sampleAssignmentsCsv)}
                block
              >
                Download Sample CSV
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

