import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SignBridgeLogo } from "@/components/SignBridgeLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { to: "/learn", label: "Learn" },
  { to: "/practice", label: "Practice" },
  { to: "/dashboard", label: "Dashboard" },
] as const;

export function SiteHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b-2 border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:gap-6">
        <Link to="/" aria-label="SignBridge home">
          <SignBridgeLogo />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="label-caps rounded-md px-2 py-1 text-xs hover:bg-accent sm:text-sm"
              activeProps={{ className: "bg-accent ink" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          {user ? (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
              className="ink ink-press label-caps rounded-md bg-card px-3 py-1.5 text-xs"
            >
              Sign out
            </button>
          ) : (
            <Link
              to="/auth"
              className="ink ink-press label-caps inline-block rounded-md bg-accent px-3 py-1.5 text-xs"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
