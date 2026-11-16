from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models import User, Teacher, Student, Parent, MessageLog, StudentParent
from app.db.schemas import UserResponse, StudentWithParents, ParentResponse, MessageLogResponse
from app.api.deps import require_role

router = APIRouter()

@router.get("/overview")
async def get_admin_overview(
    admin_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Principal / Admin dashboard summary metrics.
    """
    teachers_count = len((await db.execute(select(Teacher))).scalars().all())
    students_count = len((await db.execute(select(Student))).scalars().all())
    parents_count = len((await db.execute(select(Parent))).scalars().all())
    messages = (await db.execute(select(MessageLog))).scalars().all()
    
    total_messages = len(messages)
    sent_count = sum(1 for m in messages if m.status in ["sent", "delivered", "read"])
    failed_count = sum(1 for m in messages if m.status == "failed")
    queued_count = sum(1 for m in messages if m.status in ["queued", "processing"])

    return {
        "teachers_count": teachers_count,
        "students_count": students_count,
        "parents_count": parents_count,
        "total_messages": total_messages,
        "sent_count": sent_count,
        "failed_count": failed_count,
        "queued_count": queued_count,
    }

@router.get("/teachers")
async def list_all_teachers(
    admin_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    List all teachers with user details and assignment statistics.
    """
    teachers = (await db.execute(
        select(Teacher).options(
            selectinload(Teacher.user),
            selectinload(Teacher.assignments)
        )
    )).scalars().all()

    return [
        {
            "id": t.id,
            "user_id": t.user.id,
            "full_name": t.user.full_name,
            "email": t.user.email,
            "employee_code": t.employee_code,
            "department": t.department,
            "phone": t.phone,
            "assigned_students_count": len(t.assignments),
            "is_active": t.user.is_active,
            "last_login": t.user.last_login
        }
        for t in teachers
    ]

@router.get("/all-students", response_model=List[StudentWithParents])
async def list_all_students(
    admin_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin school-wide view of all students, classes, and parent contacts.
    """
    students_res = await db.execute(
        select(Student).options(
            selectinload(Student.parents).selectinload(StudentParent.parent)
        )
    )
    students = students_res.scalars().all()

    out = []
    for s in students:
        parent_list = [
            ParentResponse(
                id=sp.parent.id,
                full_name=sp.parent.full_name,
                whatsapp_number=sp.parent.whatsapp_number,
                consent_status=sp.parent.consent_status,
                relationship_type=sp.relationship_type
            )
            for sp in s.parents
        ]
        out.append(StudentWithParents(
            id=s.id,
            admission_no=s.admission_no,
            full_name=s.full_name,
            grade=s.grade,
            section=s.section,
            roll_no=s.roll_no,
            parents=parent_list
        ))
    return out

@router.get("/messages", response_model=List[MessageLogResponse])
async def list_all_messages(
    admin_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Centralized monitoring for the Principal to view all school-wide communication logs.
    """
    result = await db.execute(select(MessageLog).order_by(MessageLog.created_at.desc()))
    return result.scalars().all()

