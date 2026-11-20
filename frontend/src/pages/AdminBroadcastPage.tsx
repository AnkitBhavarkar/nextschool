import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Space,
  Button,
  Form,
  Select,
  Input,
  Radio,
  Row,
  Col,
  Tag,
  Alert,
  message,
  Popconfirm,
  Statistic,
  Divider,
  Table,
  Tabs
} from 'antd';
import {
  NotificationOutlined,
  SendOutlined,
  WhatsAppOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { apiClient } from '../api/client';
import { Student, MessageLog, BroadcastSummary } from '../types';
import { maskPhoneNumber } from '../utils/maskPhone';

const { Title, Text } = Typography;
const { Option } = Select;

const SCHOOL_BROADCAST_TEMPLATES: Record<string, { title: string; en: string; hi: string }> = {
  holiday_announcement: {
    title: '🏖️ School Holiday Announcement (अवकाश घोषणा)',
    en: 'NextSchool Official Notification:\nDear Parents & Students,\nThe school will remain closed on {date} on account of {details}.\nRegular classes will resume from {reopen_date}.\n– Principal Sharma, NextSchool',
    hi: 'NextSchool आधिकारिक सूचना:\nआदरणीय अभिभावक एवं विद्यार्थी,\n{details} के उपलक्ष्य में दिनांक {date} को विद्यालय में अवकाश रहेगा।\nनियमित कक्षाएं {reopen_date} से सुचारू रूप से चलेंगी।\n– प्रधानाचार्य शर्मा, NextSchool'
  },
  emergency_alert: {
    title: '⚠️ Urgent Weather / Emergency Alert (आकस्मिक अवकाश अलर्ट)',
    en: 'URGENT SCHOOL ADVISORY:\nDear Parents, due to {details}, the school will {time_slot} today ({date}). All school transport buses will operate with full safety escort.\n– Principal Office, NextSchool',
    hi: 'अति आवश्यक सूचना (Emergency Alert):\nआदरणीय अभिभावक, {details} के कारण विद्यालय आज ({date}) को {time_slot} रहेगा। सभी स्कूल बसें पूरी सुरक्षा के साथ रवाना होंगी।\n– प्रधानाचार्य कार्यालय, NextSchool'
  },
  ptm_notice: {
    title: '🤝 Parent-Teacher Meeting (PTM परिपत्र)',
    en: 'Dear Parent,\nNextSchool cordially invites you to the Parent-Teacher Meeting (PTM) on {date} from {time_slot} at {venue}.\nAgenda: Discussion on academic growth, term performance, and student wellbeing.\n– Principal Sharma, NextSchool',
    hi: 'आदरणीय अभिभावक,\nNextSchool द्वारा दिनांक {date} को {time_slot} बजे {venue} पर अभिभावक-शिक्षक बैठक (PTM) आयोजित की जा रही है।\nउद्देश्य: विद्यार्थी की शैक्षणिक प्रगति एवं परीक्षा परिणाम पर चर्चा। आपकी उपस्थिति सादर प्रार्थनीय है।\n– NextSchool'
  },
  exam_schedule: {
    title: '📝 Examination Timetable & Notice (सत्र परीक्षा समय-सारणी)',
    en: 'Important Examination Circular:\nDear Parents, Term Examinations will commence from {date}.\nTimetable, syllabus, and admit cards have been published. Please ensure regular revision and timely reporting.\n– Examination Controller, NextSchool',
    hi: 'महत्वपूर्ण परीक्षा परिपत्र:\nआदरणीय अभिभावक, विद्यालय की सत्र परीक्षाएं दिनांक {date} से प्रारंभ हो रही हैं।\nसमय-सारणी एवं प्रवेश पत्र उपलब्ध करा दिए गए हैं। कृपया विद्यार्थी की तैयारी एवं समय पर उपस्थिति सुनिश्चित करें।\n– परीक्षा विभाग, NextSchool'
  },
  sports_day_event: {
    title: '🏆 Annual Sports & Cultural Meet (खेलकूद एवं वार्षिकोत्सव निमंत्रण)',
    en: 'Celebration Invitation:\nDear Parents, NextSchool cordially invites you to celebrate our Annual Sports & Cultural Meet on {date} at {venue} ({time_slot}). Join us in applauding our student achievers!\n– NextSchool Management',
    hi: 'समारोह निमंत्रण:\nआदरणीय अभिभावक, NextSchool के वार्षिक खेलकूद एवं सांस्कृतिक महोत्सव में आप सभी सपरिवार सादर आमंत्रित हैं।\nदिनांक: {date} | समय: {time_slot} | स्थान: {venue}\n– NextSchool प्रबंधन'
  },
  fee_circular: {
    title: '💳 School Fee Installment Circular (शुल्क भुगतान सूचना)',
    en: 'Administrative Notice:\nDear Parents, this is a gentle reminder that the upcoming term school fee installment is due by {date}. Kindly complete the online payment via the school portal or accounts office.\n– Accounts Office, NextSchool',
    hi: 'प्रशासनिक सूचना:\nआदरणीय अभिभावक, यह एक विनम्र अनुस्मारक है कि आगामी सत्र की स्कूल फीस जमा करने की अंतिम तिथि {date} है। कृपया समय पर भुगतान पूर्ण करें।\n– लेखा विभाग, NextSchool'
  },
  custom_announcement: {
    title: '✍️ Custom Official Circular (कस्टम स्कूल परिपत्र)',
    en: 'NextSchool Official Circular:\nSubject: {title}\nDate: {date}\n\n{custom_message}\n\n– Principal Sharma, NextSchool',
    hi: 'NextSchool आधिकारिक परिपत्र:\nविषय: {title}\nदिनांक: {date}\n\n{custom_message}\n\n– प्रधानाचार्य शर्मा, NextSchool'
  }
};

export const AdminBroadcastPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [lastResult, setLastResult] = useState<BroadcastSummary | null>(null);

  // Form State
  const [targetAudience, setTargetAudience] = useState<'all' | 'grade' | 'section'>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('Grade 10');
  const [selectedSection, setSelectedSection] = useState<string>('A');
  const [category, setCategory] = useState<string>('holiday_announcement');
  const [language, setLanguage] = useState<'en' | 'hi'>('hi');

  const [formFields, setFormFields] = useState({
    title: 'Heavy Rainfall Alert & School Holiday Notice',
    date: 'Tomorrow (Saturday, 21-Nov-2026)',
    reopen_date: 'Monday, 23-Nov-2026',
    time_slot: 'disperse early at 12:30 PM',
    venue: 'School Main Auditorium & Classrooms',
    details: 'district administrative orders due to heavy monsoon rainfall alert',
    custom_message: 'All parents are informed that tomorrow will be a non-working day for all classes. Online doubt classes will be scheduled as per regular timetable.'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studRes, msgRes] = await Promise.all([
        apiClient.get('/admin/all-students'),
        apiClient.get('/admin/messages')
      ]);
      setStudents(studRes.data);
      setLogs(msgRes.data.filter((m: MessageLog) => m.recipient_type === 'school_broadcast'));
    } catch (err: any) {
      message.error('Failed to load students or broadcast history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter targeted students
  const targetedStudents = students.filter(s => {
    if (targetAudience === 'all') return true;
    if (targetAudience === 'grade') return s.grade === selectedGrade;
    if (targetAudience === 'section') return s.grade === selectedGrade && s.section === selectedSection;
    return true;
  });

  // Calculate unique parents and active consents
  const targetedParentsMap = new Map<string, { name: string; phone: string; consent: string }>();
  targetedStudents.forEach(s => {
    s.parents.forEach(p => {
      targetedParentsMap.set(p.id, { name: p.full_name, phone: p.whatsapp_number, consent: p.consent_status });
    });
  });

  const totalParents = targetedParentsMap.size;
  const eligibleParents = Array.from(targetedParentsMap.values()).filter(p => p.consent === 'given').length;

  const getPreviewText = () => {
    const tmpl = SCHOOL_BROADCAST_TEMPLATES[category] || SCHOOL_BROADCAST_TEMPLATES['custom_announcement'];
    const raw = tmpl[language];

    return raw
      .replace('{title}', formFields.title)
      .replace('{date}', formFields.date)
      .replace('{reopen_date}', formFields.reopen_date)
      .replace('{time_slot}', formFields.time_slot)
      .replace('{venue}', formFields.venue)
      .replace('{details}', formFields.details)
      .replace('{custom_message}', formFields.custom_message);
  };

  const handleSendBroadcast = async () => {
    if (eligibleParents === 0) {
      message.error('No parents with active consent found for this audience.');
      return;
    }

    setBroadcasting(true);
    try {
      const payload = {
        target_audience: targetAudience,
        target_grade: targetAudience !== 'all' ? selectedGrade : undefined,
        target_section: targetAudience === 'section' ? selectedSection : undefined,
        category,
        language,
        title: formFields.title,
        date: formFields.date,
        reopen_date: formFields.reopen_date,
        time_slot: formFields.time_slot,
        venue: formFields.venue,
        details: formFields.details,
        custom_message: formFields.custom_message
      };

      const res = await apiClient.post('/admin/broadcasts/send', payload);
      setLastResult(res.data);
      message.success(`School broadcast successfully dispatched to ${res.data.sent_count} parents!`);
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to dispatch broadcast');
    } finally {
      setBroadcasting(false);
    }
  };

  const logColumns = [
    {
      title: 'Dispatched At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (dt: string) => new Date(dt).toLocaleString(),
      width: 170
    },
    {
      title: 'Recipient Parent',
      dataIndex: 'recipient_name',
      key: 'recipient_name',
      render: (name: string, record: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name || 'Parent'}</Text>
          <Text code style={{ fontSize: 11 }}>{maskPhoneNumber(record.recipient_phone)}</Text>
        </Space>
      )
    },
    {
      title: 'Category',
      dataIndex: 'template_category',
      key: 'template_category',
      render: (cat: string) => <Tag color="blue">{cat.replace(/_/g, ' ').toUpperCase()}</Tag>
    },
    {
      title: 'Broadcast Message Content',
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
      render: (st: string) => (
        <Tag color="green" icon={<CheckCircleOutlined />}>{st.toUpperCase()}</Tag>
      ),
      width: 120
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>School-Wide Announcements & Broadcasts</Title>
          <Text type="secondary">
            Broadcast official notices, holidays, PTM circulars, and emergency advisories directly to parents via WhatsApp.
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
          Refresh Stats
        </Button>
      </div>

      <Tabs defaultActiveKey="compose">
        <Tabs.TabPane
          tab={
            <span>
              <NotificationOutlined /> New Broadcast (नया प्रसारण)
            </span>
          }
          key="compose"
        >
          <Row gutter={24}>
            {/* Left: Compose Form */}
            <Col xs={24} lg={14}>
              <Card title="1. Configure Broadcast Target & Message">
                <Form layout="vertical">
                  <Form.Item label="Target Audience (प्राप्तकर्ता समूह)" required>
                    <Radio.Group
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                    >
                      <Radio.Button value="all">Entire School (All Students)</Radio.Button>
                      <Radio.Button value="grade">By Grade</Radio.Button>
                      <Radio.Button value="section">By Section</Radio.Button>
                    </Radio.Group>
                  </Form.Item>

                  {targetAudience !== 'all' && (
                    <Row gutter={12}>
                      <Col span={targetAudience === 'section' ? 12 : 24}>
                        <Form.Item label="Select Grade">
                          <Select value={selectedGrade} onChange={(v) => setSelectedGrade(v)}>
                            <Option value="Grade 9">Grade 9</Option>
                            <Option value="Grade 10">Grade 10</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      {targetAudience === 'section' && (
                        <Col span={12}>
                          <Form.Item label="Select Section">
                            <Select value={selectedSection} onChange={(v) => setSelectedSection(v)}>
                              <Option value="A">Section A</Option>
                              <Option value="B">Section B</Option>
                            </Select>
                          </Form.Item>
                        </Col>
                      )}
                    </Row>
                  )}

                  <Form.Item label="Broadcast Category (सूचना का प्रकार)" required>
                    <Select value={category} onChange={(v) => setCategory(v)} size="large">
                      {Object.entries(SCHOOL_BROADCAST_TEMPLATES).map(([key, def]) => (
                        <Option key={key} value={key}>{def.title}</Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item label="Broadcast Language (भाषा)">
                    <Radio.Group value={language} onChange={(e) => setLanguage(e.target.value)}>
                      <Radio.Button value="hi">हिंदी (Hindi)</Radio.Button>
                      <Radio.Button value="en">English</Radio.Button>
                    </Radio.Group>
                  </Form.Item>

                  {category === 'holiday_announcement' && (
                    <>
                      <Form.Item label="Holiday Date (अवकाश का दिन/दिनांक)" required>
                        <Input
                          value={formFields.date}
                          onChange={(e) => setFormFields({ ...formFields, date: e.target.value })}
                          placeholder="e.g. Tomorrow (Saturday, 21-Nov-2026)"
                        />
                      </Form.Item>
                      <Form.Item label="Holiday Occasion / Reason (अवकाश का कारण)" required>
                        <Input
                          value={formFields.details}
                          onChange={(e) => setFormFields({ ...formFields, details: e.target.value })}
                          placeholder="e.g. Heavy monsoon rainfall / Diwali Festival"
                        />
                      </Form.Item>
                      <Form.Item label="Classes Resumption Date (पुनः खुलने की तिथि)" required>
                        <Input
                          value={formFields.reopen_date}
                          onChange={(e) => setFormFields({ ...formFields, reopen_date: e.target.value })}
                          placeholder="e.g. Monday, 23-Nov-2026"
                        />
                      </Form.Item>
                    </>
                  )}

                  {category === 'emergency_alert' && (
                    <>
                      <Form.Item label="Emergency Reason / Advisory Details" required>
                        <Input
                          value={formFields.details}
                          onChange={(e) => setFormFields({ ...formFields, details: e.target.value })}
                          placeholder="e.g. Severe storm weather alert / local administrative order"
                        />
                      </Form.Item>
                      <Form.Item label="Action / Timing (स्कूल समय / बदलाव)" required>
                        <Input
                          value={formFields.time_slot}
                          onChange={(e) => setFormFields({ ...formFields, time_slot: e.target.value })}
                          placeholder="e.g. disperse early at 12:30 PM / remain closed today"
                        />
                      </Form.Item>
                    </>
                  )}

                  {category === 'ptm_notice' && (
                    <>
                      <Form.Item label="PTM Date (बैठक की तिथि)" required>
                        <Input
                          value={formFields.date}
                          onChange={(e) => setFormFields({ ...formFields, date: e.target.value })}
                          placeholder="e.g. Saturday, 28-Nov-2026"
                        />
                      </Form.Item>
                      <Form.Item label="Time Slots (समय)" required>
                        <Input
                          value={formFields.time_slot}
                          onChange={(e) => setFormFields({ ...formFields, time_slot: e.target.value })}
                          placeholder="e.g. 09:00 AM – 01:00 PM (Roll-wise slots)"
                        />
                      </Form.Item>
                      <Form.Item label="Venue (स्थान)" required>
                        <Input
                          value={formFields.venue}
                          onChange={(e) => setFormFields({ ...formFields, venue: e.target.value })}
                          placeholder="e.g. Respective Classrooms & Main Block"
                        />
                      </Form.Item>
                    </>
                  )}

                  {category === 'exam_schedule' && (
                    <Form.Item label="Examination Commencement Date" required>
                      <Input
                        value={formFields.date}
                        onChange={(e) => setFormFields({ ...formFields, date: e.target.value })}
                        placeholder="e.g. Monday, 01-Dec-2026"
                      />
                    </Form.Item>
                  )}

                  {category === 'sports_day_event' && (
                    <>
                      <Form.Item label="Event Date & Time" required>
                        <Input
                          value={formFields.date}
                          onChange={(e) => setFormFields({ ...formFields, date: e.target.value })}
                          placeholder="e.g. Friday, 05-Dec-2026 at 08:30 AM"
                        />
                      </Form.Item>
                      <Form.Item label="Venue (स्थान)" required>
                        <Input
                          value={formFields.venue}
                          onChange={(e) => setFormFields({ ...formFields, venue: e.target.value })}
                          placeholder="e.g. NextSchool Sports Complex & Pavilion"
                        />
                      </Form.Item>
                    </>
                  )}

                  {category === 'fee_circular' && (
                    <Form.Item label="Due Date for Payment" required>
                      <Input
                        value={formFields.date}
                        onChange={(e) => setFormFields({ ...formFields, date: e.target.value })}
                        placeholder="e.g. 30-Nov-2026"
                      />
                    </Form.Item>
                  )}

                  {category === 'custom_announcement' && (
                    <>
                      <Form.Item label="Circular Title (शीर्षक)" required>
                        <Input
                          value={formFields.title}
                          onChange={(e) => setFormFields({ ...formFields, title: e.target.value })}
                          placeholder="e.g. Winter Uniform & Revised Timings Notice"
                        />
                      </Form.Item>
                      <Form.Item label="Circular Body (परिपत्र विवरण)" required>
                        <Input.TextArea
                          rows={4}
                          value={formFields.custom_message}
                          onChange={(e) => setFormFields({ ...formFields, custom_message: e.target.value })}
                          placeholder="Write the full circular announcement here..."
                          showCount
                          maxLength={500}
                        />
                      </Form.Item>
                    </>
                  )}
                </Form>
              </Card>
            </Col>

            {/* Right: Reach Metrics & WhatsApp Live Preview */}
            <Col xs={24} lg={10}>
              <Card title="2. Audience Reach & WhatsApp Preview" style={{ marginBottom: 16 }}>
                <Row gutter={12} style={{ marginBottom: 16 }}>
                  <Col span={12}>
                    <Statistic
                      title="Targeted Students"
                      value={targetedStudents.length}
                      prefix={<TeamOutlined />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Eligible WhatsApp Parents"
                      value={eligibleParents}
                      prefix={<WhatsAppOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                </Row>

                <Alert
                  type="info"
                  showIcon
                  message="Consent Compliance Active"
                  description={`${totalParents - eligibleParents} parent(s) with pending or withdrawn consent will be automatically skipped to honor privacy.`}
                  style={{ marginBottom: 16 }}
                />

                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  📱 WhatsApp Message Preview:
                </Text>

                {/* WhatsApp Chat Bubble Mockup */}
                <div style={{
                  background: '#e5ddd5',
                  padding: 16,
                  borderRadius: 12,
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                  position: 'relative',
                  minHeight: 180
                }}>
                  <div style={{
                    background: '#ffffff',
                    padding: '12px 14px',
                    borderRadius: '8px 8px 8px 0',
                    maxWidth: '90%',
                    boxShadow: '0 1px 1px rgba(0,0,0,0.15)',
                    whiteSpace: 'pre-wrap',
                    fontSize: 13,
                    lineHeight: '1.5',
                    color: '#111'
                  }}>
                    <div style={{ color: '#075e54', fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>
                      🏫 NextSchool Official Verified
                    </div>
                    {getPreviewText()}
                    <div style={{ textAlign: 'right', fontSize: 10, color: '#888', marginTop: 6 }}>
                      Just now • WhatsApp Official
                    </div>
                  </div>
                </div>

                <Divider style={{ margin: '16px 0' }} />

                <Popconfirm
                  title="Confirm School Broadcast"
                  description={`Are you sure you want to broadcast this notice to ${eligibleParents} parent(s) via WhatsApp?`}
                  onConfirm={handleSendBroadcast}
                  okText="Yes, Send Now"
                  cancelText="Cancel"
                  okButtonProps={{ style: { backgroundColor: '#52c41a', borderColor: '#52c41a' } }}
                >
                  <Button
                    type="primary"
                    size="large"
                    icon={<SendOutlined />}
                    loading={broadcasting}
                    block
                    style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', height: 48, fontSize: 16 }}
                  >
                    Broadcast to {eligibleParents} Parents
                  </Button>
                </Popconfirm>
              </Card>

              {lastResult && (
                <Card title="🎉 Last Broadcast Dispatch Result" style={{ borderColor: '#b7eb8f', background: '#f6ffed' }}>
                  <Text strong>Title:</Text> {lastResult.broadcast_title}
                  <br />
                  <Text strong>Parents Reached:</Text> <Tag color="green">{lastResult.sent_count} Sent</Tag>
                  <br />
                  <Text strong>Skipped (Consent):</Text> <Tag color="orange">{lastResult.skipped_withdrawn_consent} Skipped</Tag>
                  <br />
                  <Text strong>Category:</Text> <Tag color="blue">{lastResult.category}</Tag>
                </Card>
              )}
            </Col>
          </Row>
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={
            <span>
              <ClockCircleOutlined /> Broadcast History ({logs.length})
            </span>
          }
          key="history"
        >
          <Card>
            <Table
              columns={logColumns}
              dataSource={logs}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 8 }}
            />
          </Card>
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};
