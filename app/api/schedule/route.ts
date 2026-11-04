import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const group = searchParams.get("group");
    const day = searchParams.get("day");

    // Load master schedule from exports/schedule.json
    const schedulePath = path.join(process.cwd(), "exports", "schedule.json");
    const dataPath = path.join(process.cwd(), "starter_pack", "data", "cit_public.json");
    const requestsPath = path.join(process.cwd(), "exports", "academic_requests.json");
    const tmpRequestsPath = path.join(os.tmpdir(), "academic_requests.json");

    if (!fs.existsSync(schedulePath)) {
      return NextResponse.json({ error: "Schedule not yet generated" }, { status: 404 });
    }

    const schedule = JSON.parse(fs.readFileSync(schedulePath, "utf-8"));
    const citData = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath, "utf-8")) : {};

    // Map courses, rooms, faculty for rich frontend display
    const courses = citData.courses ? Object.fromEntries(citData.courses.map((c: any) => [c.id, c])) : {};
    const rooms = citData.rooms ? Object.fromEntries(citData.rooms.map((r: any) => [r.id, r])) : {};
    const faculty = citData.faculty ? Object.fromEntries(citData.faculty.map((f: any) => [f.id, f])) : {};
    const sessionMeta = citData.sessions ? Object.fromEntries(citData.sessions.map((s: any) => [s.id, s])) : {};

    let sessions = schedule.sessions.map((s: any) => {
      const meta = sessionMeta[s.session_id] || {};
      const course = courses[meta.course_id] || {};
      const room = rooms[s.room_id] || {};
      const fac = faculty[meta.faculty_id] || {};

      return {
        session_id: s.session_id,
        course_id: meta.course_id || s.session_id.split("-")[0],
        course_title: course.title || meta.course_id || "Course Session",
        department: course.department || fac.department || "General",
        faculty_id: meta.faculty_id,
        kind: meta.kind || "lecture",
        groups: meta.groups || [],
        day: s.day,
        start_period: s.start_period,
        duration: meta.duration || 1,
        room_id: s.room_id,
        room_name: room.name || s.room_id,
        room_type: room.type || "classroom",
        faculty_name: fac.name || meta.faculty_id || "Assigned Faculty",
        size: meta.size || 0
      };
    });

    // Merge approved extra classes and reschedule requests into global schedule
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
      const dayAbbrMap: Record<string, string> = {
        Monday: "MON", Tuesday: "TUE", Wednesday: "WED", Thursday: "THU", Friday: "FRI",
        MON: "MON", TUE: "TUE", WED: "WED", THU: "THU", FRI: "FRI"
      };
      const approvedRequests = academicRequests.filter((r: any) => r.status === "approved");

      approvedRequests.forEach((req: any) => {
        const periodMatch = req.period?.match(/P(\d+)/);
        const startPeriod = periodMatch ? parseInt(periodMatch[1], 10) : 3;

        let dayCode = "WED";
        if (req.day?.toLowerCase() === "tomorrow") {
          dayCode = "THU";
        } else if (req.day) {
          dayCode = dayAbbrMap[req.day] || req.day.slice(0, 3).toUpperCase();
        }

        const durationMatch = req.period?.match(/P(\d+)[–\-]P?(\d+)/i);
        const duration = durationMatch ? Math.max(1, parseInt(durationMatch[2], 10) - parseInt(durationMatch[1], 10) + 1) : 1;

        sessions.push({
          session_id: req.id,
          course_id: req.course ? req.course.split(" ")[0] : "EXTRA",
          course_title: `${req.course || "Extra Class"} (Approved Extra Class)`,
          kind: "lecture",
          groups: req.section ? [req.section, "Y1-A", "ECE-2"] : ["Y1-A", "ECE-2"],
          day: dayCode,
          start_period: startPeriod,
          duration: duration,
          room_id: req.venue,
          room_name: req.venue,
          faculty_name: req.faculty_name || "Faculty",
          size: req.attendance || 40,
          isExtraClass: true
        });
      });
    }

    const dept = searchParams.get("dept");

    if (group && group !== "All") {
      sessions = sessions.filter((s: any) => s.groups.includes(group));
    }
    if (day && day !== "All") {
      sessions = sessions.filter((s: any) => s.day === day);
    }
    if (dept && dept !== "All") {
      sessions = sessions.filter((s: any) => 
        (s.department && s.department.toUpperCase() === dept.toUpperCase()) ||
        (s.course_id && s.course_id.startsWith(dept.toUpperCase()))
      );
    }

    return NextResponse.json(
      {
        dataset_id: schedule.dataset_id,
        team: schedule.team,
        total_sessions: sessions.length,
        sessions,
        rooms: citData.rooms || [],
        fest_week: schedule.fest_week,
        exams: schedule.exams,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error: any) {
    console.error("Failed to load schedule:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
