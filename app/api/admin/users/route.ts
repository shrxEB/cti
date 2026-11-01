import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDbClient, DEMO_ACCOUNTS } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const sql = getDbClient();
  if (sql) {
    try {
      const users = await sql`
        SELECT id, name, email, role, department, created_at, last_login_at
        FROM users
        ORDER BY id ASC
      `;
      return NextResponse.json({ success: true, users, source: "neon" });
    } catch (e) {
      console.warn("Neon query failed:", e);
    }
  }

  // Fallback demo list
  const fallback = DEMO_ACCOUNTS.map((acc, index) => ({
    id: index + 1,
    name: acc.name,
    email: acc.email,
    role: acc.role,
    department: acc.department,
    created_at: new Date().toISOString(),
    last_login_at: null,
  }));

  return NextResponse.json({ success: true, users: fallback, source: "memory" });
}

