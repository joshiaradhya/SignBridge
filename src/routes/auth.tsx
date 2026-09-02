import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string; mode?: string } => {
    const out: { redirect?: string; mode?: string } = {};
    const r = search["redirect"];
    if (typeof r === "string" && r.startsWith("/")) out.redirect = r;
    if (search["mode"] === "signup") out.mode = "signup";
    return out;
  },
  head: () => ({
    meta: [
      { title: "Sign in — SignBridge" },
      {
        name: "description",
        content:
          "Sign in to SignBridge to save your practice attempts, track XP and see which ASL or ISL signs still need work.",
      },
      { property: "og:title", content: "Sign in — SignBridge" },
      {
        property: "og:description",
        content: "Save your practice attempts and track your sign language progress.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect: redirectTo, mode: modeParam } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(
    modeParam === "signup" ? "signup" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: redirectTo ?? "/dashboard", replace: true });
  }, [user, navigate, redirectTo]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${redirectTo ?? "/dashboard"}`,
        },
      });
      setMessage(error ? error.message : "Account created — you're signed in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
    }
    setBusy(false);
  }

  async function oauth(provider: "google" | "apple" | "microsoft", label: string) {
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}${redirectTo ?? ""}`,
    });
    if (result.error) setMessage(`${label} sign-in failed. Try again.`);
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="grid-paper-soft flex min-h-screen items-start justify-center px-4 py-16">
        <div className="ink-lg w-full max-w-md rounded-2xl bg-card p-6 sm:p-8">
          <h1 className="text-3xl">{mode === "signin" ? "WELCOME BACK" : "CREATE ACCOUNT"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {redirectTo
              ? "Sign in and we'll take you straight back to where you left off."
              : "Continue your ASL / ISL journey."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="label-caps text-[11px]">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ink mt-1 w-full rounded-xl bg-background px-3 py-2 text-sm outline-none"
                placeholder="hello@signbridge.app"
              />
            </div>
            <div>
              <label htmlFor="password" className="label-caps text-[11px]">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ink mt-1 w-full rounded-xl bg-background px-3 py-2 text-sm outline-none"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="ink ink-press label-caps w-full rounded-xl bg-accent px-5 py-3 text-sm disabled:opacity-60"
            >
              {mode === "signin" ? "Sign in" : "Sign up"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-3">
            <button
              onClick={() => oauth("google", "Google")}
              className="ink ink-press label-caps w-full rounded-xl bg-background px-5 py-3 text-sm"
            >
              Continue with Google
            </button>
            <button
              onClick={() => oauth("apple", "Apple")}
              className="ink ink-press label-caps w-full rounded-xl bg-background px-5 py-3 text-sm"
            >
              Continue with Apple
            </button>
            <button
              onClick={() => oauth("microsoft", "Microsoft")}
              className="ink ink-press label-caps w-full rounded-xl bg-background px-5 py-3 text-sm"
            >
              Continue with Microsoft
            </button>
          </div>

          {message ? <p className="ink mt-4 rounded-xl bg-muted p-3 text-sm">{message}</p> : null}

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-5 text-xs underline"
          >
            {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
