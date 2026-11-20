from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models import User, Teacher, Student, Parent, MessageLog, StudentParent, School
from app.db.schemas import (
    UserResponse,
    StudentWithParents,
    ParentResponse,
    MessageLogResponse,
    AdminTeacherMessageRequest,
    AdminBroadcastRequest,
    BroadcastSummaryResponse
)
from app.api.deps import require_role, verify_csrf
from app.services.whatsapp_service import send_meta_whatsapp_custom_text

router = APIRouter()

TEACHER_NOTICE_TEMPLATES = {
    "call_to_office": {
        "en": "Dear {teacher_name},\nPrincipal Sharma requests your presence in the Principal's Office at {time}.\nPurpose / Agenda: {reason}\n– Principal Office, NextSchool",
        "hi": "आदरणीय {teacher_name},\nप्रधानाचार्य शर्मा ने आपको {time} पर प्रधानाचार्य कार्यालय में उपस्थित होने का अनुरोध किया है।\nविषय: {reason}\n– प्रधानाचार्य कार्यालय, NextSchool"
    },
    "staff_meeting": {
        "en": "Faculty Notice:\nA staff meeting has been scheduled for {time} at {venue}.\nAgenda: {reason}\nAll concerned teaching staff are requested to attend promptly.\n– Principal Sharma, NextSchool",
        "hi": "शिक्षक सूचना:\nदिनांक व समय {time} को {venue} पर एक महत्वपूर्ण स्टाफ बैठक आयोजित की गई है।\nएजेंडा: {reason}\nसभी संबंधित शिक्षकों की उपस्थिति अनिवार्य है।\n– प्रधानाचार्य शर्मा, NextSchool"
    },
    "marks_submission": {
        "en": "Reminder for {teacher_name}:\nPlease ensure the submission and portal entry of student term examination marks by {time}.\nSubject / Class: {reason}\n– Academic Office, NextSchool",
        "hi": "अनुस्मारक सूचना ({teacher_name}):\nकृपया अपनी कक्षाओं के परीक्षा अंक पोर्टल पर {time} तक दर्ज व सत्यापित कराना सुनिश्चित करें।\nकक्षा / विषय: {reason}\n– परीक्षा विभाग, NextSchool"
    },
    "duty_assignment": {
        "en": "Duty Allocation ({teacher_name}):\nYou have been assigned {reason} at {venue} scheduled for {time}. Please report on time.\n– Administration, NextSchool",
        "hi": "ड्यूटी सूचना ({teacher_name}):\nआपको {time} पर {venue} में {reason} हेतु आवंटित किया गया है। कृपया समय पर रिपोर्ट करें।\n– प्रशासन, NextSchool"
    },
    "custom_staff_notice": {
        "en": "NextSchool Staff Notice:\nTo: {teacher_name}\nSubject: {subject}\n\n{custom_message}\n\n– Principal Sharma, NextSchool",
        "hi": "NextSchool शिक्षक परिपत्र:\nप्रेषित: {teacher_name}\nविषय: {subject}\n\n{custom_message}\n\n– प्रधानाचार्य शर्मा, NextSchool"
    }
}

SCHOOL_BROADCAST_TEMPLATES = {
    "holiday_announcement": {
        "en": "NextSchool Official Notification:\nDear Parents & Students,\nThe school will remain closed on {date} on account of {details}.\nRegular classes will resume from {reopen_date}.\n– Principal Sharma, NextSchool",
        "hi": "NextSchool आधिकारिक सूचना:\nआदरणीय अभिभावक एवं विद्यार्थी,\n{details} के उपलक्ष्य में दिनांक {date} को विद्यालय में अवकाश रहेगा।\nनियमित कक्षाएं {reopen_date} से सुचारू रूप से चलेंगी।\n– प्रधानाचार्य शर्मा, NextSchool"
    },
    "emergency_alert": {
        "en": "URGENT SCHOOL ADVISORY:\nDear Parents, due to {details}, the school will {time_slot} today ({date}). All school transport buses will operate with full safety escort.\n– Principal Office, NextSchool",
        "hi": "अति आवश्यक सूचना (Emergency Alert):\nआदरणीय अभिभावक, {details} के कारण विद्यालय आज ({date}) को {time_slot} रहेगा। सभी स्कूल बसें पूरी सुरक्षा के साथ रवाना होंगी।\n– प्रधानाचार्य कार्यालय, NextSchool"
    },
    "ptm_notice": {
        "en": "Dear Parent,\nNextSchool cordially invites you to the Parent-Teacher Meeting (PTM) on {date} from {time_slot} at {venue}.\nAgenda: Discussion on academic growth, term performance, and student wellbeing.\n– Principal Sharma, NextSchool",
        "hi": "आदरणीय अभिभावक,\nNextSchool द्वारा दिनांक {date} को {time_slot} बजे {venue} पर अभिभावक-शिक्षक बैठक (PTM) आयोजित की जा रही है।\nउद्देश्य: विद्यार्थी की शैक्षणिक प्रगति एवं परीक्षा परिणाम पर चर्चा। आपकी उपस्थिति सादर प्रार्थनीय है।\n– NextSchool"
    },
    "exam_schedule": {
        "en": "Important Examination Circular:\nDear Parents, Term Examinations will commence from {date}.\nTimetable, syllabus, and admit cards have been published. Please ensure regular revision and timely reporting.\n– Examination Controller, NextSchool",
        "hi": "महत्वपूर्ण परीक्षा परिपत्र:\nआदरणीय अभिभावक, विद्यालय की सत्र परीक्षाएं दिनांक {date} से प्रारंभ हो रही हैं।\nसमय-सारणी एवं प्रवेश पत्र उपलब्ध करा दिए गए हैं। कृपया विद्यार्थी की तैयारी एवं समय पर उपस्थिति सुनिश्चित करें।\n– परीक्षा विभाग, NextSchool"
    },
    "sports_day_event": {
        "en": "Celebration Invitation:\nDear Parents, NextSchool cordially invites you to celebrate our Annual Sports & Cultural Meet on {date} at {venue} ({time_slot}). Join us in applauding our student achievers!\n– NextSchool Management",
        "hi": "समारोह निमंत्रण:\nआदरणीय अभिभावक, NextSchool के वार्षिक खेलकूद एवं सांस्कृतिक महोत्सव में आप सभी सपरिवार सादर आमंत्रित हैं।\nदिनांक: {date} | समय: {time_slot} | स्थान: {venue}\n– NextSchool प्रबंधन"
    },
    "fee_circular": {
        "en": "Administrative Notice:\nDear Parents, this is a gentle reminder that the upcoming term school fee installment is due by {date}. Kindly complete the online payment via the school portal or accounts office.\n– Accounts Office, NextSchool",
        "hi": "प्रशासनिक सूचना:\nआदरणीय अभिभावक, यह एक विनम्र अनुस्मारक है कि आगामी सत्र की स्कूल फीस जमा करने की अंतिम तिथि {date} है। कृपया समय पर भुगतान पूर्ण करें।\n– लेखा विभाग, NextSchool"
    },
    "custom_announcement": {
        "en": "NextSchool Official Circular:\nSubject: {title}\nDate: {date}\n\n{custom_message}\n\n– Principal Sharma, NextSchool",
        "hi": "NextSchool आधिकारिक परिपत्र:\nविषय: {title}\nदिनांक: {date}\n\n{custom_message}\n\n– प्रधानाचार्य शर्मा, NextSchool"
    }
}

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

@router.post("/teachers/send-message")
async def send_message_to_teachers(
    req: AdminTeacherMessageRequest,
    admin_user: User = Depends(require_role("admin")),
    _csrf: bool = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db)
):
    """
    Principal / Admin can message an individual teacher (call to office, duty, inquiry)
    or broadcast to all teachers / entire departments.
    """
    query = select(Teacher).options(selectinload(Teacher.user))
    if req.target_type == "single":
        if not req.teacher_id:
            raise HTTPException(status_code=400, detail="teacher_id is required for single target")
        query = query.where(Teacher.id == req.teacher_id)
    elif req.target_type == "department":
        if not req.department:
            raise HTTPException(status_code=400, detail="department is required")
        query = query.where(Teacher.department == req.department)
    
    teachers = (await db.execute(query)).scalars().all()
    if not teachers:
        raise HTTPException(status_code=404, detail="No matching teachers found")
    
    school = (await db.execute(select(School))).scalars().first()
    phone_number_id = school.phone_number_id if school else "mock_phone_number_id"
    meta_access_token = school.meta_access_token if school else "mock_meta_access_token"

    lang = req.language if req.language in ["en", "hi"] else "en"
    raw_template = TEACHER_NOTICE_TEMPLATES.get(req.category, {}).get(lang, TEACHER_NOTICE_TEMPLATES["call_to_office"][lang])

    sent_count = 0
    failed_count = 0
    results = []

    for t in teachers:
        target_name = t.user.full_name if t.user else "Faculty Member"
        phone = t.phone or "+919876543210"

        params = {
            "teacher_name": target_name,
            "time": req.scheduled_time or datetime.now().strftime("%I:%M %p today"),
            "venue": req.venue or "Principal's Office",
            "reason": req.reason or "Academic Review & Student Welfare Discussion",
            "subject": req.subject or "Important School Advisory",
            "custom_message": req.custom_message or ""
        }

        try:
            rendered = raw_template.format(**params)
        except Exception:
            rendered = req.custom_message or f"Staff Notice from Principal Office for {target_name}"

        dispatch_res = await send_meta_whatsapp_custom_text(
            phone_number_id=phone_number_id,
            access_token=meta_access_token,
            to_phone_number=phone,
            message_text=rendered
        )

        status_val = dispatch_res.get("status", "sent")
        if status_val in ["sent", "delivered", "read"]:
            sent_count += 1
        else:
            failed_count += 1

        log_entry = MessageLog(
            school_id=school.id if school else None,
            sender_id=admin_user.id,
            teacher_id=t.id,
            recipient_type="teacher",
            recipient_name=target_name,
            recipient_phone=phone,
            template_category=req.category,
            language=lang,
            rendered_message=rendered,
            status=status_val,
            whatsapp_message_id=dispatch_res.get("wamid"),
            error_code=dispatch_res.get("error_code"),
            error_description=dispatch_res.get("error_description"),
            retry_count=0
        )
        db.add(log_entry)
        results.append({
            "teacher_id": t.id,
            "teacher_name": target_name,
            "phone": phone,
            "status": status_val,
            "wamid": dispatch_res.get("wamid")
        })

    await db.commit()
    return {
        "success": True,
        "total_targets": len(teachers),
        "sent_count": sent_count,
        "failed_count": failed_count,
        "recipients": results
    }

@router.post("/broadcasts/send", response_model=BroadcastSummaryResponse)
async def send_school_broadcast(
    req: AdminBroadcastRequest,
    admin_user: User = Depends(require_role("admin")),
    _csrf: bool = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db)
):
    """
    Principal / Admin can broadcast important school announcements (holidays, emergencies,
    PTMs, exam schedules, custom circulars) to all students/parents or filtered by Grade/Section.
    """
    query = select(Student).options(selectinload(Student.parents).selectinload(StudentParent.parent))
    if req.target_audience == "grade" and req.target_grade:
        query = query.where(Student.grade == req.target_grade)
    elif req.target_audience == "section" and req.target_grade and req.target_section:
        query = query.where(Student.grade == req.target_grade, Student.section == req.target_section)
    
    students = (await db.execute(query)).scalars().all()
    if not students:
        raise HTTPException(status_code=404, detail="No students found matching target criteria")

    school = (await db.execute(select(School))).scalars().first()
    phone_number_id = school.phone_number_id if school else "mock_phone_number_id"
    meta_access_token = school.meta_access_token if school else "mock_meta_access_token"

    lang = req.language if req.language in ["en", "hi"] else "en"
    raw_template = SCHOOL_BROADCAST_TEMPLATES.get(req.category, {}).get(lang, SCHOOL_BROADCAST_TEMPLATES["custom_announcement"][lang])

    now = datetime.now()
    params = {
        "title": req.title or "School Announcement",
        "date": req.date or now.strftime("%d-%b-%Y"),
        "reopen_date": req.reopen_date or "Next Working Day",
        "time_slot": req.time_slot or "09:00 AM – 12:30 PM",
        "venue": req.venue or "Main School Auditorium / Classrooms",
        "details": req.details or "Administrative order / festive celebration",
        "custom_message": req.custom_message or ""
    }

    try:
        sample_rendered = raw_template.format(**params)
    except Exception:
        sample_rendered = req.custom_message or req.title or "NextSchool Broadcast"

    sent_count = 0
    failed_count = 0
    skipped_consent = 0
    contacted_parents = set()

    for s in students:
        for sp in s.parents:
            p = sp.parent
            if p.id in contacted_parents:
                continue

            if p.consent_status != "given":
                skipped_consent += 1
                continue

            contacted_parents.add(p.id)

            dispatch_res = await send_meta_whatsapp_custom_text(
                phone_number_id=phone_number_id,
                access_token=meta_access_token,
                to_phone_number=p.whatsapp_number,
                message_text=sample_rendered
            )

            status_val = dispatch_res.get("status", "sent")
            if status_val in ["sent", "delivered", "read"]:
                sent_count += 1
            else:
                failed_count += 1

            log_entry = MessageLog(
                school_id=school.id if school else None,
                sender_id=admin_user.id,
                student_id=s.id,
                parent_id=p.id,
                recipient_type="school_broadcast",
                recipient_name=p.full_name,
                recipient_phone=p.whatsapp_number,
                template_category=req.category,
                language=lang,
                rendered_message=sample_rendered,
                status=status_val,
                whatsapp_message_id=dispatch_res.get("wamid"),
                error_code=dispatch_res.get("error_code"),
                error_description=dispatch_res.get("error_description"),
                retry_count=0
            )
            db.add(log_entry)

    await db.commit()

    return BroadcastSummaryResponse(
        total_target_students=len(students),
        total_parents_contacted=len(contacted_parents),
        skipped_withdrawn_consent=skipped_consent,
        sent_count=sent_count,
        failed_count=failed_count,
        broadcast_title=req.title or req.category.replace("_", " ").title(),
        category=req.category,
        preview_message=sample_rendered
    )


