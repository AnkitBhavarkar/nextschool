import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Text, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base

class UserRole(str, Enum):
    ADMIN = "admin"
    TEACHER = "teacher"

class School(Base):
    __tablename__ = "schools"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_name = Column(String(255), nullable=False)
    official_phone_number = Column(String(50), nullable=False)  # Display WhatsApp number e.g., +919876543210
    waba_id = Column(String(100), nullable=True)               # Meta WhatsApp Business Account ID
    phone_number_id = Column(String(100), nullable=True)       # Meta Cloud API Phone Number ID
    meta_access_token = Column(Text, nullable=True)            # Meta Permanent System User Token
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    teachers = relationship("Teacher", back_populates="school")
    students = relationship("Student", back_populates="school")
    messages = relationship("MessageLog", back_populates="school")

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default=UserRole.TEACHER)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)

    teacher_profile = relationship("Teacher", back_populates="user", uselist=False)

class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    phone = Column(String(50), nullable=True)
    employee_code = Column(String(50), unique=True, index=True, nullable=False)
    department = Column(String(100), nullable=True)

    school = relationship("School", back_populates="teachers")
    user = relationship("User", back_populates="teacher_profile")
    assignments = relationship("TeacherStudentAssignment", back_populates="teacher")

class Student(Base):
    __tablename__ = "students"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=True)
    admission_no = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    grade = Column(String(50), nullable=False)     # e.g., "Grade 10"
    section = Column(String(50), nullable=False)   # e.g., "A"
    roll_no = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    school = relationship("School", back_populates="students")
    parents = relationship("StudentParent", back_populates="student")
    teacher_assignments = relationship("TeacherStudentAssignment", back_populates="student")

class Parent(Base):
    __tablename__ = "parents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name = Column(String(255), nullable=False)
    whatsapp_number = Column(String(50), nullable=False, index=True) # E.164 format
    email = Column(String(255), nullable=True)
    consent_status = Column(String(50), default="given", nullable=False) # "given", "withdrawn", "pending"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    students = relationship("StudentParent", back_populates="parent")

class StudentParent(Base):
    __tablename__ = "student_parents"

    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), primary_key=True)
    parent_id = Column(String(36), ForeignKey("parents.id", ondelete="CASCADE"), primary_key=True)
    relationship_type = Column(String(50), default="Primary Guardian") # Father, Mother, Guardian

    student = relationship("Student", back_populates="parents")
    parent = relationship("Parent", back_populates="students")

class TeacherStudentAssignment(Base):
    __tablename__ = "teacher_student_assignments"

    teacher_id = Column(String(36), ForeignKey("teachers.id", ondelete="CASCADE"), primary_key=True)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), primary_key=True)
    subject = Column(String(100), default="General Class Teacher")
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    teacher = relationship("Teacher", back_populates="assignments")
    student = relationship("Student", back_populates="teacher_assignments")

class MessageLog(Base):
    __tablename__ = "message_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=True)
    sender_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    student_id = Column(String(36), ForeignKey("students.id"), nullable=True)
    parent_id = Column(String(36), ForeignKey("parents.id"), nullable=False)
    template_category = Column(String(100), nullable=False)
    language = Column(String(20), default="en", nullable=False)
    rendered_message = Column(Text, nullable=False)
    status = Column(String(50), default="queued", nullable=False) # queued, processing, sent, delivered, read, failed
    whatsapp_message_id = Column(String(100), nullable=True)
    error_code = Column(String(50), nullable=True)
    error_description = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    school = relationship("School", back_populates="messages")
