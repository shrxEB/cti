"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  GraduationCap,
  DoorOpen,
  RefreshCw,
  CheckSquare,
  ListOrdered,
  Database,
  ChevronRight,
  Sparkles,
  Building2,
  Clock,
  CalendarPlus,
  MessageSquare,
  UserX,
  PlusCircle,
  FileCheck2,
} from "lucide-react";

type UserRole = "admin" | "coordinator" | "faculty" | "club_rep";

interface SidebarProps {
  role: UserRole;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

function getRoleMeta(role: UserRole) {
  switch (role) {
    case "admin":
      return {
        brandSub: "Dean's Office System",
        activeRoleText: "Dean's Office (Admin)",
      };
    case "coordinator":
      return {
        brandSub: "Department System",
        activeRoleText: "Dept Coordinator (CSE)",
      };
    case "faculty":
      return {
        brandSub: "Faculty Academic Portal",
        activeRoleText: "Faculty Member (ECE)",
      };
    case "club_rep":
      return {
        brandSub: "Student Fest System",
        activeRoleText: "Club Rep (Spectra)",
      };
  }
}

function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case "admin":
      return [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { label: "Institute Timetable", href: "/admin/timetable", icon: Calendar },
        { label: "Midsem Exams", href: "/admin/midsem", icon: GraduationCap },
        { label: "Venue Booking (Spectra)", href: "/admin/bookings", icon: DoorOpen },
        { label: "Disruption Solver", href: "/admin/rescheduling", icon: RefreshCw },
        { label: "Approvals", href: "/admin/approvals", icon: CheckSquare },
        { label: "Priority Order", href: "/admin/settings", icon: ListOrdered },
        { label: "Dataset & schedule.json", href: "/admin/dataset", icon: Database },
      ];
    case "coordinator":
      return [
        { label: "Dashboard", href: "/coordinator", icon: LayoutDashboard },
        { label: "Dept Sessions", href: "/coordinator?tab=sessions", icon: Calendar },
        { label: "Lab Approvals", href: "/coordinator?tab=labs", icon: CheckSquare },
        { label: "Venue Booking", href: "/coordinator?tab=bookings", icon: DoorOpen },
        { label: "Department Timetable", href: "/coordinator?tab=timetable", icon: FileCheck2 },
      ];
    case "faculty":
      return [
        { label: "Dashboard", href: "/faculty", icon: LayoutDashboard },
        { label: "My Timetable", href: "/faculty?tab=timetable", icon: Calendar },
        { label: "Exam Duties", href: "/faculty?tab=exams", icon: GraduationCap },
        { label: "Mark Unavailability", href: "/faculty?tab=leave", icon: UserX },
        { label: "Request Reschedule", href: "/faculty?tab=reschedule", icon: PlusCircle },
      ];
    case "club_rep":
      return [
        { label: "Dashboard", href: "/club", icon: LayoutDashboard },
        { label: "New Booking (Spectra)", href: "/club?tab=new", icon: CalendarPlus },
        { label: "NL Prompt Booking", href: "/club?tab=nl", icon: MessageSquare },
      ];
  }
}

function SidebarInner({ role }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navItems = getNavItems(role);
  const roleMeta = getRoleMeta(role);
  const currentTab = searchParams.get("tab");

  return (
    <aside className="w-[245px] h-screen bg-white border-r border-[#e5e7eb] flex flex-col fixed left-0 top-0 z-40">
      {/* Brand Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#064e43] flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-[#fde047]" />
          </div>
          <div>
            <div className="text-[15px] font-extrabold text-[#0f172a] tracking-tight leading-tight">
              CIT Schedule
            </div>
            <div className="text-[11px] text-[#64748b] font-medium leading-tight mt-0.5">
              {roleMeta.brandSub}
            </div>
          </div>
        </div>

        {/* Active Role Label */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
            ACTIVE ROLE
          </div>
          <div className="text-[12px] font-bold text-[#064e43] mt-0.5">
            {roleMeta.activeRoleText}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-2 overflow-y-auto space-y-1">
        {navItems.map((item) => {
          let isActive = false;
          if (item.href.includes("?tab=")) {
            const itemTab = item.href.split("?tab=")[1];
            isActive = pathname.startsWith(item.href.split("?")[0]) && currentTab === itemTab;
          } else {
            isActive = pathname === item.href && !currentTab;
          }

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[13px] transition-all font-medium ${
                isActive
                  ? "bg-[#fde047] text-[#0f172a] font-bold shadow-sm"
                  : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-[#0f172a]" : "text-[#64748b]"}`} />
                <span>{item.label}</span>
              </div>
              {isActive && (
                <ChevronRight className="w-4 h-4 text-[#0f172a] stroke-[2.5]" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Priority Engine Card */}
      <div className="p-3 m-3 rounded-2xl bg-[#f0fdf4] border border-[#dcfce7]">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#166534]">
          <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
          <span>Priority Engine Active</span>
        </div>
        <div className="text-[10px] text-[#15803d] font-mono leading-tight mt-1 opacity-90">
          1. Exams &gt; 2. Classes &gt; 3. Events &gt; 4. Lectures &gt; 5. Dept &gt; 6. Club
        </div>
      </div>
    </aside>
  );
}

export default function Sidebar({ role }: SidebarProps) {
  return (
    <Suspense fallback={<aside className="w-[245px] h-screen bg-white border-r border-[#e5e7eb] fixed left-0 top-0 z-40" />}>
      <SidebarInner role={role} />
    </Suspense>
  );
}
