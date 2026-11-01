"""
FastAPI Server connecting the Next.js Frontend to the Python Scheduling & AI Assistant.
Provides REST endpoints with CORS enabled for seamless local development.
"""
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
from pathlib import Path

# Engine & AI imports
import sys
sys.path.append(str(Path(__file__).parent / "engine"))
sys.path.append(str(Path(__file__).parent / "ai"))

from assistant import assistant
from gemini_parser import parse_booking_request
from audio_parser import parse_audio_booking
from rescheduler import apply_disruption, solve_reschedule
from data_loader import load_dataset

app = FastAPI(
    title="CIT Scheduling & Venue Management API",
    description="Backend services for timetable optimization, AI booking parsing, and conversational assistance",
    version="1.0.0"
)

# Enable CORS for Next.js frontend (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    user_role: Optional[str] = "faculty"
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_department: Optional[str] = None

class BookingParseRequest(BaseModel):
    text: str

class RescheduleRequest(BaseModel):
    faculty_id: Optional[str] = None
    room_id: Optional[str] = None
    days: List[str] = []
    periods: List[int] = []
    reason: str = "Unavailability reported"

@app.get("/")
def health_check():
    return {"status": "ok", "service": "CIT Campus Scheduling API"}

@app.get("/api/schedule")
def get_current_schedule():
    """Returns the baseline schedule with all 189 sessions, exams, and fest bookings."""
    schedule_path = Path("exports/schedule.json")
    if not schedule_path.exists():
        raise HTTPException(status_code=404, detail="Schedule not yet generated.")
    with open(schedule_path, "r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/api/schedule/after")
def get_disrupted_schedule():
    """Returns the schedule_after.json showing the minimal perturbation repaired schedule."""
    schedule_path = Path("exports/schedule_after.json")
    if not schedule_path.exists():
        raise HTTPException(status_code=404, detail="Disrupted schedule not yet generated.")
    with open(schedule_path, "r", encoding="utf-8") as f:
        return json.load(f)

@app.post("/api/ai/parse-booking")
def parse_booking(req: BookingParseRequest):
    """Parses natural English / Hinglish booking queries into structured fields."""
    parsed = parse_booking_request(req.text)
    return parsed.model_dump()

@app.post("/api/ai/parse-audio")
async def parse_audio(file: UploadFile = File(...)):
    """Receives voice audio recording from user mic, transcribes and extracts booking JSON."""
    contents = await file.read()
    mime = file.content_type or "audio/webm"
    parsed = parse_audio_booking(contents, mime_type=mime)
    return parsed.model_dump()

@app.post("/api/ai/chat")
def chat_with_assistant(req: ChatRequest):
    """Conversational assistant handling decision explanations, room search, and scheduling queries."""
    user_context = {
        "role": req.user_role or "faculty",
        "name": req.user_name,
        "email": req.user_email,
        "department": req.user_department
    }
    response_text = assistant.process_chat_message(req.message, user_context=user_context)
    return {"reply": response_text}

@app.get("/api/ai/explain/{request_id}")
def explain_decision_endpoint(request_id: str):
    """Explains why a specific Spectra booking request was approved, rejected, or modified."""
    explanation = assistant.explain_request_decision(request_id)
    return {"request_id": request_id, "explanation": explanation}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
