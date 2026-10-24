"use client";
import { useActionState, useState } from "react";
import { authenticate } from "@/app/actions/auth";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [state, action, pending] = useActionState(authenticate, undefined);

  return (
    <main className="mx-auto mt-24 max-w-sm p-6">
      <h1 className="mb-1 text-2xl font-bold">Lost &amp; Found</h1>
      <p className="mb-6 text-sm text-gray-500">{mode === "login" ? "Log in to continue" : "Create an account"}</p>
      <form action={action} className="space-y-3">
        <input type="hidden" name="mode" value={mode} />
        {mode === "signup" && (
          <input name="full_name" placeholder="Full name" required className="w-full rounded border p-2" />
        )}
        <input name="email" type="email" placeholder="Email" required className="w-full rounded border p-2" />
        <input name="password" type="password" placeholder="Password (8+ chars)" required className="w-full rounded border p-2" />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.message && <p className="text-sm text-green-600">{state.message}</p>}
        <button disabled={pending} className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-50">
          {pending ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>
      <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="mt-4 text-sm text-blue-600">
        {mode === "login" ? "No account? Sign up" : "Have an account? Log in"}
      </button>
    </main>
  );
}