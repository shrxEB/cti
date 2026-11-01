import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

function runPythonParse(text: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonBin = path.join(process.cwd(), "venv", "bin", "python");
    const script = `
import sys, json
raw_input = sys.argv[1]
from gemini_parser import parse_booking_request
parsed = parse_booking_request(raw_input)
print(json.dumps(parsed.model_dump()))
`;

    const py = spawn(pythonBin, ["-c", script, text], {
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
        resolve({ error: "No json output" });
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
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

    // Try HTTP endpoint first
    try {
      const response = await fetch(`${pythonBackendUrl}/api/ai/parse-booking`, {
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
      // Fall through to direct python engine execution
    }

    // Direct invocation fallback
    const result = await runPythonParse(body.text || "");
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI parse-booking error:", error);
    return NextResponse.json({ error: "Failed to connect to AI parsing engine" }, { status: 500 });
  }
}
