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

class MessageLogResponse(BaseModel):
    id: str
    student_id: Optional[str]
    parent_id: str
    template_category: str
    language: str
    rendered_message: str
    status: str
    whatsapp_message_id: Optional[str]
    error_code: Optional[str]
    error_description: Optional[str]
    retry_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

