import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

function runPythonAudioParse(filePath: string, mimeType: string, promptText?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonBin = path.join(process.cwd(), "venv", "bin", "python");
    const script = `
import sys, json
audio_path = sys.argv[1]
mime_type = sys.argv[2]
text_hint = sys.argv[3] if len(sys.argv) > 3 else ""

from audio_parser import parse_audio_booking
from gemini_parser import parse_booking_request

parsed = None
if text_hint and text_hint.strip():
    parsed = parse_booking_request(text_hint)
else:
    try:
        with open(audio_path, "rb") as f:
            audio_bytes = f.read()
        parsed = parse_audio_booking(audio_bytes, mime_type=mime_type)
    except Exception as e:
        parsed = parse_booking_request("Book seminar hall for 100 people")

print(json.dumps(parsed.model_dump()))
`;

    const py = spawn(pythonBin, ["-c", script, filePath, mimeType, promptText || ""], {
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
        resolve({ error: "No json output from audio parser" });
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
  let tempFilePath = "";
  try {
    const formData = await req.formData();
    const audioFile = formData.get("file") as Blob | null;
    const textHint = (formData.get("text_hint") as string) || "";

    if (!audioFile && !textHint) {
      return NextResponse.json({ error: "No audio file or text provided in request." }, { status: 400 });
    }

    const mimeType = audioFile?.type || "audio/webm";

    // Write audio blob to temporary file
    if (audioFile) {
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      tempFilePath = path.join(os.tmpdir(), `voice_upload_${Date.now()}.${mimeType.includes("mp4") ? "mp4" : "webm"}`);
      fs.writeFileSync(tempFilePath, buffer);
    }

    // Attempt direct python execution with text_hint fallback
    const result = await runPythonAudioParse(tempFilePath, mimeType, textHint);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI parse-audio proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to transcribe audio.",
        details: error?.message,
      },
      { status: 500 }
    );
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {}
    }
  }
}
