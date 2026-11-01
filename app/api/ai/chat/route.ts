import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

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

    // Direct invocation fallback: Runs assistant.py directly through venv python
    const result = await runPythonChat(body.message, userContext);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI chat assistant error:", error);
    return NextResponse.json({
      reply: "The AI Assistant is currently processing your request. Please try again in a moment.",
      error: error?.message,
    });
  }
}
