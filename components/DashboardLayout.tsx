"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { RefreshCw } from "lucide-react";

type UserRole = "admin" | "coordinator" | "faculty" | "club_rep";

interface UserSession {
  id: number | string;
  name: string;
  email: string;
  role: UserRole;
  department?: string | null;
}

interface DashboardLayoutProps {
  requiredRole: UserRole;
  children: (user: UserSession) => React.ReactNode;
}

export default function DashboardLayout({ requiredRole, children }: DashboardLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!data.authenticated || !data.user) {
          router.push("/");
          return;
        }
        if (data.user.role !== requiredRole) {
          const target =
            data.user.role === "admin"
              ? "/admin"
              : data.user.role === "coordinator"
              ? "/coordinator"
              : data.user.role === "faculty"
              ? "/faculty"
              : "/club";
          router.push(target);
          return;
        }
        setUser(data.user);
      } catch {
        router.push("/");
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [router, requiredRole]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7fb]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#6c5ce7]" />
          <p className="text-sm font-medium text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] flex">
      <Sidebar role={requiredRole} />
      <div className="flex-1 ml-[240px] flex flex-col">
        <TopBar user={user} />
        <main className="flex-1 p-6 overflow-y-auto">
          {children(user)}
        </main>
      </div>
    </div>
  );
}

