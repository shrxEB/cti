# TechZephyr — Chilika Institute of Technology (CIT) Scheduling Platform

> High-performance academic scheduling, disruption management, and venue allocation system powered by **Google OR-Tools CP-SAT**, **Next.js 15 (React 19)**, **FastAPI**, and **Multimodal Gemini AI**.

[![Official Validator](https://img.shields.io/badge/Validator-Passing_100%25-064e43?style=for-the-badge&logo=python)](starter_pack/validator.py)
[![Hard Violations](https://img.shields.io/badge/Hard_Violations-0-emerald?style=for-the-badge)](starter_pack/validator.py)
[![Priority Inversions](https://img.shields.io/badge/Priority_Inversions-0-blue?style=for-the-badge)](starter_pack/validator.py)
[![Live Deployment](https://img.shields.io/badge/Live_App-cti--indol.vercel.app-0284c7?style=for-the-badge&logo=vercel)](https://cti-indol.vercel.app/)

---

## 🌐 Live Deployed Application

👉 **[https://cti-indol.vercel.app/](https://cti-indol.vercel.app/)**

---

## 🔑 Judge & Evaluator Credentials (Quick Access)

> **Live Deployment / Evaluation Access**: Visit **[https://cti-indol.vercel.app/](https://cti-indol.vercel.app/)**, click any profile card on the login screen to populate the identity, then enter the corresponding password below to sign in:

| Profile / Role | Full Name | Username (Email ID) | Password | Portal Destination |
| :--- | :--- | :--- | :--- | :--- |
| **👑 1. Admin (Dean's Office)** | Prof. Alok Sharma (Dean Academic) | `admin@cit.edu.in` | `citadmin2026` | `/admin` |
| **🏢 2. Dept Coordinator** | Dr. Sunita Mohanty (CSE) | `coordinator.cse@cit.edu.in` | `citcoord2026` | `/coordinator` |
| **🎓 3. Faculty Member** | Dr. Rajesh Tripathy (ECE) | `faculty.ece@cit.edu.in` | `citfaculty2026` | `/faculty` |
| **🎪 4. Club Representative** | Priyansh Verma (Spectra Lead) | `club.spectra@cit.edu.in` | `citclub2026` | `/club` |

> 🔄 **Clean State Reset**: When testing different scenarios or custom requests, judges can click the **`Reset Demo`** button on the top-right header of the **Admin Dashboard (`/admin`)** to immediately flush all changes and restore the system to a clean baseline state.

---

## 🏛️ System Overview

TechZephyr is a production-grade campus scheduling engine built for the **Chilika Institute of Technology (CIT)**. It solves complex constraints across **40 faculty**, **27 campus rooms**, **14 student cohorts**, **189 teaching sessions**, **41 midsem exams**, and **25 Spectra tech fest venue requests**.

### Key Highlights
- **Zero Hard Violations (H1–H14)** verified by the official CIT test validator.
- **0 Priority Inversions**: Strict 6-tier conflict resolution hierarchy:
  $$\text{Midsem Exams (P1)} > \text{Regular Sessions (P2)} > \text{Institute Events (P3)} > \text{Guest Lectures (P4)} > \text{Dept Events (P5)} > \text{Club Events (P6)}$$
- **Multimodal AI Scheduling Copilot**: Real-time voice, speech-to-text, natural language booking parser, and constraint explainer supporting both English and Hinglish.
- **Real-Time Disruption Recovery**: Automated conflict repair when faculty report sudden unavailability, auto-assigning clash-free substitute invigilators without disrupting unchanged exams.
- **Interactive Multi-Role Portals**: Dedicated operational workspaces for Dean's Office (Admin), Department Coordinators, Faculty Members, and Club Representatives.

---

## ⚡ Architecture & Tech Stack

```mermaid
graph TD
    Client["Client Browser (Next.js 15 / Tailwind / Lucide)"]
    API["Next.js Route Handlers (/api/*)"]
    FastAPI["FastAPI Daemon (backend/main.py :8000)"]
    Solver["Google OR-Tools CP-SAT Constraint Engine"]
    AI["Gemini 2.5 Flash + Regex Fallback Parser"]
    Validator["Official CIT Validator (starter_pack/validator.py)"]

    Client -->|App Router UI & Voice Audio| API
    API -->|Async Request / Spawn Fallback| FastAPI
    FastAPI -->|Math Model Optimization| Solver
    FastAPI -->|Plain-Language Extraction| AI
    Solver -->|Export Schedule JSON| Validator
```

- **Frontend**: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Backend & Optimization**: Python 3.12, Google OR-Tools CP-SAT, FastAPI, Uvicorn, Pydantic
- **AI & NLP**: Google Gemini 2.5 Flash SDK, Web Speech API audio transcription, rule-based offline regex engine
- **Database / Provisioning**: Neon PostgreSQL (with fallback demo in-memory persistence)

---

## 👥 Authorized Role Portals & Capabilities

| Portal | Role | Primary Features |
| :--- | :--- | :--- |
| **Dean's Office (Admin)** | `admin` | Full Master Timetable view, Midsem Exam invigilation matrix, 6-Tier Approvals Queue with explicit decision justification, Neon DB provisioning & reset. |
| **Dept Coordinator** | `coordinator` | Department session shift requests with instant conflict pre-check, Priority 5 departmental event booking, practical lab approval/override in-app modals. |
| **Faculty Member** | `faculty` | Personal timetable, exam duty schedule, single-click substitute reassignment for invigilation leave, extra lecture booking. |
| **Club Representative** | `club_rep` | Spectra Fest (Week 7) booking ledger, plain-language text & voice prompt booking parser, instant withdrawal/cancellation, alternative acceptance. |

---

## 📊 Constraint Compliance & Scoring

Verified using the official evaluation script `starter_pack/validator.py`:

```bash
python3 starter_pack/validator.py --data starter_pack/data/cit_public.json --schedule exports/schedule.json
```

```text
==================================================
RUNNING OFFICIAL VALIDATOR (validator.py)
==================================================
Dataset: cit-public-v1   Schedule: cit-public-v1   Team: TechZephyr
Hard violations: 0  {}
Soft penalty: 329  {'S1': 0, 'S2': 200, 'S3': 6, 'S4': 81, 'S5': 42, 'S6': 0}
Bookings: score 58.0 | approved 18, alternatives 4, rejected 3, session overrides 0, priority inversions 0
Exam soft penalty: 0
```

### Constraints Modeled:
- **Hard (H1–H14)**:
  - `H1`: Every session placed exactly once.
  - `H2–H4`: Zero room, student group, or faculty double-bookings.
  - `H5–H6`: Venue capacity and equipment/type compatibility verified.
  - `H7–H8`: Maintenance windows and faculty fixed unavailabilities strictly respected.
  - `H9`: Teaching strictly within P1–P9; **13:00–14:00 lunch break strictly protected**; 3h labs only start at P2 or P6.
  - `H10`: Wheelchair accessibility enforced whenever required.
  - `H11`: Parallel elective baskets (`OEB-1`) synchronized across separate rooms.
  - `H12`: Daily faculty teaching hours strictly capped at maximum limits.
  - `H13–H14`: Fest week room allowance compliance and fixed slot adherence.
- **Soft (S1–S6)**: Minimized faculty avoidance periods, student idle gap hours, daily lecture loads $>6\text{h}$, repeat lectures in a single day, room size wastage ($<40\%$), and evening fatigue.

---

## 🚀 Quickstart & Setup

### 1. Prerequisites
- **Node.js**: v18.18+ or v20+
- **Python**: 3.9+ with `pip` and `virtualenv`

### 2. Clone & Install Dependencies

```bash
git clone https://github.com/shrxEB/cti.git
cd cti

# Install Node dependencies
npm install

# Setup Python environment
python3 -m venv venv
./venv/bin/pip install fastapi uvicorn ortools google-genai
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory:

```env
# Optional: Neon PostgreSQL connection string (in-memory demo mode active if omitted)
DATABASE_URL=postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require

# Optional: Google Gemini API Key for online multimodal capabilities
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run the Platform

In terminal 1, start the Python backend engine:
```bash
PYTHONPATH="backend:backend/ai:backend/engine" ./venv/bin/python backend/main.py
```

In terminal 2, start the Next.js development server:
```bash
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

---

## 🔐 Demo Credentials for Evaluation

Judges and evaluators can log in using any of the four verified institutional accounts. On the landing page, click a role card to populate the institutional identity, then input the password to sign in:

| Role | Name & Department | Login Email ID | Password | Portal Destination |
| :--- | :--- | :--- | :--- | :--- |
| **Admin (Dean's Office)** | Prof. Alok Sharma (Dean Academic) | `admin@cit.edu.in` | `citadmin2026` | `/admin` |
| **Dept Coordinator** | Dr. Sunita Mohanty (CSE) | `coordinator.cse@cit.edu.in` | `citcoord2026` | `/coordinator` |
| **Faculty Member** | Dr. Rajesh Tripathy (ECE) | `faculty.ece@cit.edu.in` | `citfaculty2026` | `/faculty` |
| **Club Representative** | Priyansh Verma (Spectra Fest Lead) | `club.spectra@cit.edu.in` | `citclub2026` | `/club` |

> 🔄 **Clean State Reset for Evaluators**:
> When testing different scenarios or after creating test requests, judges can click the **`Reset Demo`** button on the top-right header of the **Admin Dashboard (`/admin`)**. This immediately flushes any test disruptions or custom submissions and restores all database records and schedules back to the pristine baseline state.

---

## 📦 Deployment

### Deploying Frontend to Vercel
1. Push this repository to GitHub (`https://github.com/shrxEB/cti`).
2. Import the project in your [Vercel Dashboard](https://vercel.com/new).
3. Set the Framework Preset to **Next.js**.
4. Configure environment variables (`DATABASE_URL`, `GEMINI_API_KEY`).
5. Deploy. The Next.js API routes include pure TypeScript/Node fallback execution ensuring serverless resilience.

### Deploying Backend to Render / Railway / Cloud Run
Deploy the `backend` directory with `uvicorn main:app --host 0.0.0.0 --port 8000` and set `PYTHONPATH=.`.

---

## 📄 License
Developed for the Chilika Institute of Technology (CIT) Crunch Week Hackathon.
