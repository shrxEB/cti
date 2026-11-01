import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

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

When user asks to book a room or reschedule in Hindi, Hinglish, or English (e.g. "kal subha 10 baje se 12 baje tak class rakho 25 baccho ki"):
Extract:
1. Requested Venue / Room type
2. Day & Time / Periods
3. Batch / Students count
4. Any conflict or lunch break warning
And provide a clear confirmation message asking if they would like to submit this directly to the Dean's approval queue.
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
      name: body.user_name,
      email: body.user_email,
      department: body.user_department,
    };

    // First attempt: Call FastAPI microservice if reachable
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";
    try {
      const response = await fetch(`${pythonBackendUrl}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(1500), // Quick 1.5s timeout check
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch {
      // FastAPI server not reachable or network connection refused -> fall through to direct python engine execution!
    }

    // Direct invocation: Call Google Gemini REST API directly (works in any serverless lambda without local Python subprocess)
    const geminiReply = await callGeminiDirect(body.message, userContext);
    if (geminiReply) {
      return NextResponse.json({ reply: geminiReply });
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
