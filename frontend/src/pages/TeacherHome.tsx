import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Select,
  Input,
  Radio,
  Tag,
  Typography,
  Card,
  Space,
  message,
  Alert,
  Tooltip,
} from 'antd';
import {
  SendOutlined,
  WhatsAppOutlined,
  ReloadOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { apiClient } from '../api/client';
import { Student, Parent } from '../types';

const { Title, Text } = Typography;
const { Option } = Select;

const TEMPLATE_DEFINITIONS: Record<string, { title: string; en: string; hi: string; requiredFields: string[] }> = {
  student_absent_today: {
    title: '1. Student Absent Today',
    en: 'Dear {parent_name},\nWe would like to inform you that {student_name} was absent from school on {date} ({day_of_week}).',
    hi: 'नमस्ते {parent_name},\nहम आपको सूचित करना चाहते हैं कि {student_name} आज {date} ({day_of_week}) को विद्यालय में अनुपस्थित थे।',
    requiredFields: []
  },
  improper_uniform: {
    title: '2. Improper Uniform',
    en: 'Dear {parent_name}, {student_name} was observed wearing an improper uniform on {date} ({day_of_week}). Please ensure the school uniform guidelines are followed. – NextSchool',
    hi: 'नमस्ते {parent_name}, {student_name} को आज {date} को उचित स्कूल यूनिफॉर्म में नहीं पाया गया। कृपया विद्यालय के नियमों का पालन सुनिश्चित करें। – NextSchool',
    requiredFields: []
  },
  misbehaviour_complaint: {
    title: '3. Misbehaviour Complaint',
    en: 'Dear {parent_name}, on {date} ({day_of_week}) {student_name} was involved in a behaviour incident: "{incident_description}". We request your cooperation in addressing this matter. – NextSchool',
    hi: 'नमस्ते {parent_name}, आज {date} को {student_name} के संबंध में एक अनुशासनहीनता की घटना ध्यान में आई है: "{incident_description}"। कृपया सहयोग करें। – NextSchool',
    requiredFields: ['incident_description']
  },
  incomplete_homework: {
    title: '4. Incomplete Homework/Copy',
    en: 'Dear {parent_name}, {student_name} has not submitted the homework for {subject} ({date}). Please ensure it is completed by the next class. – NextSchool',
    hi: 'नमस्ते {parent_name}, {student_name} ने {subject} का गृहकार्य ({date}) जमा नहीं किया है। कृपया अगली कक्षा तक पूरा कराएं। – NextSchool',
    requiredFields: ['subject']
  },
  good_behaviour: {
    title: '5. Good Behaviour Appreciation',
    en: 'Dear {parent_name}, we are pleased to inform you that {student_name} displayed excellent behaviour on {date}. Keep encouraging this positive attitude! – NextSchool',
    hi: 'नमस्ते {parent_name}, हमें यह बताते हुए खुशी हो रही है कि {student_name} ने आज {date} को उत्कृष्ट व्यवहार और आचरण दिखाया। – NextSchool',
    requiredFields: []
  },
  weekly_growth_report: {
    title: '6. Weekly Student Growth Report',
    en: 'Dear {parent_name}, here is the weekly progress report for {student_name} (Week {week_number}): Attendance: {attendance_percentage}%. Highlights: {highlights}. – NextSchool',
    hi: 'नमस्ते {parent_name}, {student_name} की साप्ताहिक प्रगति रिपोर्ट (सप्ताह {week_number}): उपस्थिति: {attendance_percentage}%. – NextSchool',
    requiredFields: ['highlights']
  }
};

export const TeacherHome: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState('student_absent_today');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [customParams, setCustomParams] = useState<Record<string, string>>({
    incident_description: 'Disrupting classroom instruction',
    subject: 'Mathematics',
    highlights: 'Active participation and improved assignment scores'
  });
  const [sending, setSending] = useState(false);

  const fetchAssignedStudents = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/teachers/my-students');
      setStudents(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to fetch assigned students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedStudents();
  }, []);

  const openNotifyModal = (student: Student, parent: Parent) => {
    setSelectedStudent(student);
    setSelectedParent(parent);
    setModalOpen(true);
  };

  const getPreviewText = () => {
    if (!selectedStudent || !selectedParent) return '';
    const tmpl = TEMPLATE_DEFINITIONS[category];
    const raw = tmpl[language];
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const dayName = new Date().toLocaleDateString('en-GB', { weekday: 'long' });

    return raw
      .replace('{parent_name}', selectedParent.full_name)
      .replace('{student_name}', selectedStudent.full_name)
      .replace('{date}', today)
      .replace('{day_of_week}', dayName)
      .replace('{incident_description}', customParams.incident_description || 'Incident')
      .replace('{subject}', customParams.subject || 'Classwork')
      .replace('{week_number}', '46')
      .replace('{attendance_percentage}', '94')
      .replace('{highlights}', customParams.highlights || 'Great effort');
  };

  const handleSendMessage = async () => {
    if (!selectedStudent || !selectedParent) return;

    if (selectedParent.consent_status !== 'given') {
      message.error('WhatsApp notification blocked: Parent has not provided consent or has opted out.');
      return;
    }

    setSending(true);
    try {
      const res = await apiClient.post('/teachers/send-notification', {
        student_id: selectedStudent.id,
        parent_id: selectedParent.id,
        template_category: category,
        language,
        custom_params: customParams
      });
      message.success(`Notification successfully queued and sent! Message ID: ${res.data.whatsapp_message_id}`);
      setModalOpen(false);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Instant filter by Student Name, Roll No, Admission No, or Grade/Section
  const filteredStudents = students.filter(s => {
    const query = searchText.toLowerCase().trim();
    if (!query) return true;
    return (
      s.full_name?.toLowerCase().includes(query) ||
      s.roll_no?.toLowerCase().includes(query) ||
      s.admission_no?.toLowerCase().includes(query) ||
      s.grade?.toLowerCase().includes(query) ||
      s.section?.toLowerCase().includes(query) ||
      s.parents?.some(p => p.full_name?.toLowerCase().includes(query) || p.whatsapp_number?.includes(query))
    );
  });

  const columns = [
    {
      title: 'Roll / Adm No',
      dataIndex: 'admission_no',
      key: 'admission_no',
      render: (adm: string, record: Student) => (
        <Space direction="vertical" size={0}>
          <Text strong>Roll: {record.roll_no || '-'}</Text>
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
          <Text strong style={{ fontSize: 15 }}>{name}</Text>
          <Tag color="cyan">{record.grade} • Sec {record.section}</Tag>
        </Space>
      )
    },
    {
      title: 'Parent / Guardian Contacts',
      key: 'parents',
      render: (_: any, record: Student) => (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {record.parents.map((p: Parent) => {
            const hasConsent = p.consent_status === 'given';
            return (
              <div key={p.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                background: '#fafafa',
                borderRadius: 4,
                border: '1px solid #f0f0f0'
              }}>
                <Space>
                  <WhatsAppOutlined style={{ color: hasConsent ? '#52c41a' : '#bfbfbf' }} />
                  <Text>{p.full_name} <span style={{ fontSize: 11, color: '#8c8c8c' }}>({p.relationship_type})</span></Text>
                  <Text code>{p.whatsapp_number}</Text>
                  <Tag color={hasConsent ? 'green' : 'red'}>
                    {hasConsent ? 'Consent Active' : 'Opted Out / Withdrawn'}
                  </Tag>
                </Space>

                <Tooltip title={hasConsent ? 'Send Predefined Template' : 'Consent withdrawn by parent'}>
                  <Button
                    type="primary"
                    size="small"
                    icon={<SendOutlined />}
                    disabled={!hasConsent}
                    onClick={() => openNotifyModal(record, p)}
                  >
                    Notify
                  </Button>
                </Tooltip>
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
          <Title level={3} style={{ margin: 0 }}>Teacher Dashboard – Assigned Students</Title>
          <Text type="secondary">
            Showing {filteredStudents.length} of {students.length} assigned students. Search by name, roll no, or admission no.
          </Text>
        </div>
        <Space>
          <Input
            placeholder="Search by Student Name, Roll No, Adm No..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 320 }}
            allowClear
            size="middle"
          />
          <Button icon={<ReloadOutlined />} onClick={fetchAssignedStudents} loading={loading}>
            Refresh
          </Button>
        </Space>
      </div>

      <Alert
        message="Role-Based Security Active"
        description="Every notification request is verified against the school's teacher-student assignment matrix and parent consent status on the backend."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card>
        <Table
          columns={columns}
          dataSource={filteredStudents}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Predefined WhatsApp Notification Modal */}
      <Modal
        title={
          <Space>
            <WhatsAppOutlined style={{ color: '#52c41a' }} />
            <span>Send Predefined Notification</span>
          </Space>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="back" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            icon={<SendOutlined />}
            loading={sending}
            onClick={handleSendMessage}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
            Confirm & Send via WhatsApp
          </Button>
        ]}
        width={650}
      >
        {selectedStudent && selectedParent && (
          <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 8 }}>
            <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: 12, borderRadius: 6 }}>
              <Text strong>Target Recipient:</Text> {selectedParent.full_name} ({selectedParent.relationship_type})
              <br />
              <Text strong>WhatsApp Number:</Text> <Text code>{selectedParent.whatsapp_number}</Text>
              <br />
              <Text strong>Student:</Text> {selectedStudent.full_name} (Roll: {selectedStudent.roll_no} | {selectedStudent.grade} - {selectedStudent.section})
            </div>

            <Form layout="vertical">
              <Form.Item label="Notification Category" required>
                <Select value={category} onChange={(val) => setCategory(val)} size="large">
                  {Object.entries(TEMPLATE_DEFINITIONS).map(([key, def]) => (
                    <Option key={key} value={key}>{def.title}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="Language">
                <Radio.Group value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <Radio.Button value="en">English</Radio.Button>
                  <Radio.Button value="hi">हिंदी (Hindi)</Radio.Button>
                </Radio.Group>
              </Form.Item>

              {category === 'misbehaviour_complaint' && (
                <Form.Item label="Incident Description" required>
                  <Input
                    value={customParams.incident_description}
                    onChange={(e) => setCustomParams({ ...customParams, incident_description: e.target.value })}
                    placeholder="Briefly state incident"
                  />
                </Form.Item>
              )}

              {category === 'incomplete_homework' && (
                <Form.Item label="Subject" required>
                  <Input
                    value={customParams.subject}
                    onChange={(e) => setCustomParams({ ...customParams, subject: e.target.value })}
                    placeholder="e.g. Mathematics Chapter 4"
                  />
                </Form.Item>
              )}

              {category === 'weekly_growth_report' && (
                <Form.Item label="Highlights & Areas of Growth" required>
                  <Input.TextArea
                    rows={2}
                    value={customParams.highlights}
                    onChange={(e) => setCustomParams({ ...customParams, highlights: e.target.value })}
                  />
                </Form.Item>
              )}

              <Form.Item label="WhatsApp Message Preview (Exact Approved Template)">
                <div style={{
                  background: '#e6f7ff',
                  border: '1px solid #91d5ff',
                  padding: 12,
                  borderRadius: 6,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: 13
                }}>
                  {getPreviewText()}
                </div>
              </Form.Item>
            </Form>
          </Space>
        )}
      </Modal>
    </div>
  );
};
