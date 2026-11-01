"""
Robust Rule-based / Regex Booking Parser for CIT Campus Requests.
Functions both as a standalone high-speed parser and as an offline fallback
when LLM quota is exhausted or network is unavailable.
"""
import re
from typing import Dict, Any, List, Optional
from schemas import ParsedBooking, BookingWindow

DAYS_MAP = {
    "mon": "MON", "monday": "MON", "somwar": "MON",
    "tue": "TUE", "tuesday": "TUE", "mangalwar": "TUE",
    "wed": "WED", "wednesday": "WED", "budhwar": "WED",
    "thu": "THU", "thursday": "THU", "guruwar": "THU", "veervar": "THU",
    "fri": "FRI", "friday": "FRI", "shukrawar": "FRI",
    "sat": "SAT", "saturday": "SAT", "shaniwar": "SAT"
}

def extract_attendance(text: str) -> int:
    # 45 people, 100 log, 400 participants, 60 students, 100 baccho
    m = re.search(r"(\d+)\s*(?:people|students|participants|log|baccho|bacche|bache|dancers|spectators|audience|visitors|seats)?", text, re.I)
    if m:
        num = int(m.group(1))
        # check if it's not a period or hour (e.g. 6 pm, 2 hours, 6 baje)
        m_baje = re.search(r"\b" + str(num) + r"\s*(?:pm|am|baje|ghante|hours?)\b", text, re.I)
        if not m_baje and num > 12:
            return num
    # fallback searching specifically around words
    m2 = re.search(r"(?:around|about|for|maybe)?\s*(\d+)\s*(?:people|log|participants|students|dancers)", text, re.I)
    if m2:
        return int(m2.group(1))
    return 50  # default reasonable fallback

def extract_duration(text: str) -> int:
    # 2 hours, 2 ghante, 3-hour, 6 straight hours
    m = re.search(r"(\d+)\s*(?:-| )?(?:hour|hours|ghante|ghanta)", text, re.I)
    if m:
        return int(m.group(1))
    # range like 6 to 8 pm -> 2 hours
    m_range = re.search(r"(\d+)\s*(?:to|-)\s*(\d+)\s*(?:pm|am)", text, re.I)
    if m_range:
        h1 = int(m_range.group(1))
        h2 = int(m_range.group(2))
        if h2 > h1:
            return h2 - h1
    if "all day" in text.lower():
        return 9
    return 2

def time_to_period(hour_24: int) -> int:
    """
    Period mapping:
    P1: 08:00, P2: 09:00, P3: 10:00, P4: 11:00, P5: 12:00
    P6: 14:00, P7: 15:00, P8: 16:00, P9: 17:00
    P10: 18:00 (6 PM), P11: 19:00 (7 PM), P12: 20:00 (8 PM), P13: 21:00 (9 PM)
    """
    if hour_24 == 8: return 1
    if hour_24 == 9: return 2
    if hour_24 == 10: return 3
    if hour_24 == 11: return 4
    if hour_24 == 12: return 5
    if hour_24 == 14: return 6
    if hour_24 == 15: return 7
    if hour_24 == 16: return 8
    if hour_24 == 17: return 9
    if hour_24 == 18: return 10
    if hour_24 == 19: return 11
    if hour_24 == 20: return 12
    if hour_24 == 21: return 13
    if hour_24 == 22: return 13
    return 10

def parse_booking_rule_based(text: str) -> ParsedBooking:
    lower = text.lower()
    
    # 1. Attendance
    attendance = extract_attendance(text)
    
    # 2. Duration
    dur = extract_duration(text)
    
    # 3. Needs
    needs = []
    if "projector" in lower:
        needs.append("projector")
    if "mic" in lower or "pa system" in lower or "sound" in lower:
        needs.append("pa_system")
    if "stage" in lower:
        needs.append("stage")
    if "computer" in lower or "pc" in lower or "coding" in lower:
        needs.append("computers")
    if "wheelchair" in lower or "accessible" in lower:
        needs.append("accessible")
        
    # 4. Room Types
    room_types = []
    if "auditorium" in lower:
        room_types.append("auditorium")
    if "seminar hall" in lower or "seminar" in lower:
        room_types.append("seminar_hall")
    if "lab" in lower or "coding contest" in lower:
        room_types.append("lab_cs")
    if "workshop" in lower:
        room_types.append("workshop")
    if not room_types:
        if attendance > 250:
            room_types = ["auditorium", "outdoor"]
        elif attendance > 80:
            room_types = ["lecture_hall", "seminar_hall", "auditorium"]
        else:
            room_types = ["classroom", "lecture_hall", "seminar_hall"]
            
    # 5. Requested room
    requested_room = None
    for r in ["AUD", "SH-1", "SH-2", "OAT", "LH-1", "LH-2", "LH-3", "LH-4", "LH-5", "LH-6", "CS-LAB-1", "CS-LAB-2"]:
        if r.lower() in lower:
            requested_room = r
            break
            
    # 6. Windows / Day
    days_found = []
    for word, d_val in DAYS_MAP.items():
        if re.search(r"\b" + word + r"\b", lower):
            if d_val not in days_found:
                days_found.append(d_val)
                
    # Hinglish "kal" (tomorrow)
    if "kal" in lower and not days_found:
        days_found.append("FRI") # default weekday mapping
        
    if not days_found:
        days_found.append("THU") # default fallback
        
    # Period window
    from_p = 10
    to_p = 11
    
    # Range regex (e.g. 6 to 8 pm, 7 to 9 pm, 10 am)
    m_time = re.search(r"(\d+)\s*(?:to|-)\s*(\d+)\s*(pm|am)?", lower)
    if m_time:
        start_h = int(m_time.group(1))
        end_h = int(m_time.group(2))
        is_pm = m_time.group(3) == "pm" or start_h >= 1 or end_h <= 11
        if is_pm and start_h < 12: start_h += 12
        if is_pm and end_h < 12: end_h += 12
        from_p = time_to_period(start_h)
        to_p = time_to_period(end_h) - 1
        if to_p < from_p:
            to_p = from_p + dur - 1
    elif "6 baje" in lower or "6 pm" in lower or "evening" in lower:
        from_p = 10
        to_p = 10 + dur - 1
    elif "after lunch" in lower or "afternoon" in lower:
        from_p = 6
        to_p = 6 + dur - 1
    elif "10 am" in lower or "morning" in lower:
        from_p = 3
        to_p = 3 + dur - 1
    elif "all day" in lower:
        from_p = 1
        to_p = 9
        
    windows = [BookingWindow(day=d, from_period=from_p, to_period=to_p) for d in days_found]
    
    # 7. Mandatory groups
    mand_groups = []
    if "mechanical third" in lower or "me-3" in lower:
        mand_groups.append("ME-3")
    if "cse third" in lower or "cse-3" in lower:
        mand_groups.append("CSE-3")
    if "ece third" in lower or "ece-3" in lower:
        mand_groups.append("ECE-3")
        
    # 8. Physical Conflicts / Contradictions Detection
    conflicts = []
    if requested_room == "SH-2" and "accessible" in needs:
        conflicts.append("Conflict: SH-2 is on the 1st floor with no lift (not wheelchair accessible). Suggested SH-1 instead.")
        requested_room = "SH-1"
        if "seminar_hall" not in room_types:
            room_types.append("seminar_hall")
            
    if attendance > 800:
        conflicts.append(f"Capacity warning: Campus largest venue (OAT) seats 800. Requested attendance is {attendance}.")
        
    follow_up = None
    if "after lunch" in lower and "maybe" in lower:
        follow_up = "Exact start period after lunch (P6 at 2 PM vs P7 at 3 PM) and finalized attendee count."
        
    return ParsedBooking(
        attendance=attendance,
        duration_periods=dur,
        windows=windows,
        room_types=room_types,
        needs=needs,
        requested_room=requested_room,
        mandatory_for_groups=mand_groups,
        conflicts_or_warnings=conflicts,
        follow_up_question=follow_up
    )
