from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# Token & Auth
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    email: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str
    is_active: bool = True

class UserCreate(UserBase):
    password: str
    employee_code: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None

class UserResponse(UserBase):
    id: str
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

# Parent & Student Schemas
class ParentResponse(BaseModel):
    id: str
    full_name: str
    whatsapp_number: str
    consent_status: str
    relationship_type: Optional[str] = None

    class Config:
        from_attributes = True

class StudentWithParents(BaseModel):
    id: str
    admission_no: str
    full_name: str
    grade: str
    section: str
    roll_no: Optional[str] = None
    parents: List[ParentResponse] = []

    class Config:
        from_attributes = True

# Message Preview and Queue Schemas
class MessageSendRequest(BaseModel):
    student_id: str
    parent_id: str
    template_category: str
    language: str = "en"
    custom_params: Optional[dict] = Field(default_factory=dict)
    custom_message: Optional[str] = None

class MessageLogResponse(BaseModel):
    id: str
    student_id: Optional[str] = None
    parent_id: Optional[str] = None
    teacher_id: Optional[str] = None
    recipient_type: Optional[str] = "parent"
    recipient_name: Optional[str] = None
    recipient_phone: Optional[str] = None
    template_category: str
    language: str
    rendered_message: str
    status: str
    whatsapp_message_id: Optional[str] = None
    error_code: Optional[str] = None
    error_description: Optional[str] = None
    retry_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Admin -> Teachers Communication Schema
class AdminTeacherMessageRequest(BaseModel):
    target_type: str = "single" # "single", "all", "department"
    teacher_id: Optional[str] = None
    department: Optional[str] = None
    category: str = "call_to_office" # "call_to_office", "staff_meeting", "marks_submission", "duty_assignment", "custom_staff_notice"
    subject: Optional[str] = "Important Staff Communication"
    reason: Optional[str] = None
    scheduled_time: Optional[str] = None
    venue: Optional[str] = None
    custom_message: Optional[str] = None
    language: str = "en"

# Admin -> School-wide Students/Parents Broadcast Schema
class AdminBroadcastRequest(BaseModel):
    target_audience: str = "all" # "all", "grade", "section"
    target_grade: Optional[str] = None
    target_section: Optional[str] = None
    category: str = "holiday_announcement" # holiday_announcement, ptm_notice, exam_schedule, sports_day_event, emergency_alert, custom_announcement
    title: Optional[str] = "School Announcement"
    date: Optional[str] = None
    reopen_date: Optional[str] = None
    time_slot: Optional[str] = None
    venue: Optional[str] = None
    details: Optional[str] = None
    custom_message: Optional[str] = None
    language: str = "en"

class BroadcastSummaryResponse(BaseModel):
    total_target_students: int
    total_parents_contacted: int
    skipped_withdrawn_consent: int
    sent_count: int
    failed_count: int
    broadcast_title: str
    category: str
    preview_message: str

