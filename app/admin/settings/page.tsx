"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Settings,
  ArrowUpDown,
  Database,
  RefreshCw,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  Server,
  Layers,
} from "lucide-react";

const INITIAL_PRIORITY_ORDER = [
  { id: 1, name: "Exams", desc: "Midsem exams (effective room capacity halved for physical spacing)" },
  { id: 2, name: "Regular Classes", desc: "Mandatory lectures, tutorials, and 3-hour laboratory slots" },
  { id: 3, name: "Institute Events", desc: "Spectra main events, convocation, college fest opening ceremonies" },
  { id: 4, name: "Guest Lectures", desc: "Visiting professors & institute level distinguished talks" },
  { id: 5, name: "Department Events", desc: "Dept workshops, seminars, and technical student symposiums" },
  { id: 6, name: "Club Events", desc: "Student club practices, hackathons, and cultural activities (Spectra)" },
];

export default function SettingsPage() {
  const [priorityOrder, setPriorityOrder] = useState(INITIAL_PRIORITY_ORDER);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [dbUsers, setDbUsers] = useState<any[]>([]);

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch("/api/admin/users");
        const data = await res.json();
        if (data.success && data.users) {
          setDbUsers(data.users);
        }
      } catch (e) {
        console.warn(e);
      }
    }
    loadUsers();
  }, []);

  const movePriority = (index: number, direction: "up" | "down") => {
    const newOrder = [...priorityOrder];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    setPriorityOrder(newOrder);
    setStatusMsg(`✓ Updated Priority Order: "${temp.name}" is now Priority Rank ${targetIndex + 1}.`);
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset demo data in Neon DB to the clean initial state?")) return;
    setResetting(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/auth/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg("✓ Neon DB reset to clean initial demo state with all 4 default roles.");
      } else {
        setStatusMsg(`Error: ${data.error || data.message}`);
      }
    } catch (err) {
      setStatusMsg("Reset failed: " + (err as Error).message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <DashboardLayout requiredRole="admin">
      {() => (
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Breadcrumb & Subtitle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[12px] font-semibold text-[#64748b] tracking-wide mb-1">
                Workspace <span className="mx-1 text-gray-300">&gt;</span> Priority Order &amp; System Settings
              </div>
              <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0f172a] tracking-tight">
                Contention Hierarchy &amp; DB Configuration
              </h1>
              <p className="text-[13px] text-[#64748b] mt-0.5">
                Section 4: Configure the 6-level contention priority hierarchy and manage Neon cloud database users.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0fdf4] border border-[#dcfce7] text-[12px] font-bold text-[#166534]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Dean&apos;s Policy Enforced</span>
              </span>
            </div>
          </div>

          {statusMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{statusMsg}</span>
              </div>
              <button onClick={() => setStatusMsg(null)} className="text-emerald-600 hover:text-emerald-800">✕</button>
            </div>
          )}

          {/* Section 1: Contention Priority Order */}
          <div className="bg-white rounded-[26px] border border-[#e2e8f0] p-6 space-y-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[#0f172a] flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-[#064e43]" />
                  <span>Contention Priority Hierarchy (Section 4)</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  When two activities request the same room and slot simultaneously, this order determines which activity is granted the venue.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {priorityOrder.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-[#f8fafc] border border-gray-100"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-[#e6f4f1] text-[#064e43] flex items-center justify-center font-extrabold text-xs">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#0f172a]">{item.name}</div>
                      <div className="text-xs text-gray-500 font-medium">{item.desc}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={index === 0}
                      onClick={() => movePriority(index, "up")}
                      className="p-1.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      disabled={index === priorityOrder.length - 1}
                      onClick={() => movePriority(index, "down")}
                      className="p-1.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Neon Cloud Database & Reset Action */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-[26px] border border-[#e2e8f0] p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[#0f172a] flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#064e43]" />
                    <span>Neon PostgreSQL Status</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Cloud Database Instance</p>
                </div>
                <span className="text-[11px] font-bold uppercase px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                  Connected &amp; Active
                </span>
              </div>

              <div className="space-y-2 text-xs text-gray-700 bg-[#f8fafc] p-4 rounded-2xl border border-gray-100 divide-y divide-gray-200/50">
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-500">Provider:</span>
                  <strong className="text-gray-900 font-mono">Neon Serverless Cloud</strong>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-500">Table:</span>
                  <strong className="text-gray-900 font-mono">users</strong>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-500">Total Registered Users:</span>
                  <strong className="text-[#064e43] font-bold">{dbUsers.length || "4 Demo Users"}</strong>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-500">Security / Encryption:</span>
                  <strong className="text-gray-900">bcryptjs + JWT Tokens</strong>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[26px] border border-[#e2e8f0] p-6 space-y-4 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[#0f172a] flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[#064e43]" />
                  <span>Reset Demo State</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Reset user accounts and sample schedules back to clean demonstration state.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                ⚠️ This will re-seed default demo accounts (admin, coordinator, faculty, club_rep) with their official credentials in your Neon cloud database.
              </div>

              <button
                onClick={handleReset}
                disabled={resetting}
                className="w-full bg-[#064e43] hover:bg-[#053d34] text-white py-3 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}`} />
                <span>{resetting ? "Resetting Neon DB..." : "Reset Neon DB to Default Demo State"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
