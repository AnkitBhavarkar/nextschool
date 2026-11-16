import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Switch, Typography, Space, Alert, message, Tag, Divider, Row, Col } from 'antd';
import { WhatsAppOutlined, CheckCircleOutlined, DisconnectOutlined, ApiOutlined } from '@ant-design/icons';
import { apiClient } from '../api/client';

const { Title, Text, Paragraph } = Typography;

export const AdminWhatsAppConnectPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/whatsapp/whatsapp-config');
      setConfig(res.data);
      form.setFieldsValue({
        official_phone_number: res.data.official_phone_number,
        phone_number_id: res.data.phone_number_id,
        waba_id: res.data.waba_id,
        is_active: res.data.is_active
      });
    } catch (err: any) {
      message.error('Failed to load WhatsApp API configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveConfig = async (values: any) => {
    setSaving(true);
    try {
      const res = await apiClient.post('/admin/whatsapp/whatsapp-config', values);
      message.success(res.data.message || 'WhatsApp credentials connected successfully!');
      fetchConfig();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to update WhatsApp configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <WhatsAppOutlined style={{ color: '#52c41a', marginRight: 8 }} />
            School WhatsApp Business API Connection
          </Title>
          <Text type="secondary">
            Connect the School's official WhatsApp number. All teachers will securely send notifications through this account.
          </Text>
        </div>

        <div>
          {config?.is_connected ? (
            <Tag color="success" style={{ padding: '4px 12px', fontSize: 13 }}>
              <CheckCircleOutlined /> Live Connected: {config.official_phone_number}
            </Tag>
          ) : (
            <Tag color="warning" style={{ padding: '4px 12px', fontSize: 13 }}>
              <DisconnectOutlined /> Simulation / Mock Mode Active
            </Tag>
          )}
        </div>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title="Meta WhatsApp Cloud API Credentials" loading={loading}>
            <Alert
              message="Centralized School Number"
              description="Teachers do not need personal numbers or WhatsApp Web sessions. Once configured here, the whole school communicates via Meta's official API."
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Form form={form} layout="vertical" onFinish={handleSaveConfig}>
              <Form.Item
                name="official_phone_number"
                label="Official School WhatsApp Phone Number"
                rules={[{ required: true, message: 'Please enter the registered school WhatsApp number!' }]}
                help="Include country code, e.g., +919876543210"
              >
                <Input placeholder="+919876500000" size="large" />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="phone_number_id"
                    label="Meta Phone Number ID"
                    rules={[{ required: true, message: 'Phone Number ID is required!' }]}
                    help="Obtained from Meta App Dashboard > WhatsApp > API Setup"
                  >
                    <Input placeholder="e.g. 105948372619482" size="large" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="waba_id"
                    label="WhatsApp Business Account ID (WABA ID)"
                    rules={[{ required: true, message: 'WABA ID is required!' }]}
                  >
                    <Input placeholder="e.g. 102938475610293" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="meta_access_token"
                label="Permanent System User Access Token"
                rules={[{ required: true, message: 'Meta Access Token is required!' }]}
                help="Generated in Meta Business Manager with whatsapp_business_messaging permission"
              >
                <Input.Password placeholder="EAAG... Paste permanent token here" size="large" />
              </Form.Item>

              <Form.Item
                name="is_active"
                label="Enable WhatsApp Service for Teachers"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch checkedChildren="Active" unCheckedChildren="Disabled" />
              </Form.Item>

              <Divider />

              <Button
                type="primary"
                htmlType="submit"
                icon={<ApiOutlined />}
                size="large"
                loading={saving}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Save & Connect WhatsApp API
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Quick Setup Guide" style={{ background: '#fafafa' }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>1. Get Meta Developer Account</Text>
                <Paragraph type="secondary" style={{ fontSize: 13 }}>
                  Visit <a href="https://developers.facebook.com" target="_blank" rel="noreferrer">developers.facebook.com</a> and create a Business App with WhatsApp product.
                </Paragraph>
              </div>

              <div>
                <Text strong>2. Add School Phone Number</Text>
                <Paragraph type="secondary" style={{ fontSize: 13 }}>
                  Verify the school's landline or mobile number via SMS/Call in Meta Business Manager.
                </Paragraph>
              </div>

              <div>
                <Text strong>3. Generate Permanent Token</Text>
                <Paragraph type="secondary" style={{ fontSize: 13 }}>
                  Create a System User in Business Manager and assign the WhatsApp account with messaging permission.
                </Paragraph>
              </div>

              <div>
                <Text strong>4. Safe Mock Testing</Text>
                <Paragraph type="secondary" style={{ fontSize: 13 }}>
                  If fields are left as dummy/mock values, the system safely simulates immediate delivery without error.
                </Paragraph>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

