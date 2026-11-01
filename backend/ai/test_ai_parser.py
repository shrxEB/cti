"""
Automated Test Suite for the CIT AI Booking Parser.
Tests all 8 public practice requests from starter_pack/examples/sample_requests.md
"""
import json
from gemini_parser import parse_booking_request

SAMPLE_REQUESTS = [
    (1, "Need a room for 45 people on Tuesday 6 to 8 pm, projector please."),
    (2, "Book the auditorium for the CSE department farewell, Friday evening, around 400 people, need stage and mic."),
    (3, "Can I get a lab with computers for a 3-hour coding contest on Thursday afternoon? About 60 participants."),
    (4, "Our club meets every Monday and Wednesday 7 to 8 pm, 30 people, any small room is fine."),
    (5, "Mechanical third years need a 2 hour session with an industry speaker on Wednesday, it's compulsory for them."),
    (6, "seminar hall kal shaam 6 baje, 2 ghante, 100 log, mic chahiye"),
    (7, "I want SH-2 on Friday at 10 am for a wheelchair-accessible poster session, 60 people."),
    (8, "Need somewhere for the quiz finals after lunch on Thursday, maybe 150 people.")
]

def run_tests():
    print("=" * 70)
    print("RUNNING CIT AI BOOKING PARSER TESTS (sample_requests.md)")
    print("=" * 70)
    
    for req_num, prompt in SAMPLE_REQUESTS:
        print(f"\n[Test #{req_num}]: \"{prompt}\"")
        res = parse_booking_request(prompt)
        res_dict = res.model_dump()
        print("  -> Parsed Attendance:", res_dict["attendance"])
        print("  -> Duration (periods):", res_dict["duration_periods"])
        print("  -> Feasible Windows:", [(w["day"], f"P{w['from_period']}-P{w['to_period']}") for w in res_dict["windows"]])
        print("  -> Needs / Equipment:", res_dict["needs"])
        print("  -> Candidate Room Types:", res_dict["room_types"])
        if res_dict["mandatory_for_groups"]:
            print("  -> Mandatory for Groups:", res_dict["mandatory_for_groups"])
        if res_dict["conflicts_or_warnings"]:
            print("  -> [Constraint Alert]:", res_dict["conflicts_or_warnings"])
        if res_dict["follow_up_question"]:
            print("  -> [Clarification Question]:", res_dict["follow_up_question"])

if __name__ == "__main__":
    run_tests()
