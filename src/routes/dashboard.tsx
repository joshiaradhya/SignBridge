import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { signsQuery } from "@/lib/signbridge";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your progress — SignBridge dashboard" },
      {
        name: "description",
        content:
          "See your SignBridge practice history: attempt scores, total attempts and the signs that still need the most work.",
      },
      { property: "og:title", content: "Your progress — SignBridge" },
      {
        property: "og:description",
        content: "Attempt scores and weakest signs from your ASL and ISL practice.",
      },
    ],
  }),
  component: Dashboard,
});

type Attempt = {
  id: string;
  sign_id: string | null;
  confidence: number;
  feedback: string;
  created_at: string;
};

function Dashboard() {
  const { user, loading } = useAuth();
  const signs = useQuery(signsQuery);

  const attempts = useQuery({
    queryKey: ["attempts", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Attempt[]> => {
      const { data, error } = await supabase
        .from("attempts")
        .select("id, sign_id, confidence, feedback, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Attempt[];
    },
  });

  const rows = attempts.data ?? [];
  const glossFor = (id: string | null) =>
    (signs.data ?? []).find((s) => s.id === id)?.gloss ?? "Unknown sign";

  const averages = new Map<string, { total: number; count: number }>();
  rows.forEach((a) => {
    if (!a.sign_id) return;
    const cur = averages.get(a.sign_id) ?? { total: 0, count: 0 };
    averages.set(a.sign_id, { total: cur.total + Number(a.confidence), count: cur.count + 1 });
  });
  const weakest = [...averages.entries()]
    .map(([id, v]) => ({ id, avg: Math.round(v.total / v.count), count: v.count }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 3);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="grid-paper-soft min-h-screen">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <h1 className="text-4xl">YOUR PROGRESS</h1>

          {loading ? (
            <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
          ) : !user ? (
            <div className="ink-lg mt-6 rounded-2xl bg-card p-6">
              <p className="text-sm">Sign in to save practice attempts and track weak signs.</p>
              <Link
                to="/auth"
                className="ink ink-press label-caps mt-4 inline-block rounded-xl bg-accent px-5 py-3 text-sm"
              >
                Sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="ink rounded-2xl bg-primary p-5">
                  <p className="label-caps text-[11px]">Attempts</p>
                  <p className="font-display text-4xl font-extrabold">{rows.length}</p>
                </div>
                <div className="ink rounded-2xl bg-accent p-5">
                  <p className="label-caps text-[11px]">Average score</p>
                  <p className="font-display text-4xl font-extrabold">
                    {rows.length
                      ? Math.round(
                          rows.reduce((sum, a) => sum + Number(a.confidence), 0) / rows.length,
                        )
                      : 0}
                    %
                  </p>
                </div>
                <div className="ink rounded-2xl bg-sky p-5">
                  <p className="label-caps text-[11px]">Signs practised</p>
                  <p className="font-display text-4xl font-extrabold">{averages.size}</p>
                </div>
              </div>

              <h2 className="mt-10 text-2xl">NEEDS WORK</h2>
              <div className="mt-4 grid gap-3">
                {weakest.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No attempts yet — head to SignLab and record one.
                  </p>
                ) : (
                  weakest.map((w) => (
                    <div
                      key={w.id}
                      className="ink flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-4"
                    >
                      <div>
                        <p className="label-caps text-sm">{glossFor(w.id)}</p>
                        <p className="text-xs text-muted-foreground">
                          {w.count} attempt{w.count === 1 ? "" : "s"} · avg {w.avg}%
                        </p>
                      </div>
                      <Link
                        to="/practice"
                        search={{
                          sign: (signs.data ?? []).find((s) => s.id === w.id)?.slug,
                        }}
                        className="ink ink-press label-caps rounded-lg bg-accent px-3 py-2 text-xs"
                      >
                        Practise again
                      </Link>
                    </div>
                  ))
                )}
              </div>

              <h2 className="mt-10 text-2xl">RECENT ATTEMPTS</h2>
              <div className="mt-4 grid gap-3">
                {rows.slice(0, 10).map((a) => (
                  <div key={a.id} className="ink rounded-xl bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="label-caps text-sm">{glossFor(a.sign_id)}</p>
                      <span className="label-caps text-sm">{Math.round(Number(a.confidence))}%</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {a.feedback}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
