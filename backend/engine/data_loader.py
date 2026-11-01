"""
Data loader and schema definitions for the CIT Scheduling Engine.
"""
import json
from pathlib import Path
from typing import Dict, Any, List

def load_dataset(path: str | Path) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def get_teaching_periods(calendar: Dict[str, Any]) -> List[int]:
    return [p["id"] for p in calendar["periods"] if p.get("teaching", False)]

def get_event_periods(calendar: Dict[str, Any]) -> List[int]:
    return [p["id"] for p in calendar["periods"] if not p.get("teaching", False)]
