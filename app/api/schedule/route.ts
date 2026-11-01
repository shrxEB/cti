import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const group = searchParams.get("group");
    const day = searchParams.get("day");

    // Load master schedule from exports/schedule.json
    const schedulePath = path.join(process.cwd(), "exports", "schedule.json");
    const dataPath = path.join(process.cwd(), "starter_pack", "data", "cit_public.json");
    const requestsPath = path.join(process.cwd(), "exports", "academic_requests.json");

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
    if (fs.existsSync(requestsPath)) {
      try {
        const dayAbbrMap: Record<string, string> = {
          Monday: "MON", Tuesday: "TUE", Wednesday: "WED", Thursday: "THU", Friday: "FRI"
        };
        const academicRequests = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));
        const approvedRequests = academicRequests.filter((r: any) => r.status === "approved");

        approvedRequests.forEach((req: any) => {
          const periodMatch = req.period?.match(/P(\d+)/);
          const startPeriod = periodMatch ? parseInt(periodMatch[1], 10) : 2;
          const dayCode = dayAbbrMap[req.day] || req.day.slice(0, 3).toUpperCase();

          sessions.push({
            session_id: req.id,
            course_id: req.course.split(" ")[0],
            course_title: `${req.course} (Extra Class)`,
            kind: "lecture",
            groups: req.section ? [req.section] : ["Y1-A"],
            day: dayCode,
            start_period: startPeriod,
            duration: 1,
            room_id: req.venue,
            room_name: req.venue,
            faculty_name: req.faculty_name || "Faculty",
            size: 40,
            isExtraClass: true
          });
        });
      } catch (err) {
        console.error("Error loading approved requests into master schedule:", err);
      }
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

    return NextResponse.json({
      dataset_id: schedule.dataset_id,
      team: schedule.team,
      total_sessions: sessions.length,
      sessions,
      rooms: citData.rooms || [],
      fest_week: schedule.fest_week,
      exams: schedule.exams
    });
  } catch (error: any) {
    console.error("Failed to load schedule:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
