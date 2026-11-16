import pytest
from app.core.security import get_password_hash
from app.db.models import User, Teacher, Student, Parent, StudentParent, TeacherStudentAssignment, UserRole

@pytest.mark.asyncio
async def test_health_check(client):
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_login_logout_flow(client, db_session):
    # Create test admin
    user = User(
        email="admin_test@nextschool.internal",
        hashed_password=get_password_hash("SecretPass123!"),
        full_name="Admin Test",
        role=UserRole.ADMIN,
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()

    # 1. Login with incorrect password
    bad_res = await client.post("/api/v1/auth/login", json={
        "email": "admin_test@nextschool.internal",
        "password": "WrongPassword"
    })
    assert bad_res.status_code == 401

    # 2. Login with correct password
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "admin_test@nextschool.internal",
        "password": "SecretPass123!"
    })
    assert login_res.status_code == 200
    data = login_res.json()
    assert data["role"] == "admin"
    assert "access_token" in data

    # Check cookies
    cookies = login_res.cookies
    assert "ns_access_token" in cookies
    assert "ns_csrf_token" in cookies

    # 3. Check /me with authenticated cookie
    me_res = await client.get("/api/v1/auth/me", cookies=cookies)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "admin_test@nextschool.internal"

    # 4. Logout
    logout_res = await client.post("/api/v1/auth/logout", cookies=cookies)
    assert logout_res.status_code == 200

@pytest.mark.asyncio
async def test_rbac_teacher_vs_admin_permissions(client, db_session):
    # Setup Teacher
    teacher_user = User(
        email="teacher_test@nextschool.internal",
        hashed_password=get_password_hash("TeacherPass123!"),
        full_name="Teacher One",
        role=UserRole.TEACHER,
        is_active=True
    )
    db_session.add(teacher_user)
    await db_session.flush()

    teacher_profile = Teacher(
        user_id=teacher_user.id,
        phone="+919876543210",
        employee_code="TCH-TEST",
        department="English"
    )
    db_session.add(teacher_profile)
    await db_session.commit()

    # Login as Teacher
    t_login = await client.post("/api/v1/auth/login", json={
        "email": "teacher_test@nextschool.internal",
        "password": "TeacherPass123!"
    })
    teacher_cookies = t_login.cookies

    # 1. Teacher attempts to access Admin Overview -> Forbidden (403)
    admin_access = await client.get("/api/v1/admin/overview", cookies=teacher_cookies)
    assert admin_access.status_code == 403

    # 2. Teacher can access /teachers/my-students
    t_students = await client.get("/api/v1/teachers/my-students", cookies=teacher_cookies)
    assert t_students.status_code == 200
    assert isinstance(t_students.json(), list)

@pytest.mark.asyncio
async def test_teacher_student_assignment_authorization(client, db_session):
    # Create Teacher 1 and Teacher 2
    t1_user = User(
        email="t1@nextschool.internal",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Teacher 1",
        role=UserRole.TEACHER
    )
    t2_user = User(
        email="t2@nextschool.internal",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Teacher 2",
        role=UserRole.TEACHER
    )
    db_session.add_all([t1_user, t2_user])
    await db_session.flush()

    t1 = Teacher(user_id=t1_user.id, employee_code="T1", department="Math")
    t2 = Teacher(user_id=t2_user.id, employee_code="T2", department="Science")
    db_session.add_all([t1, t2])

    # Create Student A and Parent A
    s_a = Student(admission_no="NS-A", full_name="Student A", grade="10", section="A")
    p_a = Parent(full_name="Parent A", whatsapp_number="+919999999999", consent_status="given")
    db_session.add_all([s_a, p_a])
    await db_session.flush()

    db_session.add(StudentParent(student_id=s_a.id, parent_id=p_a.id, relationship_type="Father"))
    # Assign Student A ONLY to Teacher 1
    db_session.add(TeacherStudentAssignment(teacher_id=t1.id, student_id=s_a.id, subject="Math"))
    await db_session.commit()

    # Login as Teacher 2 (who is NOT assigned to Student A)
    t2_login = await client.post("/api/v1/auth/login", json={
        "email": "t2@nextschool.internal",
        "password": "Pass123!"
    })
    t2_cookies = t2_login.cookies
    t2_token = t2_login.json()["access_token"]

    # Teacher 2 attempts to send a notification regarding Student A -> 403 Forbidden!
    unauth_send = await client.post(
        "/api/v1/teachers/send-notification",
        json={
            "student_id": s_a.id,
            "parent_id": p_a.id,
            "template_category": "student_absent_today",
            "language": "en"
        },
        headers={"Authorization": f"Bearer {t2_token}"}
    )
    assert unauth_send.status_code == 403
    assert "Unauthorized" in unauth_send.json()["detail"]

    # Login as Teacher 1 (assigned)
    t1_login = await client.post("/api/v1/auth/login", json={
        "email": "t1@nextschool.internal",
        "password": "Pass123!"
    })
    t1_token = t1_login.json()["access_token"]

    # Teacher 1 sends notification regarding Student A -> 200 OK!
    auth_send = await client.post(
        "/api/v1/teachers/send-notification",
        json={
            "student_id": s_a.id,
            "parent_id": p_a.id,
            "template_category": "student_absent_today",
            "language": "en"
        },
        headers={"Authorization": f"Bearer {t1_token}"}
    )
    assert auth_send.status_code == 200
    assert auth_send.json()["status"] == "sent"

