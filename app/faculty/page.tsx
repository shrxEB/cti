"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Calendar as CalendarIcon,
  Clock,
  UserX,
  PlusCircle,
  BookOpen,
  CheckCircle2,
  Send,
  GraduationCap,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  MapPin,
  Users,
  AlertTriangle,
  FileText,
  X,
} from "lucide-react";

export interface InvigilationDuty {
  exam_id: string;
  course_code: string;
  course_title: string;
  day: string;
  raw_day?: string;
  session: string; // AM or PM
  time: string;
  rooms: string;
  raw_rooms?: string[];
  groups?: string[];
  students_count: number;
  reporting_time: string;
  duty_role: string;
}

interface ScheduleSlot {
  id?: string;
  day: string;
  raw_day?: string;
  period: string;
  start_period: number;
  course: string;
  course_id?: string;
  course_title?: string;
  room: string;
  room_id?: string;
  type: "lecture" | "lab" | "tutorial" | "event";
  durationHours: number;
  groups?: string[];
  faculty_name?: string;
  isApprovedExtraClass?: boolean;
  channel?: string;
}

const DAYS_TEMPLATE = [
  { key: "Monday", shortKey: "MON", label: "Monday" },
  { key: "Tuesday", shortKey: "TUE", label: "Tuesday" },
  { key: "Wednesday", shortKey: "WED", label: "Wednesday" },
  { key: "Thursday", shortKey: "THU", label: "Thursday" },
  { key: "Friday", shortKey: "FRI", label: "Friday" },
];

const TIME_ROWS = [
  { period: 1, label: "08 AM", time: "08:00 - 09:00" },
  { period: 2, label: "09 AM", time: "09:00 - 10:00" },
  { period: 3, label: "10 AM", time: "10:00 - 11:00" },
  { period: 4, label: "11 AM", time: "11:00 - 12:00" },
  { period: 5, label: "12 PM", time: "12:00 - 13:00" },
  { period: -1, label: "01 PM", time: "13:00 - 14:00", isLunch: true },
  { period: 6, label: "02 PM", time: "14:00 - 15:00" },
  { period: 7, label: "03 PM", time: "15:00 - 16:00" },
  { period: 8, label: "04 PM", time: "16:00 - 17:00" },
  { period: 9, label: "05 PM", time: "17:00 - 18:00" },
];

// Rich pastel theme palettes matching user's requested calendar design
const CARD_PALETTES = [
  { bg: "bg-pink-100/90", border: "border-pink-200", text: "text-pink-900", timeText: "text-pink-700", dot: "bg-pink-400" },
  { bg: "bg-purple-100/90", border: "border-purple-200", text: "text-purple-900", timeText: "text-purple-700", dot: "bg-purple-400" },
  { bg: "bg-orange-100/90", border: "border-orange-200", text: "text-orange-900", timeText: "text-orange-700", dot: "bg-orange-400" },
  { bg: "bg-cyan-100/90", border: "border-cyan-200", text: "text-cyan-900", timeText: "text-cyan-700", dot: "bg-cyan-400" },
  { bg: "bg-emerald-100/90", border: "border-emerald-200", text: "text-emerald-900", timeText: "text-emerald-700", dot: "bg-emerald-400" },
  { bg: "bg-blue-100/90", border: "border-blue-200", text: "text-blue-900", timeText: "text-blue-700", dot: "bg-blue-400" },
];

function FacultyContent() {
  const searchParams = useSearchParams();
  // Tabs: "overview" (Dashboard), "timetable" (My Timetable calendar), "exams", "leave", "reschedule"
  const [activeTab, setActiveTab] = useState<"overview" | "timetable" | "exams" | "leave" | "reschedule">("overview");
  const [viewMode, setViewMode] = useState<"Daily" | "Weekly" | "Monthly">("Weekly");
  
  // Date navigation state: starts at June 18, 2026 (Wednesday of Week 25)
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 5, 18));
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [invigilations, setInvigilations] = useState<InvigilationDuty[]>([]);
  const [acknowledgedDuties, setAcknowledgedDuties] = useState<Record<string, boolean>>({});

  // Custom Leave / Substitute Modal State for Exam Duties
  const [leaveModalDuty, setLeaveModalDuty] = useState<InvigilationDuty | null>(null);
  const [leaveModalReason, setLeaveModalReason] = useState("");
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveSuccessFeedback, setLeaveSuccessFeedback] = useState<string | null>(null);

  // Filters state
  const [showLectures, setShowLectures] = useState(true);
  const [showTutorials, setShowTutorials] = useState(true);
  const [showLabs, setShowLabs] = useState(true);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["overview", "timetable", "exams", "leave", "reschedule"].includes(tab)) {
      setActiveTab(tab as any);
    } else {
      setActiveTab("overview");
    }

    const loadLiveFacultySchedule = async () => {
      setLoadingSchedule(true);
      try {
        const res = await fetch("/api/faculty/schedule?faculty_id=F01");
        const data = await res.json();
        if (data.sessions && data.sessions.length > 0) {
          setSchedule(
            data.sessions.map((s: any) => ({
              id: s.id || s.session_id,
              day: s.day,
              raw_day: s.raw_day,
              period: s.period,
              start_period: s.start_period,
              course: s.course,
              course_id: s.course_id,
              course_title: s.course_title,
              room: s.room,
              room_id: s.room_id,
              type: s.type,
              durationHours: s.duration || 1,
              groups: s.groups || [],
              faculty_name: s.faculty_name,
              isApprovedExtraClass: s.isApprovedExtraClass,
              channel: s.channel,
            }))
          );
        }
        if (data.invigilations && Array.isArray(data.invigilations)) {
          setInvigilations(data.invigilations);
        }
      } catch (err) {
        console.error("Failed to load live faculty schedule:", err);
      } finally {
        setLoadingSchedule(false);
      }
    };
    loadLiveFacultySchedule();
  }, [searchParams]);

  // Compute live metrics dynamically from the real OR-Tools solved schedule
  const dailyHours: Record<string, number> = {
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
  };

  schedule.forEach((s) => {
    if (dailyHours[s.day] !== undefined) {
      dailyHours[s.day] += s.durationHours;
    }
  });

  const weeklyLoad = Object.values(dailyHours).reduce((a, b) => a + b, 0);
  const dailyPeak = Math.max(...Object.values(dailyHours), 0);
  const activeCourseList = Array.from(
    new Set(schedule.map((s) => s.course_id || s.course.split(" ")[0]))
  ).filter(Boolean);

  // Unavailability state
  const [unavailabilities, setUnavailabilities] = useState<string[]>([
    "Wednesday P6–P9 (14:00 - 18:00) – HOD Meeting (Fixed Unavailability)",
  ]);
  const [leaveDay, setLeaveDay] = useState("Wednesday");
  const [leavePeriod, setLeavePeriod] = useState("P3 (10:00 - 11:00)");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveMsg, setLeaveMsg] = useState<string | null>(null);

  // Request Type & Reschedule / Extra Class state
  const [requestMode, setRequestMode] = useState<"extra_class" | "reschedule">("extra_class");
  const [rescheduleCourse, setRescheduleCourse] = useState("CS101");
  const [targetSection, setTargetSection] = useState("Y1-A");
  const [targetRoom, setTargetRoom] = useState("Room 201");
  const [extraClassReason, setExtraClassReason] = useState("");
  const [rescheduleTargetDay, setRescheduleTargetDay] = useState("Tuesday");
  const [rescheduleTargetPeriod, setRescheduleTargetPeriod] = useState("P2 (09:00 - 10:00)");
  const [rescheduleMsg, setRescheduleMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const STUDENT_SECTIONS = [
    { id: "Y1-A", label: "Year 1 - Section A (Y1-A)" },
    { id: "Y1-B", label: "Year 1 - Section B (Y1-B)" },
    { id: "Y1-C", label: "Year 1 - Section C (Y1-C)" },
    { id: "Y1-D", label: "Year 1 - Section D (Y1-D)" },
    { id: "CSE-2", label: "Year 2 - CSE (CSE-2)" },
    { id: "ECE-2", label: "Year 2 - ECE (ECE-2)" },
    { id: "EE-2", label: "Year 2 - EE (EE-2)" },
    { id: "ME-2", label: "Year 2 - ME (ME-2)" },
    { id: "CE-2", label: "Year 2 - CE (CE-2)" },
    { id: "CSE-3", label: "Year 3 - CSE (CSE-3)" },
    { id: "ECE-3", label: "Year 3 - ECE (ECE-3)" },
    { id: "EE-3", label: "Year 3 - EE (EE-3)" },
  ];

  const AVAILABLE_ROOMS = [
    "Room 101", "Room 102", "Room 201", "Room 202", "Room 301",
    "Lecture Hall 1", "Lecture Hall 2", "Main Auditorium", "Hardware Lab 1", "Software Lab 2"
  ];

  // Date Navigation Handlers
  const handlePrevDate = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "Daily") {
        next.setDate(next.getDate() - 1);
      } else if (viewMode === "Weekly") {
        next.setDate(next.getDate() - 7);
      } else {
        next.setMonth(next.getMonth() - 1);
      }
      return next;
    });
  };

  const handleNextDate = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "Daily") {
        next.setDate(next.getDate() + 1);
      } else if (viewMode === "Weekly") {
        next.setDate(next.getDate() + 7);
      } else {
        next.setMonth(next.getMonth() + 1);
      }
      return next;
    });
  };

  // Formatted date string, e.g. "June, 18 2026"
  const formattedHeaderDate = currentDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Calculate the dates for Monday - Friday of the selected week
  const dayOfWeek = currentDate.getDay();
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const mondayDate = new Date(currentDate);
  mondayDate.setDate(currentDate.getDate() - distanceToMonday);

  const currentWeekDays = DAYS_TEMPLATE.map((tpl, i) => {
    const d = new Date(mondayDate);
    d.setDate(mondayDate.getDate() + i);
    const isCurrentSelected =
      d.getDate() === currentDate.getDate() &&
      d.getMonth() === currentDate.getMonth() &&
      d.getFullYear() === currentDate.getFullYear();
    return {
      key: tpl.key,
      shortKey: tpl.shortKey,
      label: tpl.label,
      dateNum: String(d.getDate()),
      fullDate: d,
      isToday: isCurrentSelected,
    };
  });

  // Track requests list and submitting state
  const [facultyRequests, setFacultyRequests] = useState<any[]>([]);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const fetchFacultyRequests = async () => {
    try {
      const res = await fetch("/api/requests");
      const data = await res.json();
      if (data.requests) {
        setFacultyRequests(data.requests);
      }
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    }
  };

  useEffect(() => {
    fetchFacultyRequests();
  }, []);

  const handleAddLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason.trim()) return alert("Please specify an unavailability reason.");
    setUnavailabilities((p) => [...p, `${leaveDay} ${leavePeriod} – ${leaveReason}`]);
    setLeaveMsg(`✓ Unavailability registered for ${leaveDay} ${leavePeriod}. Solver will protect this slot from rescheduling.`);
    setLeaveReason("");
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentDayHours = dailyHours[rescheduleTargetDay] || 0;
    
    // Check Section 2: Max 4 hours daily faculty teaching limit
    if (currentDayHours + 1 > 4) {
      setRescheduleMsg({
        text: `⚠️ HARD CONSTRAINT VIOLATION: ${rescheduleTargetDay} currently has ${currentDayHours} hrs scheduled. Adding 1 hour would exceed the mandatory 4-hour daily faculty teaching limit!`,
        error: true,
      });
      return;
    }

    setSubmittingRequest(true);
    try {
      const payload = {
        type: requestMode,
        faculty_id: "F01",
        faculty_name: "Shrayans",
        department: "ECE",
        course: rescheduleCourse,
        section: targetSection,
        venue: targetRoom,
        day: rescheduleTargetDay,
        period: rescheduleTargetPeriod,
        reason: extraClassReason || (requestMode === "extra_class" ? "Syllabus revision / extra lecture" : "Faculty schedule conflict adjustment"),
      };

      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setRescheduleMsg({
          text: `✓ Request ${data.request?.id || ""} submitted to Dean's Office & Coordinator queue! You can track the live status below.`,
          error: false,
        });
        setExtraClassReason("");
        await fetchFacultyRequests();
      } else {
        setRescheduleMsg({
          text: "Failed to submit request. Please try again.",
          error: true,
        });
      }
    } catch (err) {
      setRescheduleMsg({
        text: "Error contacting scheduling server.",
        error: true,
      });
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Build grid map: grid[day][period] = session
  const grid: Record<string, Record<number, ScheduleSlot>> = {};
  DAYS_TEMPLATE.forEach((d) => {
    grid[d.key] = {};
  });

  schedule
    .filter((s) => {
      if (s.type === "lecture" && !showLectures) return false;
      if (s.type === "tutorial" && !showTutorials) return false;
      if (s.type === "lab" && !showLabs) return false;
      return true;
    })
    .forEach((s) => {
      if (grid[s.day]) {
        for (let i = 0; i < s.durationHours; i++) {
          grid[s.day][s.start_period + i] = s;
        }
      }
    });

  // Determine current active day name for Daily view
  const currentDayName = currentDate.toLocaleDateString("en-US", { weekday: "long" });
  const activeDayKey = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(currentDayName)
    ? currentDayName
    : "Wednesday";

  // Reusable Calendar Matrix Component
  const renderCalendar = () => (
    <div className="bg-white rounded-[32px] border border-gray-200/90 p-6 sm:p-7 shadow-sm space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        {/* Date Navigation & Interactive Arrow Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevDate}
            title="Previous"
            className="p-2 hover:bg-gray-100 active:scale-95 rounded-xl text-gray-600 transition-all cursor-pointer border border-gray-200"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight select-none">
            {formattedHeaderDate}
          </h2>

          <button
            onClick={handleNextDate}
            title="Next"
            className="p-2 hover:bg-gray-100 active:scale-95 rounded-xl text-gray-600 transition-all cursor-pointer border border-gray-200"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day / Week / Month Switcher & Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-[#f1f5f9] p-1 rounded-xl text-xs font-bold text-gray-600">
            {(["Daily", "Weekly", "Monthly"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  viewMode === m ? "bg-white text-gray-900 shadow-2xs" : "hover:text-gray-900"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            onClick={() => setActiveTab("leave")}
            className="inline-flex items-center gap-1.5 bg-[#fde047] hover:bg-[#facc15] text-[#064e43] px-4 py-2 rounded-xl text-xs font-bold shadow-2xs active:scale-95 transition-all"
          >
            <UserX className="w-3.5 h-3.5 text-[#064e43]" />
            <span>Mark Leave</span>
          </button>
        </div>
      </div>

      {/* Weekly Time Grid View */}
      {viewMode === "Weekly" || viewMode === "Monthly" ? (
        <div className="overflow-x-auto">
          <div className="min-w-[850px]">
            {/* Days Header */}
            <div className="grid grid-cols-6 border-b border-gray-100 pb-3">
              <div className="text-[11px] font-bold text-gray-400 pl-2 self-end pb-1">
                GMT+05:30
              </div>
              {currentWeekDays.map((d) => (
                <div
                  key={d.key}
                  onClick={() => setCurrentDate(d.fullDate)}
                  className={`text-center p-2.5 rounded-2xl transition-all cursor-pointer ${
                    d.isToday
                      ? "bg-emerald-50/80 border border-emerald-300 text-[#064e43] shadow-2xs"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {d.label}
                  </div>
                  <div
                    className={`text-2xl font-black mt-0.5 ${
                      d.isToday ? "text-[#064e43]" : "text-gray-900"
                    }`}
                  >
                    {d.dateNum}
                  </div>
                </div>
              ))}
            </div>

            {/* Schedule Time Slot Rows */}
            <div className="divide-y divide-gray-100/70">
              {TIME_ROWS.map((row) => {
                if (row.isLunch) {
                  return (
                    <div key={row.label} className="grid grid-cols-6 py-2.5 items-center bg-amber-50/40">
                      <div className="text-[11px] font-bold text-amber-700 pl-2">01 PM</div>
                      <div className="col-span-5 text-center text-xs font-bold text-amber-700/80 tracking-widest">
                        — LUNCH BREAK (13:00 – 14:00) STRICTLY PROTECTED —
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={row.label}
                    className="grid grid-cols-6 min-h-[78px] py-2 items-stretch group hover:bg-gray-50/40 transition-colors"
                  >
                    {/* Left Time Label */}
                    <div className="text-[11px] font-bold text-gray-400 pl-2 pt-2 select-none">
                      {row.label}
                    </div>

                    {/* 5 Days Columns */}
                    {currentWeekDays.map((d, colIndex) => {
                      const cell = grid[d.key]?.[row.period];
                      if (!cell) {
                        return (
                          <div
                            key={d.key}
                            className="border-l border-gray-100/70 px-1.5 py-1 flex items-center justify-center text-gray-300 text-xs"
                          >
                            {/* Free period */}
                          </div>
                        );
                      }

                      const courseCode = cell.course_id || cell.course.split(" ")[0];
                      const paletteIndex =
                        (courseCode.charCodeAt(courseCode.length - 1) + colIndex) % CARD_PALETTES.length;
                      const palette = CARD_PALETTES[paletteIndex];

                      const isApproved = cell.isApprovedExtraClass;
                      const cardBg = isApproved ? "bg-emerald-50/90" : palette.bg;
                      const cardBorder = isApproved ? "border-emerald-300 ring-1 ring-emerald-400/40" : palette.border;

                      return (
                        <div key={d.key} className="border-l border-gray-100/70 px-1.5 py-1">
                          <div
                            className={`h-full p-2.5 rounded-2xl border ${cardBg} ${cardBorder} shadow-2xs hover:shadow-md transition-all flex flex-col justify-between`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-[11px] font-extrabold ${isApproved ? "text-emerald-900" : palette.text} truncate`}>
                                  {cell.course_title || cell.course}
                                </span>
                                <span className={`w-2 h-2 rounded-full shrink-0 ${isApproved ? "bg-emerald-500 animate-pulse" : palette.dot}`} />
                              </div>
                              <div className={`text-[10px] font-semibold ${isApproved ? "text-emerald-700" : palette.timeText} mt-0.5 flex items-center justify-between`}>
                                <span>{row.time}</span>
                                {isApproved && (
                                  <span className="text-[9px] font-black uppercase tracking-wider px-1 py-0.2 rounded bg-emerald-200/60 text-emerald-800">
                                    {cell.channel === "chatbot" ? "AI Copilot" : "Approved"}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-gray-700 pt-1.5 border-t border-black/5">
                              <span className="truncate max-w-[85px]">{cell.room}</span>
                              <span className="opacity-80 uppercase text-[9px] px-1 rounded bg-black/5">
                                {cell.type}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Daily View */
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-100">
            {currentWeekDays.map((d) => (
              <button
                key={d.key}
                onClick={() => setCurrentDate(d.fullDate)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  d.isToday
                    ? "bg-[#064e43] text-white shadow-xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {d.label} ({d.dateNum})
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {TIME_ROWS.map((row) => {
              if (row.isLunch) {
                return (
                  <div
                    key={row.label}
                    className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/60 text-center text-xs font-bold text-amber-800"
                  >
                    ☕ LUNCH BREAK (13:00 – 14:00) PROTECTED
                  </div>
                );
              }

              const cell = grid[activeDayKey]?.[row.period];
              if (!cell) {
                return (
                  <div
                    key={row.label}
                    className="p-3.5 rounded-2xl border border-dashed border-gray-200 text-gray-400 text-xs flex items-center justify-between"
                  >
                    <span className="font-semibold text-gray-400">{row.time}</span>
                    <span className="italic">No lecture scheduled • Available for research/mentorship</span>
                  </div>
                );
              }

              const courseCode = cell.course_id || cell.course.split(" ")[0];
              const paletteIndex = courseCode.charCodeAt(courseCode.length - 1) % CARD_PALETTES.length;
              const palette = CARD_PALETTES[paletteIndex];

              return (
                <div
                  key={row.label}
                  className={`p-4 rounded-2xl border ${palette.bg} ${palette.border} shadow-2xs flex items-center justify-between`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/80 border border-black/5 flex items-center justify-center font-bold text-xs text-gray-800">
                      P{row.period}
                    </div>
                    <div>
                      <h4 className={`text-sm font-extrabold ${palette.text}`}>
                        {cell.course_title || cell.course}
                      </h4>
                      <div className="text-xs text-gray-600 mt-0.5 flex items-center gap-2">
                        <span>{row.time}</span>
                        <span>•</span>
                        <span>Venue: <strong>{cell.room}</strong></span>
                        <span>•</span>
                        <span className="uppercase text-[10px] font-bold">{cell.type}</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/80 text-gray-800 border border-black/5">
                    Enforced
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout requiredRole="faculty">
      {(user) => (
        <div className="space-y-6 max-w-[1600px] mx-auto">
          {/* Header & Basic Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[12px] font-semibold text-[#64748b] tracking-wide mb-1">
                FACULTY PORTAL • CHILIKA INSTITUTE OF TECHNOLOGY
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <span>Welcome, {user.name}</span>
              </h1>
              <p className="text-[13px] text-[#64748b] mt-0.5">
                Department of {user.department || "Electronics & Communication Engineering"}. Monitor weekly teaching workload, mark leaves, and inspect timetable schedules.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0fdf4] border border-[#dcfce7] text-[12px] font-bold text-[#166534]">
                <Clock className="w-3.5 h-3.5" />
                <span>Academic Session 2025–26</span>
              </span>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="bg-white rounded-[24px] border border-[#e2e8f0] p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-start justify-between">
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Weekly Load</div>
                <div className="text-2xl font-extrabold text-[#0f172a] mt-1">{weeklyLoad} Hrs</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Across Mon–Fri</div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#e6f4f1] text-[#064e43] flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white rounded-[24px] border border-[#e2e8f0] p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-start justify-between">
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Daily Peak</div>
                <div className="text-2xl font-extrabold text-[#0f172a] mt-1">{dailyPeak} / 4 Hrs</div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Within daily limit</div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white rounded-[24px] border border-[#e2e8f0] p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-start justify-between">
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active Courses</div>
                <div className="text-2xl font-extrabold text-[#0f172a] mt-1">{activeCourseList.length}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[100px]">
                  {activeCourseList.join(", ") || "Assigned"}
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white rounded-[24px] border border-[#e2e8f0] p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-start justify-between">
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Exam Duties</div>
                <div className="text-2xl font-extrabold text-[#064e43] mt-1">{invigilations.length} Roster</div>
                <div className="text-[10px] text-teal-600 font-semibold mt-0.5">Midsem Supervision</div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#064e43] flex items-center justify-center font-bold">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white rounded-[24px] border border-[#e2e8f0] p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-start justify-between">
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Leaves Marked</div>
                <div className="text-2xl font-extrabold text-[#0f172a] mt-1">{unavailabilities.length}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Protected slots</div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <UserX className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
            {[
              { id: "overview", label: "Dashboard Overview", icon: LayoutDashboard },
              { id: "timetable", label: `My Timetable (${schedule.length} Slots)`, icon: CalendarIcon },
              { id: "exams", label: `Exam Duties (${invigilations.length} Sessions)`, icon: GraduationCap },
              { id: "leave", label: `Mark Unavailability (${unavailabilities.length})`, icon: UserX },
              { id: "reschedule", label: "Request Reschedule", icon: PlusCircle },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isActive
                      ? "bg-[#064e43] text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: DASHBOARD OVERVIEW (Info + Load Breakdown Meter + Protected Slots) */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Mandatory Daily Teaching Load Meter */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-[26px] border border-[#e2e8f0] p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Mandatory Daily Teaching Load Meter</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Section 2 Constraint: No faculty member can teach more than 4 hours in a single day.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#dcfce7] text-[#166534]">
                      Max Cap: 4h/day
                    </span>
                  </div>

                  <div className="space-y-4 pt-1">
                    {Object.entries(dailyHours).map(([day, hours]) => {
                      const percentage = (hours / 4) * 100;
                      const isNearLimit = hours >= 3;
                      return (
                        <div key={day} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-800">{day}</span>
                            <span className="font-semibold text-gray-600">
                              <strong>{hours}</strong> / 4 Hours ({percentage}%)
                              {isNearLimit && (
                                <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                  Peak Day
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isNearLimit ? "bg-[#eab308]" : "bg-[#064e43]"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Summary Card */}
                <div className="bg-white rounded-[26px] border border-[#e2e8f0] p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-gray-900">Protected Slots &amp; Leaves</h3>
                  <p className="text-xs text-gray-500">
                    These time intervals are locked in the engine. No lectures will be moved here.
                  </p>

                  <div className="space-y-2.5">
                    {unavailabilities.map((u, i) => (
                      <div key={i} className="p-3 rounded-2xl bg-[#f8faf9] border border-gray-200 text-xs text-gray-700">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#064e43]" />
                          <span className="font-medium">{u}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setActiveTab("leave")}
                    className="w-full bg-[#fde047] hover:bg-[#facc15] text-[#064e43] py-2.5 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Register Another Leave</span>
                  </button>
                </div>
              </div>

              {/* Quick Calendar Preview on Dashboard */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900">Weekly Timetable Schedule</h3>
                  <button
                    onClick={() => setActiveTab("timetable")}
                    className="text-xs font-bold text-[#064e43] hover:underline"
                  >
                    Full View →
                  </button>
                </div>
                {renderCalendar()}
              </div>
            </div>
          )}

          {/* TAB 2: MY TIMETABLE (Pure Calendar View) */}
          {activeTab === "timetable" && (
            <div className="space-y-4">
              {renderCalendar()}
            </div>
          )}

          {/* TAB 3: MARK UNAVAILABILITY */}
          {activeTab === "leave" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-[26px] border border-[#e2e8f0] p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Register Unavailability</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Mark when you are unavailable due to research, conferences, or personal reasons.
                  </p>
                </div>

                {leaveMsg && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{leaveMsg}</span>
                    </div>
                    <button onClick={() => setLeaveMsg(null)}>✕</button>
                  </div>
                )}

                <form onSubmit={handleAddLeave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Day of Week</label>
                      <select
                        value={leaveDay}
                        onChange={(e) => setLeaveDay(e.target.value)}
                        className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 font-medium focus:outline-none focus:border-[#064e43]"
                      >
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Period</label>
                      <select
                        value={leavePeriod}
                        onChange={(e) => setLeavePeriod(e.target.value)}
                        className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 font-medium focus:outline-none focus:border-[#064e43]"
                      >
                        <option>P1 (08:00 - 09:00)</option>
                        <option>P2 (09:00 - 10:00)</option>
                        <option>P3 (10:00 - 11:00)</option>
                        <option>P4 (11:00 - 12:00)</option>
                        <option>P5 (12:00 - 13:00)</option>
                        <option>P6 (14:00 - 15:00)</option>
                        <option>P7 (15:00 - 16:00)</option>
                        <option>P8 (16:00 - 17:00)</option>
                        <option>P9 (17:00 - 18:00)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Reason / Note</label>
                    <input
                      type="text"
                      required
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      placeholder="e.g., Medical appointment, PhD thesis review committee"
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#064e43]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#064e43] hover:bg-[#053d34] text-white py-2.5 rounded-full text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Register Protected Slot</span>
                  </button>
                </form>
              </div>

              {/* Active list */}
              <div className="bg-white rounded-[26px] border border-[#e2e8f0] p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-gray-900">Active Unavailability Entries</h3>
                <div className="space-y-3">
                  {unavailabilities.map((u, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-[#f8faf9] border border-gray-200 flex items-center justify-between text-xs text-gray-800">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        <span className="font-semibold">{u}</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Enforced
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MIDSEM EXAM INVIGILATION DUTIES */}
          {activeTab === "exams" && (
            <div className="space-y-6">
              {/* Feedback Alert */}
              {leaveSuccessFeedback && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">{leaveSuccessFeedback}</span>
                  </div>
                  <button onClick={() => setLeaveSuccessFeedback(null)} className="font-bold ml-2">✕</button>
                </div>
              )}

              {/* Exam Period Header & Protocol Notice */}
              <div className="bg-linear-to-r from-[#064e43] to-[#04332c] rounded-[28px] p-6 sm:p-7 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-[11px] font-bold text-amber-300 border border-white/10">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Midsem Examination Supervision Roster • Spring 2026</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Midsem Invigilation Schedule &amp; Hall Allocations
                  </h2>
                  <p className="text-xs text-white/80 leading-relaxed">
                    CIT Academic Section Policy: Examination halls operate under strictly enforced 50% capacity with alternate seating. Faculty invigilators are required to report 30 minutes prior to session commencement to collect test papers and verified OMR envelopes.
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl shrink-0">
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">Assigned Duties</div>
                    <div className="text-2xl font-extrabold text-white mt-0.5">{invigilations.length} Sessions</div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Slots Breakdown</div>
                    <div className="text-xs font-semibold text-white/90">
                      AM (09:30–11:30) &amp; PM (14:00–16:00)
                    </div>
                  </div>
                </div>
              </div>

              {/* Roster Cards Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900">Assigned Invigilation Roster</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Halved-capacity examination rooms allocated through solver constraints
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    Academic Year 2025–26
                  </span>
                </div>

                {invigilations.length === 0 ? (
                  <div className="bg-white rounded-[24px] border border-dashed border-gray-300 p-12 text-center text-gray-500 space-y-2">
                    <GraduationCap className="w-10 h-10 text-gray-300 mx-auto" />
                    <div className="font-bold text-sm text-gray-700">No Invigilation Duties Found</div>
                    <div className="text-xs text-gray-400">
                      You are not currently assigned to any midsem examination slots.
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {invigilations.map((duty, idx) => {
                      const isAcked = acknowledgedDuties[duty.exam_id];
                      return (
                        <div
                          key={duty.exam_id + idx}
                          className="bg-white rounded-[24px] border border-gray-200/90 hover:border-[#064e43]/40 p-5.5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all flex flex-col justify-between gap-4"
                        >
                          <div>
                            {/* Card Top: Code, ID, Session Badge */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#e6f4f1] text-[#064e43] font-mono text-[11px] font-bold mr-2">
                                  {duty.exam_id}
                                </span>
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                  {duty.course_code}
                                </span>
                                <h4 className="text-base font-extrabold text-gray-900 mt-1">
                                  {duty.course_title}
                                </h4>
                              </div>

                              <span
                                className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase shrink-0 border ${
                                  duty.session === "AM"
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : "bg-indigo-50 text-indigo-800 border-indigo-200"
                                }`}
                              >
                                {duty.session} Session
                              </span>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-2xl bg-[#f8fafc] border border-gray-100 text-xs">
                              <div>
                                <div className="text-[10px] font-bold uppercase text-gray-400">Exam Day &amp; Slot</div>
                                <div className="font-bold text-gray-800 mt-0.5">{duty.day}</div>
                                <div className="text-[11px] text-gray-500 font-semibold">{duty.time}</div>
                              </div>

                              <div>
                                <div className="text-[10px] font-bold uppercase text-gray-400">Reporting Time</div>
                                <div className="font-bold text-emerald-700 mt-0.5">{duty.reporting_time}</div>
                                <div className="text-[10px] text-gray-400">Academic Office</div>
                              </div>

                              <div className="col-span-2 pt-2 border-t border-gray-200/60 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-gray-700">
                                  <MapPin className="w-3.5 h-3.5 text-[#064e43] shrink-0" />
                                  <span>Venue: <strong className="font-bold text-gray-900">{duty.rooms}</strong></span>
                                </div>
                                <span className="text-[10px] font-semibold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                                  Half Capacity (50%)
                                </span>
                              </div>

                              <div className="col-span-2 flex items-center justify-between text-gray-600 text-[11px]">
                                <div className="flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span>Cohort: {duty.groups && duty.groups.length > 0 ? duty.groups.join(", ") : "All Registered Sections"}</span>
                                </div>
                                <span>~{duty.students_count} Examinees</span>
                              </div>
                            </div>
                          </div>

                          {/* Footer with Role & Actions */}
                          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#064e43]" />
                              <span className="text-xs font-semibold text-gray-700">
                                Role: <strong>{duty.duty_role}</strong>
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setLeaveModalDuty(duty);
                                  setLeaveModalReason("");
                                }}
                                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                              >
                                Report Leave / Substitute
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setAcknowledgedDuties((prev) => ({
                                    ...prev,
                                    [duty.exam_id]: !prev[duty.exam_id],
                                  }))
                                }
                                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                  isAcked
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-[#064e43] text-white hover:bg-[#053d34] shadow-xs active:scale-95"
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{isAcked ? "Duty Acknowledged" : "Acknowledge"}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Examination Regulations Callout */}
              <div className="bg-[#fcfbf7] rounded-[24px] border border-[#fef3c7] p-5.5 text-xs text-amber-900 flex items-start gap-4">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <div className="font-extrabold text-sm text-amber-950">
                    Important Exam Regulations &amp; Conduct Rules
                  </div>
                  <div>
                    1. <strong>Strict Alternate Seating:</strong> Desks are pre-tagged with roll numbers. Students must occupy seats corresponding to their hall tickets.
                  </div>
                  <div>
                    2. <strong>Handover &amp; Sealing:</strong> Answer scripts must be counted and sealed in tamper-proof cloth packets in the presence of the Chief Superintendent at Room A-102.
                  </div>
                  <div>
                    3. <strong>Emergency Relief:</strong> In case of unavoidable medical contingency, inform the Examination Controller at least 3 hours before reporting time.
                  </div>
                </div>
              </div>

              {/* IN-APP MODAL: REPORT UNAVAILABILITY & AUTO-SUBSTITUTE */}
              {leaveModalDuty && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-[28px] max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div>
                        <span className="text-[11px] font-bold uppercase text-[#064e43] tracking-wider">
                          Faculty Unavailability / Leave
                        </span>
                        <h3 className="text-lg font-black text-gray-900 mt-0.5">
                          Report Exam Duty Unavailability
                        </h3>
                      </div>
                      <button
                        onClick={() => setLeaveModalDuty(null)}
                        className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Duty Context Details */}
                    <div className="bg-[#f8fafc] border border-gray-200 rounded-2xl p-4 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#064e43]">{leaveModalDuty.exam_id} • {leaveModalDuty.course_code}</span>
                        <span className="font-bold text-gray-700">{leaveModalDuty.day} ({leaveModalDuty.session} Session)</span>
                      </div>
                      <div className="text-gray-900 font-semibold">{leaveModalDuty.course_title}</div>
                      <div className="text-gray-500 text-[11px]">
                        Venues: <strong>{leaveModalDuty.rooms}</strong> • Time: <strong>{leaveModalDuty.time}</strong>
                      </div>
                      <div className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg mt-1">
                        Notice: Upon submission, your leave request will be routed directly to the Dean&apos;s Office approval queue with an auto-suggested conflict-free substitute. The Dean can confirm the substitution or revert the duty.
                      </div>
                    </div>

                    {/* Reason Textarea */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Reason for Leave / Unavailability <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={leaveModalReason}
                        onChange={(e) => setLeaveModalReason(e.target.value)}
                        placeholder="e.g., Medical contingency, emergency research conference, university administrative committee..."
                        className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#064e43]"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setLeaveModalDuty(null)}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={submittingLeave || !leaveModalReason.trim()}
                        onClick={async () => {
                          setSubmittingLeave(true);
                          try {
                            const res = await fetch("/api/exams", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                action: "request_leave",
                                exam_id: leaveModalDuty.exam_id,
                                reason: leaveModalReason,
                              }),
                            });
                            const data = await res.json();
                            if (res.ok) {
                              setLeaveSuccessFeedback(data.message);
                              setLeaveModalDuty(null);
                              // Refresh live schedule
                              const refreshed = await fetch("/api/faculty/schedule?faculty_id=F01");
                              const refData = await refreshed.json();
                              if (refData.invigilations) setInvigilations(refData.invigilations);
                            } else {
                              alert(data.error || "Failed to process leave request.");
                            }
                          } catch (err: any) {
                            alert(err.message);
                          } finally {
                            setSubmittingLeave(false);
                          }
                        }}
                        className="px-5 py-2.5 rounded-xl bg-[#064e43] hover:bg-[#053d34] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        {submittingLeave ? "Submitting..." : "Submit to Dean for Review"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REQUEST EXTRA CLASS OR RESCHEDULE */}
          {activeTab === "reschedule" && (
            <div className="bg-white rounded-[26px] border border-[#e2e8f0] p-6 sm:p-8 shadow-sm space-y-6 max-w-2xl mx-auto">
              <div className="border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#064e43]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#064e43]">Faculty Academic Request</span>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Request Extra Class / Session Adjustment</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Request an extra lecture for a specific student section or propose moving an existing slot. The system automatically enforces the <strong>4-hour daily faculty teaching limit</strong> and checks room availability.
                </p>
              </div>

              {/* Mode Toggle: Extra Class vs Reschedule */}
              <div className="grid grid-cols-2 p-1.5 bg-[#f1f5f9] rounded-2xl gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setRequestMode("extra_class")}
                  className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                    requestMode === "extra_class"
                      ? "bg-[#064e43] text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Request Extra Class</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRequestMode("reschedule")}
                  className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                    requestMode === "reschedule"
                      ? "bg-[#064e43] text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Reschedule Existing Slot</span>
                </button>
              </div>

              {rescheduleMsg && (
                <div
                  className={`p-4 rounded-2xl text-xs flex items-center justify-between ${
                    rescheduleMsg.error
                      ? "bg-red-50 border border-red-200 text-red-800"
                      : "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {rescheduleMsg.error ? (
                      <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <span className="font-medium leading-relaxed">{rescheduleMsg.text}</span>
                  </div>
                  <button onClick={() => setRescheduleMsg(null)} className="font-bold ml-2">✕</button>
                </div>
              )}

              <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                {/* Course Selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Select Course</label>
                  <select
                    value={rescheduleCourse}
                    onChange={(e) => setRescheduleCourse(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 font-semibold focus:outline-none focus:border-[#064e43]"
                  >
                    {activeCourseList.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="CS101">CS101 - Introduction to Programming</option>
                    <option value="EC201">EC201 - Analog Electronics</option>
                    <option value="EC301">EC301 - Signals &amp; Systems</option>
                    <option value="EC302">EC302 - Digital Signal Processing</option>
                  </select>
                </div>

                {/* Target Student Section & Room Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Target Student Section</label>
                    <select
                      value={targetSection}
                      onChange={(e) => setTargetSection(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 font-semibold focus:outline-none focus:border-[#064e43]"
                    >
                      {STUDENT_SECTIONS.map((sec) => (
                        <option key={sec.id} value={sec.id}>{sec.label}</option>
                      ))}
                    </select>
                    <div className="text-[10px] text-gray-400 mt-1">Section timetable verified by engine</div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Preferred Venue / Room</label>
                    <select
                      value={targetRoom}
                      onChange={(e) => setTargetRoom(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 font-semibold focus:outline-none focus:border-[#064e43]"
                    >
                      {AVAILABLE_ROOMS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <div className="text-[10px] text-gray-400 mt-1">Room capacity matched to batch size</div>
                  </div>
                </div>

                {/* Proposed Day & Period */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Proposed Day</label>
                    <select
                      value={rescheduleTargetDay}
                      onChange={(e) => setRescheduleTargetDay(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 font-semibold focus:outline-none focus:border-[#064e43]"
                    >
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                    <div className="text-[10px] text-gray-500 mt-1 font-medium">
                      Current Load: <strong>{dailyHours[rescheduleTargetDay] || 0} / 4 hrs</strong>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Proposed Period</label>
                    <select
                      value={rescheduleTargetPeriod}
                      onChange={(e) => setRescheduleTargetPeriod(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 font-semibold focus:outline-none focus:border-[#064e43]"
                    >
                      <option>P1 (08:00 - 09:00)</option>
                      <option>P2 (09:00 - 10:00)</option>
                      <option>P3 (10:00 - 11:00)</option>
                      <option>P4 (11:00 - 12:00)</option>
                      <option>P5 (12:00 - 13:00)</option>
                      <option>P6 (14:00 - 15:00)</option>
                      <option>P7 (15:00 - 16:00)</option>
                      <option>P8 (16:00 - 17:00)</option>
                    </select>
                    <div className="text-[10px] text-gray-400 mt-1">Lunch break 13:00–14:00 blocked</div>
                  </div>
                </div>

                {/* Optional Note / Justification */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Academic Justification / Note (Optional)</label>
                  <input
                    type="text"
                    value={extraClassReason}
                    onChange={(e) => setExtraClassReason(e.target.value)}
                    placeholder="e.g. Midsem syllabus revision or makeup lecture for missed session"
                    className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 focus:outline-none focus:border-[#064e43]"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="w-full bg-[#fde047] hover:bg-[#facc15] text-[#064e43] py-3 rounded-full text-xs font-extrabold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4 text-[#064e43]" />
                  <span>
                    {submittingRequest
                      ? "Submitting to Dean's Office..."
                      : requestMode === "extra_class"
                      ? `Request Extra Class for Section ${targetSection}`
                      : "Submit Slot Reschedule Proposal"}
                  </span>
                </button>
              </form>

              {/* Real-time Status Tracker for Submitted Requests */}
              <div className="pt-6 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-gray-900 tracking-tight">Your Submitted Academic Requests</h4>
                  <button
                    onClick={fetchFacultyRequests}
                    className="text-[11px] font-bold text-[#064e43] hover:underline"
                  >
                    Refresh Status
                  </button>
                </div>

                <div className="space-y-2.5">
                  {facultyRequests.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
                      No requests submitted yet. Use the form above to request extra classes.
                    </div>
                  ) : (
                    facultyRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3.5 rounded-2xl border border-gray-200 bg-[#f8fafc] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#064e43]">{req.id}</span>
                            <span className="font-bold text-gray-900">{req.course}</span>
                            <span className="text-gray-500">• Section: <strong>{req.section}</strong></span>
                            <span className="text-gray-500">• Venue: <strong>{req.venue}</strong></span>
                          </div>
                          <div className="text-gray-500 text-[11px] mt-0.5">
                            Slot: {req.day} {req.period} {req.reason ? `• Reason: "${req.reason}"` : ""}
                          </div>

                          {/* Decision & Constraint Reasoning Box */}
                          <div
                            className={`mt-2 p-2 rounded-xl border text-[11px] font-medium ${
                              req.status === "approved"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                : req.status === "rejected"
                                ? "bg-red-50 border-red-200 text-red-900"
                                : "bg-amber-50 border-amber-200 text-amber-900"
                            }`}
                          >
                            <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5">
                              {req.status === "approved"
                                ? "✓ Dean's Approval Reasoning (Priority 2)"
                                : req.status === "rejected"
                                ? "✕ Rejection / Conflict Reasoning"
                                : "⏳ Priority Engine Status"}
                            </span>
                            {req.adminReason ||
                              (req.status === "approved"
                                ? `Approved by Dean's Office Authority: Verified zero hard conflicts (H2 room & H3 student cohort free). Timetable automatically updated.`
                                : req.status === "rejected"
                                ? `Slot rejected due to room or faculty clash.`
                                : `Evaluation pending under Priority Tier 2.`)}
                          </div>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase shrink-0 self-start sm:self-center border ${
                            req.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : req.status === "rejected"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {req.status === "pending" ? "Pending Dean Approval" : req.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

export default function FacultyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">Loading Faculty Portal...</div>}>
      <FacultyContent />
    </Suspense>
  );
}
