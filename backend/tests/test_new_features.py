import httpx

def test_custom_and_broadcast_features():
    client = httpx.Client(base_url="http://localhost:8000/api/v1", timeout=15.0)

    # 1. Admin Login
    res = client.post("/auth/login", json={"email": "admin@nextschool.internal", "password": "AdminSecurePass2026!"})
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    csrf = client.cookies.get("ns_csrf_token")
    headers = {"X-CSRF-Token": csrf}

    # 2. Admin messaging all teachers
    res_t = client.post("/admin/teachers/send-message", json={
        "target_type": "all",
        "category": "staff_meeting",
        "language": "en",
        "scheduled_time": "Today at 3:30 PM",
        "venue": "Staff Conference Room",
        "reason": "CBSE evaluation schedule and periodic tests review"
    }, headers=headers)
    assert res_t.status_code == 200, f"Teacher broadcast failed: {res_t.text}"
    t_data = res_t.json()
    print("Teacher broadcast dispatched:", t_data.get("sent_count"), "teachers reached.")
    assert t_data.get("sent_count") > 0

    # 3. Admin School-wide Holiday Broadcast
    res_b = client.post("/admin/broadcasts/send", json={
        "target_audience": "all",
        "category": "holiday_announcement",
        "language": "hi",
        "title": "Monsoon Heavy Rain Holiday Alert",
        "date": "21-Nov-2026",
        "reopen_date": "23-Nov-2026",
        "details": "heavy monsoon rainfall and administrative orders"
    }, headers=headers)
    assert res_b.status_code == 200, f"School broadcast failed: {res_b.text}"
    b_data = res_b.json()
    print("School broadcast dispatched:", b_data.get("sent_count"), "parents reached.")
    assert b_data.get("sent_count") > 0

    # 4. Teacher Login & Send Custom Message
    t_client = httpx.Client(base_url="http://localhost:8000/api/v1", timeout=15.0)
    t_login = t_client.post("/auth/login", json={"email": "teacher1@nextschool.internal", "password": "TeacherSecurePass2026!"})
    assert t_login.status_code == 200, f"Teacher login failed: {t_login.text}"
    t_csrf = t_client.cookies.get("ns_csrf_token")
    t_headers = {"X-CSRF-Token": t_csrf}

    # Get teacher's assigned students
    students_res = t_client.get("/teachers/my-students")
    assert students_res.status_code == 200
    students = students_res.json()
    assert len(students) > 0
    target_student = students[0]
    target_parent = target_student["parents"][0]

    # Send Custom Message
    custom_res = t_client.post("/teachers/send-notification", json={
        "student_id": target_student["id"],
        "parent_id": target_parent["id"],
        "template_category": "custom_message",
        "language": "hi",
        "custom_message": "कृपया विद्यार्थी की विज्ञान प्रोजेक्ट फाइल कल समय पर स्कूल भेजें।"
    }, headers=t_headers)
    assert custom_res.status_code == 200, f"Custom notification failed: {custom_res.text}"
    custom_data = custom_res.json()
    print("Custom Teacher Message dispatched:", custom_data.get("rendered_message"))
    assert "विज्ञान प्रोजेक्ट" in custom_data.get("rendered_message")

    print("\nALL NEW FEATURES TESTED AND VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    test_custom_and_broadcast_features()
