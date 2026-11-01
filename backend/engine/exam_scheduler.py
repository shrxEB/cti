"""
Examination Scheduler for Chilika Institute of Technology (CIT)
Schedules all 41 midsem exams across MON-SAT in AM/PM slots.
Key constraints:
- Halved room capacity (seats = capacity // 2)
- Rooms must allow 'exam'
- Multi-room allocation for large exams
- No student group has 2 exams in the same slot
- Minimizes student groups having multiple exams on the same day (pen = 5 * (count - 1))
"""
from typing import Dict, Any, List
from collections import defaultdict
from ortools.sat.python import cp_model

def schedule_exams(data: Dict[str, Any], time_limit_seconds: float = 30.0) -> List[Dict[str, Any]]:
    exams = data.get("exams", [])
    if not exams:
        return []
        
    exam_week = data["calendar"]["exam_week"]
    days = exam_week["days"]  # ["MON", "TUE", "WED", "THU", "FRI", "SAT"]
    day_to_idx = {d: i for i, d in enumerate(days)}
    idx_to_day = {i: d for i, d in enumerate(days)}
    num_days = len(days)
    
    sessions = exam_week["sessions"]  # [{"id": "AM", ...}, {"id": "PM", ...}]
    sess_ids = [s["id"] for s in sessions]
    sess_to_idx = {s: i for i, s in enumerate(sess_ids)}
    idx_to_sess = {i: s for i, s in enumerate(sess_ids)}
    num_sess = len(sess_ids)
    
    # 12 total slots: (day_idx, sess_idx)
    num_slots = num_days * num_sess
    
    # Rooms that allow exams
    exam_rooms = [r for r in data["rooms"] if "exam" in r.get("allowed_uses", [])]
    exam_room_ids = [r["id"] for r in exam_rooms]
    room_to_idx = {rid: i for i, rid in enumerate(exam_room_ids)}
    idx_to_room = {i: rid for i, rid in enumerate(exam_room_ids)}
    room_seats = {rid: r["capacity"] // 2 for r, rid in zip(exam_rooms, exam_room_ids)}
    
    model = cp_model.CpModel()
    
    # For each exam e:
    # slot_var in [0..num_slots-1]
    # use_room[e_id, r_id] is BoolVar
    slot_vars = {}
    use_room = {}
    
    for ex in exams:
        eid = ex["id"]
        slot_vars[eid] = model.NewIntVar(0, num_slots - 1, f"slot_{eid}")
        
        for rid in exam_room_ids:
            use_room[(eid, rid)] = model.NewBoolVar(f"use_{eid}_{rid}")
            
        # Capacity constraint: sum(seats) >= exam size
        model.Add(
            sum(use_room[(eid, rid)] * room_seats[rid] for rid in exam_room_ids) >= ex["size"]
        )
        
    # No room double-booked in the same slot:
    # If room rid is used by eid, and eid is in slot s, room is occupied in slot s
    for s_idx in range(num_slots):
        for rid in exam_room_ids:
            room_slot_uses = []
            for ex in exams:
                eid = ex["id"]
                in_slot = model.NewBoolVar(f"in_s_{eid}_{s_idx}")
                model.Add(slot_vars[eid] == s_idx).OnlyEnforceIf(in_slot)
                model.Add(slot_vars[eid] != s_idx).OnlyEnforceIf(in_slot.Not())
                
                both = model.NewBoolVar(f"both_{eid}_{rid}_{s_idx}")
                model.AddBoolAnd([in_slot, use_room[(eid, rid)]]).OnlyEnforceIf(both)
                model.AddBoolOr([in_slot.Not(), use_room[(eid, rid)].Not()]).OnlyEnforceIf(both.Not())
                room_slot_uses.append(both)
                
            model.Add(sum(room_slot_uses) <= 1)
            
    # No student group has 2 exams in the same slot:
    grp_exams = defaultdict(list)
    for ex in exams:
        for g in ex["groups"]:
            grp_exams[g].append(ex["id"])
            
    for g, eids in grp_exams.items():
        if len(eids) > 1:
            for s_idx in range(num_slots):
                in_slot_vars = []
                for eid in eids:
                    in_s = model.NewBoolVar(f"grp_s_{g}_{eid}_{s_idx}")
                    model.Add(slot_vars[eid] == s_idx).OnlyEnforceIf(in_s)
                    model.Add(slot_vars[eid] != s_idx).OnlyEnforceIf(in_s.Not())
                    in_slot_vars.append(in_s)
                model.Add(sum(in_slot_vars) <= 1)
                
    # Soft Penalty: Minimize student group having 2 exams on the SAME day
    same_day_penalties = []
    for g, eids in grp_exams.items():
        if len(eids) > 1:
            for d in range(num_days):
                # day slots are (d * 2, d * 2 + 1)
                s0 = d * 2
                s1 = d * 2 + 1
                in_day_vars = []
                for eid in eids:
                    in_d = model.NewBoolVar(f"in_d_{g}_{eid}_{d}")
                    in_s0 = model.NewBoolVar(f"in_s0_{g}_{eid}_{d}")
                    in_s1 = model.NewBoolVar(f"in_s1_{g}_{eid}_{d}")
                    model.Add(slot_vars[eid] == s0).OnlyEnforceIf(in_s0)
                    model.Add(slot_vars[eid] != s0).OnlyEnforceIf(in_s0.Not())
                    model.Add(slot_vars[eid] == s1).OnlyEnforceIf(in_s1)
                    model.Add(slot_vars[eid] != s1).OnlyEnforceIf(in_s1.Not())
                    model.AddBoolOr([in_s0, in_s1]).OnlyEnforceIf(in_d)
                    model.AddBoolAnd([in_s0.Not(), in_s1.Not()]).OnlyEnforceIf(in_d.Not())
                    in_day_vars.append(in_d)
                    
                # if count > 1, penalize
                excess = model.NewIntVar(0, len(eids), f"excess_{g}_{d}")
                model.Add(excess >= sum(in_day_vars) - 1)
                same_day_penalties.append(5 * excess)
                
    # Also minimize number of rooms used (prefer compact seating)
    room_count_penalty = [sum(use_room[(ex["id"], rid)] for rid in exam_room_ids) for ex in exams]
    
    model.Minimize(sum(same_day_penalties) + sum(room_count_penalty))
    
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_seconds
    solver.parameters.num_workers = 8
    
    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError(f"Exam solver failed to find solution: {solver.StatusName(status)}")
        
    result = []
    for ex in exams:
        eid = ex["id"]
        s_val = solver.Value(slot_vars[eid])
        day_idx = s_val // num_sess
        sess_idx = s_val % num_sess
        
        assigned_rooms = [rid for rid in exam_room_ids if solver.Value(use_room[(eid, rid)]) == 1]
        
        result.append({
            "exam_id": eid,
            "day": idx_to_day[day_idx],
            "session": idx_to_sess[sess_idx],
            "rooms": assigned_rooms
        })
        
    return result
