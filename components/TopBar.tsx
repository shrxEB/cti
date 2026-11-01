"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronDown,
  LogOut,
  ShieldCheck,
  Building2,
  GraduationCap,
  Sparkles,
  Command,
} from "lucide-react";

type UserRole = "admin" | "coordinator" | "faculty" | "club_rep";

interface TopBarProps {
  user: {
    name: string;
    email: string;
    role: UserRole;
    department?: string | null;
  };
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin (Dean's office)",
  coordinator: "Dept Coordinator (CSE)",
  faculty: "Faculty (ECE)",
  club_rep: "Club Rep (Spectra)",
};

const ROLE_HEADER_TITLE: Record<UserRole, string> = {
  admin: "Dean of Academics",
  coordinator: "Coordinator CSE",
  faculty: "Faculty Member",
  club_rep: "Spectra Tech Lead",
};

const ROLE_ICONS: Record<UserRole, React.ElementType> = {
  admin: ShieldCheck,
  coordinator: Building2,
  faculty: GraduationCap,
  club_rep: Sparkles,
};

const ROLE_SWITCH: {
  role: UserRole;
  email: string;
  password: string;
  path: string;
}[] = [
  { role: "admin", email: "admin@cit.edu.in", password: "citadmin2026", path: "/admin" },
  { role: "coordinator", email: "coordinator.cse@cit.edu.in", password: "citcoord2026", path: "/coordinator" },
  { role: "faculty", email: "faculty.ece@cit.edu.in", password: "citfaculty2026", path: "/faculty" },
  { role: "club_rep", email: "club.spectra@cit.edu.in", password: "citclub2026", path: "/club" },
];

export default function TopBar({ user }: TopBarProps) {
  const router = useRouter();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const switchRole = async (target: (typeof ROLE_SWITCH)[0]) => {
    if (target.role === user.role) return;
    setSwitching(true);
    setRoleDropdownOpen(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target.email, password: target.password }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(target.path);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-[#e5e7eb] flex items-center justify-between px-7 sticky top-0 z-30">
      {/* Search Bar with ⌘K Badge */}
      <div className="flex items-center gap-3 flex-1 max-w-[380px]">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search timetable, room, faculty, or club..."
            className="w-full bg-[#f8fafc] border border-gray-200/90 rounded-2xl pl-10 pr-12 py-2 text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#064e43] focus:bg-white transition-all shadow-sm"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] font-mono font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
            <span>⌘K</span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Active Role Badge (Clean & Non-dropdown) */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8] hidden md:inline">
            ACTIVE ROLE:
          </span>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 text-[12px] font-bold text-[#064e43] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{ROLE_LABELS[user.role]}</span>
          </div>
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setRoleDropdownOpen(false);
            }}
            className="flex items-center gap-2.5 cursor-pointer pl-1"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#064e43] to-[#047857] text-white flex items-center justify-center text-xs font-bold shadow-sm">
              {user.name.charAt(0) || "D"}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-[13px] font-bold text-gray-900 leading-tight">
                {user.name}
              </div>
              <div className="text-[11px] text-gray-400 font-medium leading-tight">
                {ROLE_LABELS[user.role]}
              </div>
            </div>
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/60 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-sm font-bold text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
