import { NextRequest, NextResponse } from "next/server";
import { initDatabase, resetDemoDatabase, isNeonConfigured, DEMO_ACCOUNTS } from "@/lib/db";
import { getSession } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function GET() {
  const result = await initDatabase();
  return NextResponse.json({
    neonConfigured: isNeonConfigured(),
    status: result.status,
    message: result.message,
    demoAccounts: DEMO_ACCOUNTS.map((d) => ({
      name: d.name,
      email: d.email,
      role: d.role,
      department: d.department,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    // Only logged in admin or initial setup can trigger reset
    const body = await req.json().catch(() => ({}));
    const action = body.action || "init";

    if (action === "reset") {
      if (session && session.role !== "admin") {
        return NextResponse.json(
          { success: false, error: "Only Admin (Dean's Office) can reset the demo dataset." },
          { status: 403 }
        );
      }
      const resetResult = await resetDemoDatabase();

      // Reset dynamic requests and disruption files back to pristine demo state
      try {
        const REQUESTS_FILE = path.join(process.cwd(), "exports", "academic_requests.json");
        const EXAMS_STORE_FILE = path.join(process.cwd(), "exports", "exam_invigilations.json");
        if (fs.existsSync(REQUESTS_FILE)) {
          fs.unlinkSync(REQUESTS_FILE);
        }
        if (fs.existsSync(EXAMS_STORE_FILE)) {
          fs.unlinkSync(EXAMS_STORE_FILE);
        }
      } catch (fileErr) {
        console.warn("Resetting export files note:", fileErr);
      }

      return NextResponse.json(resetResult);
    }

    const initResult = await initDatabase();
    return NextResponse.json({ success: true, ...initResult });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

