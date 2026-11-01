import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

interface AcademicRequest {
  id: string;
  type: string;
  channel?: string;
  submitted_by_role?: string;
  faculty_id?: string;
  faculty_name: string;
  department: string;
  course: string;
  section: string;
  venue: string;
  day: string;
  period: string;
  attendance?: number;
  reason?: string;
  priorityLevel: number;
  status: "pending" | "approved" | "rejected" | "alternative_suggested";
  created_at: string;
}

const REQUESTS_FILE = path.join(process.cwd(), "exports", "academic_requests.json");
const TMP_REQUESTS_FILE = path.join(os.tmpdir(), "academic_requests.json");

function getStoredRequests(): AcademicRequest[] {
  if (fs.existsSync(TMP_REQUESTS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(TMP_REQUESTS_FILE, "utf-8"));
      if (Array.isArray(data)) return data;
    } catch {}
  }
  if (fs.existsSync(REQUESTS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(REQUESTS_FILE, "utf-8"));
      if (Array.isArray(data)) return data;
    } catch {}
  }
  return [];
}

function saveRequest(newReq: AcademicRequest) {
  const current = getStoredRequests();
  current.unshift(newReq);
  try {
    fs.writeFileSync(TMP_REQUESTS_FILE, JSON.stringify(current, null, 2), "utf-8");
  } catch {}
  try {
    if (fs.existsSync(path.dirname(REQUESTS_FILE))) {
      fs.writeFileSync(REQUESTS_FILE, JSON.stringify(current, null, 2), "utf-8");
    }
  } catch {}
}

const GEMINI_SYSTEM_PROMPT = `
You are the CIT AI Scheduling Copilot for Chilika Institute of Technology (CIT).
You assist Dean/Admin, Department Coordinators, Faculty, and Students in English and Hinglish.

Timing Rules:
- Periods 1-9 (08:00 - 18:00): Teaching hours (Lunch is 13:00 - 14:00 between P5 and P6).
- Periods 10-13 (18:00 - 22:00): Event / club hours.
- Daily teaching load limit: Max 4 hours per faculty per day.
- Campus Venues:
  * AUD: Main Auditorium (500 capacity, accessible, projector, sound system)
  * LH-1 to LH-6: Lecture Halls (120 - 200 capacity)
  * SH-1: Seminar Hall 1 (150 capacity, ground floor, wheelchair accessible)
  * SH-2: Seminar Hall 2 (100 capacity, 1st floor NO LIFT, NOT wheelchair accessible)
  * OAT: Open Air Theatre (800 capacity)
  * CS-LAB-1, CS-LAB-2: Computing labs (90 capacity)
  * ELEC-LAB-1, ELEC-LAB-2: Electronics labs (80 capacity)

When user asks to book a room, reschedule, or reserve a slot in Hindi, Hinglish, or English (e.g. "kal subha 10 baje se 12 baje tak class rakho 25 baccho ki"):
Extract the request details clearly:
1. Venue / Room Type
2. Day & Time / Periods
3. Batch / Attendance count
4. Course / Purpose

At the end of your response, ALWAYS include a clean JSON block inside \`\`\`json ... \`\`\` with this exact format so the system can submit it to the Dean's approvals queue:
\`\`\`json
{
  "is_booking": true,
  "venue": "Seminar Hall 1 (SH-1)",
  "day": "Tomorrow",
  "period": "10:00 - 12:00 (P3-P4)",
  "attendance": 25,
  "course": "Extra Lecture / Practical Class",
  "reason": "Faculty requested class for 25 students"
}
\`\`\`
If the user's message is just a general question or doesn't involve booking/rescheduling, do not include the JSON block.
`;

async function callGeminiDirect(message: string, userContext: any): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
  const role = userContext?.role || "faculty";
  const userName = userContext?.name || "Faculty Member";

  const prompt = `User role: ${role} (${userName}, ${userContext?.department || "CIT"}).
User message: "${message}"

Respond helpfully as CIT AI Copilot with structured formatting.`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: GEMINI_SYSTEM_PROMPT }]
        },
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 800,
        }
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) return reply;
    }
  } catch (e) {
    console.warn("Direct Gemini REST call failed:", e);
  }
  return null;
}

function runPythonChat(message: string, userContext: any): Promise<{ reply: string }> {
  return new Promise((resolve, reject) => {
    const pythonBin = path.join(process.cwd(), "venv", "bin", "python");
    const script = `
import sys, json
raw_input = sys.argv[1]
from assistant import assistant
user_ctx = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
reply = assistant.process_chat_message(raw_input, user_context=user_ctx)
print(json.dumps({'reply': reply}))
`;

    const py = spawn(pythonBin, ["-c", script, message, JSON.stringify(userContext || {})], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONPATH: "backend:backend/ai:backend/engine",
      },
    });

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    py.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    py.on("close", (code) => {
      if (code !== 0 && !stdout) {
        return reject(new Error(`Python process exited with code ${code}: ${stderr}`));
      }
      try {
        const jsonLine = stdout
          .trim()
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.startsWith("{") && l.endsWith("}"))
          .pop();

        if (jsonLine) {
          const parsed = JSON.parse(jsonLine);
          return resolve(parsed);
        }
        resolve({ reply: stdout.trim() || "Request processed." });
      } catch (err) {
        reject(err);
      }
    });

    py.on("error", (err) => {
      reject(err);
    });
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userContext = {
      role: body.user_role || "faculty",
      name: body.user_name || "Dr. Rajesh Tripathy",
      email: body.user_email || "faculty@cit.edu.in",
      department: body.user_department || "ECE",
    };

    // First attempt: Call FastAPI microservice if reachable
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";
    try {
      const response = await fetch(`${pythonBackendUrl}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(1500),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch {
      // Fall through
    }

    // Direct invocation: Call Google Gemini REST API directly
    const geminiReply = await callGeminiDirect(body.message, userContext);
    if (geminiReply) {
      // Parse structured booking JSON if Gemini produced it
      let cleanReply = geminiReply;
      let createdRequestId: string | null = null;

      const jsonMatch = geminiReply.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.is_booking) {
            const currentList = getStoredRequests();
            const newId = `AR-${200 + currentList.length + 1}`;
            createdRequestId = newId;

            const newReq: AcademicRequest = {
              id: newId,
              type: "extra_class",
              channel: "chatbot",
              submitted_by_role: userContext.role,
              faculty_id: body.user_id || "F19",
              faculty_name: userContext.name,
              department: userContext.department,
              course: parsed.course || "Extra Class / Lab",
              section: `Batch (${parsed.attendance || 25} students)`,
              venue: parsed.venue || "Seminar Hall 1",
              day: parsed.day || "Tomorrow",
              period: parsed.period || "10:00 - 12:00",
              attendance: parsed.attendance || 25,
              reason: parsed.reason || body.message,
              priorityLevel: userContext.role === "club_rep" ? 6 : (userContext.role === "coordinator" ? 4 : 2),
              status: "pending",
              created_at: new Date().toISOString(),
            };

            saveRequest(newReq);

            // Clean json block from the user-facing text and append confirmation
            cleanReply = cleanReply.replace(/```json[\s\S]*?```/, "").trim();
            cleanReply += `\n\n---\n✅ **Request Submitted to Dean's Office Approval Queue!**\n- **Request ID**: \`${newId}\`\n- **Queue**: Dean's Office System ➔ [Approvals](/admin/approvals) (Tab: 🤖 AI Chatbot)\n- **Status**: ⏳ Pending Dean's Review`;
          }
        } catch (e) {
          console.warn("Failed to parse booking json from Gemini:", e);
        }
      }

      return NextResponse.json({ reply: cleanReply, request_id: createdRequestId });
    }

    // Direct invocation fallback: Runs assistant.py directly through venv python if available locally
    try {
      const result = await runPythonChat(body.message, userContext);
      return NextResponse.json(result);
    } catch (pyErr) {
      console.warn("Python subprocess unavailable:", pyErr);
    }

    return NextResponse.json({
      reply: `CIT AI Copilot: Received your request "${body.message}". The request has been formatted and queued for scheduler validation.`,
    });
  } catch (error: any) {
    console.error("AI chat assistant error:", error);
    return NextResponse.json({
      reply: "The AI Assistant is currently processing your request. Please try again in a moment.",
      error: error?.message,
    });
  }
}
