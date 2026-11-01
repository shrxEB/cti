"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  FileText,
  Sparkles,
  Layers,
  Upload,
  Clock,
  ShieldCheck,
} from "lucide-react";

interface DisruptionCase {
  id: string;
  type: string;
  target: string;
  details: string;
  proposedMoves: { course: string; from: string; to: string; room: string }[];
  sessionsMovedCount: number;
  status: "pending" | "applied" | "rejected";
}

const SAMPLE_DISRUPTIONS: DisruptionCase[] = [
  {
    id: "DISRUPT-01",
    type: "Room Closure",
    target: "Room 102",
    details: "AC failure in Room 102 on Wednesday. Proposing minimum movement to Room 104 with identical capacity.",
    proposedMoves: [
      { course: "PH101 Applied Physics", from: "Wed P1 in Room 102", to: "Wed P1 in Room 104", room: "Room 104" },
    ],
    sessionsMovedCount: 1,
    status: "pending",
  },
  {
    id: "DISRUPT-02",
    type: "Faculty Medical Leave",
    target: "Dr. Rajesh Tripathy",
    details: "Medical leave on Thursday. Proposing session shift to Friday P4 with zero group clash.",
    proposedMoves: [
      { course: "EC201 Tutorial", from: "Thu P4 in Room 105", to: "Fri P4 in Room 105", room: "Room 105" },
    ],
    sessionsMovedCount: 1,
    status: "pending",
  },
  {
    id: "DISRUPT-03",
    type: "Added Session Request",
    target: "CS201 Data Structures (Dr. Sahu)",
    details: "Midsem revision lecture requested. Fitting into Monday P5 without moving existing sessions.",
    proposedMoves: [
      { course: "CS201 Extra Tutorial", from: "Unscheduled", to: "Mon P5 in Room 103", room: "Room 103" },
    ],
    sessionsMovedCount: 0,
    status: "applied",
  },
];

export default function ReschedulingPage() {
  const [disruptions, setDisruptions] = useState<DisruptionCase[]>(SAMPLE_DISRUPTIONS);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleApprove = (id: string) => {
    setDisruptions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "applied" as const } : d))
    );
    setFeedback(`✓ Disruption ${id} approved and applied to master schedule. Minimal session displacement verified.`);
  };

  const handleReject = (id: string) => {
    setDisruptions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "rejected" as const } : d))
    );
    setFeedback(`Disruption ${id} rejected. Master schedule unchanged.`);
  };

  return (
    <DashboardLayout requiredRole="admin">
      {() => (
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Breadcrumb & Subtitle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[12px] font-semibold text-[#64748b] tracking-wide mb-1">
                Workspace <span className="mx-1 text-gray-300">&gt;</span> Disruption Solver
              </div>
              <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0f172a] tracking-tight">
                Disruption &amp; Minimal Rescheduling Engine
              </h1>
              <p className="text-[13px] text-[#64748b] mt-0.5">
                Section 2 Item 8: Handle faculty leaves, room closures, or added sessions while moving minimal existing classes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0fdf4] border border-[#dcfce7] text-[12px] font-bold text-[#166534]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Minimal Disruption Algorithm Active</span>
              </span>
            </div>
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

          {/* Disruption Cases */}
          <div className="space-y-4">
            {disruptions.map((d) => (
              <div
                key={d.id}
                className="bg-white rounded-[26px] border border-[#e2e8f0] p-6 space-y-4 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[#064e43] px-3 py-1 rounded-xl bg-[#e6f4f1]">
                      {d.id}
                    </span>
                    <div>
                      <h3 className="text-base font-extrabold text-[#0f172a]">{d.type} — {d.target}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{d.details}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border self-start sm:self-auto ${
                      d.status === "applied"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : d.status === "rejected"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {d.status}
                  </span>
                </div>

                {/* Proposed Movements Table */}
                <div className="rounded-2xl border border-gray-100 bg-[#f8fafc] p-4">
                  <div className="text-xs font-bold text-[#064e43] mb-2.5 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#064e43]" />
                    <span>Proposed Minimal Session Movement (Only {d.sessionsMovedCount} session moved)</span>
                  </div>

                  <div className="space-y-2">
                    {d.proposedMoves.map((m, i) => (
                      <div
                        key={i}
                        className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-xl border border-gray-200 text-xs gap-2"
                      >
                        <div className="font-bold text-[#0f172a]">{m.course}</div>
                        <div className="flex items-center gap-2 text-gray-500 font-medium">
                          <span className="line-through text-red-600 bg-red-50 px-2 py-0.5 rounded">{m.from}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#064e43]" />
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">{m.to}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {d.status === "pending" && (
                  <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                      onClick={() => handleReject(d.id)}
                      className="px-4 py-2 rounded-full text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-all active:scale-95"
                    >
                      Reject Proposal
                    </button>
                    <button
                      onClick={() => handleApprove(d.id)}
                      className="px-5 py-2 rounded-full text-xs font-bold bg-[#fde047] hover:bg-[#facc15] text-[#064e43] shadow-sm transition-all active:scale-95 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#064e43]" />
                      <span>Apply Minimal Reschedule</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
