import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

// Primary read path in repo, fallback write path in /tmp on read-only serverless platforms (Vercel)
const REPO_EXAMS_STORE_FILE = path.join(process.cwd(), "exports", "exam_invigilations.json");
const TMP_EXAMS_STORE_FILE = path.join(os.tmpdir(), "exam_invigilations.json");

const SCHEDULE_FILE = path.join(process.cwd(), "exports", "schedule.json");
const CIT_DATA_FILE = path.join(process.cwd(), "starter_pack", "data", "cit_public.json");

// In-memory cache for serverless invocation lifetime
let memoryInvigilations: InvigilationRecord[] | null = null;

interface InvigilationRecord {
  exam_id: string;
  course_code: string;
  course_title: string;
  day: string;
  raw_day: string;
  session: string; // "AM" | "PM"
  time: string;
  rooms: string;
  raw_rooms: string[];
  groups: string[];
  students_count: number;
  reporting_time: string;
  primary_faculty_id: string;
  faculty_name: string;
  duty_role: string;
  status: "assigned" | "reassigned" | "leave_requested";
  reassigned_from?: string;
  leave_reason?: string;
}

const DAY_NAME_MAP: Record<string, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
};

function initializeInvigilations(): InvigilationRecord[] {
  if (memoryInvigilations && memoryInvigilations.length > 0) {
    return memoryInvigilations;
  }

  // Check /tmp first (persisted during serverless container life)
  if (fs.existsSync(TMP_EXAMS_STORE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(TMP_EXAMS_STORE_FILE, "utf-8"));
      if (Array.isArray(data) && data.length > 0) {
        memoryInvigilations = data;
        return data;
      }
    } catch (e) {
      console.warn("Could not read tmp exam invigilations:", e);
    }
  }

  // Check repo store file
  if (fs.existsSync(REPO_EXAMS_STORE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(REPO_EXAMS_STORE_FILE, "utf-8"));
      if (Array.isArray(data) && data.length > 0) {
        memoryInvigilations = data;
        return data;
      }
    } catch (e) {
      console.warn("Could not read repo exam invigilations:", e);
    }
  }

  const schedule = fs.existsSync(SCHEDULE_FILE)
    ? JSON.parse(fs.readFileSync(SCHEDULE_FILE, "utf-8"))
    : { exams: [] };
  const citData = fs.existsSync(CIT_DATA_FILE)
    ? JSON.parse(fs.readFileSync(CIT_DATA_FILE, "utf-8"))
    : {};

  const courses = citData.courses ? Object.fromEntries(citData.courses.map((c: any) => [c.id, c])) : {};
  const rooms = citData.rooms ? Object.fromEntries(citData.rooms.map((r: any) => [r.id, r])) : {};
  const rawExams = citData.exams ? Object.fromEntries(citData.exams.map((e: any) => [e.id, e])) : {};
  const facultyList: any[] = citData.faculty || [];
  const facultyMap = Object.fromEntries(facultyList.map((f: any) => [f.id, f]));

  // Map courses to faculty from teaching sessions
  const courseToFaculty: Record<string, string> = {};
  if (citData.sessions) {
    citData.sessions.forEach((s: any) => {
      if (s.course_id && s.faculty_id && !courseToFaculty[s.course_id]) {
        courseToFaculty[s.course_id] = s.faculty_id;
      }
    });
  }

  const invigilations: InvigilationRecord[] = [];

  (schedule.exams || []).forEach((ex: any, idx: number) => {
    const meta = rawExams[ex.exam_id] || {};
    const courseCode = meta.course_ids ? meta.course_ids[0] : ex.exam_id.replace("EX-", "");
    const course = courses[courseCode] || {};

    // Determine initial instructor assigned by engine
    let assignedFacId = courseToFaculty[courseCode];
    if (!assignedFacId || !facultyMap[assignedFacId]) {
      // Pick round-robin from available faculty
      assignedFacId = facultyList[idx % (facultyList.length || 1)]?.id || "F01";
    }

    const fac = facultyMap[assignedFacId] || { name: "Dr. Ananya Mishra", id: "F01" };
    const roomNames = (ex.rooms || []).map((rid: string) => rooms[rid]?.name || rid).join(", ");

    invigilations.push({
      exam_id: ex.exam_id,
      course_code: meta.course_ids ? meta.course_ids.join(", ") : courseCode,
      course_title: course.title || "Midsem Examination",
      day: DAY_NAME_MAP[ex.day] || ex.day,
      raw_day: ex.day,
      session: ex.session,
      time: ex.session === "AM" ? "09:30 – 11:30 AM" : "14:00 – 16:00 PM",
      rooms: roomNames || "Main Auditorium",
      raw_rooms: ex.rooms || [],
      groups: meta.groups || [],
      students_count: meta.size || 80,
      reporting_time: ex.session === "AM" ? "09:00 AM (30 min prior)" : "13:30 PM (30 min prior)",
      primary_faculty_id: assignedFacId,
      faculty_name: fac.name,
      duty_role: "Lead Invigilator",
      status: "assigned",
    });
  });

  memoryInvigilations = invigilations;
  saveInvigilations(invigilations);

  return invigilations;
}

function saveInvigilations(data: InvigilationRecord[]) {
  memoryInvigilations = data;
  try {
    fs.writeFileSync(TMP_EXAMS_STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    // Read-only filesystem warning suppression
  }
  try {
    if (fs.existsSync(path.dirname(REPO_EXAMS_STORE_FILE))) {
      fs.writeFileSync(REPO_EXAMS_STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
    }
  } catch (err) {
    // Silent fallback for Vercel serverless runtime
  }
}

// GET: Returns list of exams, faculty pool, and stats
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const facultyId = searchParams.get("faculty_id");

    const invigilations = initializeInvigilations();

    const citData = fs.existsSync(CIT_DATA_FILE)
      ? JSON.parse(fs.readFileSync(CIT_DATA_FILE, "utf-8"))
      : {};
    const facultyList = (citData.faculty || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      department: f.department,
      unavailable: f.unavailable || [],
    }));

    if (facultyId) {
      const filtered = invigilations.filter(
        (inv) => inv.primary_faculty_id === facultyId
      );
      return NextResponse.json({
        invigilations: filtered,
        faculty_id: facultyId,
      });
    }

    return NextResponse.json({
      total: invigilations.length,
      exams: invigilations,
      faculty: facultyList,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Action handlers: "reassign", "request_leave", "auto_substitute"
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, exam_id, new_faculty_id, reason, faculty_id } = body;

    const invigilations = initializeInvigilations();
    const citData = fs.existsSync(CIT_DATA_FILE)
      ? JSON.parse(fs.readFileSync(CIT_DATA_FILE, "utf-8"))
      : {};
    const facultyMap = Object.fromEntries(
      (citData.faculty || []).map((f: any) => [f.id, f])
    );
    const facultyList: any[] = citData.faculty || [];

    // 1. ADMIN REASSIGNMENT
    if (action === "reassign") {
      if (!exam_id || !new_faculty_id) {
        return NextResponse.json(
          { error: "exam_id and new_faculty_id are required" },
          { status: 400 }
        );
      }

      const newFac = facultyMap[new_faculty_id];
      if (!newFac) {
        return NextResponse.json({ error: "Invalid faculty selected" }, { status: 404 });
      }

      const idx = invigilations.findIndex((inv) => inv.exam_id === exam_id);
      if (idx === -1) {
        return NextResponse.json({ error: "Exam duty not found" }, { status: 404 });
      }

      const prevFacName = invigilations[idx].faculty_name;
      invigilations[idx].primary_faculty_id = new_faculty_id;
      invigilations[idx].faculty_name = newFac.name;
      invigilations[idx].status = "reassigned";
      invigilations[idx].reassigned_from = prevFacName;
      if (reason) invigilations[idx].leave_reason = reason;

      saveInvigilations(invigilations);

      return NextResponse.json({
        success: true,
        message: `Duty for ${exam_id} reassigned to ${newFac.name} (${newFac.department}).`,
        exam: invigilations[idx],
      });
    }

    // 2. FACULTY REQUEST LEAVE / REPORT UNAVAILABILITY — FORWARDS TO DEAN APPROVAL QUEUE
    if (action === "request_leave") {
      const idx = invigilations.findIndex((inv) => inv.exam_id === exam_id);
      if (idx === -1) {
        return NextResponse.json({ error: "Exam duty not found" }, { status: 404 });
      }

      const currentExam = invigilations[idx];
      const prevFacName = currentExam.faculty_name;
      const prevFacId = currentExam.primary_faculty_id;

      // Find an available candidate substitute teacher
      const busyFacultyInSlot = new Set(
        invigilations
          .filter(
            (inv) =>
              inv.raw_day === currentExam.raw_day &&
              inv.session === currentExam.session &&
              inv.exam_id !== currentExam.exam_id
          )
          .map((inv) => inv.primary_faculty_id)
      );

      const candidate = facultyList.find(
        (f) => f.id !== prevFacId && !busyFacultyInSlot.has(f.id)
      );

      const candidateName = candidate ? candidate.name : "Dr. Rohit Sahoo";
      const candidateId = candidate ? candidate.id : "F02";

      // Mark status as leave_requested on the exam duty record
      invigilations[idx].status = "leave_requested";
      invigilations[idx].leave_reason = reason || "Unavailability reported by faculty";
      saveInvigilations(invigilations);

      // Submit into exports/academic_requests.json for Dean review
      const REQUESTS_FILE = path.join(process.cwd(), "exports", "academic_requests.json");
      let requestsList: any[] = [];
      if (fs.existsSync(REQUESTS_FILE)) {
        try {
          requestsList = JSON.parse(fs.readFileSync(REQUESTS_FILE, "utf-8"));
        } catch (e) {
          console.error("Error reading requests file:", e);
        }
      }

      const reqId = `EL-${200 + requestsList.length + 1}`;
      const examLeaveRequest = {
        id: reqId,
        type: "exam_leave",
        faculty_id: prevFacId,
        faculty_name: prevFacName,
        department: "ECE",
        course: `${currentExam.course_code} (${currentExam.course_title})`,
        section: currentExam.groups.join(", ") || "Examinees",
        venue: currentExam.rooms,
        day: currentExam.day,
        period: `${currentExam.session} (${currentExam.time})`,
        reason: reason || "Unavailability reported by faculty",
        priorityLevel: 1, // Highest priority: Examination Invigilation
        status: "pending",
        created_at: new Date().toISOString(),
        exam_id: currentExam.exam_id,
        original_faculty_id: prevFacId,
        original_faculty_name: prevFacName,
        substitute_faculty_id: candidateId,
        substitute_faculty_name: candidateName,
      };

      requestsList.unshift(examLeaveRequest);
      try {
        fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requestsList, null, 2), "utf-8");
      } catch (err) {
        // Fallback for serverless environment
      }

      return NextResponse.json({
        success: true,
        message: `Leave request for ${currentExam.exam_id} submitted to Dean's Office approval queue (Request ID: ${reqId}). Dean can approve auto-substitute (${candidateName}) or revert to original teacher.`,
        request: examLeaveRequest,
        candidate_substitute: candidateName,
        exam: invigilations[idx],
      });
    }

    // 3. ADMIN INSTANT AUTO-SUBSTITUTE
    if (action === "auto_substitute") {
      const idx = invigilations.findIndex((inv) => inv.exam_id === exam_id);
      if (idx === -1) {
        return NextResponse.json({ error: "Exam duty not found" }, { status: 404 });
      }

      const currentExam = invigilations[idx];
      const prevFacName = currentExam.faculty_name;
      const prevFacId = currentExam.primary_faculty_id;

      const busyFacultyInSlot = new Set(
        invigilations
          .filter(
            (inv) =>
              inv.raw_day === currentExam.raw_day &&
              inv.session === currentExam.session &&
              inv.exam_id !== currentExam.exam_id
          )
          .map((inv) => inv.primary_faculty_id)
      );

      const candidate = facultyList.find(
        (f) => f.id !== prevFacId && !busyFacultyInSlot.has(f.id)
      );

      if (!candidate) {
        return NextResponse.json(
          { error: "No available substitute faculty found for this slot" },
          { status: 409 }
        );
      }

      invigilations[idx].primary_faculty_id = candidate.id;
      invigilations[idx].faculty_name = candidate.name;
      invigilations[idx].status = "reassigned";
      invigilations[idx].reassigned_from = `${prevFacName} (Emergency Leave: ${reason || "Unavailability reported"})`;
      invigilations[idx].leave_reason = reason || "Unavailability reported";

      saveInvigilations(invigilations);

      return NextResponse.json({
        success: true,
        message: `Duty for ${exam_id} automatically reassigned to available substitute: ${candidate.name} (${candidate.department}).`,
        substitute_name: candidate.name,
        exam: invigilations[idx],
      });
    }

    // 3. RESET TO DEFAULT GENERATOR ALLOCATIONS
    if (action === "reset") {
      memoryInvigilations = null;
      try {
        if (fs.existsSync(TMP_EXAMS_STORE_FILE)) {
          fs.unlinkSync(TMP_EXAMS_STORE_FILE);
        }
      } catch (e) {}
      const resetList = initializeInvigilations();
      return NextResponse.json({
        success: true,
        message: "Exam invigilation roster reset to automatic generator allocations.",
        total: resetList.length,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
