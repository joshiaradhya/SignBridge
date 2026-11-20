import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // The public site must still render if a deployment is missing its optional
    // authentication variables. Auth routes show the configuration message.
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
        setSession(next);
        setLoading(false);
      });
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setLoading(false);
      });
      return () => sub.subscription.unsubscribe();
    } catch (error) {
      console.error("[Supabase] Could not initialise browser authentication", error);
      setLoading(false);
      return undefined;
    }
  }, []);

  const user: User | null = session?.user ?? null;
  return { session, user, loading };
}
