"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  CheckSquare,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  BookOpen,
  Calendar,
  AlertTriangle,
} from "lucide-react";

interface RequestApproval {
  id: string;
  type?: string;
  channel?: "chatbot" | "portal" | "form";
  submitted_by_role?: string;
  sourceText?: string;
  applicant: string;
  department?: string;
  course?: string;
  section?: string;
  venue: string;
  day: string;
  period: string;
  priorityLevel: number;
  status: "pending" | "approved" | "rejected" | "alternative_suggested";
  reason: string;
  alternative?: string;
  exam_id?: string;
  substitute_faculty_id?: string;
  substitute_faculty_name?: string;
  original_faculty_id?: string;
  original_faculty_name?: string;
}

export default function ApprovalsPage() {
  const [activeFilter, setActiveFilter] = useState<"all" | "chatbot" | "exams" | "academic" | "spectra">("all");
  const [requests, setRequests] = useState<RequestApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modal dialog state for Revoke / Reject / Revert
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [targetRequestId, setTargetRequestId] = useState<string | null>(null);
  const [targetRequestObj, setTargetRequestObj] = useState<RequestApproval | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/requests?_t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.requests) {
        const formattedAcademic: RequestApproval[] = data.requests.map((r: any) => ({
          id: r.id,
          type: r.type,
          channel: r.channel || (r.reason && r.reason.toLowerCase().includes("copilot") ? "chatbot" : "portal"),
          submitted_by_role: r.submitted_by_role || (r.priorityLevel === 6 ? "club_rep" : "faculty"),
          sourceText: r.channel === "chatbot" || (r.reason && r.reason.toLowerCase().includes("copilot"))
            ? `🤖 AI Copilot Request: ${r.venue} on ${r.day} (${r.period})`
            : r.type === "exam_leave"
            ? `Midsem Invigilation Leave: ${r.course} (${r.venue})`
            : r.type === "extra_class" 
            ? `Extra Class: ${r.course} for Section ${r.section} (${r.venue})` 
            : `Reschedule: ${r.course} for Section ${r.section} to ${r.venue}`,
          applicant: `${r.faculty_name} (${r.department || "ECE"})`,
          department: r.department,
          course: r.course,
          section: r.section,
          venue: r.venue,
          day: r.day,
          period: r.period,
          priorityLevel: r.type === "exam_leave" ? 1 : (r.priorityLevel || 2),
          status: r.status,
          reason: r.reason || "Faculty requested syllabus review / slot adjustment",
          alternative: r.adminReason,
          exam_id: r.exam_id,
          substitute_faculty_id: r.substitute_faculty_id,
          substitute_faculty_name: r.substitute_faculty_name,
          original_faculty_id: r.original_faculty_id,
          original_faculty_name: r.original_faculty_name,
        }));

        setRequests(formattedAcademic);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error("Failed to load requests:", err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const approve = async (id: string) => {
    try {
      await fetch("/api/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: "approved",
          adminReason: "Approved by Dean's Office Authority. Venue reserved and timetable updated.",
        }),
      });

      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "approved" as const, reason: "Approved by Dean's Office Authority." } : r
        )
      );
      setFeedback(`✓ Request ${id} approved. Confirmation sent to applicant!`);
    } catch {
      setFeedback(`Failed to approve request ${id}.`);
    }
  };

  const openRevokeModal = (request: RequestApproval) => {
    setTargetRequestId(request.id);
    setTargetRequestObj(request);
    setRevokeReason("Room conflict / priority institutional event re-allocation.");
    setRevokeModalOpen(true);
  };

  const handleConfirmRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRequestId) return;
    setSubmittingAction(true);

    try {
      await fetch("/api/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: targetRequestId,
          status: "rejected",
          adminReason: revokeReason || "Revoked by Dean's Office.",
        }),
      });

      setRequests((prev) =>
        prev.map((r) =>
          r.id === targetRequestId
            ? { ...r, status: "rejected" as const, reason: revokeReason || "Revoked by Dean." }
            : r
        )
      );
      setFeedback(`Request ${targetRequestId} revoked/rejected. Faculty calendar updated.`);
      setRevokeModalOpen(false);
    } catch {
      setFeedback(`Failed to revoke request ${targetRequestId}.`);
    } finally {
      setSubmittingAction(false);
    }
  };

  const displayedRequests = requests.filter((r) => {
    if (activeFilter === "chatbot") return r.channel === "chatbot" || (r.reason && r.reason.toLowerCase().includes("copilot"));
    if (activeFilter === "exams") return r.type === "exam_leave" || r.priorityLevel === 1;
    if (activeFilter === "academic") return r.priorityLevel === 2 && r.type !== "exam_leave";
    if (activeFilter === "spectra") return r.priorityLevel > 2;
    return true;
  });

  return (
    <DashboardLayout requiredRole="admin">
      {() => (
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Breadcrumb & Subtitle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[12px] font-semibold text-[#64748b] tracking-wide mb-1">
                Workspace <span className="mx-1 text-gray-300">&gt;</span> Approvals
              </div>
              <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0f172a] tracking-tight">
                Academic &amp; Exam Supervision Approvals
              </h1>
              <p className="text-[13px] text-[#64748b] mt-0.5">
                Centralized Dean&apos;s Office approval queue for Exam Invigilation Leave (Priority 1), Faculty Extra Classes (Priority 2), Spectra Fest Venues (Priority 6), and AI Chatbot submissions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0fdf4] border border-[#dcfce7] text-[12px] font-bold text-[#166534]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>6-Tier Conflict Hierarchy Active</span>
              </span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
            {[
              { id: "all", label: `All Requests (${requests.length})` },
              { id: "chatbot", label: `🤖 Chatbot Requests (${requests.filter(r => r.channel === "chatbot" || (r.reason && r.reason.toLowerCase().includes("copilot"))).length})` },
              { id: "exams", label: `Exam Invigilation Leave (${requests.filter(r => r.type === "exam_leave" || r.priorityLevel === 1).length})` },
              { id: "academic", label: `Extra Classes (${requests.filter(r => r.priorityLevel === 2 && r.type !== "exam_leave").length})` },
              { id: "spectra", label: `Spectra Bookings (${requests.filter(r => r.priorityLevel > 2).length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  activeFilter === tab.id
                    ? "bg-[#064e43] text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {feedback && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{feedback}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="text-emerald-600 hover:text-emerald-800">✕</button>
            </div>
          )}

          {/* List of Requests */}
          <div className="space-y-4">
            {displayedRequests.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 bg-white rounded-2xl border border-gray-200">
                No requests found matching this filter.
              </div>
            ) : (
              displayedRequests.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-[26px] border border-[#e2e8f0] p-6 space-y-3.5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#064e43] px-3 py-0.5 rounded-lg bg-[#e6f4f1]">
                          {r.id}
                        </span>
                        {/* Chatbot Source Badge */}
                        {(r.channel === "chatbot" || (r.reason && r.reason.toLowerCase().includes("copilot"))) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-[10px] font-extrabold uppercase tracking-wide">
                            <Sparkles className="w-3 h-3 text-violet-600" />
                            AI Copilot Request
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                            r.status === "approved"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : r.status === "rejected"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : r.status === "pending"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {r.status === "pending" ? "Pending Dean Decision" : r.status.replace("_", " ")}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          • Applicant: <strong>{r.applicant}</strong> ({r.priorityLevel === 2 ? "Academic Priority 2" : `Club Priority ${r.priorityLevel}`})
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-[#0f172a] mt-2">{r.sourceText}</h3>
                      <div className="text-xs text-gray-600 mt-1 flex flex-wrap gap-4 font-medium">
                        <span>Target Venue: <strong>{r.venue}</strong></span>
                        <span>Requested Slot: <strong>{r.day}, {r.period}</strong></span>
                        {r.section && <span>Batch / Section: <strong>{r.section}</strong></span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      {r.status === "pending" ? (
                        r.type === "exam_leave" ? (
                          <>
                            <button
                              onClick={() => approve(r.id)}
                              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#064e43] text-white hover:bg-[#053d34] transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                              title={`Approve leave and auto-assign substitute: ${r.substitute_faculty_name}`}
                            >
                              <Check className="w-3.5 h-3.5" /> Auto-Assign Substitute ({r.substitute_faculty_name || "Substitute"})
                            </button>
                            <button
                              onClick={() => openRevokeModal(r)}
                              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                              title="Deny leave and revert duty to original teacher"
                            >
                              <X className="w-3.5 h-3.5" /> Revert to Original Teacher
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => approve(r.id)}
                              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#064e43] text-white hover:bg-[#053d34] transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => openRevokeModal(r)}
                              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        )
                      ) : r.status === "approved" ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold border border-emerald-200">
                            <Check className="w-3.5 h-3.5" /> {r.type === "exam_leave" ? `Reassigned to ${r.substitute_faculty_name || "Substitute"}` : "Approved"}
                          </span>
                          <button
                            onClick={() => openRevokeModal(r)}
                            className="text-[11px] font-semibold text-gray-500 hover:text-red-600 px-2.5 py-1 rounded-lg border border-gray-200 hover:border-red-200 hover:bg-red-50/50 transition-all cursor-pointer"
                            title="Revert / Revoke"
                          >
                            {r.type === "exam_leave" ? "Revert to Original" : "Revoke Approval"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-800 text-xs font-extrabold border border-red-200">
                            <X className="w-3.5 h-3.5" /> {r.type === "exam_leave" ? `Reverted to ${r.original_faculty_name || "Original"}` : "Rejected"}
                          </span>
                          <button
                            onClick={() => approve(r.id)}
                            className="text-[11px] font-semibold text-gray-500 hover:text-emerald-700 px-2.5 py-1 rounded-lg border border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all cursor-pointer"
                            title="Reconsider and approve substitute"
                          >
                            {r.type === "exam_leave" ? "Assign Substitute" : "Approve Instead"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-gray-100 text-xs text-gray-800 space-y-2">
                    <div>
                      <strong className="text-gray-900 font-bold">Applicant Request: </strong>
                      {r.reason}
                    </div>

                    {r.type === "exam_leave" && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                        <span className="text-gray-500">Original Faculty: <strong className="text-gray-800">{r.original_faculty_name}</strong></span>
                        <span>&rarr;</span>
                        <span className="bg-[#e6f4f1] text-[#064e43] px-2.5 py-0.5 rounded-md font-bold">
                          Conflict-Free Substitute: {r.substitute_faculty_name} ({r.substitute_faculty_id})
                        </span>
                      </div>
                    )}

                    {/* Constraint & Priority Decision Audit Callout */}
                    <div
                      className={`p-2.5 rounded-xl border text-xs font-medium space-y-1 ${
                        r.status === "approved"
                          ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                          : r.status === "rejected"
                          ? "bg-red-50/80 border-red-200 text-red-950"
                          : "bg-amber-50/80 border-amber-200 text-amber-950"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>
                          {r.status === "approved"
                            ? "Dean's Approval & Conflict Audit Reason"
                            : r.status === "rejected"
                            ? "Rejection / Revocation Reason"
                            : "Pending Priority & Constraint Evaluation"}
                        </span>
                      </div>
                      <div className="text-[12px] leading-relaxed">
                        {r.alternative ||
                          (r.status === "approved"
                            ? `Approved under Priority Tier ${r.priorityLevel}. Venue ${r.venue} verified free from hard violations (H1-H14), no overlapping student cohort or room clashes.`
                            : r.status === "rejected"
                            ? `Disallowed due to conflict with higher-ranking priority session or capacity constraint.`
                            : `Awaiting administrative review. Will check against hard rules (H1-H14) and soft penalties.`)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ================= REASON & REVOKE DIALOG MODAL ================= */}
          {revokeModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-[28px] max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-gray-900">
                        Revoke / Reject Request
                      </h3>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        {targetRequestObj?.id} • {targetRequestObj?.course || targetRequestObj?.sourceText}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setRevokeModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-amber-900 text-xs">
                  Revoking will release the reserved venue and remove this extra class slot from the faculty timetable.
                </div>

                <form onSubmit={handleConfirmRevoke} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Decision Reason / Note for Faculty
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={revokeReason}
                      onChange={(e) => setRevokeReason(e.target.value)}
                      placeholder="e.g. Mandatory departmental meeting scheduled or room needed for university examination."
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-3 text-xs text-gray-800 font-medium focus:outline-none focus:border-red-500 focus:bg-white transition-colors"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setRevokeModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingAction}
                      className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                      {submittingAction ? "Processing..." : "Confirm Revoke"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
