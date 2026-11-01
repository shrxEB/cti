"""
Interactive CLI Tester for CIT AI Scheduling Assistant & Booking Parser.
Allows testing natural language booking, Hinglish requests, decision explanations,
and room queries directly from the terminal without needing the frontend!
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load env variables
load_dotenv()

sys.path.append(str(Path(__file__).parent / "backend" / "ai"))
sys.path.append(str(Path(__file__).parent / "backend" / "engine"))

from gemini_parser import parse_booking_request
from assistant import assistant

def print_banner():
    print("=" * 65)
    print("🎓 CIT AI CAMPUS SCHEDULING & BOOKING ASSISTANT (CLI TESTER)")
    print("=" * 65)
    print("Commands you can test:")
    print(" 1. Booking in English or Hinglish:")
    print("    e.g. 'seminar hall kal shaam 6 baje, 2 ghante, 100 log, mic chahiye'")
    print("    e.g. 'Need a room for 45 people on Tuesday 6 to 8 pm, projector please'")
    print(" 2. Ask why a request was rejected/modified:")
    print("    e.g. 'Why was BR-09 rejected?'")
    print("    e.g. 'Why did BR-07 get an alternative?'")
    print(" 3. Find available rooms:")
    print("    e.g. 'Find an available computer lab on Thursday afternoon'")
    print(" Type 'quit' or 'exit' to stop.")
    print("=" * 65)

def main():
    print_banner()
    while True:
        try:
            query = input("\n[You] > ").strip()
            if not query:
                continue
            if query.lower() in ("quit", "exit", "q"):
                print("Exiting AI tester. Have a great day!")
                break

            # If user asks why or finding a room -> Route to Assistant
            lower = query.lower()
            if any(k in lower for k in ["why", "reason", "karan", "find", "available", "khali", "free", "reschedule"]):
                reply = assistant.process_chat_message(query)
                print(f"\n[AI Assistant]\n{reply}")
            else:
                # Treat as booking parsing
                print("\n[AI Parsing Booking Request...]")
                parsed = parse_booking_request(query)
                print(parsed.model_dump_json(indent=2))
        except (KeyboardInterrupt, EOFError):
            print("\nGoodbye!")
            break

if __name__ == "__main__":
    main()
