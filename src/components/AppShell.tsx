import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  Users,
  Lightbulb,
  UserRound,
  Video,
  Camera,
  Menu,
  X,
} from "lucide-react";
import { SignBridgeLogo } from "@/components/SignBridgeLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useProfile } from "@/hooks/useProfile";
import { AuthFlash } from "@/components/AuthFlash";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/learn", label: "Courses", icon: BookOpen },
  { to: "/achievements", label: "Achievements", icon: Trophy },
  { to: "/friends", label: "Friends", icon: Users },
  { to: "/insights", label: "Insights", icon: Lightbulb },
  { to: "/practice", label: "SignLab", icon: Camera },
  { to: "/connect", label: "SignConnect", icon: Video },
  { to: "/profile", label: "Profile", icon: UserRound },
] as const;

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { profile, avatarUrl } = useProfile();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-5">
      <Link to="/" aria-label="SignBridge home" onClick={() => setOpen(false)}>
        <SignBridgeLogo />
      </Link>

      <div className="ink flex items-center gap-3 rounded-xl bg-background p-3">
        <span className="ink flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0">
          <p className="label-caps text-[11px]">Welcome back</p>
          <p className="truncate text-sm font-semibold">{profile?.display_name ?? "Learner"}</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {nav.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              preload="intent"
              onClick={() => setOpen(false)}
              className={`label-caps flex items-center gap-3 rounded-xl px-3 py-2 text-xs transition-colors ${
                active ? "ink bg-accent" : "hover:bg-accent/40"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="ink rounded-xl bg-primary p-4">
        <p className="label-caps text-[11px]">Streak</p>
        <p className="font-display text-3xl font-extrabold">{profile?.streak ?? 0} days</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <AuthFlash />
      <div className="flex min-h-screen w-full">
        <aside className="hidden w-64 shrink-0 border-r-2 border-border bg-card lg:block">
          <div className="sticky top-0 h-screen overflow-y-auto">{sidebar}</div>
        </aside>

        {open ? (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="w-72 border-r-2 border-border bg-card">
              <div className="flex justify-end p-3">
                <button onClick={() => setOpen(false)} aria-label="Close menu" className="ink rounded-lg bg-background p-1">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {sidebar}
            </div>
            <button
              className="flex-1 bg-foreground/40"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
          </div>
        ) : null}

        <main className="grid-paper-soft min-w-0 flex-1">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => setOpen(true)}
                  aria-label="Open menu"
                  className="ink mt-1 rounded-lg bg-card p-2 lg:hidden"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <div>
                  <h1 className="text-4xl">{title}</h1>
                  {subtitle ? (
                    <p className="mt-2 max-w-xl text-sm text-muted-foreground">{subtitle}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {actions}
                <ThemeToggle />
              </div>
            </div>
            <div className="mt-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
