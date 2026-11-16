export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'teacher';
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface Parent {
  id: string;
  full_name: string;
  whatsapp_number: string;
  consent_status: 'given' | 'withdrawn' | 'pending';
  relationship_type?: string;
}

export interface Student {
  id: string;
  admission_no: string;
  full_name: string;
  grade: string;
  section: string;
  roll_no?: string;
  parents: Parent[];
}

export interface MessageLog {
  id: string;
  student_id?: string;
  parent_id: string;
  template_category: string;
  language: string;
  rendered_message: string;
  status: 'queued' | 'processing' | 'sent' | 'delivered' | 'read' | 'failed';
  whatsapp_message_id?: string;
  error_code?: string;
  error_description?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

