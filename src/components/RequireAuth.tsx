import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

export function RequireAuth({ children, what }: { children: ReactNode; what?: string | undefined }) {
  const { user, loading } = useAuth();
  const href = useRouterState({ select: (s) => s.location.href });

  if (loading) {
    return (
      <div className="grid-paper-soft min-h-screen">
        <p className="mx-auto max-w-6xl px-4 py-12 text-sm text-muted-foreground">Checking your session…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid-paper-soft min-h-screen">
        <div className="mx-auto max-w-xl px-4 py-16">
          <div className="ink-lg rounded-2xl bg-card p-8">
            <p className="label-caps text-xs text-muted-foreground">One quick step</p>
            <h1 className="mt-3 text-3xl">SIGN IN TO KEEP GOING</h1>
            <p className="mt-4 text-sm leading-relaxed">
              {what
                ? `“${what}” is ready for you — sign in and we'll drop you straight back on this page.`
                : "Sign in and we'll bring you straight back to this lesson."}{" "}
              Signing in keeps your progress and practice scores attached to your account.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/auth"
                search={{ redirect: href }}
                className="ink ink-press label-caps inline-block rounded-xl bg-accent px-5 py-3 text-sm"
              >
                Sign in and continue
              </Link>
              <Link
                to="/auth"
                search={{ redirect: href, mode: "signup" }}
                className="ink ink-press label-caps inline-block rounded-xl bg-card px-5 py-3 text-sm"
              >
                Create an account
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Just browsing?{" "}
              <Link to="/" className="underline">
                Back to the home page
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
