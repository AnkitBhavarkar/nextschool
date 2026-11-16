import asyncio
import logging
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.core.security import get_password_hash
from app.db.models import User, Teacher, Student, Parent, StudentParent, TeacherStudentAssignment, UserRole, School

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_development_data():
    """
    Repeatable development-only seed script.
    Populates:
    - 1 Central School record with WhatsApp Business API configuration
    - 2 Teachers (Verma & Sharma)
    - 5 Students across Grade 9 & 10
    - 6 Parents with valid WhatsApp numbers (+91...) and consent
    - Teacher-Student assignments
    """
    logger.info("Starting development mock data seeding...")
    from app.db.session import engine
    from app.db.base import Base

    # Ensure tables are created first
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 1. School & Central WhatsApp Configuration
        res_school = await db.execute(select(School).where(School.school_name == "NextSchool International"))
        school = res_school.scalars().first()
        if not school:
            school = School(
                school_name="NextSchool International",
                official_phone_number="+919876500000",
                waba_id="waba_nextschool_1001",
                phone_number_id="dummy_phone_number_id_999",
                meta_access_token="mock_system_user_token_abc123",
                is_active=True
            )
            db.add(school)
            await db.flush()
            logger.info("Created Central School record with WhatsApp Cloud API configuration.")

        # 2. Teachers
        teachers_data = [
            {
                "email": "teacher1@nextschool.internal",
                "name": "Mrs. Ananya Verma",
                "password": "TeacherSecurePass2026!",
                "code": "TCH-001",
                "phone": "+919876543210",
                "dept": "Mathematics"
            },
            {
                "email": "teacher2@nextschool.internal",
                "name": "Mr. Rajesh Kumar",
                "password": "TeacherSecurePass2026!",
                "code": "TCH-002",
                "phone": "+919876543211",
                "dept": "Science"
            }
        ]

        teachers_objs = []
        for t_info in teachers_data:
            res = await db.execute(select(User).where(User.email == t_info["email"]))
            user = res.scalars().first()
            if not user:
                user = User(
                    email=t_info["email"],
                    hashed_password=get_password_hash(t_info["password"]),
                    full_name=t_info["name"],
                    role=UserRole.TEACHER,
                    is_active=True
                )
                db.add(user)
                await db.flush()

                teacher = Teacher(
                    school_id=school.id,
                    user_id=user.id,
                    phone=t_info["phone"],
                    employee_code=t_info["code"],
                    department=t_info["dept"]
                )
                db.add(teacher)
                await db.flush()
                teachers_objs.append(teacher)
            else:
                t_res = await db.execute(select(Teacher).where(Teacher.user_id == user.id))
                teacher = t_res.scalars().first()
                if teacher:
                    teachers_objs.append(teacher)

        # 3. Students
        students_data = [
            {"adm": "NS-2026-101", "name": "Aarav Gupta", "grade": "Grade 10", "section": "A", "roll": "1001"},
            {"adm": "NS-2026-102", "name": "Diya Patel", "grade": "Grade 10", "section": "A", "roll": "1002"},
            {"adm": "NS-2026-103", "name": "Rohan Mehra", "grade": "Grade 10", "section": "B", "roll": "1003"},
            {"adm": "NS-2026-104", "name": "Ananya Sen", "grade": "Grade 9", "section": "A", "roll": "901"},
            {"adm": "NS-2026-105", "name": "Kabir Singh", "grade": "Grade 9", "section": "B", "roll": "902"},
        ]

        student_objs = []
        for s_info in students_data:
            res = await db.execute(select(Student).where(Student.admission_no == s_info["adm"]))
            s = res.scalars().first()
            if not s:
                s = Student(
                    school_id=school.id,
                    admission_no=s_info["adm"],
                    full_name=s_info["name"],
                    grade=s_info["grade"],
                    section=s_info["section"],
                    roll_no=s_info["roll"]
                )
                db.add(s)
                await db.flush()
            student_objs.append(s)

        # 4. Parents
        parents_data = [
            {"name": "Sanjay Gupta", "whatsapp": "+919811111111", "consent": "given"},
            {"name": "Sunita Gupta", "whatsapp": "+919811111112", "consent": "given"},
            {"name": "Vikram Patel", "whatsapp": "+919822222222", "consent": "given"},
            {"name": "Pooja Mehra", "whatsapp": "+919833333333", "consent": "given"},
            {"name": "Subhash Sen", "whatsapp": "+919844444444", "consent": "given"},
            {"name": "Gurpreet Singh", "whatsapp": "+919855555555", "consent": "withdrawn"}, # Test opt-out safeguard
        ]

        parent_objs = []
        for p_info in parents_data:
            res = await db.execute(select(Parent).where(Parent.whatsapp_number == p_info["whatsapp"]))
            p = res.scalars().first()
            if not p:
                p = Parent(
                    full_name=p_info["name"],
                    whatsapp_number=p_info["whatsapp"],
                    consent_status=p_info["consent"]
                )
                db.add(p)
                await db.flush()
            parent_objs.append(p)

        # 5. Link Student -> Parents
        links = [
            (student_objs[0], parent_objs[0], "Father"),
            (student_objs[0], parent_objs[1], "Mother"),
            (student_objs[1], parent_objs[2], "Father"),
            (student_objs[2], parent_objs[3], "Mother"),
            (student_objs[3], parent_objs[4], "Father"),
            (student_objs[4], parent_objs[5], "Father"),
        ]

        for s, p, rel in links:
            sp_check = await db.execute(select(StudentParent).where(
                StudentParent.student_id == s.id,
                StudentParent.parent_id == p.id
            ))
            if not sp_check.scalars().first():
                db.add(StudentParent(student_id=s.id, parent_id=p.id, relationship_type=rel))

        # 6. Link Teacher -> Students (Assignment)
        if len(teachers_objs) >= 2:
            t1 = teachers_objs[0]
            t2 = teachers_objs[1]

            for s in [student_objs[0], student_objs[1], student_objs[2]]:
                assign_check = await db.execute(select(TeacherStudentAssignment).where(
                    TeacherStudentAssignment.teacher_id == t1.id,
                    TeacherStudentAssignment.student_id == s.id
                ))
                if not assign_check.scalars().first():
                    db.add(TeacherStudentAssignment(teacher_id=t1.id, student_id=s.id, subject="Mathematics"))

            for s in [student_objs[3], student_objs[4]]:
                assign_check = await db.execute(select(TeacherStudentAssignment).where(
                    TeacherStudentAssignment.teacher_id == t2.id,
                    TeacherStudentAssignment.student_id == s.id
                ))
                if not assign_check.scalars().first():
                    db.add(TeacherStudentAssignment(teacher_id=t2.id, student_id=s.id, subject="Science"))

        await db.commit()
        logger.info("Successfully seeded development mock data with School Central WhatsApp configuration!")

if __name__ == "__main__":
    asyncio.run(seed_development_data())
