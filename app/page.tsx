"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Building2,
  GraduationCap,
  Sparkles,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type AuthMode = "signin" | "signup";
type UserRole = "admin" | "coordinator" | "faculty" | "club_rep";

const DEMO_PRESETS = [
  {
    role: "admin" as const,
    label: "Admin (Dean's Office)",
    name: "Prof. Alok Sharma",
    email: "admin@cit.edu.in",
    password: "citadmin2026",
    color: "from-[#064e43] to-[#047857]",
    icon: ShieldCheck,
    destination: "/admin",
  },
  {
    role: "coordinator" as const,
    label: "Dept Coordinator",
    name: "Dr. Sunita Mohanty",
    email: "coordinator.cse@cit.edu.in",
    password: "citcoord2026",
    color: "from-[#0284c7] to-[#38bdf8]",
    icon: Building2,
    destination: "/coordinator",
  },
  {
    role: "faculty" as const,
    label: "Faculty",
    name: "Dr. Rajesh Tripathy",
    email: "faculty.ece@cit.edu.in",
    password: "citfaculty2026",
    color: "from-[#16a34a] to-[#4ade80]",
    icon: GraduationCap,
    destination: "/faculty",
  },
  {
    role: "club_rep" as const,
    label: "Club Representative",
    name: "Priyansh Verma",
    email: "club.spectra@cit.edu.in",
    password: "citclub2026",
    color: "from-[#ea580c] to-[#fb923c]",
    icon: Sparkles,
    destination: "/club",
  },
];

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");

  // Sign In fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Sign Up fields
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpRole, setSignUpRole] = useState<UserRole>("faculty");
  const [signUpDept, setSignUpDept] = useState("Computer Science & Engineering");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            const role = data.user.role;
            router.push(
              role === "admin"
                ? "/admin"
                : role === "coordinator"
                ? "/coordinator"
                : role === "faculty"
                ? "/faculty"
                : "/club"
            );
            return;
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkSession();
  }, [router]);

  const handleSignIn = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    const loginEmail = customEmail || email;
    const loginPass = customPass || password;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Authentication failed.");
        setLoading(false);
      } else {
        router.push(data.redirectUrl || "/");
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signUpName,
          email: signUpEmail,
          password: signUpPassword,
          role: signUpRole,
          department: signUpDept,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to create account.");
        setLoading(false);
      } else {
        setSuccessMsg("Account created! Redirecting to your dashboard...");
        setTimeout(() => {
          router.push(data.redirectUrl || "/");
          router.refresh();
        }, 600);
      }
    } catch {
      setError("Network error while creating account.");
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faf9]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#064e43]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-between">
      {/* Decorative top bar in forest teal */}
      <div className="h-2 bg-gradient-to-r from-[#064e43] via-[#047857] to-[#fde047]" />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Branding & Demo Cards */}
          <div className="lg:col-span-6 space-y-7">
            {/* Brand Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#064e43] flex items-center justify-center shadow-md">
                <Sparkles className="w-6 h-6 text-[#fde047]" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-[#0f172a] tracking-tight leading-tight">
                  CIT Schedule
                </h1>
                <p className="text-sm text-[#64748b] font-medium">Dean&apos;s Office Campus System</p>
              </div>
            </div>

            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f172a] leading-tight tracking-tight">
                Full Scheduling &amp;<br />Conflict Authority
              </h2>
              <p className="mt-3 text-[#64748b] text-sm leading-relaxed max-w-md">
                Chilika Institute of Technology platform for clash-free semester timetables, midsem exam allocations,
                and Spectra Tech Fest venue reservations across all 4 authorized roles.
              </p>
            </div>

            {/* Select Role Profile & Enter Credentials */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  Select Profile to Sign In
                </p>
                <span className="text-[11px] font-bold text-[#064e43]">4 Registered Roles</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DEMO_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = email === preset.email;
                  return (
                    <button
                      key={preset.role}
                      type="button"
                      onClick={() => {
                        setEmail(preset.email);
                        setPassword("");
                        setError(null);
                        setSuccessMsg(null);
                        setMode("signin");
                      }}
                      className={`group relative p-3.5 rounded-2xl bg-white border transition-all text-left cursor-pointer ${
                        isSelected
                          ? "border-[#064e43] ring-2 ring-[#064e43]/20 shadow-md bg-emerald-50/20"
                          : "border-[#e2e8f0] hover:border-gray-300 hover:shadow-xs"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${preset.color} flex items-center justify-center text-white`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        {isSelected ? (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#064e43] text-white">
                            Selected
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-gray-400 group-hover:text-[#064e43] transition-colors">
                            Select &rarr;
                          </span>
                        )}
                      </div>
                      <div className="text-[12.5px] font-bold text-gray-800">{preset.label}</div>
                      <div className="text-[11px] text-gray-500 font-medium">{preset.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{preset.email}</div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-400 mt-2 italic">
                * Click a profile above to populate your institutional ID, then enter your password on the right to sign in.
              </p>
            </div>
          </div>

          {/* Right: Auth Card (Sign In / Sign Up) */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-[28px] border border-[#e2e8f0] shadow-xl shadow-gray-200/50 p-6 sm:p-8">
              {/* Tab Switcher */}
              <div className="flex p-1 bg-gray-100/80 rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    mode === "signin"
                      ? "bg-[#fde047] text-[#0f172a] shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    mode === "signup"
                      ? "bg-[#fde047] text-[#0f172a] shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Create Account (Sign Up)
                </button>
              </div>

              {/* Header Info */}
              <div className="mb-5">
                <h3 className="text-xl font-extrabold text-[#0f172a]">
                  {mode === "signin" ? "Sign in to your account" : "Create your CIT account"}
                </h3>
                <p className="text-xs text-[#64748b] mt-1">
                  {mode === "signin"
                    ? "Enter your institutional credentials to access your portal"
                    : "Register your profile and role in the Neon database"}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* MODE 1: SIGN IN */}
              {mode === "signin" && (
                <form onSubmit={(e) => handleSignIn(e)} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@cit.edu.in"
                        className="w-full bg-[#f8fafc] border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#064e43] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-[#f8fafc] border border-gray-200 rounded-2xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#064e43] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-full font-bold text-xs sm:text-sm text-[#0f172a] bg-[#fde047] hover:bg-[#facc15] shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In to Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center">
                    <p className="text-xs text-gray-500">
                      Don&apos;t have an account yet?{" "}
                      <button
                        type="button"
                        onClick={() => setMode("signup")}
                        className="font-bold text-[#064e43] hover:underline"
                      >
                        Create Account
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* MODE 2: SIGN UP */}
              {mode === "signup" && (
                <form onSubmit={handleSignUp} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={signUpName}
                        onChange={(e) => setSignUpName(e.target.value)}
                        placeholder="e.g. Dr. Ananya Mishra"
                        className="w-full bg-[#f8fafc] border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#064e43] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Institutional Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        placeholder="e.g. ananya@cit.edu.in"
                        className="w-full bg-[#f8fafc] border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#064e43] transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Select Role
                      </label>
                      <select
                        value={signUpRole}
                        onChange={(e) => setSignUpRole(e.target.value as UserRole)}
                        className="w-full bg-[#f8fafc] border border-gray-200 rounded-2xl px-3 py-2.5 text-xs sm:text-sm text-gray-800 focus:outline-none focus:border-[#064e43]"
                      >
                        <option value="faculty">Faculty Member</option>
                        <option value="coordinator">Dept Coordinator</option>
                        <option value="club_rep">Club Representative</option>
                        <option value="admin">Admin (Dean&apos;s Office)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Department / Unit
                      </label>
                      <input
                        type="text"
                        value={signUpDept}
                        onChange={(e) => setSignUpDept(e.target.value)}
                        placeholder="e.g. Computer Science"
                        className="w-full bg-[#f8fafc] border border-gray-200 rounded-2xl px-3 py-2.5 text-xs sm:text-sm text-gray-800 focus:outline-none focus:border-[#064e43]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Password (min 6 chars)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-[#f8fafc] border border-gray-200 rounded-2xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#064e43] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-full font-bold text-xs sm:text-sm text-[#0f172a] bg-[#fde047] hover:bg-[#facc15] shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Account &amp; Enter</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center">
                    <p className="text-xs text-gray-500">
                      Already registered?{" "}
                      <button
                        type="button"
                        onClick={() => setMode("signin")}
                        className="font-bold text-[#064e43] hover:underline"
                      >
                        Sign In here
                      </button>
                    </p>
                  </div>
                </form>
              )}

              <div className="mt-5 pt-4 border-t border-gray-100 text-center">
                <p className="text-[11px] text-[#64748b]">
                  Data stored securely in <span className="font-bold text-[#064e43]">Neon PostgreSQL</span> with bcrypt encryption.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
