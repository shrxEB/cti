"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Building,
  Calendar,
  DoorClosed,
  DoorOpen,
  Check,
  X,
  Sparkles,
  ArrowUpRight,
  Clock,
  Send,
  CheckCircle2,
  Users,
  FileCheck2,
  AlertCircle,
  PlusCircle,
  Filter,
  Search,
  ArrowRight,
  ShieldAlert,
  Layers,
  Monitor,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  Bot,
  HelpCircle,
  BadgeAlert,
} from "lucide-react";

interface ScheduleSession {
  session_id: string;
  course_id: string;
  course_title: string;
  department: string;
  faculty_id?: string;
  faculty_name: string;
  kind: "lecture" | "lab" | "tutorial" | "event";
  groups: string[];
  day: string;
  start_period: number;
  duration: number;
  room_id: string;
  room_name: string;
  room_type?: string;
  size: number;
  isExtraClass?: boolean;
}

interface RoomInfo {
  id: string;
  name: string;
  building: string;
  type: string;
  capacity: number;
  features?: string[];
  accessible?: boolean;
}

interface LabRequestItem {
  id: string;
  applicant: string;
  lab: string;
  room_id: string;
  day: string;
  period: string;
  start_period: number;
  duration: number;
  purpose: string;
  attendance: number;
  status: "pending" | "approved" | "rejected" | "alternative_suggested";
  reason?: string;
  alternative?: string;
  clashWarning?: string | null;
  hasClash?: boolean;
  priorityLevel: number;
}

interface AcademicRequestRecord {
  id: string;
  type: string;
  submitted_by_role?: string;
  faculty_id?: string;
  faculty_name: string;
  department: string;
  course: string;
  section: string;
  venue: string;
  day: string;
  period: string;
  target_day?: string;
  target_period?: string;
  target_venue?: string;
  session_id?: string;
  attendance?: number;
  mandatory_groups?: string[];
  reason?: string;
  priorityLevel: number;
  status: "pending" | "approved" | "rejected" | "alternative_suggested";
  adminReason?: string;
  alternative_venue?: string;
  created_at: string;
}

const DAYS_LIST = ["MON", "TUE", "WED", "THU", "FRI"];
const DAY_LABELS: Record<string, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
};

const PERIODS = [
  { id: 1, label: "P1 (08:00 - 09:00)" },
  { id: 2, label: "P2 (09:00 - 10:00)" },
  { id: 3, label: "P3 (10:00 - 11:00)" },
  { id: 4, label: "P4 (11:00 - 12:00)" },
  { id: 5, label: "P5 (12:00 - 13:00)" },
  { id: 6, label: "P6 (14:00 - 15:00)" },
  { id: 7, label: "P7 (15:00 - 16:00)" },
  { id: 8, label: "P8 (16:00 - 17:00)" },
  { id: 9, label: "P9 (17:00 - 18:00)" },
];

const EVENT_PERIODS = [
  { id: 10, label: "P10 (18:00 - 19:00)" },
  { id: 11, label: "P11 (19:00 - 20:00)" },
  { id: 12, label: "P12 (20:00 - 21:00)" },
  { id: 13, label: "P13 (21:00 - 22:00)" },
];

const DEPARTMENTS = [
  { code: "CSE", name: "Computer Science & Engineering", labs: ["CS-LAB-1", "CS-LAB-2"] },
  { code: "ECE", name: "Electronics & Communication", labs: ["ELEC-LAB-1", "ELEC-LAB-2"] },
  { code: "ME", name: "Mechanical Engineering", labs: ["MECH-WS"] },
  { code: "CE", name: "Civil Engineering", labs: ["CIVIL-LAB"] },
  { code: "EE", name: "Electrical Engineering", labs: ["ELEC-LAB-1"] },
];

// Seeded lab booking requests from Spectra Week & Clubs targeting departmental labs
const INITIAL_LAB_REQUESTS: LabRequestItem[] = [
  {
    id: "BR-02",
    applicant: "Coding Club",
    lab: "Computing Lab 1",
    room_id: "CS-LAB-1",
    day: "THU",
    period: "P6 – P8 (14:00 - 17:00)",
    start_period: 6,
    duration: 3,
    purpose: "Spectra Code Sprint (8-Hour AI Coding Contest)",
    attendance: 40,
    status: "pending",
    priorityLevel: 6,
  },
  {
    id: "SPEC-03",
    applicant: "GameDev Society",
    lab: "Computing Lab 1",
    room_id: "CS-LAB-1",
    day: "TUE",
    period: "P6 – P8 (14:00 - 17:00)",
    start_period: 6,
    duration: 3,
    purpose: "LAN Gaming Qualifier Tournament",
    attendance: 35,
    status: "pending",
    priorityLevel: 6,
  },
  {
    id: "BR-04",
    applicant: "Robotics Club",
    lab: "Electronics Lab 1",
    room_id: "ELEC-LAB-1",
    day: "TUE",
    period: "P10 – P12 (18:00 - 21:00)",
    start_period: 10,
    duration: 3,
    purpose: "Line-Follower Bot Simulation & Arduino Workshop",
    attendance: 35,
    status: "pending",
    priorityLevel: 6,
  },
  {
    id: "LR-104",
    applicant: "AI & ML Student Chapter",
    lab: "Computing Lab 2",
    room_id: "CS-LAB-2",
    day: "WED",
    period: "P6 – P8 (14:00 - 17:00)",
    start_period: 6,
    duration: 3,
    purpose: "GPU Model Fine-Tuning Hands-on Workshop",
    attendance: 40,
    status: "approved",
    reason: "Approved: No scheduled CSE practicals in CS-LAB-2 on Wednesday afternoon.",
    priorityLevel: 6,
  },
];

function CoordinatorContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"overview" | "sessions" | "labs" | "bookings" | "timetable">("overview");
  const [selectedDept, setSelectedDept] = useState("CSE");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["overview", "sessions", "labs", "bookings", "timetable"].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  // Master data from backend
  const [allSessions, setAllSessions] = useState<ScheduleSession[]>([]);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [requestsList, setRequestsList] = useState<AcademicRequestRecord[]>([]);
  const [labRequests, setLabRequests] = useState<LabRequestItem[]>(INITIAL_LAB_REQUESTS);
  const [loading, setLoading] = useState(true);

  // Filter states for sessions
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");

  // Feature 1: Session Change Request Modal / Form State
  const [activeSessionToMove, setActiveSessionToMove] = useState<ScheduleSession | null>(null);
  const moveFormRef = useRef<HTMLDivElement | null>(null);
  const [moveTargetDay, setMoveTargetDay] = useState("WED");
  const [moveTargetPeriod, setMoveTargetPeriod] = useState(4);
  const [moveTargetRoom, setMoveTargetRoom] = useState("");
  const [moveReason, setMoveReason] = useState("");
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const [sessionChangeFeedback, setSessionChangeFeedback] = useState<string | null>(null);

  // Feature 2: Department Event Room Booking Form State
  const [eventTitle, setEventTitle] = useState("");
  const [eventAttendance, setEventAttendance] = useState(100);
  const [eventRoom, setEventRoom] = useState("SH-1");
  const [eventDay, setEventDay] = useState("WED");
  const [eventStartPeriod, setEventStartPeriod] = useState(10);
  const [eventDuration, setEventDuration] = useState(2);
  const [eventMandatoryGroups, setEventMandatoryGroups] = useState<string[]>(["CSE-3"]);
  const [eventNeeds, setEventNeeds] = useState<string[]>(["projector", "pa_system"]);
  const [eventReason, setEventReason] = useState("");
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [eventFeedback, setEventFeedback] = useState<string | null>(null);

  // AI Parser Bar State for Event Booking
  const [aiBookingPrompt, setAiBookingPrompt] = useState("");
  const [isParsingAi, setIsParsingAi] = useState(false);
  const [aiParseMessage, setAiParseMessage] = useState<string | null>(null);

  // Feature 3: Lab Approvals Feedback State & Modal State
  const [labFeedback, setLabFeedback] = useState<string | null>(null);
  const [activeLabActionModal, setActiveLabActionModal] = useState<{
    type: "approve" | "reject" | "alt";
    req: LabRequestItem;
    note: string;
  } | null>(null);

  // Load master schedule and request queue
  const loadData = async () => {
    try {
      setLoading(true);
      const [schedRes, reqRes] = await Promise.all([
        fetch("/api/schedule"),
        fetch("/api/requests"),
      ]);

      if (schedRes.ok) {
        const schedData = await schedRes.json();
        setAllSessions(schedData.sessions || []);
        if (schedData.rooms) setRooms(schedData.rooms);
      }

      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequestsList(reqData.requests || []);
      }
    } catch (err) {
      console.error("Failed to load coordinator data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute departmental sessions
  const deptSessions = useMemo(() => {
    return allSessions.filter((s) => {
      if (s.department && s.department.toUpperCase() === selectedDept.toUpperCase()) return true;
      if (s.course_id && s.course_id.toUpperCase().startsWith(selectedDept.toUpperCase())) return true;
      return false;
    });
  }, [allSessions, selectedDept]);

  // Compute department's assigned lab rooms
  const deptLabRoomIds = useMemo(() => {
    const deptObj = DEPARTMENTS.find((d) => d.code === selectedDept);
    return deptObj ? deptObj.labs : ["CS-LAB-1", "CS-LAB-2"];
  }, [selectedDept]);

  // Merge scheduled lab batches with lab requests to evaluate clashes
  const evaluatedLabRequests = useMemo(() => {
    return labRequests.map((req) => {
      // Check if scheduled practical sessions use this lab at this day & period
      const clashingSession = allSessions.find((s) => {
        if (s.room_id !== req.room_id && !req.lab.includes(s.room_id)) return false;
        if (s.day !== req.day) return false;

        const reqEnd = req.start_period + req.duration - 1;
        const sessEnd = s.start_period + s.duration - 1;
        // Overlap check
        return Math.max(req.start_period, s.start_period) <= Math.min(reqEnd, sessEnd);
      });

      if (clashingSession) {
        return {
          ...req,
          hasClash: true,
          clashWarning: `Practical Clash: ${clashingSession.course_id} (${clashingSession.course_title}) with ${clashingSession.groups.join(", ")} occupies ${clashingSession.room_name} at P${clashingSession.start_period}–P${clashingSession.start_period + clashingSession.duration - 1}.`,
        };
      }
      return {
        ...req,
        hasClash: false,
        clashWarning: null,
      };
    });
  }, [labRequests, allSessions]);

  // Filtered department sessions for table / explorer
  const filteredDeptSessions = useMemo(() => {
    return deptSessions.filter((s) => {
      if (kindFilter !== "all" && s.kind !== kindFilter) return false;
      if (yearFilter !== "all") {
        const matchesYear = s.groups.some((g) => g.includes(yearFilter));
        if (!matchesYear) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQ =
          s.course_id.toLowerCase().includes(q) ||
          s.course_title.toLowerCase().includes(q) ||
          s.faculty_name.toLowerCase().includes(q) ||
          s.room_name.toLowerCase().includes(q) ||
          s.groups.some((g) => g.toLowerCase().includes(q));
        if (!matchesQ) return false;
      }
      return true;
    });
  }, [deptSessions, kindFilter, yearFilter, searchQuery]);

  // Submitted session change requests for this department
  const departmentChangeRequests = useMemo(() => {
    return requestsList.filter(
      (r) =>
        r.department?.toUpperCase().includes(selectedDept.toUpperCase()) ||
        r.course?.toUpperCase().startsWith(selectedDept.toUpperCase()) ||
        r.submitted_by_role === "coordinator"
    );
  }, [requestsList, selectedDept]);

  // Submitted department event bookings
  const departmentEventBookings = useMemo(() => {
    return requestsList.filter(
      (r) =>
        r.type === "dept_event" ||
        r.priorityLevel === 5 ||
        (r.submitted_by_role === "coordinator" && r.type === "spectra_booking")
    );
  }, [requestsList]);

  // Live "What-If" Clash Pre-Check for Session Move
  const sessionMoveClash = useMemo(() => {
    if (!activeSessionToMove) return null;

    const targetDay = moveTargetDay;
    const targetPeriod = moveTargetPeriod;
    const duration = activeSessionToMove.duration || 1;
    const targetEnd = targetPeriod + duration - 1;

    // Rule H9: Check lunch overlap
    if (targetPeriod <= 5 && targetEnd >= 6) {
      return {
        hasClash: true,
        type: "lunch",
        message: `Violates Rule H9: Session crosses mandatory lunch break (13:00 - 14:00 between P5 and P6).`,
      };
    }

    // Rule H9: Labs must start at P2 or P6
    if (activeSessionToMove.kind === "lab" && targetPeriod !== 2 && targetPeriod !== 6) {
      return {
        hasClash: true,
        type: "lab_start",
        message: `Violates Rule H9: 3-Hour Laboratory practical blocks must start strictly at P2 (09:00) or P6 (14:00).`,
      };
    }

    // Rule H2: Faculty double booking check
    const facClash = allSessions.find((s) => {
      if (s.session_id === activeSessionToMove.session_id) return false;
      if (s.faculty_name !== activeSessionToMove.faculty_name && s.faculty_id !== activeSessionToMove.faculty_id) return false;
      if (s.day !== targetDay) return false;
      const sessEnd = s.start_period + s.duration - 1;
      return Math.max(targetPeriod, s.start_period) <= Math.min(targetEnd, sessEnd);
    });

    if (facClash) {
      return {
        hasClash: true,
        type: "faculty",
        message: `Faculty Clash (H2): ${activeSessionToMove.faculty_name} is already teaching ${facClash.course_id} on ${DAY_LABELS[targetDay]} at P${facClash.start_period}.`,
      };
    }

    // Rule H3: Student group double booking check
    const grpClash = allSessions.find((s) => {
      if (s.session_id === activeSessionToMove.session_id) return false;
      if (s.day !== targetDay) return false;
      const sharesGroup = s.groups.some((g) => activeSessionToMove.groups.includes(g));
      if (!sharesGroup) return false;
      const sessEnd = s.start_period + s.duration - 1;
      return Math.max(targetPeriod, s.start_period) <= Math.min(targetEnd, sessEnd);
    });

    if (grpClash) {
      return {
        hasClash: true,
        type: "group",
        message: `Student Cohort Clash (H3): Group ${grpClash.groups.join(", ")} already has ${grpClash.course_id} scheduled on ${DAY_LABELS[targetDay]} at P${grpClash.start_period}.`,
      };
    }

    // Rule H4: Room double booking check (if specific target room selected)
    if (moveTargetRoom) {
      const roomClash = allSessions.find((s) => {
        if (s.session_id === activeSessionToMove.session_id) return false;
        if (s.room_id !== moveTargetRoom && s.room_name !== moveTargetRoom) return false;
        if (s.day !== targetDay) return false;
        const sessEnd = s.start_period + s.duration - 1;
        return Math.max(targetPeriod, s.start_period) <= Math.min(targetEnd, sessEnd);
      });

      if (roomClash) {
        return {
          hasClash: true,
          type: "room",
          message: `Room Conflict (H4): Venue ${moveTargetRoom} is double-booked by ${roomClash.course_id} on ${DAY_LABELS[targetDay]} at P${roomClash.start_period}.`,
        };
      }
    }

    return {
      hasClash: false,
      message: `✓ Verified Safe: Zero clashes detected for ${activeSessionToMove.faculty_name} and Cohort ${activeSessionToMove.groups.join(", ")} on ${DAY_LABELS[targetDay]} P${targetPeriod}.`,
    };
  }, [activeSessionToMove, moveTargetDay, moveTargetPeriod, moveTargetRoom, allSessions]);

  // ----------------------------------------------------------------------------------
  // Feature 1 Handler: Request Change to Department Session
  // ----------------------------------------------------------------------------------
  const handleSessionMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSessionToMove) return;
    if (!moveReason.trim()) {
      alert("Please provide a justification for moving this academic session.");
      return;
    }

    setIsSubmittingMove(true);
    try {
      const payload = {
        type: "session_change",
        submitted_by_role: "coordinator",
        session_id: activeSessionToMove.session_id,
        course: `${activeSessionToMove.course_id} ${activeSessionToMove.course_title}`,
        faculty_name: activeSessionToMove.faculty_name,
        faculty_id: activeSessionToMove.faculty_id,
        department: selectedDept,
        section: activeSessionToMove.groups.join(", "),
        venue: activeSessionToMove.room_name || activeSessionToMove.room_id,
        day: DAY_LABELS[activeSessionToMove.day] || activeSessionToMove.day,
        period: `P${activeSessionToMove.start_period} (${activeSessionToMove.duration}h)`,
        target_day: DAY_LABELS[moveTargetDay] || moveTargetDay,
        target_period: `P${moveTargetPeriod} (${activeSessionToMove.duration}h)`,
        target_venue: moveTargetRoom || "Auto-assigned room",
        reason: moveReason,
        priorityLevel: 2,
      };

      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to submit session change request");

      setSessionChangeFeedback(
        `✓ Session Change Request submitted to Dean's Office: Moving ${activeSessionToMove.course_id} from ${DAY_LABELS[activeSessionToMove.day]} P${activeSessionToMove.start_period} to ${DAY_LABELS[moveTargetDay]} P${moveTargetPeriod}.`
      );
      setMoveReason("");
      setActiveSessionToMove(null);
      await loadData();
    } catch (err: any) {
      alert(`Error submitting request: ${err.message}`);
    } finally {
      setIsSubmittingMove(false);
    }
  };

  // ----------------------------------------------------------------------------------
  // Feature 2 Handler: AI Plain-Language Booking Parser
  // ----------------------------------------------------------------------------------
  const handleAiParse = async () => {
    if (!aiBookingPrompt.trim()) return;
    setIsParsingAi(true);
    setAiParseMessage(null);

    try {
      const res = await fetch("/api/ai/parse-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiBookingPrompt }),
      });

      if (!res.ok) throw new Error("AI parser failed");
      const data = await res.json();

      if (data.attendance) setEventAttendance(data.attendance);
      if (data.duration_periods) setEventDuration(data.duration_periods);
      if (data.windows && data.windows.length > 0) {
        const win = data.windows[0];
        setEventDay(win.day);
        setEventStartPeriod(win.from_period);
      }
      if (data.requested_room) setEventRoom(data.requested_room);
      if (data.mandatory_for_groups && data.mandatory_for_groups.length > 0) {
        setEventMandatoryGroups(data.mandatory_for_groups);
      }
      if (data.needs && data.needs.length > 0) {
        setEventNeeds(data.needs);
      }
      if (!eventTitle) {
        setEventTitle(aiBookingPrompt.slice(0, 50));
      }

      setAiParseMessage(`✓ Extracted: ${data.attendance || 100} attendees, ${data.windows?.[0]?.day || "WED"} P${data.windows?.[0]?.from_period || 10}, room type: ${data.room_types?.join(", ")}`);
    } catch {
      setAiParseMessage("⚠️ AI assistant offline. Autofilled with best heuristic estimate.");
    } finally {
      setIsParsingAi(false);
    }
  };

  // ----------------------------------------------------------------------------------
  // Feature 2 Handler: Book Room for Department Event
  // ----------------------------------------------------------------------------------
  const handleDeptEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      alert("Please enter the Department Event Title.");
      return;
    }

    setIsSubmittingEvent(true);
    try {
      const payload = {
        type: "dept_event",
        submitted_by_role: "coordinator",
        applicant: `Dept Coordinator (${selectedDept})`,
        department: selectedDept,
        course: eventTitle,
        section: eventMandatoryGroups.join(", ") || "Open to all students",
        venue: eventRoom,
        day: DAY_LABELS[eventDay] || eventDay,
        period: `P${eventStartPeriod} – P${eventStartPeriod + eventDuration - 1}`,
        attendance: eventAttendance,
        mandatory_groups: eventMandatoryGroups,
        equipment: eventNeeds,
        reason: eventReason || `Department Event: ${eventTitle}`,
        priorityLevel: 5, // Priority Level 5 for Department Events
      };

      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to register department event booking");

      setEventFeedback(
        `✓ Priority Level 5 Venue Booking registered for "${eventTitle}" in ${eventRoom} on ${DAY_LABELS[eventDay]} P${eventStartPeriod}–P${eventStartPeriod + eventDuration - 1}.`
      );
      setEventTitle("");
      setEventReason("");
      await loadData();
    } catch (err: any) {
      alert(`Error booking venue: ${err.message}`);
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  // ----------------------------------------------------------------------------------
  // Feature 3 Handlers: Approve / Reject / Suggest Alt for Department Labs (In-App Modal)
  // ----------------------------------------------------------------------------------
  const openApproveModal = (req: LabRequestItem) => {
    setActiveLabActionModal({
      type: "approve",
      req,
      note: req.hasClash
        ? `Overridden & Approved by ${selectedDept} Dept Coordinator: Verified academic priority exception.`
        : `Verified by ${selectedDept} Dept Coordinator: No practical batch clash. Workstations authorized.`,
    });
  };

  const openRejectModal = (req: LabRequestItem) => {
    setActiveLabActionModal({
      type: "reject",
      req,
      note: req.clashWarning || `Clashes with scheduled ${selectedDept} undergraduate practical laboratory batch.`,
    });
  };

  const openAltModal = (req: LabRequestItem) => {
    setActiveLabActionModal({
      type: "alt",
      req,
      note: "Computing Lab 2 is free on Wednesday P6–P8 (14:00 - 17:00), or Evening slot P10–P12.",
    });
  };

  const handleConfirmLabModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLabActionModal) return;

    const { type, req, note } = activeLabActionModal;
    const { id, lab } = req;

    if (type === "approve") {
      setLabRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: "approved", reason: note || "Approved by Dept Coordinator." }
            : r
        )
      );

      try {
        await fetch("/api/requests", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            status: "approved",
            adminReason: note || "Endorsed by Department Coordinator",
          }),
        });
      } catch (err) {
        console.warn("Sync to backend skipped:", err);
      }

      setLabFeedback(
        `✓ Request ${id} approved for ${lab}. Notification forwarded to Dean's Office & Club Rep.`
      );
    } else if (type === "reject") {
      setLabRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "rejected", reason: note || "Lab unavailable." } : r
        )
      );

      try {
        await fetch("/api/requests", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            status: "rejected",
            adminReason: note,
          }),
        });
      } catch (err) {
        console.warn("Sync to backend skipped:", err);
      }

      setLabFeedback(`Request ${id} rejected for ${lab}.`);
    } else if (type === "alt") {
      setLabRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "alternative_suggested",
                alternative: note,
                reason: `Alternative venue proposed by ${selectedDept} Coordinator.`,
              }
            : r
        )
      );

      setLabFeedback(`✓ Alternative venue counter-offer dispatched for request ${id}.`);
    }

    setActiveLabActionModal(null);
  };

  return (
    <DashboardLayout requiredRole="coordinator">
      {(user) => (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          {/* Header & Department Switcher */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-[12px] font-semibold text-[#64748b] tracking-wide mb-1">
                Workspace <span className="mx-1 text-gray-300">&gt;</span> Department Coordinator
              </div>
              <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0f172a] tracking-tight">
                Department Coordinator Portal
              </h1>
              <p className="text-[13px] text-[#64748b] mt-0.5">
                Manage {selectedDept} teaching hours, book department venues, and approve laboratory access.
              </p>
            </div>

            {/* Department Selector */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-2xl border border-gray-200 shadow-sm">
                <Building className="w-4 h-4 text-[#064e43]" />
                <span className="text-xs font-bold text-gray-600">Department:</span>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="text-xs font-extrabold text-[#064e43] bg-transparent focus:outline-none cursor-pointer"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={loadData}
                disabled={loading}
                className="p-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl text-gray-600 transition-all shadow-sm active:scale-95"
                title="Refresh Schedule & Requests"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#064e43]" : ""}`} />
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
                <span>{selectedDept} Department Authority (Priority Level 5 Cap)</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Academic Session Shifts, Venue Bookings &amp; Lab Access
              </h2>

              <p className="mt-2 text-white/80 text-[13px] sm:text-sm leading-relaxed max-w-xl">
                Official coordinator authority to request academic session moves with instant clash detection, reserve campus venues for department lectures, and clear external club access to departmental laboratories.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setActiveTab("sessions")}
                  className="inline-flex items-center gap-2 bg-[#fde047] hover:bg-[#facc15] text-[#064e43] px-5 py-2.5 rounded-full text-[13px] font-bold transition-all shadow-sm active:scale-95"
                >
                  <Calendar className="w-4 h-4 text-[#064e43]" />
                  <span>Request Session Change</span>
                </button>

                <button
                  onClick={() => setActiveTab("labs")}
                  className="inline-flex items-center gap-2 bg-[#fde047] hover:bg-[#facc15] text-[#064e43] px-5 py-2.5 rounded-full text-[13px] font-bold transition-all shadow-sm active:scale-95"
                >
                  <DoorClosed className="w-4 h-4 text-[#064e43]" />
                  <span>
                    Approve Lab Bookings ({evaluatedLabRequests.filter((l) => l.status === "pending").length})
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("bookings")}
                  className="inline-flex items-center gap-2 bg-[#064e43] hover:bg-[#053d34] text-white border border-white/20 px-4 py-2.5 rounded-full text-[13px] font-semibold transition-all active:scale-95"
                >
                  <DoorOpen className="w-4 h-4" />
                  <span>Book Dept Venue</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
            {[
              { id: "overview", label: "Overview", icon: Building },
              { id: "sessions", label: `Dept Sessions (${deptSessions.length})`, icon: Calendar },
              { id: "labs", label: `Lab Approvals (${evaluatedLabRequests.filter((l) => l.status === "pending").length})`, icon: DoorClosed },
              { id: "bookings", label: "Dept Venue Booking", icon: DoorOpen },
              { id: "timetable", label: `${selectedDept} Timetable Matrix`, icon: FileCheck2 },
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

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-[24px] border border-[#e2e8f0] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{selectedDept} Sessions</div>
                <div className="text-3xl font-extrabold text-[#0f172a] mt-1.5">{deptSessions.length}</div>
                <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active in master timetable
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-[#e6f4f1] text-[#064e43] flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-[24px] border border-[#e2e8f0] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Dept Labs</div>
                <div className="text-3xl font-extrabold text-[#0f172a] mt-1.5">{deptLabRoomIds.length}</div>
                <div className="text-[11px] text-gray-400 mt-1">{deptLabRoomIds.join(", ")}</div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <DoorClosed className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-[24px] border border-[#e2e8f0] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Pending Lab Reviews</div>
                <div className="text-3xl font-extrabold text-[#0f172a] mt-1.5">
                  {evaluatedLabRequests.filter((l) => l.status === "pending").length}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">From student clubs</div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-[24px] border border-[#e2e8f0] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Dept Events Booked</div>
                <div className="text-3xl font-extrabold text-[#0f172a] mt-1.5">{departmentEventBookings.length}</div>
                <div className="text-[11px] text-gray-400 mt-1">Priority Level 5 registered</div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* ================================================================================= */}
          {/* TAB 1: OVERVIEW */}
          {/* ================================================================================= */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Lab Booking Requests Quick Review */}
              <div className="lg:col-span-2 bg-white rounded-[26px] border border-[#e2e8f0] p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Department Lab Approvals Queue</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Student clubs requesting access to {deptLabRoomIds.join(" & ")}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("labs")}
                    className="text-xs font-bold text-[#064e43] hover:underline"
                  >
                    View All ({evaluatedLabRequests.length}) &rarr;
                  </button>
                </div>

                <div className="space-y-3">
                  {evaluatedLabRequests.slice(0, 3).map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl border border-gray-200 bg-[#f8faf9] flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-[#064e43] bg-[#e6f4f1] px-2 py-0.5 rounded-md">
                            {req.id}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                              req.status === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : req.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : req.status === "alternative_suggested"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {req.status}
                          </span>
                          <span className="text-xs text-gray-600 font-bold">• {req.applicant}</span>
                        </div>
                        <div className="text-sm font-bold text-gray-900">{req.purpose}</div>
                        <div className="text-xs text-gray-500">
                          {req.lab} ({req.room_id}) • {DAY_LABELS[req.day] || req.day}, {req.period}
                        </div>
                        {req.clashWarning && (
                          <div className="text-xs text-red-700 bg-red-50 p-2 rounded-xl border border-red-200 flex items-center gap-1.5 mt-1 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{req.clashWarning}</span>
                          </div>
                        )}
                      </div>

                      {req.status === "pending" && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => openApproveModal(req)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#064e43] text-white hover:bg-[#053d34] transition-all shadow-sm active:scale-95"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(req)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all active:scale-95"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Coordinator Quick Actions Panel */}
              <div className="bg-white rounded-[26px] border border-[#e2e8f0] p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-gray-900">Coordinator Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab("sessions")}
                    className="w-full text-left p-3.5 rounded-2xl border border-gray-200 bg-[#f8faf9] hover:bg-[#e6f4f1] transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center border border-gray-200 text-[#064e43]">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900 group-hover:text-[#064e43]">
                            Request Session Move
                          </div>
                          <div className="text-[11px] text-gray-500">Submit lecture/lab slot shift to Dean</div>
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#064e43]" />
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("bookings")}
                    className="w-full text-left p-3.5 rounded-2xl border border-gray-200 bg-[#f8faf9] hover:bg-[#e6f4f1] transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center border border-gray-200 text-[#064e43]">
                          <DoorOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900 group-hover:text-[#064e43]">
                            Book Venue for Dept Event
                          </div>
                          <div className="text-[11px] text-gray-500">Priority 5 guest talks, seminars &amp; contests</div>
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#064e43]" />
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("labs")}
                    className="w-full text-left p-3.5 rounded-2xl border border-gray-200 bg-[#f8faf9] hover:bg-[#e6f4f1] transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center border border-gray-200 text-[#064e43]">
                          <DoorClosed className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900 group-hover:text-[#064e43]">
                            Lab Booking Approvals
                          </div>
                          <div className="text-[11px] text-gray-500">Check practical clashes &amp; clear clubs</div>
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#064e43]" />
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("timetable")}
                    className="w-full text-left p-3.5 rounded-2xl border border-gray-200 bg-[#f8faf9] hover:bg-[#e6f4f1] transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center border border-gray-200 text-[#064e43]">
                          <FileCheck2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900 group-hover:text-[#064e43]">
                            {selectedDept} Timetable Matrix
                          </div>
                          <div className="text-[11px] text-gray-500">View weekly schedule &amp; free slots</div>
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#064e43]" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================================= */}
          {/* TAB 2: REQUEST CHANGES TO DEPARTMENT SESSIONS */}
          {/* ================================================================================= */}
          {activeTab === "sessions" && (
            <div className="space-y-6">
              {sessionChangeFeedback && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{sessionChangeFeedback}</span>
                  </div>
                  <button onClick={() => setSessionChangeFeedback(null)} className="text-emerald-700 font-bold hover:underline">
                    ✕
                  </button>
                </div>
              )}

              {/* Session Move Modal / Form (when a session is selected) */}
              {activeSessionToMove && (
                <div ref={moveFormRef} className="bg-white rounded-[26px] border-2 border-[#064e43] p-6 shadow-md space-y-4 scroll-mt-24">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div>
                      <div className="text-xs font-bold text-[#064e43] uppercase tracking-wider">
                        Configure Session Shift Request
                      </div>
                      <h3 className="text-lg font-extrabold text-gray-900">
                        {activeSessionToMove.course_id} — {activeSessionToMove.course_title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Current: <strong>{DAY_LABELS[activeSessionToMove.day]} P{activeSessionToMove.start_period}</strong> in <strong>{activeSessionToMove.room_name}</strong> | Instructor: <strong>{activeSessionToMove.faculty_name}</strong> | Cohort: <strong>{activeSessionToMove.groups.join(", ")}</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveSessionToMove(null)}
                      className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Clash Pre-check Indicator */}
                  {sessionMoveClash && (
                    <div
                      className={`p-3.5 rounded-2xl text-xs font-medium flex items-center gap-2.5 ${
                        sessionMoveClash.hasClash
                          ? "bg-red-50 border border-red-200 text-red-800"
                          : "bg-emerald-50 border border-emerald-200 text-emerald-800"
                      }`}
                    >
                      {sessionMoveClash.hasClash ? (
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      <div>
                        <strong>{sessionMoveClash.hasClash ? "Schedule Conflict Warning:" : "Validation Passed:"}</strong>{" "}
                        {sessionMoveClash.message}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSessionMoveSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Target Day</label>
                        <select
                          value={moveTargetDay}
                          onChange={(e) => setMoveTargetDay(e.target.value)}
                          className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 font-medium focus:outline-none focus:border-[#064e43]"
                        >
                          {DAYS_LIST.map((d) => (
                            <option key={d} value={d}>
                              {DAY_LABELS[d]} ({d})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Target Period {activeSessionToMove.kind === "lab" ? "(Must be P2 or P6)" : ""}
                        </label>
                        <select
                          value={moveTargetPeriod}
                          onChange={(e) => setMoveTargetPeriod(parseInt(e.target.value, 10))}
                          className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 font-medium focus:outline-none focus:border-[#064e43]"
                        >
                          {activeSessionToMove.kind === "lab" ? (
                            <>
                              <option value={2}>P2 (09:00 - 12:00 - Morning Lab Block)</option>
                              <option value={6}>P6 (14:00 - 17:00 - Afternoon Lab Block)</option>
                            </>
                          ) : (
                            PERIODS.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.label}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Target Venue</label>
                        <select
                          value={moveTargetRoom}
                          onChange={(e) => setMoveTargetRoom(e.target.value)}
                          className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 font-medium focus:outline-none focus:border-[#064e43]"
                        >
                          <option value="">Auto-assign best available room</option>
                          {rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.id}) — Cap {r.capacity}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Justification / Administrative Reason <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={moveReason}
                        onChange={(e) => setMoveReason(e.target.value)}
                        placeholder="e.g., Guest speaker availability, lab maintenance window, faculty academic council meeting..."
                        className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#064e43]"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveSessionToMove(null)}
                        className="px-4 py-2 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingMove || sessionMoveClash?.hasClash}
                        className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 ${
                          sessionMoveClash?.hasClash
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-[#064e43] hover:bg-[#053d34] text-white"
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSubmittingMove ? "Submitting..." : "Submit Request to Dean's Office"}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Department Sessions Explorer */}
              <div className="bg-white rounded-[26px] border border-[#e2e8f0] p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      {selectedDept} Department Academic Sessions ({filteredDeptSessions.length})
                    </h3>
                    <p className="text-xs text-gray-500">
                      Official lectures, laboratories, and tutorial slots scheduled in the master timetable
                    </p>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search course or faculty..."
                        className="pl-8 pr-3 py-1.5 text-xs bg-[#f8fafc] border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-[#064e43] w-48"
                      />
                    </div>

                    <select
                      value={kindFilter}
                      onChange={(e) => setKindFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-[#f8fafc] border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-[#064e43]"
                    >
                      <option value="all">All Types</option>
                      <option value="lecture">Lectures</option>
                      <option value="lab">Labs (3h)</option>
                      <option value="tutorial">Tutorials</option>
                    </select>

                    <select
                      value={yearFilter}
                      onChange={(e) => setYearFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-[#f8fafc] border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-[#064e43]"
                    >
                      <option value="all">All Cohorts</option>
                      <option value="Y1">Year 1</option>
                      <option value="2">Year 2</option>
                      <option value="3">Year 3</option>
                    </select>
                  </div>
                </div>

                {/* Session list table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-gray-200 rounded-2xl overflow-hidden">
                    <thead className="bg-[#f8fafc] text-gray-700 uppercase font-bold text-[11px]">
                      <tr>
                        <th className="p-3 border-b">Session ID</th>
                        <th className="p-3 border-b">Course Code &amp; Title</th>
                        <th className="p-3 border-b">Cohort</th>
                        <th className="p-3 border-b">Current Slot</th>
                        <th className="p-3 border-b">Assigned Venue</th>
                        <th className="p-3 border-b">Faculty Instructor</th>
                        <th className="p-3 border-b text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredDeptSessions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-xs text-gray-400">
                            No sessions found matching filters for department {selectedDept}.
                          </td>
                        </tr>
                      ) : (
                        filteredDeptSessions.map((sess) => (
                          <tr key={sess.session_id} className="hover:bg-[#f8faf9] transition-all">
                            <td className="p-3">
                              <span className="font-mono font-bold text-[#064e43] bg-[#e6f4f1] px-2 py-0.5 rounded-md">
                                {sess.session_id}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-gray-900">{sess.course_id}</div>
                              <div className="text-[11px] text-gray-500">{sess.course_title}</div>
                              <span
                                className={`inline-block mt-0.5 text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                                  sess.kind === "lab"
                                    ? "bg-amber-100 text-amber-800"
                                    : sess.kind === "tutorial"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {sess.kind} ({sess.duration}h)
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="font-semibold text-gray-700">{sess.groups.join(", ")}</span>
                              <div className="text-[10px] text-gray-400">{sess.size} students</div>
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-[#064e43]">
                                {DAY_LABELS[sess.day] || sess.day}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                P{sess.start_period}
                                {sess.duration > 1 ? `–P${sess.start_period + sess.duration - 1}` : ""}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-gray-800">{sess.room_name}</div>
                              <div className="text-[10px] text-gray-400">{sess.room_id}</div>
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-gray-800">{sess.faculty_name}</div>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => {
                                  setActiveSessionToMove(sess);
                                  setMoveTargetDay(sess.day === "MON" ? "WED" : "MON");
                                  setMoveTargetPeriod(sess.start_period);
                                  setMoveTargetRoom(sess.room_id);
                                  setTimeout(() => {
                                    moveFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                                  }, 50);
                                }}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#064e43] text-white hover:bg-[#053d34] transition-all shadow-sm active:scale-95"
                              >
                                Request Move
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Submitted Department Change Requests Status */}
              <div className="bg-white rounded-[26px] border border-[#e2e8f0] p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Submitted Session Change Requests</h3>
                    <p className="text-xs text-gray-500">
                      Track the approval status of session shift requests forwarded to the Dean&apos;s Office
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f1f5f9] text-gray-700">
                    {departmentChangeRequests.length} Requests Logged
                  </span>
                </div>

                <div className="space-y-3">
                  {departmentChangeRequests.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      No session change requests submitted yet for {selectedDept}.
                    </div>
                  ) : (
                    departmentChangeRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 rounded-2xl border border-gray-200 bg-[#f8fafc] flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-[#064e43] bg-[#e6f4f1] px-2 py-0.5 rounded-md">
                              {req.id}
                            </span>
                            <span className="text-sm font-extrabold text-gray-900">{req.course}</span>
                            <span
                              className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                req.status === "approved"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : req.status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {req.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              • Submitted by: {req.submitted_by_role || "coordinator"}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            Requested Shift: <strong>{req.day} {req.period}</strong> &rarr; Target:{" "}
                            <strong>{req.target_day || req.day} {req.target_period || req.period}</strong> ({req.target_venue || req.venue})
                          </div>
                          {req.reason && (
                            <div className="text-[11px] text-gray-500 italic">
                              &ldquo;{req.reason}&rdquo;
                            </div>
                          )}

                          {/* Decision & Constraint Reasoning Box */}
                          <div
                            className={`p-2.5 rounded-xl border text-xs font-medium space-y-0.5 ${
                              req.status === "approved"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                : req.status === "rejected"
                                ? "bg-red-50 border-red-200 text-red-900"
                                : "bg-amber-50 border-amber-200 text-amber-900"
                            }`}
                          >
                            <span className="font-bold uppercase tracking-wider text-[10px] block">
                              {req.status === "approved"
                                ? "✓ Dean's Approval Reasoning (Priority 5)"
                                : req.status === "rejected"
                                ? "✕ Rejection Reasoning"
                                : "⏳ Status & Conflict Pre-Check"}
                            </span>
                            <div>
                              {req.adminReason ||
                                (req.status === "approved"
                                  ? `Verified by Academic Scheduling Authority: No practical lab clashes or teaching overlaps in target window. Master timetable shifted.`
                                  : req.status === "rejected"
                                  ? `Shift cannot be accommodated due to schedule clash with undergraduate cohort lectures.`
                                  : `Pending Dean's Office sign-off. Pre-check passed: Target slot free from hard violations.`)}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-xs text-gray-400 font-mono">
                          {new Date(req.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================================= */}
          {/* TAB 3: APPROVE BOOKINGS OF DEPARTMENT LABS */}
          {/* ================================================================================= */}
          {activeTab === "labs" && (
            <div className="space-y-6">
              {labFeedback && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{labFeedback}</span>
                  </div>
                  <button onClick={() => setLabFeedback(null)} className="text-emerald-700 font-bold hover:underline">
                    ✕
                  </button>
                </div>
              )}

              {/* Department Lab Assets Overview Banner */}
              <div className="bg-white rounded-[26px] border border-[#e2e8f0] p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      {selectedDept} Department Laboratory Assets
                    </h3>
                    <p className="text-xs text-gray-500">
                      Undergraduate practical sessions hold Priority 2. Club events during Spectra Week require Coordinator clearance.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {deptLabRoomIds.map((labId) => {
                      const roomObj = rooms.find((r) => r.id === labId);
                      return (
                        <span
                          key={labId}
                          className="px-3 py-1 rounded-xl bg-[#e6f4f1] text-[#064e43] font-bold text-xs border border-[#064e43]/20"
                        >
                          {roomObj?.name || labId} (Cap {roomObj?.capacity || 45})
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-[#f8fafc] border border-gray-200 text-xs text-gray-700 space-y-1">
                    <div className="font-bold text-[#064e43] flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" /> Lab Conflict Protection Rule
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      A lab booking by an external club (Priority 6) may <strong>NEVER</strong> displace a scheduled 3-hour practical batch (Priority 2). The system automatically verifies practical timetables before you approve.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#f8fafc] border border-gray-200 text-xs text-gray-700 space-y-1">
                    <div className="font-bold text-amber-800 flex items-center gap-1.5">
                      <DoorOpen className="w-4 h-4" /> Alternative Lab Offering
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      If the requested lab is occupied by a practical batch, click <strong>Propose Alternative</strong> to offer an open departmental lab or evening window (P10–P13) without outright rejection.
                    </p>
                  </div>
                </div>
              </div>

              {/* Lab Requests Queue */}
              <div className="bg-white rounded-[26px] border border-[#e2e8f0] p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      Laboratory Booking Requests ({evaluatedLabRequests.length})
                    </h3>
                    <p className="text-xs text-gray-500">
                      Review, cross-check against practical batches, and approve club bookings for departmental labs
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800">
                    {evaluatedLabRequests.filter((l) => l.status === "pending").length} Pending Review
                  </span>
                </div>

                <div className="space-y-4">
                  {evaluatedLabRequests.map((req) => (
                    <div
                      key={req.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        req.hasClash && req.status === "pending"
                          ? "border-red-300 bg-red-50/40"
                          : "border-gray-200 bg-[#f8faf9]"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-[#064e43] bg-[#e6f4f1] px-2 py-0.5 rounded-md">
                              {req.id}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                req.status === "approved"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : req.status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : req.status === "alternative_suggested"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {req.status.replace("_", " ")}
                            </span>
                            <span className="text-xs text-gray-600 font-bold">• Applicant: {req.applicant}</span>
                            <span className="text-[11px] text-gray-400">
                              (Workstations Needed: {req.attendance})
                            </span>
                          </div>

                          <div className="text-sm font-extrabold text-gray-900">{req.purpose}</div>

                          <div className="text-xs text-gray-700 font-medium">
                            Venue: <strong>{req.lab} ({req.room_id})</strong> | Requested Slot:{" "}
                            <strong>{DAY_LABELS[req.day] || req.day}, {req.period}</strong>
                          </div>

                          {/* Clash Pre-check Banner */}
                          {req.clashWarning ? (
                            <div className="text-xs text-red-800 bg-red-100/80 p-2.5 rounded-xl border border-red-200 flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                              <div>
                                <strong>Practical Batch Clash Detected:</strong> {req.clashWarning}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-emerald-800 bg-emerald-50 p-2 rounded-xl border border-emerald-200 flex items-center gap-1.5 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Verified: No departmental practical batches scheduled in {req.lab} during this slot.</span>
                            </div>
                          )}

                          {req.reason && (
                            <div className="text-xs text-gray-600 bg-white p-2.5 rounded-xl border border-gray-200">
                              <strong>Coordinator Decision Note:</strong> {req.reason}
                            </div>
                          )}

                          {req.alternative && (
                            <div className="text-xs text-purple-800 bg-purple-50 p-2.5 rounded-xl border border-purple-200 font-medium">
                              <strong>Alternative Proposed:</strong> {req.alternative}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
                          {req.status === "pending" ? (
                            <>
                              <button
                                onClick={() => openApproveModal(req)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 ${
                                  req.hasClash
                                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                                    : "bg-[#064e43] hover:bg-[#053d34] text-white"
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{req.hasClash ? "Override & Approve" : "Approve Lab"}</span>
                              </button>

                              <button
                                onClick={() => openAltModal(req)}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-all active:scale-95"
                              >
                                <DoorOpen className="w-3.5 h-3.5" /> Offer Alt
                              </button>

                              <button
                                onClick={() => openRejectModal(req)}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all active:scale-95"
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() =>
                                setLabRequests((prev) =>
                                  prev.map((r) =>
                                    r.id === req.id
                                      ? { ...r, status: "pending", reason: undefined, alternative: undefined }
                                      : r
                                  )
                                )
                              }
                              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-200 transition-all"
                            >
                              Re-evaluate Request
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================================= */}
          {/* TAB 4: BOOKS ROOMS FOR DEPARTMENT EVENTS */}
          {/* ================================================================================= */}
          {activeTab === "bookings" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Event Booking Form */}
              <div className="lg:col-span-2 bg-white rounded-[26px] border border-[#e2e8f0] p-6 shadow-sm space-y-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#e6f4f1] text-[#064e43] text-[11px] font-bold mb-1">
                    Priority Level 5 • Department Authority
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Book Venue for Department Events</h3>
                  <p className="text-xs text-gray-500">
                    Alumni technical seminars, industry placement drives, and departmental hackathons (Outranks Club Priority 6)
                  </p>
                </div>

                {eventFeedback && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{eventFeedback}</span>
                    </div>
                    <button onClick={() => setEventFeedback(null)} className="text-emerald-700 font-bold hover:underline">
                      ✕
                    </button>
                  </div>
                )}

                {/* AI Plain-Language Assistant Quick Bar */}
                <div className="p-4 rounded-2xl bg-[#f8faf9] border border-gray-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#064e43]">
                    <Bot className="w-4 h-4 text-[#064e43]" />
                    <span>AI Plain-Language Booking Assistant</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={aiBookingPrompt}
                      onChange={(e) => setAiBookingPrompt(e.target.value)}
                      placeholder='e.g., "Pre-placement talk for CSE third years, Wednesday 6 to 8 pm, compulsory for CSE-3"'
                      className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#064e43]"
                    />
                    <button
                      type="button"
                      onClick={handleAiParse}
                      disabled={isParsingAi || !aiBookingPrompt.trim()}
                      className="inline-flex items-center gap-1.5 bg-[#064e43] hover:bg-[#053d34] disabled:bg-gray-300 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#fde047]" />
                      <span>{isParsingAi ? "Parsing..." : "AI Auto-Fill"}</span>
                    </button>
                  </div>
                  {aiParseMessage && (
                    <div className="text-[11px] text-[#064e43] font-medium pt-1">
                      {aiParseMessage}
                    </div>
                  )}
                </div>

                <form onSubmit={handleDeptEventSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Event Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="e.g., CSE Alumni Technical Talk & Industry Q&A"
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#064e43]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Expected Attendance</label>
                      <input
                        type="number"
                        min={10}
                        max={800}
                        value={eventAttendance}
                        onChange={(e) => setEventAttendance(parseInt(e.target.value, 10) || 50)}
                        className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#064e43]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Preferred Venue</label>
                      <select
                        value={eventRoom}
                        onChange={(e) => setEventRoom(e.target.value)}
                        className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#064e43]"
                      >
                        <option value="SH-1">Seminar Hall 1 (SH-1, Cap 150 - Ground Floor Accessible)</option>
                        <option value="SH-2">Seminar Hall 2 (SH-2, Cap 100 - Not Wheelchair Accessible)</option>
                        <option value="AUD">Main Auditorium (AUD, Cap 500 - Full AV &amp; Stage)</option>
                        <option value="LH-1">Lecture Hall 1 (LH-1, Cap 120)</option>
                        <option value="CS-LAB-1">Computing Lab 1 (CS-LAB-1, Cap 45 Workstations)</option>
                        <option value="CS-LAB-2">Computing Lab 2 (CS-LAB-2, Cap 45 Workstations)</option>
                        <option value="OAT">Open-Air Theatre (OAT, Cap 800)</option>
                      </select>
                    </div>
                  </div>

                  {/* Accessibility & Sanity Warning for SH-2 */}
                  {eventRoom === "SH-2" && eventNeeds.includes("accessible") && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Conflict Warning: <strong>Seminar Hall 2 (SH-2)</strong> is on the 1st floor with no elevator. If wheelchair accessibility is required, select <strong>Seminar Hall 1 (SH-1)</strong>.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Day of Week</label>
                      <select
                        value={eventDay}
                        onChange={(e) => setEventDay(e.target.value)}
                        className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#064e43]"
                      >
                        {DAYS_LIST.map((d) => (
                          <option key={d} value={d}>
                            {DAY_LABELS[d]} ({d})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Starting Period</label>
                      <select
                        value={eventStartPeriod}
                        onChange={(e) => setEventStartPeriod(parseInt(e.target.value, 10))}
                        className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#064e43]"
                      >
                        <optgroup label="Afternoon Teaching Slots">
                          <option value={6}>P6 (14:00 - 15:00)</option>
                          <option value={7}>P7 (15:00 - 16:00)</option>
                          <option value={8}>P8 (16:00 - 17:00)</option>
                        </optgroup>
                        <optgroup label="Evening Event Periods">
                          <option value={10}>P10 (18:00 - 19:00)</option>
                          <option value={11}>P11 (19:00 - 20:00)</option>
                          <option value={12}>P12 (20:00 - 21:00)</option>
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Duration</label>
                      <select
                        value={eventDuration}
                        onChange={(e) => setEventDuration(parseInt(e.target.value, 10))}
                        className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#064e43]"
                      >
                        <option value={1}>1 Hour (1 Period)</option>
                        <option value={2}>2 Hours (2 Periods)</option>
                        <option value={3}>3 Hours (3 Periods)</option>
                      </select>
                    </div>
                  </div>

                  {/* Mandatory Student Cohorts (Important for CIT BR-08, BR-13, BR-18) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Mandatory Attendance Cohorts (Optional)
                    </label>
                    <p className="text-[11px] text-gray-500 mb-2">
                      Select student groups required to attend (e.g. Year 3 CSE). The engine protects them from class clashes.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {["CSE-3", "CSE-2", "Y1-A", "Y1-B", "ECE-3", "ME-3"].map((grp) => {
                        const isSelected = eventMandatoryGroups.includes(grp);
                        return (
                          <button
                            type="button"
                            key={grp}
                            onClick={() => {
                              if (isSelected) {
                                setEventMandatoryGroups((p) => p.filter((g) => g !== grp));
                              } else {
                                setEventMandatoryGroups((p) => [...p, grp]);
                              }
                            }}
                            className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                              isSelected
                                ? "bg-[#064e43] text-white border-[#064e43]"
                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            {grp}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Agenda / Details</label>
                    <textarea
                      rows={2}
                      value={eventReason}
                      onChange={(e) => setEventReason(e.target.value)}
                      placeholder="e.g., Pre-placement preparation talk conducted by corporate tech leads..."
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-3 text-xs text-gray-800 focus:outline-none focus:border-[#064e43]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingEvent}
                    className="w-full bg-[#fde047] hover:bg-[#facc15] text-[#064e43] py-2.5 rounded-full text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#064e43]" />
                    <span>{isSubmittingEvent ? "Registering..." : "Reserve Department Venue (Priority 5)"}</span>
                  </button>
                </form>
              </div>

              {/* Active Department Bookings List */}
              <div className="bg-white rounded-[26px] border border-[#e2e8f0] p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Department Event Bookings</h3>
                    <p className="text-xs text-gray-500">Official Priority 5 department reservations</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    {departmentEventBookings.length} Logged
                  </span>
                </div>

                <div className="space-y-3">
                  {departmentEventBookings.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      No department events booked yet.
                    </div>
                  ) : (
                    departmentEventBookings.map((b) => (
                      <div
                        key={b.id}
                        className="p-4 rounded-2xl border border-gray-200 bg-[#f8fafc] space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-[#064e43] bg-[#e6f4f1] px-2 py-0.5 rounded-md">
                            {b.id}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              b.status === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : b.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-gray-900">{b.course}</div>
                        <div className="text-[11px] text-gray-600">
                          Venue: <strong>{b.venue}</strong> • Slot: <strong>{b.day} {b.period}</strong>
                        </div>
                        {b.section && (
                          <div className="text-[10px] text-[#064e43] font-semibold">
                            Mandatory for: {b.section}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================================= */}
          {/* TAB 5: DEPARTMENT TIMETABLE MATRIX */}
          {/* ================================================================================= */}
          {activeTab === "timetable" && (
            <div className="bg-white rounded-[26px] border border-[#e2e8f0] p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {selectedDept} Master Timetable Matrix ({deptSessions.length} Scheduled Sessions)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Weekly distribution across Monday to Friday with protected lunch (13:00–14:00)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    Lunch Protected: 13:00 – 14:00 Free
                  </span>
                  <button
                    onClick={() => setActiveTab("sessions")}
                    className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-[#064e43] text-white hover:bg-[#053d34] transition-all shadow-sm"
                  >
                    Request Move &rarr;
                  </button>
                </div>
              </div>

              {/* Grid / Table representation */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-gray-200 rounded-2xl overflow-hidden">
                  <thead className="bg-[#f8fafc] text-gray-700 uppercase font-bold text-[11px]">
                    <tr>
                      <th className="p-3 border-b">Day</th>
                      <th className="p-3 border-b">Period</th>
                      <th className="p-3 border-b">Course Code &amp; Title</th>
                      <th className="p-3 border-b">Type</th>
                      <th className="p-3 border-b">Instructor</th>
                      <th className="p-3 border-b">Cohort</th>
                      <th className="p-3 border-b">Venue</th>
                      <th className="p-3 border-b text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deptSessions.slice(0, 20).map((s) => (
                      <tr key={s.session_id} className="hover:bg-gray-50">
                        <td className="p-3 font-bold text-gray-900">{DAY_LABELS[s.day] || s.day}</td>
                        <td className="p-3 font-semibold text-[#064e43]">
                          P{s.start_period}{s.duration > 1 ? `–P${s.start_period + s.duration - 1}` : ""}
                        </td>
                        <td className="p-3 font-bold text-gray-900">
                          {s.course_id} <span className="font-normal text-gray-500">({s.course_title})</span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              s.kind === "lab"
                                ? "bg-amber-100 text-amber-800"
                                : s.kind === "tutorial"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {s.kind}
                          </span>
                        </td>
                        <td className="p-3 text-gray-700">{s.faculty_name}</td>
                        <td className="p-3 text-gray-600 font-semibold">{s.groups.join(", ")}</td>
                        <td className="p-3 text-gray-800 font-semibold">{s.room_name}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setActiveTab("sessions");
                              setActiveSessionToMove(s);
                              setMoveTargetDay(s.day === "MON" ? "WED" : "MON");
                              setMoveTargetPeriod(s.start_period);
                              setMoveTargetRoom(s.room_id);
                              setTimeout(() => {
                                moveFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }, 100);
                            }}
                            className="text-[#064e43] font-bold hover:underline"
                          >
                            Move
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= IN-APP MODAL: LAB BOOKING APPROVAL / OVERRIDE / REJECTION ================= */}
          {activeLabActionModal && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-[28px] max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        activeLabActionModal.type === "approve"
                          ? activeLabActionModal.req.hasClash
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-[#064e43]"
                          : activeLabActionModal.type === "reject"
                          ? "bg-red-100 text-red-600"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {activeLabActionModal.type === "approve" ? (
                        <Check className="w-5 h-5" />
                      ) : activeLabActionModal.type === "reject" ? (
                        <X className="w-5 h-5" />
                      ) : (
                        <DoorOpen className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#064e43]">
                        {selectedDept} Department Lab Clearance
                      </span>
                      <h3 className="text-base font-extrabold text-gray-900 mt-0.5">
                        {activeLabActionModal.type === "approve"
                          ? activeLabActionModal.req.hasClash
                            ? "Override Schedule Clash & Approve Lab"
                            : "Approve Department Laboratory Access"
                          : activeLabActionModal.type === "reject"
                          ? "Reject Laboratory Booking Request"
                          : "Propose Alternative Lab Venue"}
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveLabActionModal(null)}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Booking details summary card */}
                <div className="p-4 rounded-2xl bg-[#f8faf9] border border-gray-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Applicant:</span>
                    <span className="font-bold text-gray-900">{activeLabActionModal.req.applicant}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Requested Facility:</span>
                    <span className="font-bold text-[#064e43]">
                      {activeLabActionModal.req.lab} ({activeLabActionModal.req.room_id})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Day &amp; Time Slot:</span>
                    <span className="font-bold text-gray-800">
                      {DAY_LABELS[activeLabActionModal.req.day] || activeLabActionModal.req.day},{" "}
                      {activeLabActionModal.req.period}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Purpose:</span>
                    <span className="font-semibold text-gray-700">{activeLabActionModal.req.purpose}</span>
                  </div>

                  {activeLabActionModal.req.clashWarning && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      <div>
                        <strong>Practical Clash Note:</strong> {activeLabActionModal.req.clashWarning}
                      </div>
                    </div>
                  )}
                </div>

                {/* Form input */}
                <form onSubmit={handleConfirmLabModal} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      {activeLabActionModal.type === "approve"
                        ? "Coordinator Endorsement & Authorization Note"
                        : activeLabActionModal.type === "reject"
                        ? "Rejection Reason / Administrative Justification"
                        : "Alternative Lab Venue or Time Window Recommendation"}
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={activeLabActionModal.note}
                      onChange={(e) =>
                        setActiveLabActionModal((prev) => (prev ? { ...prev, note: e.target.value } : null))
                      }
                      placeholder={
                        activeLabActionModal.type === "approve"
                          ? "Enter reason or conditions for granting laboratory access..."
                          : activeLabActionModal.type === "reject"
                          ? "Explain why the lab cannot be cleared for this slot..."
                          : "Provide available alternative venues or slots..."
                      }
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-2xl p-3 text-xs text-gray-800 font-medium focus:outline-none focus:border-[#064e43] focus:bg-white transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setActiveLabActionModal(null)}
                      className="px-4 py-2 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 text-white ${
                        activeLabActionModal.type === "approve"
                          ? activeLabActionModal.req.hasClash
                            ? "bg-amber-600 hover:bg-amber-700"
                            : "bg-[#064e43] hover:bg-[#053d34]"
                          : activeLabActionModal.type === "reject"
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-purple-600 hover:bg-purple-700"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {activeLabActionModal.type === "approve"
                          ? activeLabActionModal.req.hasClash
                            ? "Confirm Clash Override"
                            : "Confirm Approval"
                          : activeLabActionModal.type === "reject"
                          ? "Confirm Rejection"
                          : "Dispatch Alternative Proposal"}
                      </span>
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

export default function CoordinatorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">Loading Coordinator Portal...</div>}>
      <CoordinatorContent />
    </Suspense>
  );
}
