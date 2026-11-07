
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  LockKeyhole,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Award,
  Loader2,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed.");
        return;
      }

      router.replace("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fffaf7] px-4 py-10 text-[#241000]">
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-orange-200/40 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-orange-300/30 blur-[100px]" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_25px_80px_rgba(74,32,8,0.10)] md:grid-cols-2">

        <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#241000] via-[#49200c] to-[#9a3d0b] p-10 text-white md:flex">
          <div className="absolute -right-20 top-20 h-64 w-64 rounded-full border border-white/10" />
          <div className="absolute -right-10 top-32 h-44 w-44 rounded-full border border-white/10" />

          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500">
              <Award size={27} />
            </div>
            <div>
              <p className="text-lg font-bold">Certificate Studio</p>
              <p className="text-xs text-orange-200">Certificate Management System</p>
            </div>
          </div>

          <div className="relative space-y-5">
            <span className="rounded-full border border-orange-300/30 bg-orange-300/10 px-4 py-2 text-xs font-medium text-orange-200">
              ADMINISTRATION PORTAL
            </span>

            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              Create. Manage.
              <br />
              <span className="text-orange-400">Celebrate.</span>
            </h1>

            <p className="max-w-sm text-sm leading-7 text-orange-100/75">
              A smarter way to manage events, design certificates and
              deliver recognition to every participant.
            </p>
          </div>

          <p className="relative text-xs text-orange-200/60">
            © 2026 Certificate Studio. All rights reserved.
          </p>
        </section>

        <section className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-14">
          <div className="mb-9">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#EA580C] md:hidden">
              <Award size={30} />
            </div>

            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#EA580C]">
              <ShieldCheck size={26} />
            </div>

            <h2 className="text-3xl font-bold tracking-tight">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-stone-500">
              Sign in to access your administration dashboard.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Email address</label>
              <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-[#fffdfb] px-4 transition focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10">
                <Mail size={18} className="text-stone-400" />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">Password</label>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-[#fffdfb] px-4 transition focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10">
                <LockKeyhole size={18} className="text-stone-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-stone-400 hover:text-[#EA580C]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-[#c94b09] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in to dashboard
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-stone-400">
            <LockKeyhole size={13} />
            Secure administrator access
          </div>
        </section>
      </div>
    </main>
  );
}
