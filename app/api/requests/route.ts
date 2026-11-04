import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

export interface AcademicRequest {
  id: string;
  type: "extra_class" | "reschedule" | "spectra_booking" | "exam_leave" | "dept_event" | "lab_booking" | "session_change";
  submitted_by_role?: string;
  channel?: string;
  faculty_id?: string;
  faculty_name: string;
  department: string;
  course: string;
  section: string;
  venue: string;
  day: string;
  period: string;
  target_day?: string;
  target_period?: string;
  target_venue?: string;
  session_id?: string;
  attendance?: number;
  mandatory_groups?: string[];
  equipment?: string[];
  lab_name?: string;
  applicant?: string;
  alternative_venue?: string;
  reason?: string;
  priorityLevel: number; // 1 exam, 2 academic, 5 dept event, 6 club event
  status: "pending" | "approved" | "rejected" | "alternative_suggested" | "cancelled";
  adminReason?: string;
  created_at: string;
  cancelled_at?: string;
  cancelled_by?: string;
  exam_id?: string;
  original_faculty_id?: string;
  original_faculty_name?: string;
  substitute_faculty_id?: string;
  substitute_faculty_name?: string;
}

const REQUESTS_FILE = path.join(process.cwd(), "exports", "academic_requests.json");
const TMP_REQUESTS_FILE = path.join(os.tmpdir(), "academic_requests.json");

// Direct read without stale in-memory freeze so serverless lambdas always see disk updates
function readRequests(): AcademicRequest[] {
  // 1. Try reading from /tmp
  if (fs.existsSync(TMP_REQUESTS_FILE)) {
    try {
      const raw = fs.readFileSync(TMP_REQUESTS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      // fallback
    }
  }

  // 2. Try reading from repo file
  if (fs.existsSync(REQUESTS_FILE)) {
    try {
      const raw = fs.readFileSync(REQUESTS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      // fallback
    }
  }

  return [];
}

function writeRequests(requests: AcademicRequest[]) {
  try {
    fs.writeFileSync(TMP_REQUESTS_FILE, JSON.stringify(requests, null, 2), "utf-8");
  } catch (err) {
    // Read-only filesystem warning suppression
  }
  try {
    if (fs.existsSync(path.dirname(REQUESTS_FILE))) {
      fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2), "utf-8");
    }
  } catch (err) {
    // Silent fallback for Vercel read-only runtime
  }
}

// GET /api/requests — Fetch all requests (filterable by faculty_id, department, status)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const facultyId = searchParams.get("faculty_id");
    const department = searchParams.get("department");
    const status = searchParams.get("status");

    let list = readRequests();

    if (facultyId) {
      list = list.filter((r) => r.faculty_id === facultyId || !r.faculty_id);
    }
    if (department) {
      list = list.filter((r) => r.department.toLowerCase().includes(department.toLowerCase()));
    }
    if (status) {
      list = list.filter((r) => r.status === status);
    }

    return NextResponse.json(
      { requests: list },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}

// POST /api/requests — Submit a new Extra Class or Reschedule request from Faculty
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const list = readRequests();

    const newId = `AR-${200 + list.length + 1}`;
    const newRequest: AcademicRequest = {
      id: newId,
      type: body.type || "extra_class",
      submitted_by_role: body.submitted_by_role || "faculty",
      channel: body.channel || "portal",
      faculty_id: body.faculty_id || "F01",
      faculty_name: body.faculty_name || "Faculty Member",
      department: body.department || "ECE",
      course: body.course || "Department Session",
      section: body.section || "All Sections",
      venue: body.venue || "TBD",
      day: body.day || "Monday",
      period: body.period || "P1",
      target_day: body.target_day,
      target_period: body.target_period,
      target_venue: body.target_venue,
      session_id: body.session_id,
      attendance: body.attendance,
      mandatory_groups: body.mandatory_groups || [],
      equipment: body.equipment || [],
      lab_name: body.lab_name,
      applicant: body.applicant || body.faculty_name,
      alternative_venue: body.alternative_venue,
      reason: body.reason || "",
      priorityLevel: body.priorityLevel || (body.type === "exam_leave" ? 1 : body.type === "dept_event" ? 5 : body.type === "lab_booking" ? 6 : 2),
      status: body.status || "pending",
      created_at: new Date().toISOString(),
      exam_id: body.exam_id,
      original_faculty_id: body.original_faculty_id || body.faculty_id,
      original_faculty_name: body.original_faculty_name || body.faculty_name,
      substitute_faculty_id: body.substitute_faculty_id,
      substitute_faculty_name: body.substitute_faculty_name,
    };

    list.unshift(newRequest);
    writeRequests(list);

    return NextResponse.json({
      success: true,
      request: newRequest,
      message: `Request ${newId} submitted directly to Dean's Office & Coordinator queue.`,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}

// PATCH /api/requests — Approve or Reject a request (by Dean or Coordinator)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status, adminReason } = body;

    const list = readRequests();
    const idx = list.findIndex((r) => r.id === id);

    if (idx === -1) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    list[idx].status = status;
    if (adminReason) {
      list[idx].adminReason = adminReason;
    }
    if (body.alternative_venue) {
      list[idx].alternative_venue = body.alternative_venue;
    }
    if (status === "cancelled") {
      list[idx].cancelled_at = new Date().toISOString();
      list[idx].cancelled_by = body.cancelled_by || "Requester";
    }

    // If this is an exam_leave request, sync the decision to exam_invigilations.json
    const reqItem = list[idx];
    if (reqItem.type === "exam_leave" && reqItem.exam_id) {
      const EXAMS_STORE_FILE = path.join(process.cwd(), "exports", "exam_invigilations.json");
      const TMP_EXAMS_STORE_FILE = path.join(os.tmpdir(), "exam_invigilations.json");
      let invigilations: any[] = [];
      let sourceFile = "";

      if (fs.existsSync(TMP_EXAMS_STORE_FILE)) {
        try {
          invigilations = JSON.parse(fs.readFileSync(TMP_EXAMS_STORE_FILE, "utf-8"));
          sourceFile = TMP_EXAMS_STORE_FILE;
        } catch (e) {}
      } else if (fs.existsSync(EXAMS_STORE_FILE)) {
        try {
          invigilations = JSON.parse(fs.readFileSync(EXAMS_STORE_FILE, "utf-8"));
          sourceFile = EXAMS_STORE_FILE;
        } catch (e) {}
      }

      if (invigilations.length > 0) {
        try {
          const invIdx = invigilations.findIndex((inv: any) => inv.exam_id === reqItem.exam_id);
          if (invIdx !== -1) {
            if (status === "approved" && reqItem.substitute_faculty_id) {
              // Dean approved leave with the auto-suggested substitute
              invigilations[invIdx].primary_faculty_id = reqItem.substitute_faculty_id;
              invigilations[invIdx].faculty_name = reqItem.substitute_faculty_name || invigilations[invIdx].faculty_name;
              invigilations[invIdx].status = "reassigned";
              invigilations[invIdx].reassigned_from = `${reqItem.original_faculty_name} (Leave Approved by Dean: ${reqItem.reason})`;
              invigilations[invIdx].leave_reason = reqItem.reason;
            } else if (status === "rejected") {
              // Dean reverted to original faculty
              if (reqItem.original_faculty_id) {
                invigilations[invIdx].primary_faculty_id = reqItem.original_faculty_id;
                invigilations[invIdx].faculty_name = reqItem.original_faculty_name || invigilations[invIdx].faculty_name;
              }
              invigilations[invIdx].status = "assigned";
              invigilations[invIdx].reassigned_from = undefined;
              invigilations[invIdx].leave_reason = `Leave Request Reverted by Dean: ${adminReason || "Duty mandatory"}`;
            }

            try {
              fs.writeFileSync(TMP_EXAMS_STORE_FILE, JSON.stringify(invigilations, null, 2), "utf-8");
            } catch (e) {}
            try {
              if (fs.existsSync(path.dirname(EXAMS_STORE_FILE))) {
                fs.writeFileSync(EXAMS_STORE_FILE, JSON.stringify(invigilations, null, 2), "utf-8");
              }
            } catch (e) {}
          }
        } catch (e) {
          console.error("Error updating exam_invigilations from request PATCH:", e);
        }
      }
    }

    writeRequests(list);

    return NextResponse.json({
      success: true,
      request: list[idx],
      message: `Request ${id} marked as ${status}. Notification dispatched to faculty.`,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}
