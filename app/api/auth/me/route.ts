import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isNeonConfigured } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  const dbConfigured = isNeonConfigured();

  if (!session) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      isNeonConnected: dbConfigured,
    });
  }

  return NextResponse.json({
    authenticated: true,
    user: session,
    isNeonConnected: dbConfigured,
  });
}

