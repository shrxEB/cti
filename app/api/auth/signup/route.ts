import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/db";
import { createSessionToken, AUTH_COOKIE_NAME, UserRole } from "@/lib/auth";

function getRedirectPath(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "coordinator":
      return "/coordinator";
    case "faculty":
      return "/faculty";
    case "club_rep":
      return "/club";
    default:
      return "/";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, role, department } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Please provide your full name." },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid institutional email address." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const validRoles: UserRole[] = ["admin", "coordinator", "faculty", "club_rep"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Please select a valid institutional role." },
        { status: 400 }
      );
    }

    const result = await createUser({
      name,
      email,
      password,
      role,
      department: department || null,
    });

    if (!result.success || !result.user) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to create account." },
        { status: 400 }
      );
    }

    const sessionPayload = {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
      department: result.user.department,
    };

    const token = await createSessionToken(sessionPayload);
    const redirectUrl = getRedirectPath(result.user.role);

    const response = NextResponse.json({
      success: true,
      user: sessionPayload,
      redirectUrl,
      message: `Account created successfully! Welcome, ${result.user.name}.`,
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error("Signup API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during account creation." },
      { status: 500 }
    );
  }
}

