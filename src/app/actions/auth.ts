"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authSchema } from "@/lib/validation";

type State = { error?: string; message?: string } | undefined;

export async function authenticate(_: State, formData: FormData): Promise<State> {
  const parsed = authSchema.safeParse({
    mode: formData.get("mode"),
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: formData.get("mode") === "signup" ? formData.get("full_name") : undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  if (parsed.data.mode === "signup") {
    const allowedDomains = (process.env.CAMPUS_EMAIL_DOMAINS ?? "")
      .split(",")
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean);
    if (!allowedDomains.length) {
      return { error: "Campus signup is disabled until the approved email domain is configured." };
    }
    const emailDomain = parsed.data.email.split("@").at(-1)?.toLowerCase();
    if (!emailDomain || !allowedDomains.includes(emailDomain)) {
      return { error: "Use your verified campus email address." };
    }

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { full_name: parsed.data.full_name } },
    });
    if (error) return { error: error.message };
    if (!data.session) return { message: "Check your email to confirm your account." };
  } else {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error) return { error: "Invalid email or password" };
    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      return { error: "Verify your campus email before signing in." };
    }
  }
  redirect("/items");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}