import { NextRequest, NextResponse } from "next/server";
import { initDatabase, resetDemoDatabase, isNeonConfigured, DEMO_ACCOUNTS } from "@/lib/db";
import { getSession } from "@/lib/auth";

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

