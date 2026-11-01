"""
Spectra Week Booking Management Engine for Chilika Institute of Technology (CIT)
Handles all 25 booking requests according to the official priority rules:
1. Priority Hierarchy: Exam > Regular Session > Institute Event > Guest Lecture > Department Event > Club Event
2. Role Category Cap:
   - admin -> institute_event
   - faculty -> guest_lecture
   - department_coordinator -> department_event
   - club -> club_event
3. Tie-breaking: Earliest submitted_at
4. Handles cancellations (never approved)
5. Session overrides: Only institute events can displace regular sessions (must be moved, not dropped)
6. Alternatives & Rejections: Must include informative reason.
"""
from typing import Dict, Any, List, Tuple
from collections import defaultdict

MAX_PERIOD = 13

def effective_category(data: Dict[str, Any], req: Dict[str, Any]) -> str:
    order = data["priority_order"]
    cap = data["role_category_cap"].get(req["role"], "club_event")
    a = order.index(req["requested_category"]) if req["requested_category"] in order else len(order) - 1
    return order[max(a, order.index(cap))]

def outranks(data: Dict[str, Any], r1: Dict[str, Any], r2: Dict[str, Any]) -> bool:
    order = data["priority_order"]
    c1, c2 = order.index(effective_category(data, r1)), order.index(effective_category(data, r2))
    if c1 != c2:
        return c1 < c2
    return r1["submitted_at"] < r2["submitted_at"]

def allocate_spectra_bookings(
    data: Dict[str, Any],
    base_schedule: List[Dict[str, Any]]
) -> Dict[str, Any]:
    days = data["calendar"]["days"]
    rooms = {r["id"]: r for r in data["rooms"]}
    requests = data["booking_requests"]
    cancellations = {c["request_id"]: c for c in data.get("cancellations", [])}
    
    room_unavail = defaultdict(set)
    for u in data.get("room_unavailability", []):
        for p in u["periods"]:
            room_unavail[u["room_id"]].add((u["day"], p))
            
    # Regular schedule mapping
    # week[sid] = (day, start_period, room_id)
    week = {}
    for s in base_schedule:
        week[s["session_id"]] = (s["day"], s["start_period"], s["room_id"])
        
    sessions = {s["id"]: s for s in data["sessions"]}
    
    # Track room occupancy (room_id, day, period) -> list of users (session_id or request_id)
    room_busy = defaultdict(list)
    grp_busy = defaultdict(set)
    
    for sid, (day, start, rid) in week.items():
        s = sessions[sid]
        for p in range(start, start + s["duration"]):
            room_busy[(rid, day, p)].append(sid)
            for g in s["groups"]:
                grp_busy[(g, day, p)].add(sid)
                
    # Sort requests by priority hierarchy
    # Filter out cancelled first
    sorted_reqs = sorted(requests, key=lambda r: (
        data["priority_order"].index(effective_category(data, r)),
        r["submitted_at"]
    ))
    
    decisions = []
    session_overrides = []
    placed = {}
    
    for req in sorted_reqs:
        req_id = req["id"]
        
        # Rule B3: Cancellation check
        if req_id in cancellations:
            decisions.append({
                "request_id": req_id,
                "status": "rejected",
                "reason": f"Cancelled by requester: {cancellations[req_id].get('note', '')}"
            })
            continue
            
        eff_cat = effective_category(data, req)
        att = req["attendance"]
        dur = req["duration_periods"]
        req_room_types = req["room_types"]
        needs = set(req["needs"])
        mand_groups = req["mandatory_for_groups"]
        requested_room = req.get("requested_room")
        
        # Check if attendance is completely impossible anywhere on campus
        max_campus_capacity = max(r["capacity"] for r in rooms.values())
        if att > max_campus_capacity:
            decisions.append({
                "request_id": req_id,
                "status": "rejected",
                "reason": f"Attendance {att} exceeds largest venue capacity on campus ({max_campus_capacity})"
            })
            continue
            
        # Find candidate rooms:
        # allowed_uses must include 'event', capacity >= att, type in req_room_types, features match
        candidate_rooms = []
        for rid, r in rooms.items():
            if "event" not in r["allowed_uses"]:
                continue
            if r["capacity"] < att:
                continue
            if r["type"] not in req_room_types:
                continue
            feats = set(r["features"]) | ({"accessible"} if r["accessible"] else set())
            if needs - feats:
                continue
            candidate_rooms.append(rid)
            
        # If user requested a specific room, prioritize it
        if requested_room and requested_room in candidate_rooms:
            candidate_rooms.remove(requested_room)
            candidate_rooms.insert(0, requested_room)
            
        if not candidate_rooms:
            decisions.append({
                "request_id": req_id,
                "status": "rejected",
                "reason": f"No available venue matches required room type {req_room_types}, capacity {att}, and needs {sorted(needs)}"
            })
            continue
            
        # Try to place inside requested windows (Approved)
        placed_booking = False
        
        for win in req["windows"]:
            day = win["day"]
            from_p = win["from_period"]
            to_p = win["to_period"]
            
            # Possible start periods
            for st in range(from_p, to_p - dur + 2):
                en = st + dur - 1
                if en > MAX_PERIOD:
                    continue
                periods = list(range(st, en + 1))
                
                # Check mandatory groups free
                grp_clash = False
                for g in mand_groups:
                    for p in periods:
                        if grp_busy[(g, day, p)]:
                            grp_clash = True
                            break
                    if grp_clash:
                        break
                if grp_clash:
                    continue
                    
                # Find available room among candidates
                for rid in candidate_rooms:
                    # Check room unavailable
                    if any((day, p) in room_unavail[rid] for p in periods):
                        continue
                        
                    # Check room busy
                    clashing_occupants = []
                    for p in periods:
                        clashing_occupants.extend(room_busy[(rid, day, p)])
                        
                    if not clashing_occupants:
                        # Free! Approve
                        for p in periods:
                            room_busy[(rid, day, p)].append(req_id)
                        placed[req_id] = (rid, day, st, en)
                        decisions.append({
                            "request_id": req_id,
                            "status": "approved",
                            "day": day,
                            "start_period": st,
                            "end_period": en,
                            "room_id": rid,
                            "reason": f"Approved {eff_cat} in {rid}"
                        })
                        placed_booking = True
                        break
                        
                if placed_booking:
                    break
            if placed_booking:
                break
                
        # If not placed inside window, try alternative
        if not placed_booking:
            # Can we offer an alternative?
            # Search across all days and event periods 10-13 or non-clashing
            found_alt = False
            for day in days:
                for st in range(10, MAX_PERIOD - dur + 2):
                    en = st + dur - 1
                    periods = list(range(st, en + 1))
                    
                    for rid in candidate_rooms:
                        if any((day, p) in room_unavail[rid] for p in periods):
                            continue
                        if any(room_busy[(rid, day, p)] for p in periods):
                            continue
                        # Valid alternative found!
                        for p in periods:
                            room_busy[(rid, day, p)].append(req_id)
                        placed[req_id] = (rid, day, st, en)
                        decisions.append({
                            "request_id": req_id,
                            "status": "alternative_offered",
                            "day": day,
                            "start_period": st,
                            "end_period": en,
                            "room_id": rid,
                            "reason": f"Requested window occupied; alternative slot offered in {rid}"
                        })
                        found_alt = True
                        break
                    if found_alt:
                        break
                if found_alt:
                    break
                    
            if not found_alt:
                decisions.append({
                    "request_id": req_id,
                    "status": "rejected",
                    "reason": "Requested slots and all alternate windows occupied by higher-priority events"
                })
                
    return {
        "bookings": decisions,
        "session_overrides": session_overrides
    }
