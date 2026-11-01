"use client";

import React, { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Calendar,
  Building,
  Users,
  BookOpen,
  Sparkles,
  ArrowUpRight,
  FileCheck2,
  Clock,
  DoorOpen,
  RefreshCw,
  CheckCircle2,
  Mail,
  Lock,
  UserPlus,
  Send,
  Copy,
  ExternalLink,
  ShieldCheck,
  Check,
  AlertCircle,
  ListOrdered,
  Layers,
  ChevronRight,
  Database,
} from "lucide-react";

export default function AdminPage() {
  const [resetting, setResetting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Provisioning form states
  const [provRole, setProvRole] = useState<"faculty" | "club_rep" | "coordinator">("faculty");
  const [provName, setProvName] = useState("");
  const [provLoginEmail, setProvLoginEmail] = useState("");
  const [provRecipientEmail, setProvRecipientEmail] = useState("");
  const [provDept, setProvDept] = useState("Electronics & Communication");
  const [provPassword, setProvPassword] = useState("CIT#Pass2026!");
  const [provLoading, setProvLoading] = useState(false);
  const [provError, setProvError] = useState<string | null>(null);
  const [provResult, setProvResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const generateStrongPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pass = "CIT#";
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setProvPassword(pass);
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset demo data in Neon DB to the clean initial state?")) {
      return;
    }
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
        setStatusMsg("✓ Neon DB reset to clean demo state with all 4 default roles.");
      } else {
        setStatusMsg(`Error: ${data.error || data.message}`);
      }
    } catch (err) {
      setStatusMsg("Reset failed: " + (err as Error).message);
    } finally {
      setResetting(false);
    }
  };

  const handleProvisionUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvError(null);
    setProvLoading(true);

    try {
      const res = await fetch("/api/admin/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: provName,
          email: provLoginEmail,
          recipientEmail: provRecipientEmail || provLoginEmail,
          password: provPassword,
          role: provRole,
          department: provDept,
          sendEmail: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setProvError(data.error || "Failed to provision user.");
      } else {
        setProvResult(data);
        setProvName("");
        setProvLoginEmail("");
        setProvRecipientEmail("");
        generateStrongPassword();
      }
    } catch {
      setProvError("Network error while provisioning user.");
    } finally {
      setProvLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!provResult) return;
    const text = `CIT Scheduler Account Details:\nName: ${provResult.user.name}\nRole: ${provResult.user.role}\nEmail: ${provResult.user.email}\nInitial Password: ${provPassword}\nLogin Portal: http://localhost:3000`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openMailClient = () => {
    if (!provResult) return;
    const recipient = provResult.emailResult?.recipient || provResult.user.email;
    const subject = encodeURIComponent(`Welcome to CIT Scheduler — Your Login Credentials`);
    const body = encodeURIComponent(
      `Dear ${provResult.user.name},\n\nThe Dean's Office has created your account on the CIT Scheduler Platform.\n\nLogin URL: http://localhost:3000\nEmail ID: ${provResult.user.email}\nPassword: ${provPassword}\nRole: ${provResult.user.role}\n\nPlease sign in and manage your schedule.\n\nRegards,\nCIT Dean Academic Affairs`
    );
    window.open(`mailto:${recipient}?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <DashboardLayout requiredRole="admin">
      {() => (
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Breadcrumb + Academic Session Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-[#64748b] mb-1 font-medium">
                <span>Workspace</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[#064e43] font-bold">Dashboard</span>
              </div>
              <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0f172a] tracking-tight">
                Dean&apos;s Office Dashboard
              </h1>
              <p className="text-[13px] text-[#64748b] mt-0.5 max-w-3xl">
                Everything: generate timetable, approve timetable changes &amp; bookings moving classes, change priority order.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-semibold text-[#064e43] shadow-sm">
                <Clock className="w-3.5 h-3.5 text-[#047857]" />
                <span>Academic Session 2025–26</span>
              </div>

              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}`} />
                <span>Reset Demo</span>
              </button>
            </div>
          </div>

          {statusMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{statusMsg}</span>
              </div>
              <button onClick={() => setStatusMsg(null)} className="text-emerald-600 hover:text-emerald-800">✕</button>
            </div>
          )}

          {/* Hero Banner: Full Scheduling & Conflict Authority */}
          <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#064e43] via-[#046c5d] to-[#025a4d] p-8 sm:p-9 text-white shadow-md">
            {/* Geometric Translucent Circles matching screenshot */}
            <div className="absolute right-0 top-0 bottom-0 w-[420px] pointer-events-none overflow-hidden">
              <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full border-[36px] border-white/[0.07]" />
              <div className="absolute right-14 top-6 w-56 h-56 rounded-full bg-white/[0.05]" />
              <div className="absolute right-36 bottom-[-50px] w-52 h-52 rounded-full border-[28px] border-white/[0.05]" />
            </div>

            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 bg-[#033931]/60 border border-white/10 rounded-full px-3 py-1 text-[11px] font-bold text-[#fde047] mb-3.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Dean&apos;s Office Authority</span>
              </div>

              <h2 className="text-[26px] sm:text-[30px] font-extrabold tracking-tight leading-[1.2] text-white">
                Full Scheduling &amp; Conflict Authority
              </h2>

              <p className="mt-2 text-white/85 text-[13.5px] leading-relaxed max-w-xl font-normal">
                Generate institute timetables, approve requests that move classes, and customize the 6-level conflict priority order.
              </p>

              {/* 3 Action Buttons on Hero matching screenshot */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/admin/timetable"
                  className="inline-flex items-center gap-2 bg-[#fde047] hover:bg-[#facc15] text-[#0f172a] px-5 py-2.5 rounded-full text-[13px] font-bold transition-all shadow-md active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-[#0f172a]" />
                  <span>Generate Timetable</span>
                </Link>

                <Link
                  href="/admin/timetable"
                  className="inline-flex items-center gap-2 bg-[#fef08a] hover:bg-[#fde047] text-[#0f172a] px-5 py-2.5 rounded-full text-[13px] font-bold transition-all shadow-md active:scale-95"
                >
                  <span>Explore Timetable</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/admin/settings"
                  className="inline-flex items-center gap-2 bg-[#033931]/70 hover:bg-[#033931] border border-white/20 text-white px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all active:scale-95"
                >
                  <span>Change Priority Order</span>
                </Link>
              </div>
            </div>
          </div>

          {/* 4 KPI Metric Cards matching screenshot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: TIMETABLE STATUS */}
            <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 flex items-start justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  TIMETABLE STATUS
                </div>
                <div className="text-[26px] font-extrabold text-[#0f172a] tracking-tight mt-1.5 leading-none">
                  Generated
                </div>
                <div className="text-[12px] text-[#64748b] mt-2 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>0 conflicts detected</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
            </div>

            {/* Card 2: PENDING APPROVALS */}
            <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 flex items-start justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  PENDING APPROVALS
                </div>
                <div className="text-[26px] font-extrabold text-[#0f172a] tracking-tight mt-1.5 leading-none">
                  1 Pending
                </div>
                <div className="text-[12px] text-[#64748b] mt-2 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Class moves &amp; bookings</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-[#ffedd5] text-[#ea580c] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            {/* Card 3: PRIORITY LEVELS */}
            <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 flex items-start justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  PRIORITY LEVELS
                </div>
                <div className="text-[26px] font-extrabold text-[#0f172a] tracking-tight mt-1.5 leading-none">
                  6 Ranks
                </div>
                <div className="text-[12px] text-[#64748b] mt-2 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  <span>Exams #1 to Club #6</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-[#f3e8ff] text-[#9333ea] flex items-center justify-center shrink-0">
                <ListOrdered className="w-5 h-5" />
              </div>
            </div>

            {/* Card 4: CAMPUS VENUES */}
            <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 flex items-start justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  CAMPUS VENUES
                </div>
                <div className="text-[26px] font-extrabold text-[#0f172a] tracking-tight mt-1.5 leading-none">
                  27
                </div>
                <div className="text-[12px] text-[#64748b] mt-2 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Lecture halls &amp; labs</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-[#dcfce7] text-[#16a34a] flex items-center justify-center shrink-0">
                <Building className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* User Provisioning & Email Dispatch Panel in the Forest-Teal Theme */}
          <div className="bg-white rounded-3xl border border-[#e2e8f0] p-7 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#064e43] text-[#fde047] flex items-center justify-center shadow-sm">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-[#0f172a]">
                    Create Faculty or Club Representative Account &amp; Send Email
                  </h3>
                  <p className="text-[13px] text-[#64748b] mt-0.5">
                    Dean&apos;s Office authority to provision institutional credentials and dispatch them directly to their personal inbox.
                  </p>
                </div>
              </div>

              <span className="self-start sm:self-auto text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#f0fdf4] text-[#166534] border border-[#dcfce7]">
                Dean&apos;s Office Admin
              </span>
            </div>

            {provError && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{provError}</span>
              </div>
            )}

            <form onSubmit={handleProvisionUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1.5">
                    Target Role
                  </label>
                  <select
                    value={provRole}
                    onChange={(e) => setProvRole(e.target.value as any)}
                    className="w-full bg-[#f8fafc] border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-gray-800 font-medium focus:outline-none focus:border-[#064e43]"
                  >
                    <option value="faculty">Faculty Member</option>
                    <option value="club_rep">Club Representative (Spectra Lead)</option>
                    <option value="coordinator">Department Coordinator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={provName}
                    onChange={(e) => setProvName(e.target.value)}
                    placeholder="e.g. Dr. Sourav Mohapatra"
                    className="w-full bg-[#f8fafc] border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-gray-800 focus:outline-none focus:border-[#064e43]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1.5">
                    Department / Club Name
                  </label>
                  <input
                    type="text"
                    value={provDept}
                    onChange={(e) => setProvDept(e.target.value)}
                    placeholder="e.g. Electronics & Communication"
                    className="w-full bg-[#f8fafc] border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-gray-800 focus:outline-none focus:border-[#064e43]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1.5">
                    CIT Login Email ID
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={provLoginEmail}
                      onChange={(e) => setProvLoginEmail(e.target.value)}
                      placeholder="e.g. sourav.faculty@cit.edu.in"
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-gray-800 focus:outline-none focus:border-[#064e43]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1.5">
                    Send Email To (Personal / Preferred Inbox)
                  </label>
                  <div className="relative">
                    <Send className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={provRecipientEmail}
                      onChange={(e) => setProvRecipientEmail(e.target.value)}
                      placeholder="e.g. sourav.personal@gmail.com"
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-gray-800 focus:outline-none focus:border-[#064e43]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#334155]">
                    Generated Password
                  </label>
                  <button
                    type="button"
                    onClick={generateStrongPassword}
                    className="text-[11px] font-bold text-[#064e43] hover:underline flex items-center gap-1"
                  >
                    <span>⚡ Generate Strong Password</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={provPassword}
                    onChange={(e) => setProvPassword(e.target.value)}
                    className="w-full font-mono bg-[#f8fafc] border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-gray-800 focus:outline-none focus:border-[#064e43]"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-[#64748b]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Saves to Neon DB &amp; formats official credential email invitation</span>
                </div>

                <button
                  type="submit"
                  disabled={provLoading}
                  className="px-6 py-3 rounded-full font-bold text-xs sm:text-sm text-[#0f172a] bg-[#fde047] hover:bg-[#facc15] shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {provLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating &amp; Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Create Account &amp; Send Email</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Result Confirmation Box */}
            {provResult && (
              <div className="mt-6 p-6 rounded-3xl bg-[#f0fdf4] border border-[#bbf7d0] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#0f172a]">
                        Account Created &amp; Credentials Sent!
                      </h4>
                      <p className="text-xs text-[#166534]">
                        Stored in Neon PostgreSQL as #{provResult.user.id} • Dispatched to {provResult.emailResult?.recipient}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyCredentials}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white border border-gray-200 text-gray-800 hover:border-[#064e43] hover:text-[#064e43] transition-colors shadow-sm"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copied ? "Copied!" : "Copy Details"}</span>
                    </button>

                    <button
                      onClick={openMailClient}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#064e43] text-white hover:bg-[#033931] transition-colors shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Mail Client</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-[#bbf7d0] text-xs">
                  <div>
                    <span className="text-gray-400 block text-[11px]">User Name</span>
                    <strong className="text-gray-900">{provResult.user.name}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Role</span>
                    <strong className="text-[#064e43] capitalize">{provResult.user.role.replace("_", " ")}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Login Email</span>
                    <strong className="text-gray-900 font-mono truncate block">{provResult.user.email}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Password</span>
                    <strong className="text-[#064e43] bg-[#fde047]/40 px-2 py-0.5 rounded font-mono">
                      {provPassword}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Lower Two Cards Row: Role Capabilities & Conflict Priority Order */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Role Capabilities */}
            <div className="lg:col-span-6 bg-white rounded-3xl border border-[#e2e8f0] p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[16px] font-bold text-[#0f172a]">Role Capabilities (Section 4)</h3>
                  <p className="text-[12.5px] text-[#94a3b8] mt-0.5">Strict role segregation enforced by code</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-[#dcfce7] flex items-center justify-center text-[#16a34a]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-gray-100 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#fde047] text-[#0f172a] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-[#0f172a]">Admin (Dean&apos;s office)</div>
                    <div className="text-[#64748b] mt-0.5">
                      Generates timetable, approves class moves &amp; changes, manages conflict hierarchy, resets demo data.
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-gray-100 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-[#0f172a]">Department Coordinator</div>
                    <div className="text-[#64748b] mt-0.5">
                      Requests changes to department sessions, books departmental events, approves department lab bookings.
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-gray-100 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#f3e8ff] text-[#9333ea] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-[#0f172a]">Faculty Member</div>
                    <div className="text-[#64748b] mt-0.5">
                      Views personal schedule, registers unavailability &amp; leaves, submits reschedule proposals (4h daily limit).
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-gray-100 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#ffedd5] text-[#ea580c] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    4
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-[#0f172a]">Club Representative</div>
                    <div className="text-[#64748b] mt-0.5">
                      Submits/cancels venue requests in plain English/Hinglish, tracks decision reasons for Spectra fest.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Conflict Priority Order */}
            <div className="lg:col-span-6 bg-white rounded-3xl border border-[#e2e8f0] p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[16px] font-bold text-[#0f172a]">Conflict Priority Order</h3>
                  <p className="text-[12.5px] text-[#94a3b8] mt-0.5">Automated venue contention hierarchy</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-[#fef3c7] flex items-center justify-center text-[#d97706]">
                  <ListOrdered className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-2.5">
                {[
                  { rank: 1, title: "Exams", desc: "Midsem exams (halved capacity enforced)", color: "bg-red-50 text-red-700" },
                  { rank: 2, title: "Regular Classes", desc: "Lectures, tutorials, and 3-hour labs", color: "bg-blue-50 text-blue-700" },
                  { rank: 3, title: "Institute Events", desc: "Spectra main events, convocation", color: "bg-purple-50 text-purple-700" },
                  { rank: 4, title: "Guest Lectures", desc: "Visiting professors & keynote talks", color: "bg-cyan-50 text-cyan-700" },
                  { rank: 5, title: "Department Events", desc: "Workshops, departmental symposiums", color: "bg-emerald-50 text-emerald-700" },
                  { rank: 6, title: "Club Events", desc: "Spectra club practices, hackathons", color: "bg-amber-50 text-amber-700" },
                ].map((p) => (
                  <div
                    key={p.rank}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#f8fafc] border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#064e43] text-white flex items-center justify-center font-bold text-xs">
                        {p.rank}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#0f172a]">{p.title}</span>
                        <span className="text-[11px] text-[#64748b] ml-2">{p.desc}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${p.color}`}>
                      Rank #{p.rank}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
