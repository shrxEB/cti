"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  GraduationCap,
  Calendar,
  CheckCircle2,
  Users,
  Clock,
  Sparkles,
  Search,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  MapPin,
  ChevronRight,
  ShieldCheck,
  UserX,
  X,
} from "lucide-react";

interface ExamRecord {
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

interface FacultyOption {
  id: string;
  name: string;
  department: string;
  unavailable?: any[];
}

export default function AdminMidsemPage() {
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [facultyList, setFacultyList] = useState<FacultyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSession, setFilterSession] = useState<"ALL" | "AM" | "PM">("ALL");
  const [filterDay, setFilterDay] = useState<string>("ALL");

  // Reassignment Modal state
  const [editingExam, setEditingExam] = useState<ExamRecord | null>(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Leave Substitute Confirmation Modal state
  const [leaveSubExam, setLeaveSubExam] = useState<ExamRecord | null>(null);
  const [leaveSubReason, setLeaveSubReason] = useState("");

  const loadExamsData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/exams");
      const data = await res.json();
      if (data.exams) setExams(data.exams);
      if (data.faculty) setFacultyList(data.faculty);
    } catch (err) {
      console.error("Failed to load exams data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExamsData();
  }, []);

  const handleOpenReassign = (exam: ExamRecord) => {
    setEditingExam(exam);
    setSelectedFacultyId(exam.primary_faculty_id);
    setReassignReason("");
    setFeedback(null);
  };

  const handleSaveReassignment = async () => {
    if (!editingExam) return;
    if (!selectedFacultyId) return alert("Please select a faculty member");

    setProcessing(true);
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reassign",
          exam_id: editingExam.exam_id,
          new_faculty_id: selectedFacultyId,
          reason: reassignReason || "Administrative Reassignment",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: "success", msg: data.message });
        setEditingExam(null);
        loadExamsData();
      } else {
        setFeedback({ type: "error", msg: data.error || "Failed to reassign duty." });
      }
    } catch (e: any) {
      setFeedback({ type: "error", msg: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenLeaveSub = (exam: ExamRecord) => {
    setLeaveSubExam(exam);
    setLeaveSubReason("Faculty reported emergency leave / slot unavailability");
  };

  const handleConfirmLeaveSub = async () => {
    if (!leaveSubExam) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "auto_substitute",
          exam_id: leaveSubExam.exam_id,
          reason: leaveSubReason || "Faculty reported emergency leave / slot unavailability",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: "success", msg: data.message });
        setLeaveSubExam(null);
        loadExamsData();
      } else {
        setFeedback({ type: "error", msg: data.error || "Failed to auto-substitute." });
      }
    } catch (e: any) {
      setFeedback({ type: "error", msg: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleResetGenerator = async () => {
    if (!confirm("Reset all invigilation assignments to default solver allocations?")) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: "success", msg: data.message });
        loadExamsData();
      }
    } catch (e: any) {
      setFeedback({ type: "error", msg: e.message });
    } finally {
      setProcessing(false);
    }
  };

  // Filter exams
  const filteredExams = exams.filter((ex) => {
    if (filterSession !== "ALL" && ex.session !== filterSession) return false;
    if (filterDay !== "ALL" && ex.day !== filterDay) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchCode = ex.course_code.toLowerCase().includes(q);
      const matchTitle = ex.course_title.toLowerCase().includes(q);
      const matchFac = ex.faculty_name.toLowerCase().includes(q);
      const matchId = ex.exam_id.toLowerCase().includes(q);
      const matchRoom = ex.rooms.toLowerCase().includes(q);
      if (!matchCode && !matchTitle && !matchFac && !matchId && !matchRoom) return false;
    }
    return true;
  });

  const reassignedCount = exams.filter((e) => e.status === "reassigned").length;

  return (
    <DashboardLayout requiredRole="admin">
      {() => (
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[12px] font-semibold text-[#64748b] tracking-wide mb-1">
                Workspace <span className="mx-1 text-gray-300">&gt;</span> Midsem Exams &amp; Supervision
              </div>
              <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0f172a] tracking-tight flex items-center gap-2.5">
                <span>Midsem Exam Management</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {exams.length} Exams Solved
                </span>
              </h1>
              <p className="text-[13px] text-[#64748b] mt-0.5">
                OR-Tools CP-SAT conflict-free exam schedule with 50% halved venue capacities. Admin possesses full authority to edit slots and reassign invigilators when teachers request leave.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleResetGenerator}
                title="Reset to generator default"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Allocations</span>
              </button>
            </div>
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <div
              className={`p-4 rounded-2xl text-xs flex items-center justify-between shadow-xs ${
                feedback.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span className="font-semibold">{feedback.msg}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="font-bold ml-2">✕</button>
            </div>
          )}

          {/* Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
              <div className="text-[11px] font-bold text-gray-400 uppercase">Total Exams</div>
              <div className="text-2xl font-black text-gray-900 mt-1">{exams.length} Courses</div>
              <div className="text-[11px] text-gray-500 mt-0.5">Week 8 (Mon–Sat)</div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
              <div className="text-[11px] font-bold text-gray-400 uppercase">Effective Capacity</div>
              <div className="text-2xl font-black text-[#064e43] mt-1">50% Halved</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Strict Physical Spacing</div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
              <div className="text-[11px] font-bold text-gray-400 uppercase">Faculty Assigned</div>
              <div className="text-2xl font-black text-gray-900 mt-1">{exams.length} Invigilators</div>
              <div className="text-[11px] text-gray-500 mt-0.5">From {facultyList.length} Faculty Pool</div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
              <div className="text-[11px] font-bold text-gray-400 uppercase">Admin Overrides</div>
              <div className="text-2xl font-black text-purple-700 mt-1">{reassignedCount} Overrides</div>
              <div className="text-[11px] text-purple-600 font-semibold mt-0.5">Leaves &amp; Substitutions</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search course, room, faculty, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#064e43]"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              {/* Day filter */}
              <select
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
                className="bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 font-semibold focus:outline-none"
              >
                <option value="ALL">All Days (Mon–Sat)</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
              </select>

              {/* Session filter */}
              <div className="flex items-center bg-[#f1f5f9] p-1 rounded-xl text-xs font-bold">
                {(["ALL", "AM", "PM"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterSession(s)}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      filterSession === s ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    {s === "ALL" ? "All Slots" : `${s} Slot`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Exam Table */}
          <div className="bg-white rounded-3xl border border-[#e2e8f0] overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Midsem Exam Allotment &amp; Invigilator Roster</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Showing {filteredExams.length} of {exams.length} examinations
                </p>
              </div>
              <span className="text-[11px] font-bold uppercase px-3 py-1 rounded-full bg-[#e0f2fe] text-[#0284c7]">
                Effective Capacity Halved (50%)
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-gray-400">Loading solved exam timetable...</div>
            ) : filteredExams.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-400">No examinations match your filter.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8fafc] text-[#64748b] border-b border-gray-100 font-bold uppercase tracking-wider text-[10.5px]">
                    <tr>
                      <th className="py-3 px-4">Exam ID / Course</th>
                      <th className="py-3 px-4">Day &amp; Session</th>
                      <th className="py-3 px-4">Assigned Venues</th>
                      <th className="py-3 px-4">Examinees</th>
                      <th className="py-3 px-4">Invigilator Assigned</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {filteredExams.map((exam) => (
                      <tr key={exam.exam_id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-extrabold text-[#064e43] bg-[#e6f4f1] px-2 py-0.5 rounded">
                              {exam.exam_id}
                            </span>
                            <span className="font-bold text-gray-900">{exam.course_code}</span>
                          </div>
                          <div className="text-[11px] text-gray-500 font-medium mt-0.5">
                            {exam.course_title}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{exam.day}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                exam.session === "AM"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-indigo-100 text-indigo-800"
                              }`}
                            >
                              {exam.session}
                            </span>
                            <span className="text-[11px] text-gray-500">{exam.time}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-gray-800">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#064e43] shrink-0" />
                            <span className="max-w-[200px] truncate" title={exam.rooms}>{exam.rooms}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5 font-normal">
                            {exam.raw_rooms.length} room(s) pooled
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">~{exam.students_count}</div>
                          <div className="text-[10px] text-gray-400">
                            {exam.groups.slice(0, 2).join(", ")}
                            {exam.groups.length > 2 ? ` +${exam.groups.length - 2}` : ""}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900 flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-[#064e43]" />
                            <span>{exam.faculty_name}</span>
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            ID: {exam.primary_faculty_id} • {exam.duty_role}
                          </div>
                          {exam.reassigned_from && (
                            <div className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded mt-1 inline-block">
                              Reassigned: {exam.reassigned_from}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                              exam.status === "reassigned"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>{exam.status === "reassigned" ? "Reassigned" : "Solver Assigned"}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenReassign(exam)}
                              title="Reassign to another teacher"
                              className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-[#064e43] hover:text-white text-gray-700 text-xs font-bold transition-all cursor-pointer"
                            >
                              Edit / Swap
                            </button>
                            <button
                              onClick={() => handleOpenLeaveSub(exam)}
                              title="Teacher on leave? Auto-substitute"
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <UserX className="w-3 h-3" />
                              <span>Leave Sub</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* REASSIGNMENT MODAL */}
          {editingExam && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-[28px] max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-[#064e43] tracking-wider">
                      Dean&apos;s Administrative Override
                    </span>
                    <h3 className="text-lg font-black text-gray-900 mt-0.5">
                      Reassign Invigilation Duty
                    </h3>
                  </div>
                  <button
                    onClick={() => setEditingExam(null)}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Exam Context Box */}
                <div className="bg-[#f8fafc] border border-gray-200 rounded-2xl p-4 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#064e43]">{editingExam.exam_id} • {editingExam.course_code}</span>
                    <span className="font-bold text-gray-600">{editingExam.day} ({editingExam.session})</span>
                  </div>
                  <div className="text-gray-700 font-semibold">{editingExam.course_title}</div>
                  <div className="text-gray-500 flex items-center gap-2 text-[11px]">
                    <span>Venues: <strong>{editingExam.rooms}</strong></span>
                    <span>•</span>
                    <span>Time: <strong>{editingExam.time}</strong></span>
                  </div>
                  <div className="text-gray-500 text-[11px]">
                    Current Invigilator: <strong>{editingExam.faculty_name}</strong> ({editingExam.primary_faculty_id})
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Select New Invigilator (Faculty Member)
                    </label>
                    <select
                      value={selectedFacultyId}
                      onChange={(e) => setSelectedFacultyId(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 font-semibold focus:outline-none focus:border-[#064e43]"
                    >
                      {facultyList.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.id} • {f.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Reason for Reassignment / Leave Note
                    </label>
                    <textarea
                      rows={2}
                      value={reassignReason}
                      onChange={(e) => setReassignReason(e.target.value)}
                      placeholder="e.g. Faculty medical leave / Research travel / Department meeting"
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#064e43]"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingExam(null)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                    <button
                      type="button"
                      disabled={processing}
                      onClick={handleSaveReassignment}
                      className="px-5 py-2.5 rounded-xl bg-[#064e43] hover:bg-[#053d34] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      {processing ? "Saving..." : "Confirm Reassignment"}
                    </button>
                  </div>
                </div>
              </div>
            )}

          {/* LEAVE / AUTO-SUBSTITUTE MODAL */}
          {leaveSubExam && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-[28px] max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-amber-800 tracking-wider">
                      Faculty Leave &amp; Auto-Reassignment
                    </span>
                    <h3 className="text-lg font-black text-gray-900 mt-0.5">
                      Report Leave &amp; Assign Substitute
                    </h3>
                  </div>
                  <button
                    onClick={() => setLeaveSubExam(null)}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-[#f8fafc] border border-gray-200 rounded-2xl p-4 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#064e43]">{leaveSubExam.exam_id} • {leaveSubExam.course_code}</span>
                    <span className="font-bold text-gray-700">{leaveSubExam.day} ({leaveSubExam.session} Session)</span>
                  </div>
                  <div className="text-gray-800 font-semibold">{leaveSubExam.course_title}</div>
                  <div className="text-gray-500 text-[11px]">
                    Current Teacher: <strong>{leaveSubExam.faculty_name}</strong> • Venues: <strong>{leaveSubExam.rooms}</strong>
                  </div>
                  <div className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg mt-1">
                    System will automatically allocate an available, conflict-free faculty member from the department pool.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Reason for Unavailability / Leave Record
                  </label>
                  <textarea
                    rows={2}
                    value={leaveSubReason}
                    onChange={(e) => setLeaveSubReason(e.target.value)}
                    placeholder="e.g., Medical leave, urgent personal travel, academic council meeting"
                    className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#064e43]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setLeaveSubExam(null)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={processing}
                    onClick={handleConfirmLeaveSub}
                    className="px-5 py-2.5 rounded-xl bg-[#064e43] hover:bg-[#053d34] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {processing ? "Reassigning..." : "Confirm & Auto-Substitute"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
