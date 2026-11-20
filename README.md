# NextSchool – WhatsApp Communication Management Platform

A production-ready WhatsApp communication management system for **NextSchool**, built with **FastAPI (Python)**, **PostgreSQL/SQLite (SQLAlchemy & Asyncpg/Aiosqlite)**, and **React + Vite + TypeScript (Ant Design)**.

---

## 🌟 Key Features

1. **Teacher Dashboard**:
   - Secure login and authenticated session via HttpOnly cookies and JWT.
   - Enforced restriction: Teachers see **only their assigned students**.
   - Student details & parent WhatsApp contacts with real-time consent badges.
   - **Predefined & Custom WhatsApp Messages**:
     - 6 Standard School Templates (Absent, Improper Uniform, Homework, Misbehaviour, Good Behaviour, Weekly Growth).
     - **Custom Message (विशेष संदेश)**: Write free-form messages with quick suggestions (Practical file, test signature, consent slip, etc.).
     - **Parent Meeting Request (मिलने का अनुरोध)**.
     - **Diary / Class Note (डायरी नोट)**.
     - **Health / Sick Bay Alert (स्वास्थ्य सूचना)**.
   - Bilingual support: **English** and **Hindi (हिंदी)** with live formatted preview.

2. **Principal / Admin Dashboard**:
   - **Teacher Direct Calling & Staff Notice**:
     - Directly message an individual teacher to call them to the Principal's office (with time, reason, venue).
     - Broadcast staff meetings, exam duty assignments, and syllabus deadlines to all teachers or by department.
   - **School-Wide Broadcast Hub (स्कूल प्रसारण केंद्र)**:
     - Target Audience: Entire School (All Students), by Grade (e.g. Grade 10, Grade 9), or by Section.
     - 🏖️ **School Holiday Announcements** (Rain alerts, administrative orders, festival holidays, reopening dates).
     - ⚠️ **Emergency Weather / Early Dispersal Alerts**.
     - 🤝 **Parent-Teacher Meeting (PTM) Circulars**.
     - 📝 **Term Examination Timetable & Revision Notices**.
     - 🏆 **Annual Sports Day & Cultural Fest Invitations**.
     - 💳 **Fee Installment Administrative Circulars**.
     - ✍️ **Custom Official Circulars** (Free-form custom announcements).
     - Live WhatsApp chat bubble preview with consent enforcement.
   - Centralized monitoring of all school-wide communication logs and delivery metrics.

3. **Security & Data Safeguards**:
   - **Argon2 / BCrypt** password hashing.
   - **HttpOnly JWT cookies** (preventing XSS access to tokens).
   - **CSRF Token protection** with `X-CSRF-Token` headers for state-changing endpoints.
   - **Backend RBAC enforcement** on every endpoint (never trusting frontend navigation).
   - **Parent Consent Enforcement**: Messages are blocked if parent consent is withdrawn or pending.

---

## 🔑 Login Credentials

### 1. Principal / Administrator
| Role | Name | Email (User ID) | Password | Access Details |
|---|---|---|---|---|
| **Principal / Admin** | Principal Sharma | `admin@nextschool.internal` | `AdminSecurePass2026!` | Full admin access (all classes, teachers, 50 students, message logs) |

### 2. Subject Teachers (50 Students School Demo)
| Subject / Role | Teacher Name | Email (User ID) | Password | Access Details |
|---|---|---|---|---|
| **Mathematics** | Mrs. Ananya Verma | `teacher.math@nextschool.internal` | `TeacherPass2026!` | Mathematics teacher view & student assignments |
| **Science** | Dr. Rajesh Kumar | `teacher.science@nextschool.internal` | `TeacherPass2026!` | Science teacher view & student assignments |
| **English** | Ms. Kavita Sharma | `teacher.english@nextschool.internal` | `TeacherPass2026!` | English teacher view & student assignments |
| **Computer Science** | Mr. Amit Patel | `teacher.computer@nextschool.internal` | `TeacherPass2026!` | CS teacher view & student assignments |
| **AI & Robotics** | Dr. Vikram Sengupta | `teacher.ai@nextschool.internal` | `TeacherPass2026!` | AI & Robotics view & student assignments |

### 3. Base Teachers (Bootstrap / Initial Seed)
| Role | Teacher Name | Email (User ID) | Password | Access Details |
|---|---|---|---|---|
| **Teacher 1** | Mrs. Ananya Verma | `teacher1@nextschool.internal` | `TeacherSecurePass2026!` | Initial test teacher account |
| **Teacher 2** | Mr. Rajesh Kumar | `teacher2@nextschool.internal` | `TeacherSecurePass2026!` | Initial test teacher account |

---

## 🚀 Quick Start Guide (Windows / Linux / macOS)

### Prerequisites
- **Python 3.10+**
- **Node.js 18+ or 20+**

---

### Step 1: Backend Setup & Database Seeding

Open a terminal in the project root directory (`nextschool-dashboard`):

#### On Windows (PowerShell):
```powershell
# 1. Create and activate Python virtual environment
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Navigate into backend folder (IMPORTANT: must run inside 'backend' folder)
cd backend

# 4. Populate Database (Run Seeders)
python -m app.seed.dev_seed
python -m app.seed.seed_50_students

# 5. Start Backend Server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### On Linux / macOS (Bash):
```bash
# 1. Create and activate Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Navigate into backend folder
cd backend

# 4. Populate Database (Run Seeders)
python -m app.seed.dev_seed
python -m app.seed.seed_50_students

# 5. Start Backend Server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

> **Backend URLs:**
> - API Docs (Swagger): [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
> - Health Check: [http://localhost:8000/health](http://localhost:8000/health)

---

### Step 2: Frontend Setup & Start

Open a **second terminal** in the project root:

```bash
# 1. Navigate to frontend folder
cd frontend

# 2. Install Node dependencies (first time only)
npm install

# 3. Start Vite Development Server
npm run dev
```

> **Frontend Application:**
> - Web Dashboard: [http://localhost:5173](http://localhost:5173)

---

### Step 3: Run Automated Tests

To run the backend test suite:

```bash
cd backend
pytest -v
```

---

## 🛠️ Troubleshooting & Common Issues

### 1. `sqlite3.OperationalError: no such table: users` or `404 Not Found` on Login
- **Cause:** Backend seeder or server was executed outside the `backend/` directory, or another process was using port `8000`.
- **Solution:**
  1. Make sure to `cd backend` before running python commands.
  2. Run `python -m app.seed.dev_seed` to generate tables and default admin/teacher accounts.
  3. Verify port 8000 is running `uvicorn app.main:app` (and not a different process).

### 2. PowerShell: `cannot be loaded because running scripts is disabled`
- Run this in PowerShell before activating:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  .\.venv\Scripts\Activate.ps1
  ```

### 3. Frontend says "Network Error" or cannot connect to backend
- Ensure the backend server is running on port `8000`.
- Vite automatically proxies `/api` requests from `http://localhost:5173/api` to `http://localhost:8000/api`.
