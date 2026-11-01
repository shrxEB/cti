"""
Gemini AI Booking Parser using the official google-genai SDK.
Translates unstructured English, Hindi, and Hinglish messages into structured CIT booking JSON.
Includes robust fallback to rule_parser in case of network or quota limits.
"""
import os
import json
from typing import Dict, Any, Optional
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from schemas import ParsedBooking
from rule_parser import parse_booking_rule_based

SYSTEM_PROMPT = """
You are the AI Campus Scheduling Assistant for Chilika Institute of Technology (CIT).
Your task is to parse plain-language booking requests (in English, Hindi, or Hinglish) into structured booking objects.

Campus Timing Rules:
- Periods 1 to 9 (08:00 - 18:00) are teaching periods. Lunch is between Period 5 and 6 (13:00 - 14:00).
- Periods 10 to 13 (18:00 - 22:00) are event-only periods:
  * P10: 18:00 - 19:00 (6 PM - 7 PM)
  * P11: 19:00 - 20:00 (7 PM - 8 PM)
  * P12: 20:00 - 21:00 (8 PM - 9 PM)
  * P13: 21:00 - 22:00 (9 PM - 10 PM)
- Days: MON, TUE, WED, THU, FRI, SAT.
- "Kal" in booking contexts means tomorrow (resolve to the next realistic weekday).
- Rooms:
  * AUD: Main Auditorium (500, accessible, projector, pa_system, stage, ac)
  * LH-1 to LH-6: Lecture Halls (120 - 200, ac, projector)
  * SH-1: Seminar Hall 1 (150, ground floor, accessible, projector, pa_system, stage, ac)
  * SH-2: Seminar Hall 2 (100, 1st floor NO LIFT, NOT accessible!)
  * OAT: Open Air Theatre (800, outdoor)
  * CS-LAB-1, CS-LAB-2: Computing labs (90, computers, projector, ac)
  * ELEC-LAB-1, ELEC-LAB-2: Electronics labs (80, power_benches, projector)
  * MECH-WS: Central Workshop (90, power_benches)
  * CIVIL-LAB: Civil Engineering Lab (60)
- Physical Conflict & Sanity Checks:
  * If the requester asks for SH-2 with wheelchair accessibility, flag the conflict: SH-2 has no lift, recommend SH-1 instead.
  * If the requester asks for >800 people, flag that the largest venue seats 800.
  * If details are vague ("after lunch", "maybe 150 people"), provide a follow_up_question.
"""

def parse_booking_request(text: str, api_key: Optional[str] = None) -> ParsedBooking:
    """
    Parses natural language / Hinglish booking text.
    Uses Gemini API if key is available, else falls back cleanly to the rule parser.
    """
    key = api_key or os.environ.get("GEMINI_API_KEY")
    if not key:
        return parse_booking_rule_based(text)
        
    try:
        from google import genai
        from google.genai import types
        
        client = genai.Client(api_key=key)
        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=f"Parse this booking request:\n\n{text}",
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=ParsedBooking,
                temperature=0.1
            )
        )
        # Parse into Pydantic model
        import json
        data = json.loads(response.text)
        return ParsedBooking(**data)
    except Exception as e:
        print(f"[Notice] Gemini response delay / error ({e}). Switched instantly to deterministic fallback parser.")
        return parse_booking_rule_based(text)
