import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const facultyId = searchParams.get("faculty_id") || "F09";
    const dept = searchParams.get("dept");

    const schedulePath = path.join(process.cwd(), "exports", "schedule.json");
    const dataPath = path.join(process.cwd(), "starter_pack", "data", "cit_public.json");
    const requestsPath = path.join(process.cwd(), "exports", "academic_requests.json");
    const tmpRequestsPath = path.join(os.tmpdir(), "academic_requests.json");

    if (!fs.existsSync(schedulePath)) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const schedule = JSON.parse(fs.readFileSync(schedulePath, "utf-8"));
    const citData = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath, "utf-8")) : {};

    const courses = citData.courses ? Object.fromEntries(citData.courses.map((c: any) => [c.id, c])) : {};
    const rooms = citData.rooms ? Object.fromEntries(citData.rooms.map((r: any) => [r.id, r])) : {};
    const faculty = citData.faculty ? Object.fromEntries(citData.faculty.map((f: any) => [f.id, f])) : {};
    const sessionMeta = citData.sessions ? Object.fromEntries(citData.sessions.map((s: any) => [s.id, s])) : {};

    const dayNameMap: Record<string, string> = {
      MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday", FRI: "Friday", SAT: "Saturday",
      MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday", THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday"
    };

    let matched = schedule.sessions
      .map((s: any) => {
        const meta = sessionMeta[s.session_id] || {};
        const course = courses[meta.course_id] || {};
        const room = rooms[s.room_id] || {};
        const fac = faculty[meta.faculty_id] || {};

        return {
          id: s.session_id,
          session_id: s.session_id,
          day: dayNameMap[s.day] || s.day,
          raw_day: s.day,
          period: s.duration > 1 ? `P${s.start_period} – P${s.start_period + s.duration - 1}` : `P${s.start_period}`,
          start_period: s.start_period,
          duration: meta.duration || 1,
          course: `${meta.course_id} ${course.title || ""}`,
          course_id: meta.course_id,
          course_title: course.title || meta.course_id,
          room: room.name || s.room_id,
          room_id: s.room_id,
          type: meta.kind || "lecture",
          faculty_id: meta.faculty_id,
          faculty_name: fac.name || meta.faculty_id,
          department: course.department || fac.department,
          groups: meta.groups || []
        };
      });

    if (facultyId) {
      matched = matched.filter((s: any) => s.faculty_id === facultyId);
    }
    if (dept) {
      matched = matched.filter((s: any) => s.department === dept);
    }

    // Include dynamically approved extra class and reschedule requests from both /tmp and repo
    let academicRequests: any[] = [];
    if (fs.existsSync(tmpRequestsPath)) {
      try {
        const raw = fs.readFileSync(tmpRequestsPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) academicRequests = parsed;
      } catch (err) {}
    }
    if (academicRequests.length === 0 && fs.existsSync(requestsPath)) {
      try {
        const raw = fs.readFileSync(requestsPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) academicRequests = parsed;
      } catch (err) {}
    }

    if (academicRequests.length > 0) {
      const approvedExtraClasses = academicRequests.filter(
        (r: any) => r.status === "approved" && (r.faculty_id === facultyId || r.faculty_id === "F09" || !facultyId)
      );

      approvedExtraClasses.forEach((req: any) => {
        // Normalize day (e.g. "Tomorrow" -> current/next weekday, "TUE" -> "Tuesday")
        const rawDay = (req.day || "Monday").trim();
        let normalizedDay = "Wednesday";
        if (rawDay.toLowerCase() === "tomorrow") {
          const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const tmrwIdx = (new Date().getDay() + 1) % 7;
          normalizedDay = days[tmrwIdx] === "Saturday" || days[tmrwIdx] === "Sunday" ? "Monday" : days[tmrwIdx];
        } else {
          normalizedDay = dayNameMap[rawDay.toUpperCase()] ||
            (rawDay.charAt(0).toUpperCase() + rawDay.slice(1).toLowerCase());
        }

        // Extract periods (e.g. "10:00 - 12:00 (P3-P4)", "Periods P1–P2", "P3")
        const rangeMatch = req.period?.match(/P(\d+)[–\-]P?(\d+)/i);
        const singleMatch = req.period?.match(/P(\d+)/i);
        
        let startPeriod = 3;
        let duration = 2;

        if (rangeMatch) {
          startPeriod = parseInt(rangeMatch[1], 10);
          const endPeriod = parseInt(rangeMatch[2], 10);
          duration = Math.max(1, endPeriod - startPeriod + 1);
        } else if (singleMatch) {
          startPeriod = parseInt(singleMatch[1], 10);
          duration = 1;
        } else if (req.period?.includes("10:00")) {
          startPeriod = 3;
          duration = 2;
        }

        const venueName = req.venue?.replace("_", " ") || "Seminar Hall 1";
        const formattedVenue = venueName.charAt(0).toUpperCase() + venueName.slice(1);

        matched.push({
          id: req.id,
          session_id: req.id,
          day: normalizedDay,
          raw_day: normalizedDay.slice(0, 3).toUpperCase(),
          period: duration > 1 ? `P${startPeriod} – P${startPeriod + duration - 1}` : `P${startPeriod}`,
          start_period: startPeriod,
          duration: duration,
          course: `${req.course || "Approved Extra Class"}`,
          course_id: (req.course || "EXTRA").split(" ")[0],
          course_title: `${req.course || "Extra Class"} (${req.channel === "chatbot" ? "AI Booking" : "Extra Class"})`,
          room: formattedVenue,
          room_id: req.venue,
          type: req.type === "spectra_booking" ? "event" : "lecture",
          faculty_id: req.faculty_id || facultyId,
          faculty_name: req.faculty_name || "Dr. Rajesh Tripathy",
          department: req.department || "ECE",
          groups: req.section ? [req.section] : ["ECE Cohort"],
          isApprovedExtraClass: true,
          channel: req.channel
        });
      });
    }

    // Load Faculty Midsem Exam Invigilation Duties from the shared exam_invigilations store
    const examInvigilationsPath = path.join(process.cwd(), "exports", "exam_invigilations.json");
    const tmpExamInvigilationsPath = path.join(os.tmpdir(), "exam_invigilations.json");
    let invigilations: any[] = [];

    if (fs.existsSync(tmpExamInvigilationsPath)) {
      try {
        const allExamDuties = JSON.parse(fs.readFileSync(tmpExamInvigilationsPath, "utf-8"));
        if (Array.isArray(allExamDuties) && allExamDuties.length > 0) {
          invigilations = allExamDuties.filter(
            (inv: any) => inv.primary_faculty_id === facultyId
          );
        }
      } catch (e) {
        console.error("Error reading tmp exam_invigilations.json:", e);
      }
    }

    if (invigilations.length === 0 && fs.existsSync(examInvigilationsPath)) {
      try {
        const allExamDuties = JSON.parse(fs.readFileSync(examInvigilationsPath, "utf-8"));
        if (Array.isArray(allExamDuties)) {
          invigilations = allExamDuties.filter(
            (inv: any) => inv.primary_faculty_id === facultyId
          );
        }
      } catch (e) {
        console.error("Error reading exam_invigilations.json:", e);
      }
    }

    return NextResponse.json({
      faculty_id: facultyId,
      department: dept || "ECE",
      total_sessions: matched.length,
      sessions: matched,
      invigilations: invigilations
    });
  } catch (error: any) {
    console.error("Failed to load faculty schedule:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
