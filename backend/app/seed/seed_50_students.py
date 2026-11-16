import asyncio
import logging
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.core.security import get_password_hash
from app.db.models import User, Teacher, Student, Parent, StudentParent, TeacherStudentAssignment, UserRole, School

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_large_school_data():
    """
    Populates comprehensive realistic school dummy data:
    - 1 Central School
    - 5 Teachers (Mathematics, Science, English, Computer Science, AI & Robotics)
    - 50 Students (Grades 9 & 10, Sections A & B)
    - 50 Parents with valid WhatsApp numbers and active consent
    - Teacher-Student assignments across the 5 subjects
    """
    logger.info("Starting generation of comprehensive dummy data (50 students, 5 subject teachers)...")
    from app.db.session import engine
    from app.db.base import Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 1. School
        res_school = await db.execute(select(School).where(School.school_name == "NextSchool International Academy"))
        school = res_school.scalars().first()
        if not school:
            school = School(
                school_name="NextSchool International Academy",
                official_phone_number="+919876500000",
                waba_id="waba_nextschool_1001",
                phone_number_id="dummy_phone_number_id_999",
                meta_access_token="mock_system_user_token_abc123",
                is_active=True
            )
            db.add(school)
            await db.flush()

        # 2. 5 Subject Teachers (Math, Science, English, Computer, AI)
        teachers_info = [
            {
                "email": "teacher.math@nextschool.internal",
                "name": "Mrs. Ananya Verma",
                "code": "TCH-MTH-01",
                "phone": "+919876510001",
                "dept": "Mathematics",
                "subject": "Mathematics"
            },
            {
                "email": "teacher.science@nextschool.internal",
                "name": "Dr. Rajesh Kumar",
                "code": "TCH-SCI-02",
                "phone": "+919876510002",
                "dept": "Science",
                "subject": "Science"
            },
            {
                "email": "teacher.english@nextschool.internal",
                "name": "Ms. Kavita Sharma",
                "code": "TCH-ENG-03",
                "phone": "+919876510003",
                "dept": "English Language & Lit",
                "subject": "English"
            },
            {
                "email": "teacher.computer@nextschool.internal",
                "name": "Mr. Amit Patel",
                "code": "TCH-CS-04",
                "phone": "+919876510004",
                "dept": "Computer Science",
                "subject": "Computer Science"
            },
            {
                "email": "teacher.ai@nextschool.internal",
                "name": "Dr. Vikram Sengupta",
                "code": "TCH-AI-05",
                "phone": "+919876510005",
                "dept": "Artificial Intelligence & Robotics",
                "subject": "AI & Robotics"
            }
        ]

        teacher_objs = []
        for t_data in teachers_info:
            res = await db.execute(select(User).where(User.email == t_data["email"]))
            user = res.scalars().first()
            if not user:
                user = User(
                    email=t_data["email"],
                    hashed_password=get_password_hash("TeacherPass2026!"),
                    full_name=t_data["name"],
                    role=UserRole.TEACHER,
                    is_active=True
                )
                db.add(user)
                await db.flush()

                teacher = Teacher(
                    school_id=school.id,
                    user_id=user.id,
                    phone=t_data["phone"],
                    employee_code=t_data["code"],
                    department=t_data["dept"]
                )
                db.add(teacher)
                await db.flush()
                teacher_objs.append((teacher, t_data["subject"]))
            else:
                t_res = await db.execute(select(Teacher).where(Teacher.user_id == user.id))
                teacher = t_res.scalars().first()
                if teacher:
                    teacher_objs.append((teacher, t_data["subject"]))

        # 3. 50 Students & 50 Parents Data Generation
        first_names = [
            "Aarav", "Diya", "Rohan", "Ananya", "Kabir", "Isha", "Aditya", "Meera", "Vivaan", "Sanya",
            "Reyansh", "Tanvi", "Arjun", "Pooja", "Dhruv", "Riya", "Karan", "Sneha", "Aryan", "Neha",
            "Dev", "Simran", "Yash", "Khushi", "Varun", "Shruti", "Manav", "Kavya", "Harsh", "Avani",
            "Pranav", "Nisha", "Sameer", "Aditi", "Sahil", "Tanya", "Nikhil", "Bhavna", "Kunal", "Mehak",
            "Rahul", "Divya", "Siddharth", "Payal", "Gaurav", "Anushka", "Mohit", "Aayushi", "Ayush", "Roshni"
        ]

        last_names = [
            "Sharma", "Verma", "Gupta", "Patel", "Mehra", "Singh", "Sen", "Chopra", "Malhotra", "Joshi",
            "Bhatia", "Reddy", "Nair", "Saxena", "Kapoor", "Mishra", "Pandey", "Agarwal", "Dubey", "Yadav"
        ]

        student_objs = []
        for i in range(50):
            fn = first_names[i]
            ln = last_names[i % len(last_names)]
            student_name = f"{fn} {ln}"
            
            # Divide into Grade 10 A/B and Grade 9 A/B
            if i < 15:
                grade, sec = "Grade 10", "A"
            elif i < 30:
                grade, sec = "Grade 10", "B"
            elif i < 40:
                grade, sec = "Grade 9", "A"
            else:
                grade, sec = "Grade 9", "B"

            adm_no = f"NS-2026-{1001 + i}"
            roll_no = f"{101 + (i % 25)}"

            # 1. Upsert Student
            s_res = await db.execute(select(Student).where(Student.admission_no == adm_no))
            student = s_res.scalars().first()
            if not student:
                student = Student(
                    school_id=school.id,
                    admission_no=adm_no,
                    full_name=student_name,
                    grade=grade,
                    section=sec,
                    roll_no=roll_no
                )
                db.add(student)
                await db.flush()
            student_objs.append(student)

            # 2. Upsert Parent
            parent_name = f"Mr. {ln}" if i % 2 == 0 else f"Mrs. {ln}"
            phone_num = f"+9198765{i+1000:04d}" # Generates valid distinct WhatsApp numbers
            rel = "Father" if i % 2 == 0 else "Mother"
            consent = "withdrawn" if i == 49 else "given" # Keep 1 parent as opted-out for test

            p_res = await db.execute(select(Parent).where(Parent.whatsapp_number == phone_num))
            parent = p_res.scalars().first()
            if not parent:
                parent = Parent(
                    full_name=parent_name,
                    whatsapp_number=phone_num,
                    consent_status=consent
                )
                db.add(parent)
                await db.flush()

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

        # 4. Map Teacher-Student Assignments (Subject Wise)
        # Math & Science teach Grade 10 (Students 0 to 29)
        # English teaches all Grade 9 & 10 (Students 0 to 49)
        # Computer Science teaches Grade 9 (Students 30 to 49)
        # AI & Robotics teaches Section A of both grades (Students 0 to 14 & 30 to 39)
        for teacher, subject in teacher_objs:
            target_students = []
            if subject == "Mathematics":
                target_students = student_objs[0:30] # Grade 10 A & B (30 students)
            elif subject == "Science":
                target_students = student_objs[0:30] # Grade 10 A & B (30 students)
            elif subject == "English":
                target_students = student_objs[0:50] # All 50 students
            elif subject == "Computer Science":
                target_students = student_objs[30:50] # Grade 9 A & B (20 students)
            elif subject == "AI & Robotics":
                # Special AI elective class (Section A students)
                target_students = student_objs[0:15] + student_objs[30:40] # 25 students

            for s in target_students:
                assign_check = await db.execute(select(TeacherStudentAssignment).where(
                    TeacherStudentAssignment.teacher_id == teacher.id,
                    TeacherStudentAssignment.student_id == s.id,
                    TeacherStudentAssignment.subject == subject
                ))
                if not assign_check.scalars().first():
                    db.add(TeacherStudentAssignment(
                        teacher_id=teacher.id,
                        student_id=s.id,
                        subject=subject
                    ))

        await db.commit()
        logger.info("Successfully populated 50 Students, 50 Parents and 5 Subject Teachers (Math, Science, English, Computer, AI)!")

if __name__ == "__main__":
    asyncio.run(seed_large_school_data())

