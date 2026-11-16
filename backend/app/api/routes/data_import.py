import csv
import io
import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.db.models import User, Teacher, Student, Parent, StudentParent, TeacherStudentAssignment, UserRole, School
from app.api.deps import require_role
from app.core.security import get_password_hash

router = APIRouter()

@router.post("/import-students-csv")
async def import_students_csv(
    file: UploadFile = File(...),
    admin_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Imports real school students and parents from a CSV file.
    Expected CSV columns:
    admission_no, full_name, grade, section, roll_no, parent_name, parent_whatsapp, relationship, consent
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are accepted.")

    contents = await file.read()
    decoded = contents.decode("utf-8-sig") # handles UTF-8 with BOM from Excel
    reader = csv.DictReader(io.StringIO(decoded))

    required_headers = {"admission_no", "full_name", "grade", "section", "parent_name", "parent_whatsapp"}
    if not required_headers.issubset(set(reader.fieldnames or [])):
        raise HTTPException(
            status_code=400,
            detail=f"CSV missing mandatory columns. Required: {', '.join(required_headers)}"
        )

    # Get school
    school = (await db.execute(select(School))).scalars().first()

    imported_students = 0
    imported_parents = 0

    for row in reader:
        adm = row.get("admission_no", "").strip()
        s_name = row.get("full_name", "").strip()
        grade = row.get("grade", "").strip()
        sec = row.get("section", "").strip()
        roll = row.get("roll_no", "").strip()
        
        p_name = row.get("parent_name", "").strip()
        p_phone = row.get("parent_whatsapp", "").strip()
        rel = row.get("relationship", "Guardian").strip()
        consent = row.get("consent", "given").strip().lower()

        if not adm or not s_name or not p_phone:
            continue

        # Format phone to ensure standard format
        if not p_phone.startswith("+"):
            p_phone = "+" + p_phone

        # 1. Upsert Student
        s_res = await db.execute(select(Student).where(Student.admission_no == adm))
        student = s_res.scalars().first()
        if not student:
            student = Student(
                school_id=school.id if school else None,
                admission_no=adm,
                full_name=s_name,
                grade=grade,
                section=sec,
                roll_no=roll
            )
            db.add(student)
            await db.flush()
            imported_students += 1
        else:
            student.full_name = s_name
            student.grade = grade
            student.section = sec
            student.roll_no = roll

        # 2. Upsert Parent
        p_res = await db.execute(select(Parent).where(Parent.whatsapp_number == p_phone))
        parent = p_res.scalars().first()
        if not parent:
            parent = Parent(
                full_name=p_name,
                whatsapp_number=p_phone,
                consent_status="given" if consent in ["given", "yes", "true", "active"] else "withdrawn"
            )
            db.add(parent)
            await db.flush()
            imported_parents += 1
        else:
            parent.full_name = p_name
            parent.consent_status = "given" if consent in ["given", "yes", "true", "active"] else "withdrawn"

        # 3. Link Student <-> Parent
        sp_res = await db.execute(select(StudentParent).where(
            StudentParent.student_id == student.id,
            StudentParent.parent_id == parent.id
        ))
        if not sp_res.scalars().first():
            db.add(StudentParent(
                student_id=student.id,
                parent_id=parent.id,
                relationship_type=rel
            ))

    await db.commit()
    return {
        "success": True,
        "message": f"Successfully processed CSV. Added/Updated {imported_students} students and {imported_parents} parent contacts."
    }

@router.post("/import-teachers-csv")
async def import_teachers_csv(
    file: UploadFile = File(...),
    admin_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Imports real teachers from CSV and auto-creates their login accounts.
    Expected CSV columns:
    employee_code, full_name, email, phone, department, temp_password
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are accepted.")

    contents = await file.read()
    decoded = contents.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(decoded))

    required_headers = {"employee_code", "full_name", "email"}
    if not required_headers.issubset(set(reader.fieldnames or [])):
        raise HTTPException(
            status_code=400,
            detail=f"CSV missing mandatory columns. Required: {', '.join(required_headers)}"
        )

    school = (await db.execute(select(School))).scalars().first()
    imported_count = 0

    for row in reader:
        code = row.get("employee_code", "").strip()
        name = row.get("full_name", "").strip()
        email = row.get("email", "").strip().lower()
        phone = row.get("phone", "").strip()
        dept = row.get("department", "General").strip()
        raw_pass = row.get("temp_password", "").strip() or "NextSchool2026!"

        if not code or not email or not name:
            continue

        # 1. Check User
        u_res = await db.execute(select(User).where(User.email == email))
        user = u_res.scalars().first()
        if not user:
            user = User(
                email=email,
                hashed_password=get_password_hash(raw_pass),
                full_name=name,
                role=UserRole.TEACHER,
                is_active=True
            )
            db.add(user)
            await db.flush()

            teacher = Teacher(
                school_id=school.id if school else None,
                user_id=user.id,
                phone=phone,
                employee_code=code,
                department=dept
            )
            db.add(teacher)
            imported_count += 1
        else:
            user.full_name = name
            t_res = await db.execute(select(Teacher).where(Teacher.user_id == user.id))
            teacher = t_res.scalars().first()
            if teacher:
                teacher.phone = phone
                teacher.employee_code = code
                teacher.department = dept

    await db.commit()
    return {
        "success": True,
        "message": f"Successfully processed Teachers CSV. Created/Updated {imported_count} teacher accounts."
    }

@router.post("/import-assignments-csv")
async def import_assignments_csv(
    file: UploadFile = File(...),
    admin_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Imports teacher-student assignments from CSV.
    Expected CSV columns:
    employee_code, admission_no, subject
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are accepted.")

    contents = await file.read()
    decoded = contents.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(decoded))

    required_headers = {"employee_code", "admission_no"}
    if not required_headers.issubset(set(reader.fieldnames or [])):
        raise HTTPException(
            status_code=400,
            detail="CSV missing required headers: employee_code, admission_no"
        )

    assigned_count = 0
    for row in reader:
        code = row.get("employee_code", "").strip()
        adm = row.get("admission_no", "").strip()
        subj = row.get("subject", "Class Teacher").strip()

        if not code or not adm:
            continue

        t_res = await db.execute(select(Teacher).where(Teacher.employee_code == code))
        teacher = t_res.scalars().first()

        s_res = await db.execute(select(Student).where(Student.admission_no == adm))
        student = s_res.scalars().first()

        if teacher and student:
            assign_check = await db.execute(select(TeacherStudentAssignment).where(
                TeacherStudentAssignment.teacher_id == teacher.id,
                TeacherStudentAssignment.student_id == student.id
            ))
            if not assign_check.scalars().first():
                db.add(TeacherStudentAssignment(
                    teacher_id=teacher.id,
                    student_id=student.id,
                    subject=subj
                ))
                assigned_count += 1

    await db.commit()
    return {
        "success": True,
        "message": f"Successfully mapped {assigned_count} teacher-student assignments."
    }

