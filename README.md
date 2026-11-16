# NextSchool – WhatsApp Communication Management Platform

A production-ready WhatsApp communication management system for **NextSchool**, built with **FastAPI (Python)**, **PostgreSQL (SQLAlchemy & Asyncpg)**, and **React + Vite + TypeScript (Ant Design)**.

---

## 🌟 Key Features (Phase 1 Foundation)

1. **Teacher Dashboard**:
   - Secure login and authenticated session via HttpOnly cookies.
   - Enforced restriction: Teachers see **only their assigned students**.
   - Student details & parent WhatsApp contacts with real-time consent badges.
   - Send predefined WhatsApp notifications across 6 approved templates:
     1. Student Absent Today
     2. Improper Uniform
     3. Misbehaviour Complaint
     4. Incomplete Homework/Copy
     5. Good Behaviour Appreciation
     6. Weekly Student Growth Report
   - Bilingual support: **English** and **Hindi (हिंदी)**.
   - Live formatted template preview with parameter substitution.

2. **Principal / Admin Dashboard**:
   - Centralized monitoring of all teachers, classes, and assigned students.
   - School-wide communication statistics and delivery status tracking.
   - Teacher directory with assignment counts and account statuses.

3. **Security & Data Safeguards**:
   - **Argon2 / BCrypt** password hashing.
   - **HttpOnly JWT cookies** (preventing XSS access to tokens).
   - **CSRF Token protection** with `X-CSRF-Token` headers for state-changing endpoints.
   - **Backend RBAC enforcement** on every endpoint (never trusting frontend navigation).
   - **Parent Consent Enforcement**: Messages are blocked if parent consent is withdrawn or pending.
   - **No predictable passwords**: Bootstrapped via `.env` environment variables.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ / 20+
- Docker & Docker Compose (optional for full-stack containerized run)

---

### Method 1: Local Development (Fast & Lightweight)

#### 1. Setup Backend
```bash
# In project root:
python -m venv .venv

# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1

# Install dependencies:
pip install -r backend/requirements.txt

# Run tests:
cd backend
pytest -v
```

#### 2. Run Database & Seed Mock Data
```bash
# If running PostgreSQL locally, configure credentials in .env.
# Run repeatable mock-data seeder:
python -m app.seed.dev_seed

# Start backend server:
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
API Documentation will be available at: `http://localhost:8000/api/v1/docs`

#### 3. Setup & Start Frontend
```bash
cd frontend
npm install
npm run dev
```
Open browser at: `http://localhost:5173`

---

### Method 2: Docker Compose (Full Stack)

```bash
# Build and start all services (PostgreSQL, Backend API, Frontend React):
docker compose up --build

# Run mock data seeder inside container:
docker compose exec backend python -m app.seed.dev_seed
```

---

## 🔑 Configured Test Credentials (from .env)

| Role | Email | Password |
|---|---|---|
| **Principal / Admin** | `admin@nextschool.internal` | `AdminSecurePass2026!` |
| **Teacher 1** | `teacher1@nextschool.internal` | `TeacherSecurePass2026!` |
| **Teacher 2** | `teacher2@nextschool.internal` | `TeacherSecurePass2026!` |

---

## 🛡️ Testing & Verification
Automated pytest suites cover:
- Health check verification.
- Login and logout with HttpOnly cookie verification.
- Teacher vs. Principal RBAC permission barriers.
- Backend teacher-student assignment checks (unassigned student access triggers 403 Forbidden).
- Parent consent validation (opted-out parents reject messaging requests).
