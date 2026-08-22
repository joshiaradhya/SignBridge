import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Target, Trophy, BookOpen } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useLearnerStats } from "@/hooks/useLearnerStats";
import { DIFFICULTIES } from "@/lib/learning";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your learning dashboard — SignBridge" },
      {
        name: "description",
        content:
          "Resume your current sign language course, track your daily goal, streak and recently unlocked achievements on SignBridge.",
      },
      { property: "og:title", content: "Your learning dashboard — SignBridge" },
      {
        property: "og:description",
        content: "Daily goal, streaks, course progress and achievements in one place.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <RequireAuth what="your dashboard">
      <DashboardInner />
    </RequireAuth>
  );
}

function DashboardInner() {
  const s = useLearnerStats();

  const inProgress = s.courseProgress.filter((c) => c.done > 0 && c.done < c.total);
  const current = inProgress[0] ?? s.courseProgress.find((c) => c.total > 0);
  const recent = s.achievements.filter((a) => s.earnedIds.has(a.id)).slice(0, 4);

  return (
    <AppShell title="DASHBOARD" subtitle="Keep the bridge going — a little every day.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Flame className="h-4 w-4" />} label="Current streak" value={`${s.profile?.streak ?? 0}`} tone="bg-primary" />
        <Stat icon={<Trophy className="h-4 w-4" />} label="Best streak" value={`${s.profile?.best_streak ?? 0}`} tone="bg-accent" />
        <Stat icon={<BookOpen className="h-4 w-4" />} label="Lessons done" value={`${s.stats.lessons}`} tone="bg-sky" />
        <Stat icon={<Trophy className="h-4 w-4" />} label="Badges" value={`${s.earnedIds.size}`} tone="bg-card" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="ink-lg rounded-2xl bg-card p-6 lg:col-span-2">
          <p className="label-caps text-[11px]">Continue learning</p>
          {current ? (
            <>
              <h2 className="mt-2 text-2xl">{current.course.title.toUpperCase()}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {current.course.language} · {current.course.difficulty} · {current.done}/
                {current.total} lessons
              </p>
              <div className="ink mt-4 h-3 overflow-hidden rounded-full bg-background">
                <div className="h-full bg-primary" style={{ width: `${current.percent}%` }} />
              </div>
              <Link
                to="/learn/course/$courseSlug"
                params={{ courseSlug: current.course.slug }}
                className="ink ink-press label-caps mt-5 inline-block rounded-xl bg-accent px-5 py-3 text-sm"
              >
                Resume course
              </Link>
            </>
          ) : (
            <p className="mt-3 text-sm">No courses yet — pick one from the catalogue.</p>
          )}
        </section>

        <section className="ink-lg rounded-2xl bg-card p-6">
          <p className="label-caps flex items-center gap-2 text-[11px]">
            <Target className="h-4 w-4" /> Daily goal
          </p>
          <p className="font-display mt-2 text-4xl font-extrabold">
            {s.todayDone}/{s.goal}
          </p>
          <div className="ink mt-3 h-3 overflow-hidden rounded-full bg-background">
            <div className="h-full bg-accent" style={{ width: `${s.todayPercent}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Lessons and practice sessions both count. Change your target on the profile page.
          </p>
          <Link to="/profile" className="mt-3 inline-block text-xs underline">
            Adjust daily goal
          </Link>
        </section>
      </div>

      <h2 className="mt-10 text-2xl">COURSE LEVELS</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DIFFICULTIES.map((d) => {
          const group = s.courseProgress.filter((c) => c.course.difficulty === d.key);
          const done = group.filter((c) => c.total > 0 && c.done === c.total).length;
          return (
            <Link
              key={d.key}
              to="/learn"
              search={{ level: d.key }}
              className="ink rounded-2xl bg-card p-5 transition-transform hover:-translate-y-1"
            >
              <p className="label-caps text-[11px]">{d.label}</p>
              <p className="font-display text-3xl font-extrabold">
                {done}/{group.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{d.blurb}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-2xl">RECENT BADGES</h2>
        <Link to="/achievements" className="label-caps text-xs underline">
          Trophy room
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Complete a lesson to unlock your first badge.
          </p>
        ) : (
          recent.map((a) => (
            <div key={a.id} className="ink rounded-xl bg-card p-4">
              <p className="label-caps text-sm">{a.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
            </div>
          ))
        )}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-2xl">FRIENDS</h2>
        <Link to="/friends" className="label-caps text-xs underline">
          Manage
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {s.friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">No friends yet — search for learners.</p>
        ) : (
          s.friends.map((f) => (
            <span key={f.id} className="ink label-caps rounded-full bg-card px-4 py-2 text-xs">
              {f.display_name} · {f.streak}d
            </span>
          ))
        )}
      </div>
    </AppShell>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className={`ink rounded-2xl ${tone} p-5`}>
      <p className="label-caps flex items-center gap-2 text-[11px]">
        {icon}
        {label}
      </p>
      <p className="font-display text-4xl font-extrabold">{value}</p>
    </div>
  );
}
