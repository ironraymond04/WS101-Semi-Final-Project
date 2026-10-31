"use client";

import { useActionState, useState } from "react";
import { authenticate } from "@/app/actions/auth";

/* ---------- shared styles ---------- */
const field =
  "w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30";
const labelText = "mb-1.5 block text-sm font-medium text-neutral-200";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [state, action, pending] = useActionState(authenticate, undefined);
  const isLogin = mode === "login";

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-10 text-neutral-100">
      <main className="w-full max-w-sm">
        {/* ---------- Brand ---------- */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl shadow-lg shadow-blue-600/20">
            🔍
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">SPC Lost &amp; Found</h1>
          <p className="mt-1 text-sm text-neutral-400">
            {isLogin ? "Welcome Peterians. Log in to continue." : "Create an account to report or claim items."}
          </p>
        </div>

        {/* ---------- Card ---------- */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-sm sm:p-6">
          {/* Mode switch */}
          <div className="mb-5 grid grid-cols-2 rounded-lg border border-neutral-800 bg-neutral-950 p-1">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                suppressHydrationWarning
                className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  mode === m ? "bg-neutral-800 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {m === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          <form action={action} className="space-y-4">
            <input type="hidden" name="mode" value={mode} />

            {mode === "signup" && (
              <div>
                <label htmlFor="full_name" className={labelText}>Full name</label>
                <input
                  id="full_name"
                  name="full_name"
                  placeholder="Juan Dela Cruz"
                  autoComplete="name"
                  required
                  className={field}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className={labelText}>Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                className={field}
                suppressHydrationWarning
              />
            </div>

            <div>
              <label htmlFor="password" className={labelText}>Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="8+ characters"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  className={`${field} pr-16`}
                  suppressHydrationWarning
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  suppressHydrationWarning
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded px-2 py-1 text-xs font-medium text-neutral-400 transition hover:text-neutral-100 bg-black text-white"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {state?.error && (
              <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {state.error}
              </p>
            )}
            {state?.message && (
              <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                {state.message}
              </p>
            )}

            <button
              disabled={pending}
              suppressHydrationWarning
              className="w-full cursor-pointer rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Please wait…" : isLogin ? "Log in" : "Create account"}
            </button>
          </form>
        </div>

        {/* ---------- Footer toggle ---------- */}
        <p className="mt-5 text-center text-sm text-neutral-400">
          {isLogin ? "No account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(isLogin ? "signup" : "login")}
            suppressHydrationWarning
            className="cursor-pointer font-medium text-blue-400 transition hover:text-blue-300 hover:underline"
          >
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </p>
      </main>
    </div>
  );
}