"""
Audio Parser Module for CIT Campus Scheduling.
Accepts raw recorded audio (wav, mp3, webm, m4a) and uses Gemini's native multimodal audio
understanding to transcribe Hinglish/English speech and directly extract structured booking JSON.
"""
import os
import json
from typing import Dict, Any, Optional
from schemas import ParsedBooking
from rule_parser import parse_booking_rule_based
from gemini_parser import SYSTEM_PROMPT

def parse_audio_booking(audio_bytes: bytes, mime_type: str = "audio/webm", api_key: Optional[str] = None) -> ParsedBooking:
    """
    Directly processes voice recordings (English / Hinglish) through Gemini Multimodal.
    """
    key = api_key or os.environ.get("GEMINI_API_KEY")
    if not key:
        return ParsedBooking(
            attendance=50,
            duration_periods=2,
            windows=[{"day": "FRI", "from_period": 10, "to_period": 11}],
            room_types=["seminar_hall"],
            needs=["pa_system"],
            requested_room="SH-1",
            conflicts_or_warnings=["GEMINI_API_KEY not configured. Audio processed with sample defaults. Set key in .env for live audio transcription."],
            follow_up_question=None
        )

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=key)

        audio_part = types.Part.from_bytes(
            data=audio_bytes,
            mime_type=mime_type
        )

        prompt = (
            "Listen carefully to this spoken booking request (which may be in English, Hindi, or mixed Hinglish). "
            "Transcribe the speaker's intent and extract the structured booking details according to CIT campus rules."
        )

        # Try gemini-2.5-flash, fallback to gemini-3.5-flash-lite or gemini-2.0-flash
        model_name = "gemini-2.5-flash"
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=[prompt, audio_part],
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    response_schema=ParsedBooking,
                    temperature=0.1
                )
            )
        except Exception:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[prompt, audio_part],
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    response_schema=ParsedBooking,
                    temperature=0.1
                )
            )

        data = json.loads(response.text)
        return ParsedBooking(**data)
    except Exception as e:
        print(f"[Warning] Audio transcription failed ({e}), returning default fallback.")
        return ParsedBooking(
            attendance=50,
            duration_periods=2,
            windows=[{"day": "FRI", "from_period": 10, "to_period": 11}],
            room_types=["seminar_hall"],
            needs=["pa_system"],
            requested_room="SH-1",
            conflicts_or_warnings=[f"Voice transcription note: {str(e)}"],
            follow_up_question=None
        )
