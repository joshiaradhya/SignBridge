import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { SignBridgeLogo } from "@/components/SignBridgeLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileMenu } from "@/components/ProfileMenu";
import { AuthFlash } from "@/components/AuthFlash";

const navItems = [
  { to: "/learn", label: "Learn" },
  { to: "/practice", label: "Practice" },
  { to: "/connect", label: "Connect" },
  { to: "/dashboard", label: "Dashboard" },
] as const;

export function SiteHeader() {
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-40 overflow-x-hidden border-b-2 border-border bg-background/95 backdrop-blur">
      <AuthFlash />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-6">
        <Link to="/" aria-label="SignBridge home" preload="intent">
          <SignBridgeLogo />
        </Link>
        <nav className="order-3 -mx-4 flex w-[calc(100%+2rem)] snap-x items-center gap-1 overflow-x-auto px-4 pb-1 sm:order-none sm:mx-0 sm:w-auto sm:overflow-visible sm:p-0 sm:gap-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              preload="intent"
              className="label-caps shrink-0 snap-start rounded-md px-2 py-1 text-xs transition-colors hover:bg-accent sm:text-sm"
              activeProps={{ className: "bg-accent ink" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ThemeToggle />
          {loading ? (
            <span className="h-8 w-20 animate-pulse rounded-md bg-muted" />
          ) : user ? (
            <div key="profile" className="animate-auth-swap">
              <ProfileMenu />
            </div>
          ) : (
            <Link
              key="signin"
              to="/auth"
              preload="intent"
              className="ink ink-press label-caps animate-auth-swap inline-block rounded-md bg-accent px-3 py-1.5 text-xs"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
