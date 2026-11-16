from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models import User, Teacher, Student, Parent, StudentParent, TeacherStudentAssignment, MessageLog, School
from app.db.schemas import StudentWithParents, ParentResponse, MessageSendRequest, MessageLogResponse
from app.api.deps import require_role, verify_csrf
from app.services.whatsapp_service import send_meta_whatsapp_template

router = APIRouter()

TEMPLATES = {
    "student_absent_today": {
        "en": "Dear {parent_name}, We would like to inform you that {student_name} was absent from school on {date} ({day_of_week}).",
        "hi": "नमस्ते {parent_name}, हम आपको सूचित करना चाहते हैं कि {student_name} आज {date} ({day_of_week}) को विद्यालय में अनुपस्थित थे।"
    },
    "improper_uniform": {
        "en": "Dear {parent_name}, {student_name} was observed wearing an improper uniform on {date} ({day_of_week}). Please ensure the school uniform guidelines are followed. – NextSchool",
        "hi": "नमस्ते {parent_name}, {student_name} को आज {date} को उचित स्कूल यूनिफॉर्म में नहीं पाया गया। कृपया विद्यालय के नियमों का पालन सुनिश्चित करें। – NextSchool"
    },
    "misbehaviour_complaint": {
        "en": "Dear {parent_name}, on {date} ({day_of_week}) {student_name} was involved in a behaviour incident: \"{incident_description}\". We request your cooperation in addressing this matter. – NextSchool",
        "hi": "नमस्ते {parent_name}, आज {date} को {student_name} के संबंध में एक अनुशासनहीनता की घटना ध्यान में आई है: \"{incident_description}\"। कृपया सहयोग करें। – NextSchool"
    },
    "incomplete_homework": {
        "en": "Dear {parent_name}, {student_name} has not submitted the homework for {subject} ({date}). Please ensure it is completed by the next class. – NextSchool",
        "hi": "नमस्ते {parent_name}, {student_name} ने {subject} का गृहकार्य ({date}) जमा नहीं किया है। कृपया अगली कक्षा तक पूरा कराएं। – NextSchool"
    },
    "good_behaviour": {
        "en": "Dear {parent_name}, we are pleased to inform you that {student_name} displayed excellent behaviour on {date}. Keep encouraging this positive attitude! – NextSchool",
        "hi": "नमस्ते {parent_name}, हमें यह बताते हुए खुशी हो रही है कि {student_name} ने आज {date} को उत्कृष्ट व्यवहार और आचरण दिखाया। – NextSchool"
    },
    "weekly_growth_report": {
        "en": "Dear {parent_name}, here is the weekly progress report for {student_name} (Week {week_number}): Attendance: {attendance_percentage}%. Highlights: {highlights}. – NextSchool",
        "hi": "नमस्ते {parent_name}, {student_name} की साप्ताहिक प्रगति रिपोर्ट (सप्ताह {week_number}): उपस्थिति: {attendance_percentage}%. – NextSchool"
    }
}

@router.get("/my-students", response_model=List[StudentWithParents])
async def get_my_assigned_students(
    current_teacher_user: User = Depends(require_role("teacher")),
    db: AsyncSession = Depends(get_db)
):
    """
    Teacher authorization check: Retrieve ONLY students explicitly assigned to this teacher.
    """
    teacher_res = await db.execute(select(Teacher).where(Teacher.user_id == current_teacher_user.id))
    teacher = teacher_res.scalars().first()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found")

    assignments_res = await db.execute(
        select(TeacherStudentAssignment)
        .where(TeacherStudentAssignment.teacher_id == teacher.id)
        .options(
            selectinload(TeacherStudentAssignment.student)
            .selectinload(Student.parents)
            .selectinload(StudentParent.parent)
        )
    )
    assignments = assignments_res.scalars().all()

    students_out = []
    for a in assignments:
        s = a.student
        parent_list = []
        for sp in s.parents:
            p = sp.parent
            parent_list.append(ParentResponse(
                id=p.id,
                full_name=p.full_name,
                whatsapp_number=p.whatsapp_number,
                consent_status=p.consent_status,
                relationship_type=sp.relationship_type
            ))
        students_out.append(StudentWithParents(
            id=s.id,
            admission_no=s.admission_no,
            full_name=s.full_name,
            grade=s.grade,
            section=s.section,
            roll_no=s.roll_no,
            parents=parent_list
        ))

    return students_out

@router.post("/send-notification", response_model=MessageLogResponse)
async def send_teacher_notification(
    msg_data: MessageSendRequest,
    current_teacher_user: User = Depends(require_role("teacher")),
    _csrf: bool = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db)
):
    """
    1. Verify Student is assigned to this teacher.
    2. Verify Parent is linked to this student.
    3. Verify Parent has active consent ('given').
    4. Fetch Centralized School WhatsApp credentials.
    5. Dispatch via Meta WhatsApp Cloud API.
    6. Record into MessageLog.
    """
    teacher_res = await db.execute(select(Teacher).where(Teacher.user_id == current_teacher_user.id))
    teacher = teacher_res.scalars().first()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found")

    # 1. Authorization: check assignment
    assign_check = await db.execute(
        select(TeacherStudentAssignment).where(
            TeacherStudentAssignment.teacher_id == teacher.id,
            TeacherStudentAssignment.student_id == msg_data.student_id
        )
    )
    if not assign_check.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: You can only communicate regarding students assigned to you."
        )

    # 2. Check student and parent link
    sp_res = await db.execute(
        select(StudentParent).where(
            StudentParent.student_id == msg_data.student_id,
            StudentParent.parent_id == msg_data.parent_id
        ).options(
            selectinload(StudentParent.student),
            selectinload(StudentParent.parent)
        )
    )
    sp = sp_res.scalars().first()
    if not sp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Specified parent is not associated with this student."
        )

    student = sp.student
    parent = sp.parent

    # 3. Consent check
    if parent.consent_status != "given":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot send message: Parent consent status is '{parent.consent_status}'."
        )

    # 4. Template validation
    cat = msg_data.template_category
    if cat not in TEMPLATES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid template category: {cat}")
    
    lang = msg_data.language if msg_data.language in ["en", "hi"] else "en"
    raw_template = TEMPLATES[cat].get(lang, TEMPLATES[cat]["en"])

    now = datetime.now()
    default_params = {
        "parent_name": parent.full_name,
        "student_name": student.full_name,
        "date": now.strftime("%d-%b-%Y"),
        "day_of_week": now.strftime("%A"),
        "subject": msg_data.custom_params.get("subject", "Classwork"),
        "incident_description": msg_data.custom_params.get("incident_description", "Classroom disruption"),
        "week_number": now.strftime("%W"),
        "attendance_percentage": "95",
        "highlights": "Excellent participation in class discussions"
    }
    default_params.update(msg_data.custom_params or {})

    try:
        rendered_message = raw_template.format(**default_params)
    except KeyError:
        rendered_message = raw_template

    # 5. Fetch School's Central WhatsApp Credentials
    school_id = teacher.school_id
    school = None
    if school_id:
        school = (await db.execute(select(School).where(School.id == school_id))).scalars().first()
    if not school:
        school = (await db.execute(select(School))).scalars().first()

    phone_number_id = school.phone_number_id if school else "mock_phone_number_id"
    meta_access_token = school.meta_access_token if school else "mock_meta_access_token"

    # 6. Dispatch via Centralized WhatsApp Service
    dispatch_res = await send_meta_whatsapp_template(
        phone_number_id=phone_number_id,
        access_token=meta_access_token,
        to_phone_number=parent.whatsapp_number,
        template_name=cat,
        language_code=lang,
        template_parameters=[parent.full_name, student.full_name, now.strftime("%d-%b-%Y")]
    )

    # 7. Queue message log
    message_log = MessageLog(
        school_id=school.id if school else None,
        sender_id=current_teacher_user.id,
        student_id=student.id,
        parent_id=parent.id,
        template_category=cat,
        language=lang,
        rendered_message=rendered_message,
        status=dispatch_res.get("status", "sent"),
        whatsapp_message_id=dispatch_res.get("wamid"),
        error_code=dispatch_res.get("error_code"),
        error_description=dispatch_res.get("error_description"),
        retry_count=0
    )
    db.add(message_log)
    await db.commit()
    await db.refresh(message_log)

    return message_log

@router.get("/message-history", response_model=List[MessageLogResponse])
async def get_teacher_message_history(
    current_teacher_user: User = Depends(require_role("teacher")),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns message history sent by this teacher.
    """
    result = await db.execute(
        select(MessageLog)
        .where(MessageLog.sender_id == current_teacher_user.id)
        .order_by(MessageLog.created_at.desc())
    )
    return result.scalars().all()
