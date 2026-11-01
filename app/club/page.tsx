"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import {
  CalendarPlus,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Send,
  MessageSquare,
  Sparkles,
  ArrowUpRight,
  Trash2,
  Check,
  AlertCircle,
  Building,
  Users,
  Filter,
  Search,
  RefreshCw,
  Ban,
  DoorOpen,
  Layers,
  MapPin,
  Bot,
  AlertTriangle,
  FileText,
  Calendar,
  X,
  BadgeAlert,
} from "lucide-react";

export interface ClubBookingItem {
  id: string;
  event: string;
  venue: string;
  venue_id?: string;
  day: string;
  period: string;
  start_period?: number;
  duration?: number;
  by: string;
  role: "club";
  status: "approved" | "rejected" | "alternative_suggested" | "cancelled" | "pending";
  reason: string;
  alt_venue?: string;
  alt_day?: string;
  alt_period?: string;
  attendance: number;
  equipment?: string[];
  submitted_at?: string;
  cancelled_at?: string;
  raw_text?: string;
}

const CIT_CLUBS = [
  "All Clubs",
  "Coding Club",
  "Dance Club",
  "Dramatics Society",
  "E-Cell",
  "Gaming Society",
  "Literary Society",
  "Music Club",
  "Photography Club",
  "Quiz Club",
  "Robotics Club",
  "Astronomy Club",
];

const VENUE_OPTIONS = [
  { id: "AUD", name: "Main Auditorium (AUD)", cap: 500, type: "auditorium", accessible: true },
  { id: "SH-1", name: "Seminar Hall 1 (SH-1)", cap: 150, type: "seminar_hall", accessible: true },
  { id: "SH-2", name: "Seminar Hall 2 (SH-2)", cap: 100, type: "seminar_hall", accessible: false },
  { id: "OAT", name: "Open-Air Theatre (OAT)", cap: 800, type: "outdoor", accessible: true },
  { id: "CS-LAB-1", name: "Computing Lab 1 (CS-LAB-1)", cap: 90, type: "lab_cs", accessible: true },
  { id: "CS-LAB-2", name: "Computing Lab 2 (CS-LAB-2)", cap: 90, type: "lab_cs", accessible: true },
  { id: "ELEC-LAB-1", name: "Electronics Lab 1 (ELEC-LAB-1)", cap: 80, type: "lab_elec", accessible: true },
  { id: "LH-1", name: "Lecture Hall 1 (LH-1)", cap: 200, type: "lecture_hall", accessible: true },
  { id: "LH-2", name: "Lecture Hall 2 (LH-2)", cap: 200, type: "lecture_hall", accessible: true },
  { id: "LH-3", name: "Lecture Hall 3 (LH-3)", cap: 120, type: "lecture_hall", accessible: true },
  { id: "CR-101", name: "Classroom A-101 (CR-101)", cap: 90, type: "classroom", accessible: true },
];

const DAYS_MAP: Record<string, string> = {
  MON: "Monday (Week 7)",
  TUE: "Tuesday (Week 7)",
  WED: "Wednesday (Week 7)",
  THU: "Thursday (Week 7)",
  FRI: "Friday (Week 7)",
  SAT: "Saturday (Week 7)",
};

const PERIODS = [
  { id: 6, label: "P6 – P9 (14:00 - 18:00 - Afternoon Workshop/Contest)" },
  { id: 10, label: "P10 – P12 (18:00 - 21:00 - Prime Evening Slot)" },
  { id: 10.5, label: "P10 – P13 (18:00 - 22:00 - Full Evening Fest Gala)" },
  { id: 4, label: "P4 – P6 (11:00 - 14:00 - Midday Slot)" },
  { id: 8, label: "P8 – P9 (16:00 - 18:00 - Late Afternoon Prep)" },
];

// Baseline official CIT public dataset requests seeded with solver results
const CIT_BASELINE_BOOKINGS: ClubBookingItem[] = [
  {
    id: "BR-02",
    event: "Spectra Code Sprint (8-Hour AI Coding Contest)",
    venue: "Computing Lab 1 (CS-LAB-1)",
    venue_id: "CS-LAB-1",
    day: "FRI",
    period: "P6 – P11 (14:00 - 20:00)",
    by: "Coding Club",
    role: "club",
    status: "approved",
    reason: "Approved: Zero academic practical clash on Friday afternoon in CS-LAB-1.",
    attendance: 40,
    equipment: ["projector", "computers"],
    submitted_at: "2027-01-20T10:00:00+05:30",
  },
  {
    id: "BR-04",
    event: "Line-Follower Robot Workshop",
    venue: "Electronics Lab 1 (ELEC-LAB-1)",
    venue_id: "ELEC-LAB-1",
    day: "TUE",
    period: "P10 – P13 (18:00 - 22:00)",
    by: "Robotics Club",
    role: "club",
    status: "cancelled",
    reason: "Cancelled by Requester: Workshop rescheduled to post-Spectra semester window.",
    cancelled_at: "2027-02-03T18:40:00+05:30",
    attendance: 35,
    equipment: ["power_benches"],
    submitted_at: "2027-01-22T14:15:00+05:30",
  },
  {
    id: "BR-05a",
    event: "Spectra Dance Rehearsal (Day 1)",
    venue: "Open-Air Theatre (OAT)",
    venue_id: "OAT",
    day: "MON",
    period: "P10 – P12 (18:00 - 21:00)",
    by: "Dance Club",
    role: "club",
    status: "approved",
    reason: "Approved: Open-Air Theatre cleared for evening rehearsals (Priority 6 valid).",
    attendance: 45,
    equipment: ["pa_system", "stage"],
    submitted_at: "2027-01-24T09:00:00+05:30",
  },
  {
    id: "BR-06",
    event: "Spectra Quiz Prelims",
    venue: "Seminar Hall 1 (SH-1)",
    venue_id: "SH-1",
    day: "WED",
    period: "P10 – P12 (18:00 - 21:00)",
    by: "Quiz Club",
    role: "club",
    status: "approved",
    reason: "Approved: SH-1 ground-floor auditorium verified free on Wednesday evening.",
    attendance: 120,
    equipment: ["projector", "pa_system"],
    submitted_at: "2027-01-25T11:30:00+05:30",
  },
  {
    id: "BR-07",
    event: "Stage Play: Andha Yug",
    venue: "Main Auditorium (AUD)",
    venue_id: "AUD",
    day: "THU",
    period: "P10 – P12 (18:00 - 21:00)",
    by: "Dramatics Society",
    role: "club",
    status: "approved",
    reason: "Approved: Main Auditorium allocated with full theatrical stage and PA system.",
    attendance: 130,
    equipment: ["stage", "pa_system"],
    submitted_at: "2027-01-26T09:45:00+05:30",
  },
  {
    id: "BR-09",
    event: "Valorant LAN Finals Live Screening",
    venue: "Main Auditorium (AUD)",
    venue_id: "AUD",
    day: "FRI",
    period: "P10 – P13 (18:00 - 22:00)",
    by: "Gaming Society",
    role: "club",
    status: "rejected",
    reason: "Rejected: Requested attendance (1,200 participants) exceeds largest campus venue capacity (800 in OAT, 500 in AUD).",
    attendance: 1200,
    equipment: ["projector", "pa_system"],
    submitted_at: "2027-01-27T16:00:00+05:30",
  },
  {
    id: "SPEC-03",
    event: "LAN Gaming Qualifier Round",
    venue: "Computing Lab 1 (CS-LAB-1)",
    venue_id: "CS-LAB-1",
    day: "TUE",
    period: "P6 – P8 (14:00 - 17:00)",
    by: "Gaming Society",
    role: "club",
    status: "alternative_suggested",
    reason: "Venue Contention: CS-LAB-1 pre-assigned to CS202 Lab Practical (Regular Class Priority 2 overrides Club Priority 6).",
    alt_venue: "Computing Lab 2 (CS-LAB-2)",
    alt_day: "TUE",
    alt_period: "P10 – P12 (18:00 - 21:00)",
    attendance: 40,
    submitted_at: "2027-01-28T12:00:00+05:30",
  },
  {
    id: "BR-10",
    event: "Spectra Photo Exhibition Gallery",
    venue: "Seminar Hall 1 (SH-1)",
    venue_id: "SH-1",
    day: "THU",
    period: "P6 – P9 (14:00 - 18:00)",
    by: "Photography Club",
    role: "club",
    status: "approved",
    reason: "Approved: Gallery corridor and foyer confirmed free during Thursday afternoon.",
    attendance: 75,
    equipment: ["display_boards"],
    submitted_at: "2027-01-28T14:30:00+05:30",
  },
  {
    id: "BR-15",
    event: "Spectra Jam Night (Battle of the Bands)",
    venue: "Main Auditorium (AUD)",
    venue_id: "AUD",
    day: "THU",
    period: "P10 – P13 (18:00 - 22:00)",
    by: "Music Club",
    role: "club",
    status: "approved",
    reason: "Approved: Evening slot (18:00–22:00) with zero academic lecture clashes.",
    attendance: 350,
    equipment: ["stage", "pa_system", "ac"],
    submitted_at: "2027-01-29T10:15:00+05:30",
  },
  {
    id: "BR-17",
    event: "Telescope Night Sky Observation",
    venue: "Open-Air Theatre (OAT)",
    venue_id: "OAT",
    day: "WED",
    period: "P10 – P13 (18:00 - 22:00)",
    by: "Astronomy Club",
    role: "club",
    status: "rejected",
    reason: "Rejected: Venue OAT reserved for Institute Inauguration (Priority 3 outranks Club Priority 6).",
    attendance: 90,
    equipment: ["outdoor"],
    submitted_at: "2027-01-30T15:00:00+05:30",
  },
];

function ClubContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"overview" | "new" | "nl">("overview");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["overview", "new", "nl"].includes(tab)) {
      setActiveTab(tab as any);
    } else {
      setActiveTab("overview");
    }
  }, [searchParams]);

  // Active Club Filter / Identity
  const [selectedClub, setSelectedClub] = useState("All Clubs");

  // Master list of bookings
  const [bookings, setBookings] = useState<ClubBookingItem[]>(CIT_BASELINE_BOOKINGS);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Search & Status filters for requests list
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Submission Form State (Standard Form)
  const [eventName, setEventName] = useState("");
  const [clubName, setClubName] = useState("Coding Club");
  const [venueId, setVenueId] = useState("AUD");
  const [day, setDay] = useState("THU");
  const [periodStr, setPeriodStr] = useState("P10 – P12 (18:00 - 21:00)");
  const [attendance, setAttendance] = useState("100");
  const [needs, setNeeds] = useState<string[]>(["pa_system", "projector"]);
  const [rawNotes, setRawNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cancellation Modal State
  const [cancellingBooking, setCancellingBooking] = useState<ClubBookingItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Natural Language AI Parser State
  const [nlText, setNlText] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [nlParsed, setNlParsed] = useState<{
    event: string;
    venue: string;
    venue_id: string;
    day: string;
    period: string;
    attendance: number;
    needs: string[];
    conflictWarning?: string;
  } | null>(null);

  // Load dynamically submitted requests from /api/requests
  const loadDynamicRequests = async () => {
    try {
      const res = await fetch("/api/requests");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.requests) return;

      const dynamicClubItems: ClubBookingItem[] = data.requests
        .filter((r: any) => r.type === "spectra_booking" || r.submitted_by_role === "club_rep" || r.priorityLevel === 6)
        .map((r: any) => ({
          id: r.id,
          event: r.course || "Club Event",
          venue: r.venue,
          venue_id: r.venue,
          day: r.day,
          period: r.period,
          by: r.applicant || r.faculty_name || "Club Representative",
          role: "club",
          status: r.status as any,
          reason: r.adminReason || r.reason || "Under review by Dean's Office Priority Engine.",
          attendance: r.attendance || 80,
          equipment: r.equipment || [],
          submitted_at: r.created_at,
          cancelled_at: r.cancelled_at,
          alt_venue: r.alternative_venue,
        }));

      if (dynamicClubItems.length > 0) {
        setBookings((prev) => {
          const ids = new Set(prev.map((b) => b.id));
          const newOnes = dynamicClubItems.filter((d) => !ids.has(d.id));
          // Update status of matching items
          const updated = prev.map((item) => {
            const found = dynamicClubItems.find((d) => d.id === item.id);
            if (found) {
              return {
                ...item,
                status: found.status,
                reason: found.reason || item.reason,
                cancelled_at: found.cancelled_at || item.cancelled_at,
              };
            }
            return item;
          });
          return [...newOnes, ...updated];
        });
      }
    } catch (e) {
      console.warn("Could not load dynamic requests:", e);
    }
  };

  useEffect(() => {
    loadDynamicRequests();
  }, []);

  // Filtered bookings based on selected club, status, and search query
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (selectedClub !== "All Clubs" && b.by !== selectedClub) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          b.id.toLowerCase().includes(q) ||
          b.event.toLowerCase().includes(q) ||
          b.venue.toLowerCase().includes(q) ||
          b.by.toLowerCase().includes(q) ||
          b.reason.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [bookings, selectedClub, statusFilter, searchQuery]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const currentClubBookings = selectedClub === "All Clubs" ? bookings : bookings.filter((b) => b.by === selectedClub);
    return {
      total: currentClubBookings.length,
      approved: currentClubBookings.filter((b) => b.status === "approved").length,
      rejected: currentClubBookings.filter((b) => b.status === "rejected").length,
      alternative: currentClubBookings.filter((b) => b.status === "alternative_suggested").length,
      cancelled: currentClubBookings.filter((b) => b.status === "cancelled").length,
      pending: currentClubBookings.filter((b) => b.status === "pending").length,
    };
  }, [bookings, selectedClub]);

  // -------------------------------------------------------------------------
  // Feature 1: Cancel Venue Request with Reason
  // -------------------------------------------------------------------------
  const handleOpenCancelModal = (booking: ClubBookingItem) => {
    setCancellingBooking(booking);
    setCancelReason("Event schedule modified / postponed by club core committee.");
  };

  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    const bookingId = cancellingBooking.id;

    // Update state locally
    const nowIso = new Date().toISOString();
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: "cancelled",
              reason: `Cancelled by Club Representative: ${cancelReason}`,
              cancelled_at: nowIso,
            }
          : b
      )
    );

    // Sync cancellation to /api/requests
    try {
      await fetch("/api/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bookingId,
          status: "cancelled",
          adminReason: `Cancelled by Club Representative: ${cancelReason}`,
          cancelled_by: cancellingBooking.by || "Club Representative",
        }),
      });
    } catch (e) {
      console.warn("Backend cancellation sync failed:", e);
    }

    setFeedbackMsg(`✓ Booking request ${bookingId} ("${cancellingBooking.event}") was successfully cancelled.`);
    setCancellingBooking(null);
  };

  // -------------------------------------------------------------------------
  // Feature 2: Accept Suggested Alternative Venue
  // -------------------------------------------------------------------------
  const handleAcceptAlternative = async (booking: ClubBookingItem) => {
    if (!booking.alt_venue && !booking.alt_period) return;

    const updatedVenue = booking.alt_venue || booking.venue;
    const updatedPeriod = booking.alt_period || booking.period;
    const updatedDay = booking.alt_day || booking.day;

    setBookings((prev) =>
      prev.map((item) =>
        item.id === booking.id
          ? {
              ...item,
              venue: updatedVenue,
              period: updatedPeriod,
              day: updatedDay,
              status: "approved",
              reason: `Alternative offer accepted by ${booking.by}. Assigned to ${updatedVenue} (${updatedPeriod}).`,
              alt_venue: undefined,
            }
          : item
      )
    );

    try {
      await fetch("/api/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: booking.id,
          status: "approved",
          adminReason: `Alternative accepted: Allocated ${updatedVenue} on ${updatedDay} ${updatedPeriod}`,
        }),
      });
    } catch (e) {
      console.warn("Alternative accept sync failed:", e);
    }

    setFeedbackMsg(`✓ Accepted alternative for ${booking.id}! Venue confirmed: ${updatedVenue}.`);
  };

  // -------------------------------------------------------------------------
  // Feature 3: Submit New Venue Request (Standard Structured Form)
  // -------------------------------------------------------------------------
  const handleSubmitStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) {
      alert("Please provide the event title.");
      return;
    }

    setIsSubmitting(true);
    const chosenVenue = VENUE_OPTIONS.find((v) => v.id === venueId);
    const attNum = parseInt(attendance, 10) || 50;

    // Hard Constraint Check (H9: Lunch overlap / Capacity overflow)
    let initialStatus: "pending" | "approved" | "rejected" = "approved";
    let decisionReason = "Validated: Evening fest period (P10–P13) has zero academic lecture clashes.";

    if (periodStr.includes("11:00") && periodStr.includes("14:00")) {
      initialStatus = "rejected";
      decisionReason = "Hard constraint violation (H9): overlaps with mandatory institute lunch break (13:00–14:00).";
    } else if (chosenVenue && attNum > chosenVenue.cap) {
      initialStatus = "rejected";
      decisionReason = `Venue capacity violation (H5): Attendance (${attNum}) exceeds ${chosenVenue.name} capacity of ${chosenVenue.cap}.`;
    }

    const newId = `BR-${Math.floor(21 + Math.random() * 70)}`;
    const newBooking: ClubBookingItem = {
      id: newId,
      event: eventName,
      venue: chosenVenue ? chosenVenue.name : venueId,
      venue_id: venueId,
      day,
      period: periodStr,
      by: selectedClub !== "All Clubs" ? selectedClub : clubName,
      role: "club",
      status: initialStatus,
      reason: decisionReason,
      attendance: attNum,
      equipment: needs,
      submitted_at: new Date().toISOString(),
    };

    // Save locally
    setBookings((prev) => [newBooking, ...prev]);

    // Persist to /api/requests
    try {
      await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "spectra_booking",
          submitted_by_role: "club_rep",
          applicant: newBooking.by,
          department: "Student Affairs / Clubs",
          course: eventName,
          section: "Spectra Tech & Cultural Fest",
          venue: chosenVenue ? chosenVenue.name : venueId,
          day: DAYS_MAP[day] || day,
          period: periodStr,
          attendance: attNum,
          equipment: needs,
          reason: rawNotes || `Spectra Week Venue Request: ${eventName}`,
          priorityLevel: 6, // Priority 6 for Club Events
          status: initialStatus,
          adminReason: decisionReason,
        }),
      });
    } catch (e) {
      console.warn("Backend request submission failed:", e);
    }

    setFeedbackMsg(`✓ Request ${newId} ("${eventName}") submitted. Status: ${initialStatus.toUpperCase()}.`);
    setEventName("");
    setRawNotes("");
    setIsSubmitting(false);
    setActiveTab("overview");
  };

  // -------------------------------------------------------------------------
  // Feature 4: Natural Language AI Request Parser & Submitter
  // -------------------------------------------------------------------------
  const handleParseNl = async () => {
    if (!nlText.trim()) return;
    setNlLoading(true);

    try {
      const res = await fetch("/api/ai/parse-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: nlText }),
      });

      if (!res.ok) throw new Error("AI parser failed");
      const data = await res.json();

      const win = data.windows && data.windows[0] ? data.windows[0] : { day: "THU", from_period: 10, to_period: 12 };
      const venueMap: Record<string, string> = {
        AUD: "Main Auditorium (AUD)",
        "SH-1": "Seminar Hall 1 (SH-1)",
        "SH-2": "Seminar Hall 2 (SH-2)",
        OAT: "Open-Air Theatre (OAT)",
        "CS-LAB-1": "Computing Lab 1 (CS-LAB-1)",
        "CS-LAB-2": "Computing Lab 2 (CS-LAB-2)",
      };

      const matchedRoom = data.requested_room || (data.room_types?.[0] ? data.room_types[0] : "AUD");
      const detectedVenueName = venueMap[matchedRoom] || matchedRoom;

      let warning: string | undefined = undefined;
      if (data.conflicts_or_warnings && data.conflicts_or_warnings.length > 0) {
        warning = data.conflicts_or_warnings.join(" | ");
      } else if (win.from_period <= 5 && win.to_period >= 6) {
        warning = "Overlaps with institute-wide mandatory lunch break (13:00–14:00). Will be rejected.";
      } else if (win.from_period < 10) {
        warning = "Regular teaching hours (Priority 2) take precedence over club activities (Priority 6).";
      }

      setNlParsed({
        event: nlText.trim().length > 55 ? nlText.trim().slice(0, 52) + "..." : nlText.trim(),
        venue: detectedVenueName,
        venue_id: matchedRoom,
        day: win.day,
        period: `P${win.from_period} – P${win.to_period}`,
        attendance: data.attendance || 80,
        needs: data.needs || [],
        conflictWarning: warning,
      });
    } catch {
      // Heuristic fallback
      setNlParsed({
        event: nlText.trim(),
        venue: "Main Auditorium (AUD)",
        venue_id: "AUD",
        day: "THU",
        period: "P10 – P12 (18:00 - 21:00)",
        attendance: 100,
        needs: ["pa_system"],
      });
    } finally {
      setNlLoading(false);
    }
  };

  const handleAcceptNlBooking = async () => {
    if (!nlParsed) return;

    let initialStatus: "pending" | "approved" | "rejected" = "approved";
    let decisionReason = "Validated: Natural language booking cleared priority rules and evening constraints.";

    if (nlParsed.conflictWarning) {
      initialStatus = "rejected";
      decisionReason = nlParsed.conflictWarning;
    }

    const newId = `BR-${Math.floor(21 + Math.random() * 70)}`;
    const newBooking: ClubBookingItem = {
      id: newId,
      event: nlParsed.event,
      venue: nlParsed.venue,
      venue_id: nlParsed.venue_id,
      day: nlParsed.day,
      period: nlParsed.period,
      by: selectedClub !== "All Clubs" ? selectedClub : "Spectra Club Rep",
      role: "club",
      status: initialStatus,
      reason: decisionReason,
      attendance: nlParsed.attendance,
      equipment: nlParsed.needs,
      submitted_at: new Date().toISOString(),
      raw_text: nlText,
    };

    setBookings((prev) => [newBooking, ...prev]);

    try {
      await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "spectra_booking",
          submitted_by_role: "club_rep",
          applicant: newBooking.by,
          department: "Student Affairs / Clubs",
          course: nlParsed.event,
          section: "Spectra Tech & Cultural Fest",
          venue: nlParsed.venue,
          day: DAYS_MAP[nlParsed.day] || nlParsed.day,
          period: nlParsed.period,
          attendance: nlParsed.attendance,
          equipment: nlParsed.needs,
          reason: nlText,
          priorityLevel: 6,
          status: initialStatus,
          adminReason: decisionReason,
        }),
      });
    } catch (e) {
      console.warn("Backend sync failed:", e);
    }

    setFeedbackMsg(`✓ AI Booking ${newId} registered and processed. Status: ${initialStatus.toUpperCase()}.`);
    setNlText("");
    setNlParsed(null);
    setActiveTab("overview");
  };

  return (
    <DashboardLayout requiredRole="club_rep">
      {(user) => (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          {/* Header & Club Identity Selector */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-[12px] font-semibold text-[#64748b] tracking-wide mb-1">
                Workspace <span className="mx-1 text-gray-300">&gt;</span> Student Clubs &amp; Societies
              </div>
              <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0f172a] tracking-tight">
                Spectra Fest Club Representative Portal
              </h1>
              <p className="text-[13px] text-[#64748b] mt-0.5">
                Submit venue requests, monitor approval reasons, and cancel or manage alternatives for Spectra Week.
              </p>
            </div>

            {/* Club Filter Selector */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-2xl border border-gray-200 shadow-sm">
                <Users className="w-4 h-4 text-[#064e43]" />
                <span className="text-xs font-bold text-gray-600">Representing:</span>
                <select
                  value={selectedClub}
                  onChange={(e) => {
                    setSelectedClub(e.target.value);
                    if (e.target.value !== "All Clubs") setClubName(e.target.value);
                  }}
                  className="text-xs font-extrabold text-[#064e43] bg-transparent focus:outline-none cursor-pointer"
                >
                  {CIT_CLUBS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={loadDynamicRequests}
                className="p-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl text-gray-600 transition-all shadow-sm active:scale-95"
                title="Refresh Status"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hero Banner strictly matching theme */}
          <div className="relative overflow-hidden rounded-[26px] bg-[#064e43] text-white p-7 shadow-sm">
            <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none" />
            <div className="absolute right-32 top-10 w-64 h-64 bg-white/5 rounded-full pointer-events-none" />

            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#fde047] text-xs font-semibold backdrop-blur-sm mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Spectra Week (Week 7) • Priority Level 6 Submissions</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Submit, Cancel &amp; Inspect Venue Requests
              </h2>

              <p className="mt-2 text-white/80 text-[13px] sm:text-sm leading-relaxed max-w-xl">
                Book campus auditoriums, seminar halls, and open-air stages with instant status feedback. Inspect detailed approval reasons and cancellation audits verified by the Dean&apos;s priority solver.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setActiveTab("new")}
                  className="inline-flex items-center gap-2 bg-[#fde047] hover:bg-[#facc15] text-[#064e43] px-5 py-2.5 rounded-full text-[13px] font-bold transition-all shadow-sm active:scale-95"
                >
                  <CalendarPlus className="w-4 h-4 text-[#064e43]" />
                  <span>Submit Venue Request</span>
                </button>

                <button
                  onClick={() => setActiveTab("nl")}
                  className="inline-flex items-center gap-2 bg-[#064e43] hover:bg-[#053d34] text-white border border-white/20 px-4 py-2.5 rounded-full text-[13px] font-semibold transition-all active:scale-95"
                >
                  <Bot className="w-4 h-4" />
                  <span>AI Natural Language Booking</span>
                </button>
              </div>
            </div>
          </div>

          {/* Feedback banner */}
          {feedbackMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{feedbackMsg}</span>
              </div>
              <button onClick={() => setFeedbackMsg(null)} className="text-emerald-700 font-bold hover:underline">
                ✕
              </button>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
            {[
              { id: "overview", label: "Dashboard", icon: Building },
              { id: "new", label: "Submit Venue Request", icon: CalendarPlus },
              { id: "nl", label: "AI Plain-Language Prompt", icon: MessageSquare },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isActive
                      ? "bg-[#064e43] text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* KPI Metrics Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="bg-white rounded-[24px] border border-[#e2e8f0] p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Submitted</div>
                <div className="text-2xl font-extrabold text-[#0f172a] mt-1">{metrics.total}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{selectedClub}</div>
              </div>
              <div className="w-9 h-9 rounded-2xl bg-[#e6f4f1] text-[#064e43] flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white rounded-[24px] border border-[#e2e8f0] p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Approved</div>
                <div className="text-2xl font-extrabold text-emerald-800 mt-1">{metrics.approved}</div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Venue Allocated</div>
              </div>
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white rounded-[24px] border border-[#e2e8f0] p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Alternatives</div>
                <div className="text-2xl font-extrabold text-amber-800 mt-1">{metrics.alternative}</div>
                <div className="text-[10px] text-amber-600 mt-0.5">Action Required</div>
              </div>
              <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <DoorOpen className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white rounded-[24px] border border-[#e2e8f0] p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Rejected</div>
                <div className="text-2xl font-extrabold text-red-800 mt-1">{metrics.rejected}</div>
                <div className="text-[10px] text-red-500 mt-0.5">With Detailed Reason</div>
              </div>
              <div className="w-9 h-9 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center font-bold">
                <XCircle className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white rounded-[24px] border border-[#e2e8f0] p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Cancelled</div>
                <div className="text-2xl font-extrabold text-gray-700 mt-1">{metrics.cancelled}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">By Club Rep</div>
              </div>
              <div className="w-9 h-9 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center font-bold">
                <Ban className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* ================================================================================= */}
          {/* TAB 1: OVERVIEW */}
          {/* ================================================================================= */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Status Feed & Requests Ledger */}
              <div className="lg:col-span-2 bg-white rounded-[26px] border border-[#e2e8f0] p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      Venue Requests Ledger ({filteredBookings.length})
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Live status feed for {selectedClub} with Dean&apos;s decision justification
                    </p>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search event/reason..."
                        className="pl-8 pr-3 py-1.5 text-xs bg-[#f8fafc] border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-[#064e43] w-40"
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-[#f8fafc] border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-[#064e43]"
                    >
                      <option value="all">All Statuses</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="alternative_suggested">Alt Offered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
                  {filteredBookings.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      No booking requests found matching filters.
                    </div>
                  ) : (
                    filteredBookings.map((b) => (
                      <div
                        key={b.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-start justify-between gap-3 ${
                          b.status === "approved"
                            ? "border-emerald-200 bg-[#f8faf9]"
                            : b.status === "rejected"
                            ? "border-red-200 bg-red-50/30"
                            : b.status === "cancelled"
                            ? "border-gray-200 bg-gray-50/70 opacity-80"
                            : b.status === "alternative_suggested"
                            ? "border-amber-200 bg-amber-50/30"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-[#064e43] bg-[#e6f4f1] px-2 py-0.5 rounded-md">
                              {b.id}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                b.status === "approved"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : b.status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : b.status === "cancelled"
                                  ? "bg-gray-100 text-gray-600 line-through"
                                  : b.status === "alternative_suggested"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {b.status.replace("_", " ")}
                            </span>
                            <span className="text-xs text-gray-600 font-bold">• {b.by}</span>
                            <span className="text-[11px] text-gray-400">
                              (Expected: {b.attendance})
                            </span>
                          </div>

                          <div className="text-sm font-bold text-gray-900">{b.event}</div>

                          <div className="text-xs text-gray-600">
                            {b.venue} • {DAYS_MAP[b.day] || b.day}, {b.period}
                          </div>

                          {/* Reason Callout */}
                          <div className="text-xs text-gray-700 bg-white p-2.5 rounded-xl border border-gray-200 mt-1">
                            <strong>Decision Reason:</strong> {b.reason}
                          </div>

                          {/* Alternative suggestion box */}
                          {b.status === "alternative_suggested" && (b.alt_venue || b.alt_period) && (
                            <div className="text-xs bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <strong>Proposed Alt:</strong> Move to{" "}
                                <span className="font-bold underline">{b.alt_venue || b.venue}</span> on{" "}
                                <span className="font-bold">{b.alt_day ? DAYS_MAP[b.alt_day] : b.day} {b.alt_period || b.period}</span>
                              </div>
                              <button
                                onClick={() => handleAcceptAlternative(b)}
                                className="px-3 py-1 rounded-full text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-sm shrink-0 active:scale-95"
                              >
                                Accept Alt
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Cancel / Accept button */}
                        <div className="shrink-0 flex items-center gap-2 pt-1">
                          {b.status !== "cancelled" ? (
                            <button
                              onClick={() => handleOpenCancelModal(b)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-all flex items-center gap-1.5 active:scale-95"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>
                          ) : (
                            <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="bg-white rounded-[26px] border border-[#e2e8f0] p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-gray-900">Representative Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab("new")}
                    className="w-full text-left p-3.5 rounded-2xl border border-gray-200 bg-[#f8faf9] hover:bg-[#e6f4f1] transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center border border-gray-200 text-[#064e43]">
                          <CalendarPlus className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900 group-hover:text-[#064e43]">
                            Submit Venue Request
                          </div>
                          <div className="text-[11px] text-gray-500">Structured form for auditorium / labs</div>
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#064e43]" />
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("nl")}
                    className="w-full text-left p-3.5 rounded-2xl border border-gray-200 bg-[#f8faf9] hover:bg-[#e6f4f1] transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center border border-gray-200 text-[#064e43]">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900 group-hover:text-[#064e43]">
                            Natural Language Booking
                          </div>
                          <div className="text-[11px] text-gray-500">Paste plain English / Hinglish text</div>
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#064e43]" />
                    </div>
                  </button>
                </div>

                {/* Important Rules Banner */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>Spectra Priority Guidelines</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Club requests are capped at <strong>Priority 6</strong>. Evening slots (P10–P13, 18:00–22:00) guarantee zero academic clashes. Lunch interval (13:00–14:00) requests are strictly rejected (Rule H9).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================================= */}
          {/* TAB 2: SUBMIT NEW VENUE REQUEST (STRUCTURED FORM) */}
          {/* ================================================================================= */}
          {activeTab === "new" && (
            <div className="bg-white rounded-[26px] border border-[#e2e8f0] p-6 shadow-sm space-y-4 max-w-3xl mx-auto">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#e6f4f1] text-[#064e43] text-[11px] font-bold mb-1">
                  Spectra Week Submission Form • Priority 6
                </div>
                <h3 className="text-lg font-bold text-gray-900">Submit Campus Venue Booking</h3>
                <p className="text-xs text-gray-500">
                  Request auditoriums, lecture halls, seminar rooms, or outdoor venues during Spectra Fest (Week 7)
                </p>
              </div>

              <form onSubmit={handleSubmitStandard} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Event Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      placeholder="e.g., Annual Hackathon Opening Ceremony"
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#064e43]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Submitting Club / Society</label>
                    <select
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 font-medium focus:outline-none focus:border-[#064e43]"
                    >
                      {CIT_CLUBS.filter((c) => c !== "All Clubs").map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Preferred Venue</label>
                    <select
                      value={venueId}
                      onChange={(e) => setVenueId(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#064e43]"
                    >
                      {VENUE_OPTIONS.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} (Cap {v.cap})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Expected Attendance</label>
                    <input
                      type="number"
                      required
                      min={10}
                      max={1200}
                      value={attendance}
                      onChange={(e) => setAttendance(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#064e43]"
                    />
                    {parseInt(attendance) > 800 && (
                      <div className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Attendance exceeds largest campus venue (OAT seats 800). Will be rejected!
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Day of Spectra Week</label>
                    <select
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#064e43]"
                    >
                      {Object.entries(DAYS_MAP).map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Time Slot Window</label>
                    <select
                      value={periodStr}
                      onChange={(e) => setPeriodStr(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#064e43]"
                    >
                      {PERIODS.map((p) => (
                        <option key={p.id} value={p.label}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Equipment / Needs</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {["projector", "pa_system", "stage", "ac", "computers", "power_benches"].map((feat) => {
                      const hasFeat = needs.includes(feat);
                      return (
                        <button
                          type="button"
                          key={feat}
                          onClick={() => {
                            if (hasFeat) setNeeds((p) => p.filter((x) => x !== feat));
                            else setNeeds((p) => [...p, feat]);
                          }}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                            hasFeat
                              ? "bg-[#064e43] text-white border-[#064e43]"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {feat.replace("_", " ").toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Event Overview &amp; Justification</label>
                  <textarea
                    rows={2}
                    value={rawNotes}
                    onChange={(e) => setRawNotes(e.target.value)}
                    placeholder="e.g., Coding round for intra-college contestants, needs uninterrupted network and workstations..."
                    className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-3 text-xs text-gray-800 focus:outline-none focus:border-[#064e43]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#064e43] hover:bg-[#053d34] text-white py-3 rounded-full text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Submitting..." : "Submit Venue Request (Priority 6)"}</span>
                </button>
              </form>
            </div>
          )}

          {/* ================================================================================= */}
          {/* TAB 4: NATURAL LANGUAGE AI BOOKING PARSER */}
          {/* ================================================================================= */}
          {activeTab === "nl" && (
            <div className="bg-white rounded-[26px] border border-[#e2e8f0] p-6 shadow-sm space-y-5 max-w-3xl mx-auto">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#e6f4f1] text-[#064e43] text-[11px] font-bold mb-1">
                  AI Natural Language Booking Layer
                </div>
                <h3 className="text-lg font-bold text-gray-900">Paste Plain-Language or Hinglish Request</h3>
                <p className="text-xs text-gray-500">
                  Translates conversational festival requests into structured CIT booking objects with instant sanity checks
                </p>
              </div>

              {/* Sample Prompts from problem statement */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Try Sample Requests from Dataset:
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Need a room for 45 people on Tuesday 6 to 8 pm, projector please.",
                    "seminar hall kal shaam 6 baje, 2 ghante, 100 log, mic chahiye",
                    "Can I get a lab with computers for a 3-hour coding contest on Thursday afternoon? About 60 participants.",
                    "Our club meets every Monday 7 to 8 pm, 30 people, any small room is fine.",
                  ].map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNlText(s)}
                      className="text-left text-[11px] bg-[#f8fafc] hover:bg-[#e6f4f1] border border-gray-200 px-3 py-1.5 rounded-xl text-gray-700 transition-all"
                    >
                      &ldquo;{s}&rdquo;
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={nlText}
                  onChange={(e) => setNlText(e.target.value)}
                  placeholder="Type your message, e.g.: 'Dance Club needs OAT on Wednesday from 6 PM to 9 PM for annual show rehearsal, 50 people, stage and pa system needed'"
                  className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-3 text-xs text-gray-800 focus:outline-none focus:border-[#064e43]"
                />
                <button
                  type="button"
                  onClick={handleParseNl}
                  disabled={nlLoading || !nlText.trim()}
                  className="inline-flex items-center gap-2 bg-[#064e43] hover:bg-[#053d34] disabled:bg-gray-300 text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#fde047]" />
                  <span>{nlLoading ? "Parsing with AI Engine..." : "Parse & Check Availability"}</span>
                </button>
              </div>

              {/* Parsed Result Card */}
              {nlParsed && (
                <div className="p-5 rounded-2xl border border-gray-200 bg-[#f8faf9] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <span className="text-xs font-bold text-[#064e43] uppercase tracking-wider">
                      Extracted Structured Booking
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Validated
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Detected Venue:</span>
                      <strong className="text-gray-900">{nlParsed.venue}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Day:</span>
                      <strong className="text-gray-900">{DAYS_MAP[nlParsed.day] || nlParsed.day}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Period Slot:</span>
                      <strong className="text-gray-900">{nlParsed.period}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Attendance:</span>
                      <strong className="text-gray-900">{nlParsed.attendance} People</strong>
                    </div>
                  </div>

                  {nlParsed.conflictWarning && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{nlParsed.conflictWarning}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAcceptNlBooking}
                    className="w-full bg-[#fde047] hover:bg-[#facc15] text-[#064e43] py-2.5 rounded-full text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5 text-[#064e43]" />
                    <span>Confirm &amp; Submit Structured Booking</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================================================================================= */}
          {/* CANCELLATION MODAL */}
          {/* ================================================================================= */}
          {cancellingBooking && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-[26px] p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                    <Trash2 className="w-4 h-4" />
                    <span>Cancel Booking Request</span>
                  </div>
                  <button
                    onClick={() => setCancellingBooking(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed">
                  Are you sure you want to cancel request <strong>{cancellingBooking.id}</strong> (&ldquo;{cancellingBooking.event}&rdquo;)? As per CIT festival guidelines, withdrawn requests cannot be restored.
                </p>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Cancellation Reason</label>
                  <textarea
                    rows={2}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setCancellingBooking(null)}
                    className="px-4 py-2 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100"
                  >
                    Keep Booking
                  </button>
                  <button
                    onClick={handleConfirmCancel}
                    className="px-5 py-2 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all active:scale-95"
                  >
                    Confirm Cancellation
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

export default function ClubPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">Loading Club Portal...</div>}>
      <ClubContent />
    </Suspense>
  );
}
