"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Building2,
  GraduationCap,
  Sparkles,
  LogOut,
  Database,
  User,
  ChevronDown,
} from "lucide-react";

interface NavbarProps {
  user: {
    id: number | string;
    name: string;
    email: string;
    role: "admin" | "coordinator" | "faculty" | "club_rep";
    department?: string | null;
  };
  isNeonConnected?: boolean;
}

const ROLES_INFO = {
  admin: {
    label: "Admin (Dean's Office)",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: ShieldCheck,
    path: "/admin",
    demoEmail: "admin@cit.edu.in",
    demoPass: "citadmin2026",
  },
  coordinator: {
    label: "Dept Coordinator",
    color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    icon: Building2,
    path: "/coordinator",
    demoEmail: "coordinator.cse@cit.edu.in",
    demoPass: "citcoord2026",
  },
  faculty: {
    label: "Faculty",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: GraduationCap,
    path: "/faculty",
    demoEmail: "faculty.ece@cit.edu.in",
    demoPass: "citfaculty2026",
  },
  club_rep: {
    label: "Club Representative",
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    icon: Sparkles,
    path: "/club",
    demoEmail: "club.spectra@cit.edu.in",
    demoPass: "citclub2026",
  },
};

export default function Navbar({ user, isNeonConnected = true }: NavbarProps) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const roleMeta = ROLES_INFO[user.role] || ROLES_INFO.admin;
  const RoleIcon = roleMeta.icon;

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleQuickSwitchRole = async (targetRole: keyof typeof ROLES_INFO) => {
    if (targetRole === user.role) return;
    setSwitching(true);
    setDropdownOpen(false);
    try {
      const target = ROLES_INFO[targetRole];
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target.demoEmail, password: target.demoPass }),
      });
      const data = await res.json();
      if (data.success && data.redirectUrl) {
        router.push(data.redirectUrl);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to switch role:", err);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Institute Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-cyan-500/20">
            CIT
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white tracking-wide">
                Chilika Institute of Technology
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
                Week 7 Portal
              </span>
            </div>
            <div className="text-[11px] text-slate-400">Campus Scheduling & Venue Management</div>
          </div>
        </div>

        {/* Right: Actions, Role & User Info */}
        <div className="flex items-center gap-3">
          {/* Neon DB indicator */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
              isNeonConnected
                ? "bg-emerald-950/30 text-emerald-400 border-emerald-800/40"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isNeonConnected ? "Neon DB" : "Local DB"}</span>
          </div>

          {/* Quick Switch Role Dropdown for Judges */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              disabled={switching}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
              title="Quick switch role for demo/judging"
            >
              <RoleIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">{roleMeta.label}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/50 p-1.5 z-50">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Switch Demo Role
                </div>
                {(Object.keys(ROLES_INFO) as Array<keyof typeof ROLES_INFO>).map((r) => {
                  const item = ROLES_INFO[r];
                  const ItemIcon = item.icon;
                  const isCurrent = r === user.role;
                  return (
                    <button
                      key={r}
                      disabled={isCurrent || switching}
                      onClick={() => handleQuickSwitchRole(r)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left ${
                        isCurrent
                          ? "bg-cyan-950/40 text-cyan-300 font-medium cursor-default"
                          : "hover:bg-slate-800 text-slate-300 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ItemIcon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                      </div>
                      {isCurrent && <span className="text-[10px] text-cyan-400">Active</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/60">
            <div className="w-7 h-7 rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-800/40 flex items-center justify-center font-bold text-xs">
              {user.name.charAt(0)}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-xs font-medium text-slate-200 truncate max-w-[140px]">
                {user.name}
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                {user.department || user.role}
              </div>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

