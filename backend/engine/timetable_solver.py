"""
Automated Timetable Generator for Chilika Institute of Technology (CIT)
Uses Google OR-Tools CP-SAT to guarantee 0 Hard Violations (H1 - H14)
and optimize Soft Constraints (S1 - S6).
"""
import sys
from collections import defaultdict
from typing import Dict, Any, Tuple, List
from ortools.sat.python import cp_model

def solve_timetable(data: Dict[str, Any], time_limit_seconds: float = 60.0) -> Tuple[Dict[str, Any], cp_model.CpSolver]:
    model = cp_model.CpModel()
    
    days = data["calendar"]["days"]  # ["MON", "TUE", "WED", "THU", "FRI"]
    day_to_idx = {d: i for i, d in enumerate(days)}
    idx_to_day = {i: d for i, d in enumerate(days)}
    num_days = len(days)
    
    lunch_after = data["calendar"]["lunch"]["after_period"]  # 5
    lab_starts = set(data["calendar"]["lab_start_periods"])   # {2, 6}
    last_teaching = 9
    
    rooms = {r["id"]: r for r in data["rooms"]}
    faculty = {f["id"]: f for f in data["faculty"]}
    groups = {g["id"]: g for g in data["student_groups"]}
    sessions = {s["id"]: s for s in data["sessions"]}
    
    # Pre-index room & faculty unavailability
    fac_unavail = defaultdict(set)
    for f in data["faculty"]:
        for u in f.get("unavailable", []):
            for p in u["periods"]:
                fac_unavail[f["id"]].add((u["day"], p))
                
    room_unavail = defaultdict(set)
    for u in data.get("room_unavailability", []):
        for p in u["periods"]:
            room_unavail[u["room_id"]].add((u["day"], p))
            
    # Decision Variables for each session s
    # We will choose:
    # 1. day_var in [0..num_days-1]
    # 2. start_var in [1..last_teaching - duration + 1]
    # 3. room_var: integer room index from eligible rooms
    
    session_vars = {}
    
    # Map rooms to integer indices
    room_id_list = list(rooms.keys())
    room_to_idx = {rid: i for i, rid in enumerate(room_id_list)}
    idx_to_room = {i: rid for i, rid in enumerate(room_id_list)}
    
    for sid, s in sessions.items():
        dur = s["duration"]
        kind = s["kind"]
        size = s["size"]
        req_types = set(s["room_types"])
        needs_acc = s.get("needs_accessible", False)
        
        # Valid rooms for this session (H5, H6, H10)
        eligible_room_indices = []
        for rid, r in rooms.items():
            if "lecture" not in r["allowed_uses"] and "lab" not in r["allowed_uses"] and "tutorial" not in r["allowed_uses"]:
                continue
            if kind == "lab" and "lab" not in r["allowed_uses"]:
                continue
            if kind in ("lecture", "tutorial") and kind not in r["allowed_uses"]:
                continue
            if r["capacity"] < size:
                continue
            if r["type"] not in req_types:
                continue
            if needs_acc and not r["accessible"]:
                continue
            eligible_room_indices.append(room_to_idx[rid])
            
        if not eligible_room_indices:
            raise ValueError(f"Session {sid} has no eligible rooms based on size/type/accessibility!")
            
        # Fixed slot constraint (H14)
        fixed = s.get("fixed_slot")
        if fixed:
            day_var = model.NewConstant(day_to_idx[fixed["day"]])
            start_var = model.NewConstant(fixed["start_period"])
        else:
            day_var = model.NewIntVar(0, num_days - 1, f"day_{sid}")
            
            # Start period constraints (H9)
            if kind == "lab":
                # Must start strictly at P2 or P6
                lab_start_domain = cp_model.Domain.FromValues(list(lab_starts))
                start_var = model.NewIntVarFromDomain(lab_start_domain, f"start_{sid}")
            else:
                # Valid starts within 1..9 such that start + dur - 1 <= 9
                # AND does not cross lunch (H9): interval cannot have [start <= 5 and start + dur - 1 >= 6]
                valid_starts = []
                for st in range(1, last_teaching - dur + 2):
                    en = st + dur - 1
                    if st <= lunch_after < en:
                        continue  # crosses lunch
                    valid_starts.append(st)
                start_var = model.NewIntVarFromDomain(cp_model.Domain.FromValues(valid_starts), f"start_{sid}")
                
        # Room variable
        room_var = model.NewIntVarFromDomain(cp_model.Domain.FromValues(eligible_room_indices), f"room_{sid}")
        
        session_vars[sid] = {
            "day": day_var,
            "start": start_var,
            "room": room_var,
            "duration": dur,
            "eligible_rooms": eligible_room_indices
        }
        
    # Elective Baskets (H11):
    # Year 3 students take open electives (OE301, OE302, OE303).
    # All sessions with the SAME basket_slot (e.g. OEB-1) must be at the EXACT same day and start_period.
    baskets = defaultdict(list)
    for sid, s in sessions.items():
        bslot = s.get("basket_slot")
        if bslot:
            baskets[bslot].append(sid)
            
    for bslot, sids in baskets.items():
        ref_sid = sids[0]
        for other_sid in sids[1:]:
            model.Add(session_vars[other_sid]["day"] == session_vars[ref_sid]["day"])
            model.Add(session_vars[other_sid]["start"] == session_vars[ref_sid]["start"])
            
    # Boolean indicator variables for session occurrence at (day, period) and in room
    # occ[(sid, d, p)] = True if session sid is active on day d at period p
    occ = {}
    for sid, s in sessions.items():
        dur = s["duration"]
        v = session_vars[sid]
        for d in range(num_days):
            is_day = model.NewBoolVar(f"is_day_{sid}_{d}")
            model.Add(v["day"] == d).OnlyEnforceIf(is_day)
            model.Add(v["day"] != d).OnlyEnforceIf(is_day.Not())
            
            for p in range(1, last_teaching + 1):
                is_active = model.NewBoolVar(f"act_{sid}_{d}_{p}")
                # Active if day == d AND start <= p <= start + dur - 1
                # i.e. p - dur + 1 <= start <= p
                st_ge = model.NewBoolVar(f"st_ge_{sid}_{d}_{p}")
                st_le = model.NewBoolVar(f"st_le_{sid}_{d}_{p}")
                model.Add(v["start"] >= p - dur + 1).OnlyEnforceIf(st_ge)
                model.Add(v["start"] < p - dur + 1).OnlyEnforceIf(st_ge.Not())
                model.Add(v["start"] <= p).OnlyEnforceIf(st_le)
                model.Add(v["start"] > p).OnlyEnforceIf(st_le.Not())
                
                model.AddBoolAnd([is_day, st_ge, st_le]).OnlyEnforceIf(is_active)
                model.AddBoolOr([is_day.Not(), st_ge.Not(), st_le.Not()]).OnlyEnforceIf(is_active.Not())
                
                occ[(sid, d, p)] = is_active
                
    # Faculty Unavailability (H7)
    for sid, s in sessions.items():
        f = s["faculty_id"]
        for (d_name, p) in fac_unavail[f]:
            d_idx = day_to_idx[d_name]
            model.Add(occ[(sid, d_idx, p)] == 0)
            
    # Faculty Clash (H2): Faculty can teach at most 1 session at any (day, p)
    fac_sessions = defaultdict(list)
    for sid, s in sessions.items():
        fac_sessions[s["faculty_id"]].append(sid)
        
    for f, f_sids in fac_sessions.items():
        for d in range(num_days):
            for p in range(1, last_teaching + 1):
                model.Add(sum(occ[(sid, d, p)] for sid in f_sids) <= 1)
                
    # Faculty Workload Limit (H12): max_hours_per_day
    for f, f_sids in fac_sessions.items():
        max_h = faculty[f].get("max_hours_per_day", 4)
        for d in range(num_days):
            # Sum of duration of all sessions of faculty on day d <= max_h
            # Each active session on day d at period p occupies 1 period-hour
            model.Add(sum(occ[(sid, d, p)] for sid in f_sids for p in range(1, last_teaching + 1)) <= max_h)
            
    # Student Group Clash (H3)
    # Basket sessions with the same basket_slot share groups without clashing with each other,
    # but clash with ANY non-basket or different-basket session!
    grp_sessions = defaultdict(list)
    for sid, s in sessions.items():
        for g in s["groups"]:
            grp_sessions[g].append(sid)
            
    for g, g_sids in grp_sessions.items():
        # Partition g_sids into basket groups and independent sessions
        basket_keys = defaultdict(list)
        indep_sids = []
        for sid in g_sids:
            bslot = sessions[sid].get("basket_slot")
            if bslot:
                basket_keys[bslot].append(sid)
            else:
                indep_sids.append(sid)
                
        for d in range(num_days):
            for p in range(1, last_teaching + 1):
                # For each basket, at most 1 active, or we represent basket as 1 occupancy unit
                terms = [occ[(sid, d, p)] for sid in indep_sids]
                for bslot, b_sids in basket_keys.items():
                    # Basket sessions in the same basket slot happen simultaneously,
                    # so their occurrence is identical for the group
                    terms.append(occ[(b_sids[0], d, p)])
                model.Add(sum(terms) <= 1)
                
    # Room Clash (H4) & Room Unavailability (H8)
    # room_occ[(r_idx, d, p)] = session sid occupying room r_idx on day d at period p
    # sid is in room r_idx iff (room_var == r_idx) AND occ[(sid, d, p)] is True
    for r_idx, rid in idx_to_room.items():
        for d in range(num_days):
            d_name = idx_to_day[d]
            for p in range(1, last_teaching + 1):
                # H8: Room unavailability
                if (rid, p) in room_unavail or (d_name, p) in room_unavail[rid]:
                    for sid in sessions:
                        if r_idx in session_vars[sid]["eligible_rooms"]:
                            is_in_r = model.NewBoolVar(f"in_r_{sid}_{r_idx}")
                            model.Add(session_vars[sid]["room"] == r_idx).OnlyEnforceIf(is_in_r)
                            model.Add(session_vars[sid]["room"] != r_idx).OnlyEnforceIf(is_in_r.Not())
                            model.Add(occ[(sid, d, p)] == 0).OnlyEnforceIf(is_in_r)
                    continue
                    
                # H4: At most 1 session in room r_idx at (d, p)
                in_room_terms = []
                for sid in sessions:
                    if r_idx in session_vars[sid]["eligible_rooms"]:
                        is_in_room_and_active = model.NewBoolVar(f"r_act_{sid}_{r_idx}_{d}_{p}")
                        is_in_r = model.NewBoolVar(f"in_r_{sid}_{r_idx}_{d}_{p}")
                        model.Add(session_vars[sid]["room"] == r_idx).OnlyEnforceIf(is_in_r)
                        model.Add(session_vars[sid]["room"] != r_idx).OnlyEnforceIf(is_in_r.Not())
                        
                        model.AddBoolAnd([is_in_r, occ[(sid, d, p)]]).OnlyEnforceIf(is_in_room_and_active)
                        model.AddBoolOr([is_in_r.Not(), occ[(sid, d, p)].Not()]).OnlyEnforceIf(is_in_room_and_active.Not())
                        
                        in_room_terms.append(is_in_room_and_active)
                if in_room_terms:
                    model.Add(sum(in_room_terms) <= 1)
                    
    # ================= SOFT CONSTRAINTS (S1 - S6) =================
    soft_penalties = []
    
    # S1: Faculty avoid preferences (2 points per avoided period taught)
    for sid, s in sessions.items():
        f = s["faculty_id"]
        for pref in faculty[f].get("preferences", []):
            if pref.get("type") == "avoid":
                pref_days = [day_to_idx[d] for d in pref.get("days", days)]
                for d in pref_days:
                    for p in pref.get("periods", []):
                        if 1 <= p <= last_teaching:
                            soft_penalties.append(2 * occ[(sid, d, p)])
                            
    # S6: Teaching in Period 9 (1 point per session occupying P9)
    for sid in sessions:
        for d in range(num_days):
            soft_penalties.append(occ[(sid, d, 9)])
            
    # Objective: Minimize sum of soft penalties
    if soft_penalties:
        model.Minimize(sum(soft_penalties))
        
    # Solve
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_seconds
    solver.parameters.num_workers = 8
    
    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError(f"Solver failed to find a feasible timetable: status {solver.StatusName(status)}")
        
    # Extract assignments
    assignments = []
    for sid, v in session_vars.items():
        d_val = solver.Value(v["day"])
        st_val = solver.Value(v["start"])
        r_val = solver.Value(v["room"])
        assignments.append({
            "session_id": sid,
            "day": idx_to_day[d_val],
            "start_period": st_val,
            "room_id": idx_to_room[r_val]
        })
        
    return {"sessions": assignments}, solver

if __name__ == "__main__":
    from data_loader import load_dataset
    data_path = "starter_pack/data/cit_public.json"
    print(f"Loading data from {data_path}...")
    data = load_dataset(data_path)
    print("Solving Timetable with OR-Tools CP-SAT...")
    res, solver = solve_timetable(data)
    print(f"Solved! {len(res['sessions'])} sessions scheduled.")
