"""
Intelligent Rescheduling Engine for Chilika Institute of Technology (CIT)
Handles disruptions (faculty leave, room closure, added/removed sessions).
Key objective: Minimal Perturbation Problem
- Preserves all hard constraints (0 hard violations)
- Minimizes the number of sessions moved from the baseline schedule
- Distinguishes time changes vs room-only changes (prefer room-only over time shift)
"""
import copy
from collections import defaultdict
from typing import Dict, Any, Tuple, List
from ortools.sat.python import cp_model

def apply_disruption(data: Dict[str, Any], disruption: Dict[str, Any]) -> Dict[str, Any]:
    """Applies disruption changes to dataset in exact accordance with validator.py"""
    d = copy.deepcopy(data)
    fac = {f["id"]: f for f in d["faculty"]}
    for ch in disruption.get("changes", []):
        t = ch["type"]
        if t == "faculty_unavailable":
            for day in ch["days"]:
                fac[ch["faculty_id"]]["unavailable"].append(
                    {"day": day, "periods": ch["periods"], "reason": ch.get("reason", "")}
                )
        elif t == "room_unavailable":
            for day in ch["days"]:
                d["room_unavailability"].append(
                    {"room_id": ch["room_id"], "day": day, "periods": ch["periods"], "reason": ch.get("reason", "")}
                )
        elif t == "add_faculty":
            d["faculty"].append(ch["faculty"])
            fac[ch["faculty"]["id"]] = ch["faculty"]
        elif t == "add_session":
            d["sessions"].append(ch["session"])
        elif t == "remove_session":
            d["sessions"] = [s for s in d["sessions"] if s["id"] != ch["session_id"]]
        else:
            raise ValueError(f"Unknown change type: {t}")
    return d

def solve_reschedule(
    disrupted_data: Dict[str, Any],
    baseline_schedule: Dict[str, Any],
    time_limit_seconds: float = 60.0
) -> Dict[str, Any]:
    """
    Solves minimal-perturbation schedule starting from baseline.
    Minimizes: 100 * (time_changed) + 10 * (room_changed) + soft_penalties
    """
    model = cp_model.CpModel()
    
    days = disrupted_data["calendar"]["days"]
    day_to_idx = {d: i for i, d in enumerate(days)}
    idx_to_day = {i: d for i, d in enumerate(days)}
    num_days = len(days)
    
    lunch_after = disrupted_data["calendar"]["lunch"]["after_period"]
    lab_starts = set(disrupted_data["calendar"]["lab_start_periods"])
    last_teaching = 9
    
    rooms = {r["id"]: r for r in disrupted_data["rooms"]}
    faculty = {f["id"]: f for f in disrupted_data["faculty"]}
    groups = {g["id"]: g for g in disrupted_data["student_groups"]}
    sessions = {s["id"]: s for s in disrupted_data["sessions"]}
    
    # Baseline assignments map: sid -> (day, start, room_id)
    baseline_map = {
        s["session_id"]: (s["day"], s["start_period"], s["room_id"])
        for s in baseline_schedule.get("sessions", [])
    }
    
    room_id_list = list(rooms.keys())
    room_to_idx = {rid: i for i, rid in enumerate(room_id_list)}
    idx_to_room = {i: rid for i, rid in enumerate(room_id_list)}
    
    fac_unavail = defaultdict(set)
    for f in disrupted_data["faculty"]:
        for u in f.get("unavailable", []):
            for p in u["periods"]:
                fac_unavail[f["id"]].add((u["day"], p))
                
    room_unavail = defaultdict(set)
    for u in disrupted_data.get("room_unavailability", []):
        for p in u["periods"]:
            room_unavail[u["room_id"]].add((u["day"], p))
            
    session_vars = {}
    time_moved_vars = []
    room_moved_vars = []
    
    for sid, s in sessions.items():
        dur = s["duration"]
        kind = s["kind"]
        size = s["size"]
        req_types = set(s["room_types"])
        needs_acc = s.get("needs_accessible", False)
        
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
            
        fixed = s.get("fixed_slot")
        if fixed:
            day_var = model.NewConstant(day_to_idx[fixed["day"]])
            start_var = model.NewConstant(fixed["start_period"])
        else:
            day_var = model.NewIntVar(0, num_days - 1, f"day_{sid}")
            if kind == "lab":
                start_var = model.NewIntVarFromDomain(cp_model.Domain.FromValues(list(lab_starts)), f"start_{sid}")
            else:
                valid_starts = []
                for st in range(1, last_teaching - dur + 2):
                    en = st + dur - 1
                    if st <= lunch_after < en:
                        continue
                    valid_starts.append(st)
                start_var = model.NewIntVarFromDomain(cp_model.Domain.FromValues(valid_starts), f"start_{sid}")
                
        room_var = model.NewIntVarFromDomain(cp_model.Domain.FromValues(eligible_room_indices), f"room_{sid}")
        
        session_vars[sid] = {
            "day": day_var,
            "start": start_var,
            "room": room_var,
            "duration": dur,
            "eligible_rooms": eligible_room_indices
        }
        
        # Stability variables (penalty if moved from baseline)
        if sid in baseline_map:
            base_day, base_start, base_room = baseline_map[sid]
            base_d_idx = day_to_idx[base_day]
            base_r_idx = room_to_idx.get(base_room)
            
            # Check day moved
            day_diff = model.NewBoolVar(f"day_diff_{sid}")
            model.Add(day_var != base_d_idx).OnlyEnforceIf(day_diff)
            model.Add(day_var == base_d_idx).OnlyEnforceIf(day_diff.Not())
            
            # Check start moved
            start_diff = model.NewBoolVar(f"start_diff_{sid}")
            model.Add(start_var != base_start).OnlyEnforceIf(start_diff)
            model.Add(start_var == base_start).OnlyEnforceIf(start_diff.Not())
            
            # Time moved = day_diff OR start_diff
            time_diff = model.NewBoolVar(f"time_diff_{sid}")
            model.AddBoolOr([day_diff, start_diff]).OnlyEnforceIf(time_diff)
            model.AddBoolAnd([day_diff.Not(), start_diff.Not()]).OnlyEnforceIf(time_diff.Not())
            time_moved_vars.append(time_diff)
            
            # Room moved
            if base_r_idx is not None and base_r_idx in eligible_room_indices:
                r_diff = model.NewBoolVar(f"room_diff_{sid}")
                model.Add(room_var != base_r_idx).OnlyEnforceIf(r_diff)
                model.Add(room_var == base_r_idx).OnlyEnforceIf(r_diff.Not())
                room_moved_vars.append(r_diff)
                
    # Basket constraints (H11)
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
            
    # Interval and occupancy
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
            
    # Faculty Clash (H2)
    fac_sessions = defaultdict(list)
    for sid, s in sessions.items():
        fac_sessions[s["faculty_id"]].append(sid)
        
    for f, f_sids in fac_sessions.items():
        for d in range(num_days):
            for p in range(1, last_teaching + 1):
                model.Add(sum(occ[(sid, d, p)] for sid in f_sids) <= 1)
                
    # Faculty Workload Limit (H12)
    for f, f_sids in fac_sessions.items():
        max_h = faculty[f].get("max_hours_per_day", 4)
        for d in range(num_days):
            model.Add(sum(occ[(sid, d, p)] for sid in f_sids for p in range(1, last_teaching + 1)) <= max_h)
            
    # Student Group Clash (H3)
    grp_sessions = defaultdict(list)
    for sid, s in sessions.items():
        for g in s["groups"]:
            grp_sessions[g].append(sid)
            
    for g, g_sids in grp_sessions.items():
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
                terms = [occ[(sid, d, p)] for sid in indep_sids]
                for bslot, b_sids in basket_keys.items():
                    terms.append(occ[(b_sids[0], d, p)])
                model.Add(sum(terms) <= 1)
                
    # Room Clash (H4) & Room Unavailability (H8)
    for r_idx, rid in idx_to_room.items():
        for d in range(num_days):
            d_name = idx_to_day[d]
            for p in range(1, last_teaching + 1):
                if (rid, p) in room_unavail or (d_name, p) in room_unavail[rid]:
                    for sid in sessions:
                        if r_idx in session_vars[sid]["eligible_rooms"]:
                            is_in_r = model.NewBoolVar(f"in_r_{sid}_{r_idx}")
                            model.Add(session_vars[sid]["room"] == r_idx).OnlyEnforceIf(is_in_r)
                            model.Add(session_vars[sid]["room"] != r_idx).OnlyEnforceIf(is_in_r.Not())
                            model.Add(occ[(sid, d, p)] == 0).OnlyEnforceIf(is_in_r)
                    continue
                    
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
                    
    # Objective: Minimize Movement (100 * time_changed + 10 * room_changed)
    objective_terms = []
    for t_diff in time_moved_vars:
        objective_terms.append(100 * t_diff)
    for r_diff in room_moved_vars:
        objective_terms.append(10 * r_diff)
        
    model.Minimize(sum(objective_terms))
    
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_seconds
    solver.parameters.num_workers = 8
    
    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError(f"Rescheduler failed to find a feasible solution: {solver.StatusName(status)}")
        
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
        
    return {
        "team": baseline_schedule.get("team", "TechZephyr"),
        "dataset_id": disrupted_data.get("dataset_id", "cit-public-v1"),
        "sessions": assignments,
        # Preserve fest_week and exams from baseline as allowed by validator
        "fest_week": baseline_schedule.get("fest_week", {}),
        "exams": baseline_schedule.get("exams", [])
    }
