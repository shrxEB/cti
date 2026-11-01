"""
Pipeline runner: Generates complete schedule.json and validates it against starter_pack/validator.py
"""
import json
import subprocess
from pathlib import Path

from data_loader import load_dataset
from timetable_solver import solve_timetable
from exam_scheduler import schedule_exams
from spectra_bookings import allocate_spectra_bookings

def generate_schedule(data_path: str = "starter_pack/data/cit_public.json", out_path: str = "exports/schedule.json") -> dict:
    print(f"[1/4] Loading dataset: {data_path}")
    data = load_dataset(data_path)
    
    print("[2/4] Solving 189 teaching sessions with OR-Tools CP-SAT...")
    timetable_res, _ = solve_timetable(data, time_limit_seconds=60.0)
    sessions = timetable_res["sessions"]
    print(f"      Scheduled {len(sessions)} sessions.")
    
    print("[3/4] Scheduling 41 midsem exams with halved capacity...")
    exams = schedule_exams(data, time_limit_seconds=30.0)
    print(f"      Scheduled {len(exams)} exams.")
    
    print("[4/4] Allocating 25 Spectra fest week booking requests...")
    fest_week = allocate_spectra_bookings(data, sessions)
    print(f"      Processed {len(fest_week['bookings'])} booking requests.")
    
    schedule = {
        "team": "TechZephyr",
        "dataset_id": data.get("dataset_id", "cit-public-v1"),
        "sessions": sessions,
        "fest_week": fest_week,
        "exams": exams
    }
    
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(schedule, f, indent=2)
    print(f"Exported schedule successfully to: {out_path}")
    return schedule

def run_official_validator(data_path: str = "starter_pack/data/cit_public.json", schedule_path: str = "exports/schedule.json"):
    print("\n" + "="*50)
    print("RUNNING OFFICIAL VALIDATOR (validator.py)")
    print("="*50)
    cmd = ["python3", "starter_pack/validator.py", "--data", data_path, "--schedule", schedule_path]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print(res.stdout)
    if res.stderr:
        print("STDERR:\n", res.stderr)

if __name__ == "__main__":
    generate_schedule()
    run_official_validator()
