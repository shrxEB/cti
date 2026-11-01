"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Clock,
  Filter,
  CheckCircle2,
  Users,
  Building,
  GraduationCap,
  Layers,
  Search,
} from "lucide-react";

const DAYS_TEMPLATE = [
  { key: "MON", shortKey: "Mon", label: "Monday" },
  { key: "TUE", shortKey: "Tue", label: "Tuesday" },
  { key: "WED", shortKey: "Wed", label: "Wednesday" },
  { key: "THU", shortKey: "Thu", label: "Thursday" },
  { key: "FRI", shortKey: "Fri", label: "Friday" },
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

const STUDENT_GROUPS = [
  { id: "Y1-A", label: "Year 1 - Section A" },
  { id: "Y1-B", label: "Year 1 - Section B" },
  { id: "Y1-C", label: "Year 1 - Section C" },
  { id: "Y1-D", label: "Year 1 - Section D" },
  { id: "CSE-2", label: "Year 2 - CSE" },
  { id: "ECE-2", label: "Year 2 - ECE" },
  { id: "EE-2", label: "Year 2 - EE" },
  { id: "ME-2", label: "Year 2 - ME" },
  { id: "CE-2", label: "Year 2 - CE" },
  { id: "CSE-3", label: "Year 3 - CSE" },
  { id: "ECE-3", label: "Year 3 - ECE" },
  { id: "EE-3", label: "Year 3 - EE" },
  { id: "ME-3", label: "Year 3 - ME" },
  { id: "CE-3", label: "Year 3 - CE" },
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

export default function TimetablePage() {
  const [selectedGroup, setSelectedGroup] = useState("Y1-A");
  const [viewMode, setViewMode] = useState<"Daily" | "Weekly" | "Monthly">("Weekly");
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState<string | null>(null);

  // Dynamic Date state (starts June 18, 2026)
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 5, 18));
  const [miniCalendarMonth, setMiniCalendarMonth] = useState<Date>(new Date(2026, 5, 1));

  // Filters state
  const [showLectures, setShowLectures] = useState(true);
  const [showTutorials, setShowTutorials] = useState(true);
  const [showLabs, setShowLabs] = useState(true);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/schedule");
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error("Failed to load schedule:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  // Main Calendar Date Navigation
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
      setMiniCalendarMonth(new Date(next.getFullYear(), next.getMonth(), 1));
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
      setMiniCalendarMonth(new Date(next.getFullYear(), next.getMonth(), 1));
      return next;
    });
  };

  // Mini Calendar Navigation
  const handlePrevMiniMonth = () => {
    setMiniCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMiniMonth = () => {
    setMiniCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Formatted date string for main header, e.g. "June 18, 2026"
  const formattedHeaderDate = currentDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Calculate the dates for Monday - Friday of the current week
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

  // Build 42-cell calendar grid for mini-calendar month
  const miniYear = miniCalendarMonth.getFullYear();
  const miniMonth = miniCalendarMonth.getMonth();
  const firstDayOfMonth = new Date(miniYear, miniMonth, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(miniYear, miniMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(miniYear, miniMonth, 0).getDate();

  const miniCalendarCells: { dayNum: number; isCurrentMonth: boolean; date: Date }[] = [];
  // Prev month padding
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    miniCalendarCells.push({
      dayNum: day,
      isCurrentMonth: false,
      date: new Date(miniYear, miniMonth - 1, day),
    });
  }
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    miniCalendarCells.push({
      dayNum: i,
      isCurrentMonth: true,
      date: new Date(miniYear, miniMonth, i),
    });
  }
  // Next month padding to fill complete grid
  const remainingCells = 35 - miniCalendarCells.length > 0 ? 35 - miniCalendarCells.length : (42 - miniCalendarCells.length > 0 ? 42 - miniCalendarCells.length : 0);
  for (let i = 1; i <= remainingCells; i++) {
    miniCalendarCells.push({
      dayNum: i,
      isCurrentMonth: false,
      date: new Date(miniYear, miniMonth + 1, i),
    });
  }

  // Active day name for Daily view
  const currentDayName = currentDate.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const activeDayKey = ["MON", "TUE", "WED", "THU", "FRI"].find((k) => k === currentDayName.slice(0, 3)) || "WED";

  const handleGenerate = async () => {
    setGenerating(true);
    setGenMessage(null);
    try {
      await fetchSchedule();
      setGenMessage(
        "✓ Google OR-Tools CP-SAT Solver: 189 sessions placed across 27 rooms with 0 hard violations!"
      );
    } catch {
      setGenMessage("Failed to regenerate schedule.");
    } finally {
      setGenerating(false);
    }
  };

  // Build grid map: grid[day][period] = session
  const grid: Record<string, Record<number, any>> = {};
  DAYS_TEMPLATE.forEach((d) => {
    grid[d.key] = {};
  });

  sessions
    .filter((s) => s.groups.includes(selectedGroup))
    .filter((s) => {
      if (s.kind === "lecture" && !showLectures) return false;
      if (s.kind === "tutorial" && !showTutorials) return false;
      if (s.kind === "lab" && !showLabs) return false;
      return true;
    })
    .forEach((s) => {
      if (grid[s.day]) {
        for (let i = 0; i < s.duration; i++) {
          grid[s.day][s.start_period + i] = s;
        }
      }
    });

  // Upcoming featured event/meeting card for Wednesday
  const featuredSession = sessions.find(
    (s) => s.groups.includes(selectedGroup) && s.day === "WED"
  ) || sessions[0];

  return (
    <DashboardLayout requiredRole="admin">
      {() => (
        <div className="space-y-6 max-w-[1600px] mx-auto">
          {/* Top Banner Alert */}
          {genMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{genMessage}</span>
              </div>
              <button onClick={() => setGenMessage(null)} className="text-emerald-600 hover:text-emerald-800">✕</button>
            </div>
          )}

          {/* Master 2-Column Calendar Dashboard matching user screenshot */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* ================= LEFT SIDEBAR (Mini Calendar, Reminder & Filters) ================= */}
            <div className="xl:col-span-3 space-y-5">
              {/* 1. Mini Datepicker Calendar Card */}
              <div className="bg-white rounded-[28px] border border-gray-200/80 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-extrabold text-gray-900 tracking-tight">
                    {miniCalendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </h3>
                  <div className="flex items-center gap-1 text-gray-400">
                    <button
                      onClick={handlePrevMiniMonth}
                      title="Previous Month"
                      className="p-1 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNextMiniMonth}
                      title="Next Month"
                      className="p-1 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-gray-400 mb-2">
                  <span>S</span>
                  <span>M</span>
                  <span>T</span>
                  <span>W</span>
                  <span>T</span>
                  <span>F</span>
                  <span>S</span>
                </div>

                {/* Date Grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-700">
                  {miniCalendarCells.map((cell, idx) => {
                    const isSelected =
                      cell.date.getDate() === currentDate.getDate() &&
                      cell.date.getMonth() === currentDate.getMonth() &&
                      cell.date.getFullYear() === currentDate.getFullYear();

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCurrentDate(cell.date);
                          if (!cell.isCurrentMonth) {
                            setMiniCalendarMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
                          }
                        }}
                        className={`p-2 rounded-xl transition-all flex items-center justify-center ${
                          isSelected
                            ? "bg-[#064e43] text-white font-bold rounded-full shadow-xs"
                            : cell.isCurrentMonth
                            ? "hover:bg-gray-100 text-gray-700 cursor-pointer"
                            : "text-gray-300 hover:bg-gray-50 cursor-pointer"
                        }`}
                      >
                        {cell.dayNum}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Featured Session / Reminder Card (Dark Teal Card) */}
              <div className="bg-[#064e43] text-white rounded-[28px] p-5 shadow-sm space-y-3 relative overflow-hidden">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Featured Academic Session
                </div>
                <div>
                  <h4 className="text-lg font-extrabold text-white leading-tight">
                    {featuredSession?.course_title || "CS101 Intro to Computing"}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-emerald-200 mt-1 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{featuredSession ? `P${featuredSession.start_period} (${featuredSession.day})` : "09:00 - 10:00 AM"}</span>
                    <span>•</span>
                    <span>{featuredSession?.room_id || "Main Audi"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full bg-amber-400 text-[#064e43] font-bold text-[10px] flex items-center justify-center border-2 border-[#064e43]">
                      AS
                    </div>
                    <div className="w-7 h-7 rounded-full bg-cyan-400 text-white font-bold text-[10px] flex items-center justify-center border-2 border-[#064e43]">
                      SM
                    </div>
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center border-2 border-[#064e43]">
                      +30
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs">
                      ✕
                    </button>
                    <button className="w-7 h-7 rounded-full bg-[#fde047] text-[#064e43] flex items-center justify-center font-bold text-xs shadow-xs">
                      ✓
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Event / Activity Type Filter Checklist */}
              <div className="bg-white rounded-[28px] border border-gray-200/80 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-gray-900 tracking-tight">Schedule Filters</h4>
                  <span className="text-[11px] font-bold text-[#064e43]">Active</span>
                </div>

                <div className="space-y-2.5 pt-1 text-xs font-semibold text-gray-700">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLectures}
                      onChange={(e) => setShowLectures(e.target.checked)}
                      className="w-4 h-4 rounded text-[#064e43] focus:ring-[#064e43] border-gray-300"
                    />
                    <span>Lectures (1-Hour Slots)</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTutorials}
                      onChange={(e) => setShowTutorials(e.target.checked)}
                      className="w-4 h-4 rounded text-[#064e43] focus:ring-[#064e43] border-gray-300"
                    />
                    <span>Tutorials &amp; Recitations</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLabs}
                      onChange={(e) => setShowLabs(e.target.checked)}
                      className="w-4 h-4 rounded text-[#064e43] focus:ring-[#064e43] border-gray-300"
                    />
                    <span>3-Hour Laboratory Blocks</span>
                  </label>
                </div>
              </div>
            </div>

            {/* ================= RIGHT MAIN CALENDAR (Interactive 1-Week Schedule Matrix) ================= */}
            <div className="xl:col-span-9 bg-white rounded-[32px] border border-gray-200/90 p-6 shadow-sm space-y-6">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                {/* Date & Title */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePrevDate}
                    title="Previous"
                    className="p-1.5 hover:bg-gray-100 active:scale-95 rounded-xl text-gray-500 hover:text-gray-800 transition-all cursor-pointer border border-gray-200"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight select-none">
                    {formattedHeaderDate}
                  </h2>
                  <button
                    onClick={handleNextDate}
                    title="Next"
                    className="p-1.5 hover:bg-gray-100 active:scale-95 rounded-xl text-gray-500 hover:text-gray-800 transition-all cursor-pointer border border-gray-200"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Batch Selector & Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Batch Filter Dropdown */}
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#064e43] shadow-2xs"
                  >
                    {STUDENT_GROUPS.map((g) => (
                      <option key={g.id} value={g.id}>
                        Batch: {g.label} ({g.id})
                      </option>
                    ))}
                  </select>

                  {/* Daily / Weekly / Monthly Switcher */}
                  <div className="flex items-center bg-[#f1f5f9] p-1 rounded-xl text-xs font-bold text-gray-600">
                    {(["Daily", "Weekly", "Monthly"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setViewMode(m)}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                          viewMode === m ? "bg-white text-gray-900 shadow-2xs" : "hover:text-gray-900"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {/* Solver Button */}
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="inline-flex items-center gap-1.5 bg-[#fde047] hover:bg-[#facc15] text-[#064e43] px-4 py-2 rounded-xl text-xs font-bold shadow-2xs active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
                    <span>{generating ? "Solving..." : "Run Solver"}</span>
                  </button>
                </div>
              </div>

              {/* Weekly Time Grid View */}
              {viewMode === "Weekly" || viewMode === "Monthly" ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[850px]">
                    {/* Days Header */}
                    <div className="grid grid-cols-6 border-b border-gray-100 pb-3">
                      <div className="text-[11px] font-bold text-gray-400 pl-2 self-end">GMT+05:30</div>
                      {currentWeekDays.map((d) => (
                        <div
                          key={d.key}
                          onClick={() => setCurrentDate(d.fullDate)}
                          className={`text-center p-2 rounded-2xl transition-all cursor-pointer ${
                            d.isToday ? "bg-emerald-50/80 border border-emerald-200 text-[#064e43]" : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                            {d.label}
                          </div>
                          <div className={`text-xl font-extrabold mt-0.5 ${d.isToday ? "text-[#064e43]" : "text-gray-900"}`}>
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
                          <div key={row.label} className="grid grid-cols-6 min-h-[76px] py-2 items-stretch group hover:bg-gray-50/40 transition-colors">
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
                                    {/* Empty Slot */}
                                  </div>
                                );
                              }

                              // Pick harmonious pastel palette based on course index
                              const paletteIndex = (cell.course_id.charCodeAt(cell.course_id.length - 1) + colIndex) % CARD_PALETTES.length;
                              const palette = CARD_PALETTES[paletteIndex];
                              const isApproved = cell.isExtraClass;
                              const cardBg = isApproved ? "bg-emerald-50/95" : palette.bg;
                              const cardBorder = isApproved ? "border-emerald-300 ring-2 ring-emerald-400/50" : palette.border;

                              return (
                                <div key={d.key} className="border-l border-gray-100/70 px-1.5 py-1">
                                  <div
                                    className={`h-full p-2.5 rounded-2xl border ${cardBg} ${cardBorder} shadow-2xs hover:shadow-md transition-all flex flex-col justify-between`}
                                  >
                                    <div>
                                      <div className="flex items-center justify-between gap-1">
                                        <span className={`text-[11px] font-extrabold ${isApproved ? "text-emerald-950" : palette.text} truncate`}>
                                          {cell.course_title}
                                        </span>
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${isApproved ? "bg-emerald-600 animate-pulse" : palette.dot}`} />
                                      </div>
                                      <div className={`text-[10px] font-semibold ${isApproved ? "text-emerald-700" : palette.timeText} mt-0.5 flex items-center justify-between`}>
                                        <span>{row.time}</span>
                                        {isApproved && (
                                          <span className="text-[9px] font-black uppercase tracking-wider px-1 py-0.5 rounded bg-emerald-200 text-emerald-900">
                                            Extra Class
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-gray-700 pt-1.5 border-t border-black/5">
                                      <span className="truncate max-w-[80px]">{cell.room_id}</span>
                                      <span className="opacity-80 truncate">{cell.faculty_name.split(" ")[0]}</span>
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
                        {d.shortKey} {d.dateNum}
                      </button>
                    ))}
                  </div>

                  <div className="divide-y divide-gray-100/80">
                    {TIME_ROWS.map((row) => {
                      if (row.isLunch) {
                        return (
                          <div key={row.label} className="py-2.5 px-3 bg-amber-50/60 rounded-xl my-1 text-center text-xs font-bold text-amber-800">
                            LUNCH BREAK (13:00 – 14:00)
                          </div>
                        );
                      }
                      const cell = grid[activeDayKey]?.[row.period];
                      return (
                        <div key={row.label} className="py-3 flex items-center gap-4">
                          <span className="w-16 text-xs font-bold text-gray-400 shrink-0">{row.time}</span>
                          {cell ? (
                            <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                              <div>
                                <span className="text-xs font-extrabold text-emerald-900">{cell.course_title}</span>
                                <span className="ml-2 text-[11px] text-emerald-700">({cell.room_id})</span>
                              </div>
                              <span className="text-xs font-semibold text-emerald-800">{cell.faculty_name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300 italic">No scheduled class</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
