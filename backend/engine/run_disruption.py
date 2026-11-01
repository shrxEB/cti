"""
Script to apply sample disruption and validate schedule_after.json against schedule.json
"""
import json
import subprocess
from pathlib import Path

from data_loader import load_dataset
from rescheduler import apply_disruption, solve_reschedule

def run_sample_disruption_pipeline():
    data_path = "starter_pack/data/cit_public.json"
    disruption_path = "starter_pack/examples/sample_disruption.json"
    baseline_path = "exports/schedule.json"
    out_after_path = "exports/schedule_after.json"
    
    print("[1/3] Loading data, disruption, and baseline schedule...")
    raw_data = load_dataset(data_path)
    disruption = load_dataset(disruption_path)
    baseline_schedule = load_dataset(baseline_path)
    
    disrupted_data = apply_disruption(raw_data, disruption)
    print(f"      Applied {len(disruption['changes'])} disruption changes.")
    
    print("[2/3] Solving minimal perturbation schedule with OR-Tools CP-SAT...")
    schedule_after = solve_reschedule(disrupted_data, baseline_schedule, time_limit_seconds=60.0)
    
    with open(out_after_path, "w", encoding="utf-8") as f:
        json.dump(schedule_after, f, indent=2)
    print(f"      Exported repaired schedule to: {out_after_path}")
    
    print("\n[3/3] Running official validator with --disruption and --baseline...")
    cmd = [
        "python3", "starter_pack/validator.py",
        "--data", data_path,
        "--schedule", out_after_path,
        "--disruption", disruption_path,
        "--baseline", baseline_path
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print(res.stdout)
    if res.stderr:
        print("STDERR:\n", res.stderr)

if __name__ == "__main__":
    run_sample_disruption_pipeline()
