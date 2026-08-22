import { useEffect, useRef, useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Flash = { kind: "in" | "out"; id: number } | null;

export function AuthFlash() {
  const [flash, setFlash] = useState<Flash>(null);
  const first = useRef(true);

  useEffect(() => {
    const show = (kind: "in" | "out") => setFlash({ kind, id: Date.now() });

    const onManual = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === "in" || detail === "out") show(detail);
    };
    window.addEventListener("sb-auth-flash", onManual);

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (first.current) {
        first.current = false;
        if (event === "INITIAL_SESSION") return;
      }
      if (event === "SIGNED_IN") show("in");
      if (event === "SIGNED_OUT") show("out");
    });

    return () => {
      window.removeEventListener("sb-auth-flash", onManual);
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1800);
    return () => clearTimeout(t);
  }, [flash]);

  if (!flash) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-start justify-center pt-24">
      <div className="auth-flash-veil absolute inset-0 bg-foreground/10" />
      <div
        key={flash.id}
        className="ink-lg auth-flash-card relative flex items-center gap-3 rounded-2xl bg-card px-5 py-4"
      >
        <span className="ink flex h-9 w-9 items-center justify-center rounded-full bg-accent">
          {flash.kind === "in" ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
        </span>
        <div>
          <p className="label-caps text-sm">
            {flash.kind === "in" ? "Signed in" : "Signed out"}
          </p>
          <p className="text-xs text-muted-foreground">
            {flash.kind === "in" ? "Your progress is saving again." : "See you soon!"}
          </p>
        </div>
      </div>
    </div>
  );
}
