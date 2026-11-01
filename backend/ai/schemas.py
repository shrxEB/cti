"""
Pydantic Schemas for AI Information Extraction in CIT Campus Scheduling.
Strictly adheres to official CIT starter pack and validator requirements.
"""
from typing import List, Optional
from pydantic import BaseModel, Field

class BookingWindow(BaseModel):
    day: str = Field(description="Weekday in uppercase: MON, TUE, WED, THU, FRI, or SAT")
    from_period: int = Field(description="Starting period (1 to 13)")
    to_period: int = Field(description="Ending period (1 to 13)")

class ParsedBooking(BaseModel):
    attendance: int = Field(description="Estimated number of attendees / participants")
    duration_periods: int = Field(description="Duration in 1-hour periods (e.g. 2 hours -> 2)")
    windows: List[BookingWindow] = Field(description="One or more feasible time windows for the booking")
    room_types: List[str] = Field(
        description="Allowed room types: classroom, lecture_hall, auditorium, seminar_hall, outdoor, lab_cs, lab_elec, lab_phy, workshop, lab_civil"
    )
    needs: List[str] = Field(
        default_factory=list,
        description="Equipment/features needed: projector, pa_system, stage, ac, computers, power_benches, accessible"
    )
    requested_room: Optional[str] = Field(
        None,
        description="Specific room ID wished by the user if mentioned (e.g. AUD, LH-1, SH-1, CS-LAB-1), else null"
    )
    mandatory_for_groups: List[str] = Field(
        default_factory=list,
        description="Student group IDs for whom attendance is compulsory (e.g. ['ECE-3'], ['CSE-2'])"
    )
    conflicts_or_warnings: List[str] = Field(
        default_factory=list,
        description="Any physical or logical contradiction detected (e.g. SH-2 lacks wheelchair accessibility, attendance exceeds 800)"
    )
    follow_up_question: Optional[str] = Field(
        None,
        description="Clarification question if the request is underspecified or ambiguous (e.g. missing time window, vague count)"
    )
