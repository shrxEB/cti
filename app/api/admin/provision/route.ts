import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createUser } from "@/lib/db";
import { sendCredentialsEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only Admin (Dean's Office) can provision new accounts." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, recipientEmail, password, role, department, sendEmail = true } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Please enter the user's full name." }, { status: 400 });
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "Please provide a valid login email." }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    const validRoles = ["faculty", "club_rep", "coordinator"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Role must be Faculty, Club Representative, or Coordinator." },
        { status: 400 }
      );
    }

    // 1. Create account in Neon DB
    const dbResult = await createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
      department: department?.trim() || null,
    });

    if (!dbResult.success || !dbResult.user) {
      return NextResponse.json(
        { success: false, error: dbResult.error || "Failed to create user in database." },
        { status: 400 }
      );
    }

    // 2. Dispatch email to recipient
    const targetEmail = (recipientEmail || email).trim();
    let emailResult = null;

    if (sendEmail) {
      emailResult = await sendCredentialsEmail({
        toEmail: targetEmail,
        name: name.trim(),
        role,
        email: email.trim().toLowerCase(),
        password,
        department: department?.trim() || null,
      });
    }

    return NextResponse.json({
      success: true,
      user: dbResult.user,
      emailResult,
      message: `Account created successfully for ${name}. Credentials dispatched to ${targetEmail}.`,
    });
  } catch (error) {
    console.error("Provisioning error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || "Internal server error." },
      { status: 500 }
    );
  }
}

