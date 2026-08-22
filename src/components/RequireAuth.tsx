import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

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
            <p className="label-caps text-xs text-muted-foreground">Members only</p>
            <h1 className="mt-3 text-3xl">SIGN IN TO OPEN THE LESSONS</h1>
            <p className="mt-4 text-sm leading-relaxed">
              The lesson library is available to signed-in learners so your progress and practice
              scores stay attached to your account.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="ink ink-press label-caps inline-block rounded-xl bg-accent px-5 py-3 text-sm"
              >
                Sign in
              </Link>
              <Link
                to="/"
                className="ink ink-press label-caps inline-block rounded-xl bg-card px-5 py-3 text-sm"
              >
                Back home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
