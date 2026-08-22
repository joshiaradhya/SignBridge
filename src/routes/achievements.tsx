import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useLearnerStats } from "@/hooks/useLearnerStats";
import { achievementProgress } from "@/lib/learning";

export const Route = createFileRoute("/achievements")({
  head: () => ({
    meta: [
      { title: "Trophy Room — SignBridge achievements" },
      {
        name: "description",
        content:
          "Track your SignBridge milestones: streak badges, course completions, practice accuracy and social achievements.",
      },
      { property: "og:title", content: "Trophy Room — SignBridge" },
      {
        property: "og:description",
        content: "Track your sign language milestones and celebrate progress.",
      },
    ],
  }),
  component: AchievementsPage,
});

function AchievementsPage() {
  return (
    <RequireAuth what="your trophy room">
      <AchievementsInner />
    </RequireAuth>
  );
}

function AchievementsInner() {
  const s = useLearnerStats();

  const claimed = s.achievements.filter((a) => s.earnedIds.has(a.id));
  const inProgress = s.achievements.filter((a) => !s.earnedIds.has(a.id));
  const rank = Math.max(
    1,
    100 - Math.min(95, s.stats.lessons * 4 + s.stats.streak * 3 + claimed.length * 5),
  );

  return (
    <AppShell title="TROPHY ROOM" subtitle="Track your progress and celebrate milestones.">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="ink rounded-2xl bg-primary p-5">
          <p className="font-display text-4xl font-extrabold">{s.profile?.streak ?? 0}</p>
          <p className="label-caps text-[11px]">Day streak</p>
        </div>
        <div className="ink rounded-2xl bg-sky p-5">
          <p className="font-display text-4xl font-extrabold">{s.stats.attempts}</p>
          <p className="label-caps text-[11px]">Signs practised</p>
        </div>
        <div className="ink rounded-2xl bg-accent p-5">
          <p className="font-display flex items-center gap-2 text-4xl font-extrabold">
            <Trophy className="h-6 w-6" /> Top {rank}%
          </p>
          <p className="label-caps text-[11px]">Rank</p>
        </div>
      </div>

      <h2 className="mt-10 flex items-center gap-3 text-2xl">
        <Circle className="h-5 w-5 fill-primary" /> IN PROGRESS
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {inProgress.map((a) => {
          const p = achievementProgress(a, s.stats);
          return (
            <article key={a.id} className="ink-lg rounded-2xl bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="ink flex h-10 w-10 items-center justify-center rounded-xl bg-background">
                  <Trophy className="h-5 w-5" />
                </span>
                <span className="ink label-caps rounded-full bg-background px-3 py-1 text-[10px]">
                  Locked
                </span>
              </div>
              <h3 className="mt-4 text-xl">{a.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
              <div className="mt-5 flex items-center justify-between text-xs">
                <span className="label-caps">Progress</span>
                <span className="label-caps">
                  {p.current} / {p.target}
                </span>
              </div>
              <div className="ink mt-2 h-3 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.round((p.current / p.target) * 100)}%` }}
                />
              </div>
            </article>
          );
        })}
      </div>

      <h2 className="mt-10 flex items-center gap-3 text-2xl">
        <CheckCircle2 className="h-5 w-5" /> CLAIMED
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {claimed.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing claimed yet — finish a lesson to unlock First Step.
          </p>
        ) : (
          claimed.map((a) => (
            <article key={a.id} className="ink rounded-2xl bg-accent p-5">
              <div className="flex items-center justify-between">
                <span className="ink flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                  <Trophy className="h-5 w-5" />
                </span>
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-xl">{a.name}</h3>
              <p className="mt-1 text-xs">{a.description}</p>
            </article>
          ))
        )}
      </div>
    </AppShell>
  );
}
