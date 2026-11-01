import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, updateLastLogin } from "@/lib/db";
import { createSessionToken, verifyPassword, AUTH_COOKIE_NAME, UserRole } from "@/lib/auth";

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
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Please provide both email and password." },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or user not found." },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Incorrect password. Please verify and try again." },
        { status: 401 }
      );
    }

    const sessionPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    };

    const token = await createSessionToken(sessionPayload);
    await updateLastLogin(user.id);

    const redirectUrl = getRedirectPath(user.role);

    const response = NextResponse.json({
      success: true,
      user: sessionPayload,
      redirectUrl,
      message: `Welcome back, ${user.name}!`,
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
    console.error("Login API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during authentication." },
      { status: 500 }
    );
  }
}
