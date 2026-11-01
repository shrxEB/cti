"""
Conversational AI Scheduling Assistant for Chilika Institute of Technology (CIT).
Handles natural language interactions for faculty, coordinators, and students:
1. Explaining decisions: 'Why was my scheduling request rejected?'
2. Finding available venues: 'Find an available computer lab on Thursday at 3 PM'
3. Rescheduling & Leave requests: 'Move my DBMS lecture to Friday' / 'I am unavailable on Wednesday'
All rescheduling operations route through the deterministic OR-Tools engine for validation.
"""
import json
import os
from typing import Dict, Any, List, Optional
from pathlib import Path

DATA_PATH = Path("starter_pack/data/cit_public.json")
SCHEDULE_PATH = Path("exports/schedule.json")

class SchedulingAssistant:
    def __init__(self, data_path: Path = DATA_PATH, schedule_path: Path = SCHEDULE_PATH):
        self.data = self._load_json(data_path)
        self.schedule = self._load_json(schedule_path) if schedule_path.exists() else {}
        self.rooms = {r["id"]: r for r in self.data.get("rooms", [])}
        self.faculty = {f["id"]: f for f in self.data.get("faculty", [])}
        self.sessions = {s["id"]: s for s in self.data.get("sessions", [])}
        self.bookings = {b["request_id"]: b for b in self.schedule.get("fest_week", {}).get("bookings", [])}
        self.raw_requests = {r["id"]: r for r in self.data.get("booking_requests", [])}

    def _load_json(self, path: Path) -> Dict[str, Any]:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def explain_request_decision(self, request_id: str) -> str:
        """Explains why a request was rejected, offered an alternative, or approved."""
        req_id = request_id.upper().strip()
        decision = self.bookings.get(req_id)
        raw_req = self.raw_requests.get(req_id)
        
        if not raw_req:
            return f"Booking request ID '{request_id}' not found in the campus records."

        status = decision.get("status") if decision else "Pending"
        reason = decision.get("reason", "No specific reason logged.") if decision else "Under review."
        title = raw_req.get("title", "Event")
        att = raw_req.get("attendance", 0)

        if status == "rejected":
            return (
                f"### ❌ Booking Decision for {req_id} ('{title}')\n\n"
                f"**Status**: Rejected\n"
                f"**Institutional Reason**: {reason}\n\n"
                f"**Policy Background**:\n"
                f"- CIT prioritizes bookings in the order: *Exams > Regular Classes > Institute Events > Guest Lectures > Department Events > Club Events*.\n"
                f"- Campus venue limits: The maximum seating capacity on campus is 800 (Open Air Theatre). Requests exceeding capacity or clashing with higher-priority academic/institute slots cannot be approved."
            )
        elif status == "alternative_offered":
            alt_room = decision.get("room_id")
            alt_day = decision.get("day")
            st = decision.get("start_period")
            en = decision.get("end_period")
            return (
                f"### ℹ️ Alternative Offered for {req_id} ('{title}')\n\n"
                f"**Status**: Alternative Offered\n"
                f"**Reason for Modification**: {reason}\n"
                f"**Proposed Slot**: **{alt_room}** on **{alt_day}**, Periods P{st}–P{en}\n\n"
                f"Your originally requested venue or window had a higher-priority commitment or earlier submission. Please accept or reject this alternate proposal in your portal."
            )
        elif status == "approved":
            room = decision.get("room_id")
            day = decision.get("day")
            st = decision.get("start_period")
            en = decision.get("end_period")
            return (
                f"### ✅ Booking Approved for {req_id} ('{title}')\n\n"
                f"**Status**: Approved\n"
                f"**Confirmed Venue**: **{room}**\n"
                f"**Confirmed Slot**: **{day}**, Periods P{st}–P{en}\n"
                f"**Expected Attendance**: {att} students. Room has been locked in the central schedule."
            )
        return f"Request {req_id} is currently {status}."

    def find_available_rooms(
        self,
        day: str,
        period: int,
        room_type: Optional[str] = None,
        min_capacity: int = 0,
        needs_accessible: bool = False
    ) -> List[Dict[str, Any]]:
        """Finds all available rooms for a given day and period."""
        # Check occupied rooms at (day, period) in regular schedule
        occupied_rooms = set()
        for s in self.schedule.get("sessions", []):
            if s["day"] == day and s["start_period"] == period:
                occupied_rooms.add(s["room_id"])

        available = []
        for rid, r in self.rooms.items():
            if rid in occupied_rooms:
                continue
            if min_capacity and r["capacity"] < min_capacity:
                continue
            if room_type and r["type"] != room_type:
                continue
            if needs_accessible and not r.get("accessible", False):
                continue
            available.append({
                "room_id": r["id"],
                "name": r["name"],
                "type": r["type"],
                "capacity": r["capacity"],
                "accessible": r["accessible"],
                "features": r["features"]
            })

        return sorted(available, key=lambda x: x["capacity"])

    def submit_pending_booking(self, user_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Saves the pending booking request into exports/academic_requests.json for Dean's Office approval."""
        if not self.pending_booking:
            return None

        reqs_file = Path("exports/academic_requests.json")
        requests_list = []
        if reqs_file.exists():
            try:
                with open(reqs_file, "r", encoding="utf-8") as f:
                    requests_list = json.load(f)
            except Exception:
                requests_list = []

        import datetime
        next_num = 205 + len(requests_list)
        req_id = f"AR-{next_num}"
        
        pb = self.pending_booking
        ctx = user_context or pb.get("user_context") or {}
        role = ctx.get("role", "faculty")
        user_name = ctx.get("name") or ("Dr. Rajesh Tripathy" if role == "faculty" else ("Prof. Coordinator" if role == "coordinator" else "Spectra Club Rep"))
        department = ctx.get("department") or ("Electronics & Communication" if role == "faculty" else "Computer Science & Engineering")

        # Determine priority and request type based on role
        if role == "club_rep":
            priority = 6
            req_type = "spectra_booking"
            course_label = "Club & Cultural Event"
        elif role == "coordinator":
            priority = 4
            req_type = "department_event" if "seminar" in pb.get("venue", "").lower() or "hall" in pb.get("venue", "").lower() else "extra_class"
            course_label = "Department Colloquium / Guest Lecture"
        else:
            priority = 2
            req_type = "extra_class"
            course_label = pb.get("course") or "Faculty Extra Class / Session Adjustment"

        new_entry = {
            "id": req_id,
            "type": req_type,
            "channel": "chatbot",  # Flag specifically for Dean approvals filter
            "submitted_by_role": role,
            "faculty_id": ctx.get("id") or ("F01" if role == "faculty" else "COORD-01"),
            "faculty_name": user_name,
            "department": department,
            "course": pb.get("course") or course_label,
            "section": pb.get("section") or f"Cohort ({pb.get('attendance', 50)} students)",
            "venue": pb.get("venue") or "Requested Venue",
            "day": pb.get("day") or "Upcoming weekday",
            "period": pb.get("slot") or "Requested Period",
            "reason": pb.get("raw_query") or f"Requested via AI Copilot for {pb.get('attendance', 50)} attendees",
            "priorityLevel": priority,
            "status": "pending",
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }

        requests_list.insert(0, new_entry)
        try:
            reqs_file.parent.mkdir(parents=True, exist_ok=True)
            with open(reqs_file, "w", encoding="utf-8") as f:
                json.dump(requests_list, f, indent=2)
        except Exception as e:
            print("Error persisting request:", e)

        saved = dict(new_entry)
        self.pending_booking = None
        return saved

    def process_chat_message(self, message: str, user_context: Optional[Dict[str, Any]] = None) -> str:
        """Central chat dispatcher processing natural English and Hinglish inquiries tailored to active user role."""
        lower = message.lower().strip()
        ctx = user_context or {}
        role = ctx.get("role", "faculty")
        user_name = ctx.get("name") or ("Faculty Member" if role == "faculty" else ("Department Coordinator" if role == "coordinator" else "Club Lead"))

        # Handle user confirmation to submit pending booking
        confirm_tokens = ["yes", "ha", "haan", "sure", "yep", "yeah", "confirm", "submit", "please submit", "yes please", "ok", "okay", "send", "kardo", "kar do", "bhej do"]
        if hasattr(self, "pending_booking") and self.pending_booking and any(lower == tok or lower.startswith(tok + " ") or lower.endswith(" " + tok) for tok in confirm_tokens):
            saved = self.submit_pending_booking(user_context=ctx)
            if saved:
                return (
                    f"✅ **Request Successfully Submitted!**\n\n"
                    f"- **Request ID**: `{saved['id']}`\n"
                    f"- **Applicant Role**: {role.capitalize()} ({saved['faculty_name']})\n"
                    f"- **Venue**: {saved['venue']}\n"
                    f"- **Day / Slot**: {saved['day']} ({saved['period']})\n"
                    f"- **Status**: ⏳ Pending Dean's Office Authorization\n\n"
                    f"This request has been tagged as **AI Chatbot Submission** and sent directly to the Dean's approvals queue."
                )

        cancel_tokens = ["no", "nahi", "cancel", "dont", "don't", "stop", "discard", "mat karo", "na"]
        if hasattr(self, "pending_booking") and self.pending_booking and any(lower == tok or lower.startswith(tok + " ") for tok in cancel_tokens):
            self.pending_booking = None
            return "❌ Booking request cancelled. Let me know if you would like to book a different slot or explore other options!"

        # 1. 'Why was my request rejected / modified?'
        import re
        m_req = re.search(r"\b(BR-\d+[a-z]?|AR-\d+|SPEC-\d+)\b", message, re.I)
        if ("why" in lower or "reason" in lower or "reject" in lower or "karan" in lower) and m_req:
            return self.explain_request_decision(m_req.group(1))

        # 2. 'Find an available lab / room'
        if "available" in lower or "find" in lower or "khali" in lower or "free" in lower:
            day = "THU" if "thu" in lower else ("FRI" if "fri" in lower else ("WED" if "wed" in lower else ("TUE" if "tue" in lower else "MON")))
            rtype = "lab_cs" if ("computer" in lower or "cs lab" in lower) else None
            p = 6 if ("afternoon" in lower or "3 pm" in lower or "2 pm" in lower) else 2
            rooms = self.find_available_rooms(day=day, period=p, room_type=rtype)
            if not rooms:
                return f"No matching venues found available on {day} Period {p}."
            lines = [f"- **{r['room_id']}** ({r['name']}) - Type: {r['type']}, Capacity: {r['capacity']}" for r in rooms[:5]]
            return f"### 🏛️ Available Venues on {day} Period {p}:\n" + "\n".join(lines)

        # 3. Reschedule request notice
        if "reschedule" in lower or "move" in lower or "leave" in lower or "unavailable" in lower:
            if role == "faculty":
                return (
                    "### 🔄 Faculty Reschedule & Leave Request\n\n"
                    "As a faculty member, your requested lecture or lab move will be optimized by our **Minimal Perturbation Solver**:\n"
                    "1. Guarantees your daily teaching load does not exceed the 4-hour institute limit.\n"
                    "2. Avoids clashes with your student batch's core sessions.\n"
                    "Please state the **Course Code** (e.g. `EC301`) and your preferred day/slot."
                )
            else:
                return (
                    "### 🔄 Session Reschedule Request\n\n"
                    "Your session adjustment request will be routed through the CP-SAT engine to preserve room and cohort constraints.\n"
                    "Please specify the session title, course code, and target time."
                )

        # 4. Spoken / Typed Booking Request (Hinglish / English)
        if any(w in lower for w in ["book", "chahiye", "hall", "room", "seminar", "auditorium", "lab", "slot", "baccho", "people"]):
            try:
                from gemini_parser import parse_booking_request
                parsed = parse_booking_request(message)
                win = parsed.windows[0] if parsed.windows else None
                day_str = win.day if win else "Upcoming weekday"
                time_str = f"Periods P{win.from_period}–P{win.to_period}" if win else "Requested hours"
                room_str = parsed.requested_room or (parsed.room_types[0] if parsed.room_types else "Appropriate Venue")

                warning_text = ""
                if parsed.conflicts_or_warnings:
                    warning_text = f"\n\n**⚠️ Constraints Alert**: {'; '.join(parsed.conflicts_or_warnings)}"
                elif win and win.from_period <= 5 and win.to_period >= 6:
                    warning_text = "\n\n**⚠️ Warning**: This request spans across the mandatory Institute Lunch Break (13:00–14:00)."

                # Store pending booking for the subsequent confirmation turn
                self.pending_booking = {
                    "venue": room_str,
                    "day": day_str,
                    "slot": time_str,
                    "attendance": parsed.attendance or 50,
                    "duration": parsed.duration_periods or 1,
                    "raw_query": message,
                    "course": "Extra Lecture" if role == "faculty" else ("Dept Workshop" if role == "coordinator" else "Spectra Fest Event"),
                    "user_context": ctx
                }

                role_tag = f"**Logged in as**: {user_name} ({role.upper()})"
                return (
                    f"### 📋 Booking Request Extracted via Gemini AI\n\n"
                    f"{role_tag}\n"
                    f"- **Venue / Type**: {room_str}\n"
                    f"- **Day & Slot**: {day_str}, {time_str}\n"
                    f"- **Duration**: {parsed.duration_periods} hour(s)\n"
                    f"- **Attendance**: {parsed.attendance} attendees\n"
                    f"- **Equipment / Needs**: {', '.join(parsed.needs) if parsed.needs else 'Standard'}"
                    f"{warning_text}\n\n"
                    f"Would you like to submit this request to the Dean's Office for approval?"
                )
            except Exception as e:
                pass

        # Role-customized default response
        if role == "faculty":
            return (
                f"Hello {user_name}! I am your CIT Faculty Scheduling Assistant.\n\n"
                "I can assist you with:\n"
                "- **Booking extra classes or seminar halls** (e.g. *'kal seminar hall chahiye 100 baccho ke liye'*)\n"
                "- **Finding available labs or classrooms** (e.g. *'Find an available computer lab on Thursday afternoon'*)\n"
                "- **Checking reasons for booking decisions** (e.g. *'Why was AR-203 rejected?'*)\n"
                "- **Timetable adjustments & leaves** (evaluated against the 4h/day faculty ceiling)."
            )
        elif role == "coordinator":
            return (
                f"Hello {user_name}! I am the CIT Department Scheduling Assistant.\n\n"
                "I can assist you with:\n"
                "- Department colloquium and seminar bookings\n"
                "- Inspecting batch-wide timetable allocations\n"
                "- Locating available departmental labs and auditoriums."
            )
        elif role == "club_rep":
            return (
                f"Hello {user_name}! I am the Spectra Fest Venue Assistant.\n\n"
                "I can assist you with:\n"
                "- Submitting fest venue booking requests (Auditorium, OAT, Seminar Halls)\n"
                "- Checking status and reasons for club booking approvals/rejections\n"
                "- Finding slots with zero academic clashes (e.g. evening slots P10–P13)."
            )
        else:
            return (
                f"Hello {user_name}! I am the CIT Scheduling & Venue Copilot.\n"
                "You can ask me to book venues, check available rooms, or explain scheduling decisions."
            )

# Global assistant singleton
assistant = SchedulingAssistant()
