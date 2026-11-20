import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Typography,
  Space,
  Button,
  message,
  Input,
  Modal,
  Form,
  Select,
  Radio
} from 'antd';
import {
  ReloadOutlined,
  SearchOutlined,
  SendOutlined,
  WhatsAppOutlined,
  NotificationOutlined
} from '@ant-design/icons';
import { apiClient } from '../api/client';
import { maskPhoneNumber } from '../utils/maskPhone';

const { Title, Text } = Typography;
const { Option } = Select;

const TEACHER_NOTICE_TEMPLATES: Record<string, { title: string; en: string; hi: string }> = {
  call_to_office: {
    title: '🚨 Urgent Call to Principal\'s Office (प्रधानाचार्य कक्ष में बुलावा)',
    en: 'Dear {teacher_name},\nPrincipal Sharma requests your presence in the Principal\'s Office at {time}.\nPurpose / Agenda: {reason}\n– Principal Office, NextSchool',
    hi: 'आदरणीय {teacher_name},\nप्रधानाचार्य शर्मा ने आपको {time} पर प्रधानाचार्य कार्यालय में उपस्थित होने का अनुरोध किया है।\nविषय: {reason}\n– प्रधानाचार्य कार्यालय, NextSchool'
  },
  staff_meeting: {
    title: '👥 Staff Meeting Notice (स्टाफ बैठक सूचना)',
    en: 'Faculty Notice:\nA staff meeting has been scheduled for {time} at {venue}.\nAgenda: {reason}\nAll concerned teaching staff are requested to attend promptly.\n– Principal Sharma, NextSchool',
    hi: 'शिक्षक सूचना:\nदिनांक व समय {time} को {venue} पर एक महत्वपूर्ण स्टाफ बैठक आयोजित की गई है।\nएजेंडा: {reason}\nसभी संबंधित शिक्षकों की उपस्थिति अनिवार्य है।\n– प्रधानाचार्य शर्मा, NextSchool'
  },
  marks_submission: {
    title: '📊 Marks & Report Card Submission (अंक प्रविष्टि अनुस्मारक)',
    en: 'Reminder for {teacher_name}:\nPlease ensure the submission and portal entry of student term examination marks by {time}.\nSubject / Class: {reason}\n– Academic Office, NextSchool',
    hi: 'अनुस्मारक सूचना ({teacher_name}):\nकृपया अपनी कक्षाओं के परीक्षा अंक पोर्टल पर {time} तक दर्ज व सत्यापित कराना सुनिश्चित करें।\nकक्षा / विषय: {reason}\n– परीक्षा विभाग, NextSchool'
  },
  duty_assignment: {
    title: '📋 Class Substitution / Exam Duty (ड्यूटी आवंटन सूचना)',
    en: 'Duty Allocation ({teacher_name}):\nYou have been assigned {reason} at {venue} scheduled for {time}. Please report on time.\n– Administration, NextSchool',
    hi: 'ड्यूटी सूचना ({teacher_name}):\nआपको {time} पर {venue} में {reason} हेतु आवंटित किया गया है। कृपया समय पर रिपोर्ट करें।\n– प्रशासन, NextSchool'
  },
  custom_staff_notice: {
    title: '💬 Custom Staff Notice (कस्टम शिक्षक संदेश)',
    en: 'NextSchool Staff Notice:\nTo: {teacher_name}\nSubject: {subject}\n\n{custom_message}\n\n– Principal Sharma, NextSchool',
    hi: 'NextSchool शिक्षक परिपत्र:\nप्रेषित: {teacher_name}\nविषय: {subject}\n\n{custom_message}\n\n– प्रधानाचार्य शर्मा, NextSchool'
  }
};

export const AdminTeachersPage: React.FC = () => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [targetType, setTargetType] = useState<'single' | 'all' | 'department'>('single');
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>('Mathematics');
  const [category, setCategory] = useState('call_to_office');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [params, setParams] = useState({
    time: 'Today at 2:30 PM (Free Period)',
    venue: 'Principal\'s Office',
    reason: 'Discussion regarding student academic growth & upcoming term syllabus',
    subject: 'Urgent Administrative Advisory',
    custom_message: 'Please bring your Grade 10 student progress record register when visiting the office.'
  });
  const [sending, setSending] = useState(false);

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

  const departments = Array.from(new Set(teachers.map(t => t.department).filter(Boolean)));

  const openSingleTeacherModal = (teacher: any) => {
    setSelectedTeacher(teacher);
    setTargetType('single');
    setCategory('call_to_office');
    setParams({
      time: 'Today at 2:30 PM (During 5th period)',
      venue: 'Principal\'s Office',
      reason: 'Regarding class discipline and term test performance',
      subject: 'Academic Review with Principal',
      custom_message: `Dear ${teacher.full_name}, please meet Principal Sharma today regarding urgent academic coordination.`
    });
    setModalOpen(true);
  };

  const openBroadcastTeachersModal = () => {
    setSelectedTeacher(null);
    setTargetType('all');
    setCategory('staff_meeting');
    setParams({
      time: 'Today at 3:15 PM (Post Classes)',
      venue: 'School Conference Hall',
      reason: 'Preparation for upcoming CBSE term examinations & marks entry schedule',
      subject: 'Mandatory Staff Meeting Notice',
      custom_message: 'All faculty members are requested to assemble in the main conference hall.'
    });
    setModalOpen(true);
  };

  const getPreviewText = () => {
    const tmpl = TEACHER_NOTICE_TEMPLATES[category] || TEACHER_NOTICE_TEMPLATES['call_to_office'];
    const raw = tmpl[language];
    const targetName = targetType === 'single'
      ? (selectedTeacher?.full_name || 'Faculty Member')
      : targetType === 'department'
        ? `All ${selectedDept} Faculty`
        : 'All School Faculty Members';

    return raw
      .replace('{teacher_name}', targetName)
      .replace('{time}', params.time)
      .replace('{venue}', params.venue)
      .replace('{reason}', params.reason)
      .replace('{subject}', params.subject)
      .replace('{custom_message}', params.custom_message);
  };

  const handleSendMessage = async () => {
    setSending(true);
    try {
      const payload = {
        target_type: targetType,
        teacher_id: targetType === 'single' ? selectedTeacher?.id : undefined,
        department: targetType === 'department' ? selectedDept : undefined,
        category,
        language,
        scheduled_time: params.time,
        venue: params.venue,
        reason: params.reason,
        subject: params.subject,
        custom_message: params.custom_message
      };

      const res = await apiClient.post('/admin/teachers/send-message', payload);
      message.success(`WhatsApp message successfully sent to ${res.data.sent_count} teacher(s)!`);
      setModalOpen(false);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to dispatch message to teachers');
    } finally {
      setSending(false);
    }
  };

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
      key: 'department',
      render: (dept: string) => <Tag color="geekblue">{dept || 'General'}</Tag>
    },
    {
      title: 'WhatsApp Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => (
        <Space>
          <WhatsAppOutlined style={{ color: '#52c41a' }} />
          <Text code>{maskPhoneNumber(phone)}</Text>
        </Space>
      )
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
    },
    {
      title: 'Principal Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Button
          type="primary"
          size="small"
          icon={<WhatsAppOutlined />}
          style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          onClick={() => openSingleTeacherModal(record)}
        >
          Call / Message
        </Button>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Teachers Directory & Staff Communication</Title>
          <Text type="secondary">Directly call teachers to office or broadcast staff meetings and announcements via WhatsApp.</Text>
        </div>
        <Space>
          <Button
            type="primary"
            icon={<NotificationOutlined />}
            onClick={openBroadcastTeachersModal}
            style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
          >
            📢 Broadcast to All Teachers
          </Button>
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

      {/* Modal for Principal Sending WhatsApp Notice to Teacher(s) */}
      <Modal
        title={
          <Space>
            <WhatsAppOutlined style={{ color: '#52c41a' }} />
            <span>
              {targetType === 'single'
                ? `Send WhatsApp Notice to ${selectedTeacher?.full_name}`
                : 'Broadcast WhatsApp Notice to Faculty Staff'}
            </span>
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
            Send WhatsApp Notification
          </Button>
        ]}
        width={680}
      >
        <Form layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="Target Recipient(s)">
            <Radio.Group value={targetType} onChange={(e) => setTargetType(e.target.value)}>
              <Radio.Button value="single">Single Teacher</Radio.Button>
              <Radio.Button value="all">All Teachers ({teachers.length})</Radio.Button>
              <Radio.Button value="department">By Department</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {targetType === 'single' && (
            <Form.Item label="Select Teacher" required>
              <Select
                value={selectedTeacher?.id}
                onChange={(val) => setSelectedTeacher(teachers.find(t => t.id === val))}
              >
                {teachers.map(t => (
                  <Option key={t.id} value={t.id}>
                    {t.full_name} ({t.department || 'General'} | {maskPhoneNumber(t.phone)})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {targetType === 'department' && (
            <Form.Item label="Select Department" required>
              <Select value={selectedDept} onChange={(val) => setSelectedDept(val)}>
                {departments.map(d => (
                  <Option key={d} value={d}>{d}</Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item label="Notice Category (विषय / प्रकार)" required>
            <Select value={category} onChange={(val) => setCategory(val)}>
              {Object.entries(TEACHER_NOTICE_TEMPLATES).map(([key, def]) => (
                <Option key={key} value={key}>{def.title}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Language (भाषा)">
            <Radio.Group value={language} onChange={(e) => setLanguage(e.target.value)}>
              <Radio.Button value="en">English</Radio.Button>
              <Radio.Button value="hi">हिंदी (Hindi)</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {category === 'call_to_office' && (
            <>
              <Form.Item label="Scheduled Time / Period (बुलाने का समय)" required>
                <Input
                  value={params.time}
                  onChange={(e) => setParams({ ...params, time: e.target.value })}
                  placeholder="e.g. Today at 2:30 PM (or Immediately)"
                />
              </Form.Item>
              <Form.Item label="Purpose / Reason (बुलाने का कारण)" required>
                <Input.TextArea
                  rows={2}
                  value={params.reason}
                  onChange={(e) => setParams({ ...params, reason: e.target.value })}
                  placeholder="e.g. Discussion regarding student discipline case and lesson plan review"
                />
              </Form.Item>
            </>
          )}

          {category === 'staff_meeting' && (
            <>
              <Form.Item label="Meeting Date & Time (मीटिंग का समय)" required>
                <Input
                  value={params.time}
                  onChange={(e) => setParams({ ...params, time: e.target.value })}
                  placeholder="e.g. Today at 3:15 PM"
                />
              </Form.Item>
              <Form.Item label="Meeting Venue (स्थान)" required>
                <Input
                  value={params.venue}
                  onChange={(e) => setParams({ ...params, venue: e.target.value })}
                  placeholder="e.g. Conference Hall / Staff Room"
                />
              </Form.Item>
              <Form.Item label="Agenda / Discussion Points (एजेंडा)" required>
                <Input.TextArea
                  rows={2}
                  value={params.reason}
                  onChange={(e) => setParams({ ...params, reason: e.target.value })}
                  placeholder="e.g. Term exam scheduling and evaluation guidelines"
                />
              </Form.Item>
            </>
          )}

          {category === 'marks_submission' && (
            <>
              <Form.Item label="Submission Deadline (अंतिम तिथि)" required>
                <Input
                  value={params.time}
                  onChange={(e) => setParams({ ...params, time: e.target.value })}
                  placeholder="e.g. Friday by 4:00 PM"
                />
              </Form.Item>
              <Form.Item label="Target Classes / Subject" required>
                <Input
                  value={params.reason}
                  onChange={(e) => setParams({ ...params, reason: e.target.value })}
                  placeholder="e.g. Grade 9 & 10 Term 1 Periodic Test Scores"
                />
              </Form.Item>
            </>
          )}

          {category === 'duty_assignment' && (
            <>
              <Form.Item label="Duty Type & Details (ड्यूटी का विवरण)" required>
                <Input
                  value={params.reason}
                  onChange={(e) => setParams({ ...params, reason: e.target.value })}
                  placeholder="e.g. Proxy duty for Class 9B / Examination invigilation"
                />
              </Form.Item>
              <Form.Item label="Location / Room No." required>
                <Input
                  value={params.venue}
                  onChange={(e) => setParams({ ...params, venue: e.target.value })}
                  placeholder="e.g. Room 204 (Science Wing)"
                />
              </Form.Item>
              <Form.Item label="Time / Period" required>
                <Input
                  value={params.time}
                  onChange={(e) => setParams({ ...params, time: e.target.value })}
                  placeholder="e.g. 4th Period (11:30 AM – 12:15 PM)"
                />
              </Form.Item>
            </>
          )}

          {category === 'custom_staff_notice' && (
            <>
              <Form.Item label="Notice Subject (विषय)" required>
                <Input
                  value={params.subject}
                  onChange={(e) => setParams({ ...params, subject: e.target.value })}
                  placeholder="e.g. Annual Sports Day Committee Briefing"
                />
              </Form.Item>
              <Form.Item label="Notice Message (संदेश विवरण)" required>
                <Input.TextArea
                  rows={4}
                  value={params.custom_message}
                  onChange={(e) => setParams({ ...params, custom_message: e.target.value })}
                  placeholder="Type official circular / instruction for teachers..."
                  showCount
                  maxLength={400}
                />
              </Form.Item>
            </>
          )}

          <Form.Item label="WhatsApp Message Preview (लाइव प्रिव्यू)">
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
      </Modal>
    </div>
  );
};
