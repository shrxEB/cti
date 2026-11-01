"""
Decision Explainer Module for CIT Scheduling & Venue Management.
Translates deterministic backend solver results, rejections, and priority inversions
into polite, clear, institutional explanations and alternatives.
"""
from typing import Dict, Any, Optional

def explain_decision(
    booking_decision: Dict[str, Any],
    original_request: Dict[str, Any]
) -> str:
    status = booking_decision.get("status")
    req_id = booking_decision.get("request_id", "")
    title = original_request.get("title", "Event")
    requester = original_request.get("requester", "Requester")
    att = original_request.get("attendance", 0)
    
    if status == "approved":
        room = booking_decision.get("room_id")
        day = booking_decision.get("day")
        start = booking_decision.get("start_period")
        end = booking_decision.get("end_period")
        return (
            f"✅ Booking Confirmed for '{title}'!\n"
            f"Venue: {room}\n"
            f"Slot: {day}, Periods P{start}–P{end} (18:00 onwards)\n"
            f"Confirmed Capacity: {att} attendees. Required facilities have been reserved."
        )
        
    elif status == "alternative_offered":
        room = booking_decision.get("room_id")
        day = booking_decision.get("day")
        start = booking_decision.get("start_period")
        end = booking_decision.get("end_period")
        reason = booking_decision.get("reason", "")
        return (
            f"ℹ️ Alternative Slot Offered for '{title}':\n"
            f"Your requested window could not be allocated directly ({reason}).\n"
            f"Proposed Alternative Venue: {room} on {day}, Periods P{start}–P{end}.\n"
            f"Please review and confirm if this alternative suits your schedule."
        )
        
    elif status == "rejected":
        reason = booking_decision.get("reason", "Venue unavailable due to higher priority events")
        return (
            f"❌ Booking Request Declined for '{title}':\n"
            f"Reason: {reason}.\n"
            f"Per CIT Policy, events are prioritized by: Exams > Regular Classes > Institute Events > Guest Lectures > Department Events > Club Events.\n"
            f"You may submit a revised request for an open slot or alternate date."
        )
        
    return f"Status: {status} for request {req_id}"
