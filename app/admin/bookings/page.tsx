"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Building,
  DoorOpen,
  Users,
  Search,
  Sparkles,
  Calendar,
  CheckCircle2,
  XCircle,
  Accessibility,
  Clock,
} from "lucide-react";

interface Venue {
  name: string;
  type: string;
  capacity: number;
  accessible: boolean;
  status: "available" | "occupied" | "maintenance";
  currentOccupant?: string;
}

const VENUES_LIST: Venue[] = [
  { name: "Main Auditorium", type: "Auditorium", capacity: 400, accessible: true, status: "occupied", currentOccupant: "Spectra Fest (Rock Night)" },
  { name: "Open-Air Theatre (OAT)", type: "Outdoor Amphitheatre", capacity: 500, accessible: true, status: "available" },
  { name: "Seminar Hall 1", type: "Seminar Hall", capacity: 120, accessible: true, status: "occupied", currentOccupant: "Dept Guest Lecture (CSE)" },
  { name: "Seminar Hall 2", type: "Seminar Hall", capacity: 80, accessible: false, status: "available" },
  { name: "Computer Lab 1", type: "Specialized Lab", capacity: 60, accessible: true, status: "occupied", currentOccupant: "CS102 Computing Practical" },
  { name: "Computer Lab 2", type: "Specialized Lab", capacity: 60, accessible: true, status: "available" },
  { name: "Computer Lab 3", type: "Specialized Lab", capacity: 45, accessible: false, status: "available" },
  { name: "Physics Lab", type: "Specialized Lab", capacity: 40, accessible: true, status: "occupied", currentOccupant: "PH102 Physics Lab" },
  { name: "Electronics Lab", type: "Specialized Lab", capacity: 40, accessible: true, status: "occupied", currentOccupant: "EC302 DSP Lab" },
  { name: "Lecture Hall 101", type: "Classroom", capacity: 70, accessible: true, status: "occupied", currentOccupant: "CS101 Intro to Computing" },
  { name: "Lecture Hall 102", type: "Classroom", capacity: 70, accessible: true, status: "available" },
  { name: "Lecture Hall 201", type: "Classroom", capacity: 65, accessible: false, status: "occupied", currentOccupant: "EC201 Analog Circuits" },
];

export default function VenuesBookingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");

  const filtered = VENUES_LIST.filter((v) => {
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "All" || v.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <DashboardLayout requiredRole="admin">
      {() => (
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Breadcrumb & Subtitle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[12px] font-semibold text-[#64748b] tracking-wide mb-1">
                Workspace <span className="mx-1 text-gray-300">&gt;</span> Campus Venues &amp; Bookings
              </div>
              <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0f172a] tracking-tight">
                Campus Venues &amp; Real-time Utilization
              </h1>
              <p className="text-[13px] text-[#64748b] mt-0.5">
                Monitor 27 campus spaces, check accessibility compliance, and review active bookings during Week 7.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0fdf4] border border-[#dcfce7] text-[12px] font-bold text-[#166534]">
                <Clock className="w-3.5 h-3.5" />
                <span>27 Active Campus Venues</span>
              </span>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="bg-white rounded-[24px] border border-[#e2e8f0] p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3 flex-1 max-w-sm">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search venue name (e.g. Auditorium, Lab 1)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs text-gray-800 font-medium focus:outline-none focus:border-[#064e43]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500 font-bold">Venue Type:</span>
              {["All", "Auditorium", "Seminar Hall", "Specialized Lab", "Classroom"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    filterType === t
                      ? "bg-[#064e43] text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Venues Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((venue) => (
              <div
                key={venue.name}
                className="bg-white rounded-[26px] border border-[#e2e8f0] p-5 space-y-4 hover:shadow-md transition-shadow shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-[#0f172a]">{venue.name}</h3>
                      <div className="text-xs text-gray-500 mt-0.5 font-medium">{venue.type}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                        venue.status === "available"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {venue.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-[#f8fafc] p-3 rounded-2xl border border-gray-100 mt-3.5">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-[#064e43]" />
                      <span className="text-gray-600">Cap: <strong>{venue.capacity} seats</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Accessibility className="w-3.5 h-3.5 text-[#064e43]" />
                      <span className="text-gray-600">{venue.accessible ? "Accessible (Ramp)" : "Standard"}</span>
                    </div>
                  </div>
                </div>

                {venue.currentOccupant ? (
                  <div className="text-xs text-[#064e43] bg-[#e6f4f1] p-3 rounded-2xl border border-[#064e43]/15">
                    <span className="font-bold text-[#064e43]">Active Slot: </span>
                    {venue.currentOccupant}
                  </div>
                ) : (
                  <div className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-2xl border border-emerald-100 font-semibold">
                    ✓ Available for immediate booking / allocation
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
