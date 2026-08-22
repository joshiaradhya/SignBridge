import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { UserRound, Upload, LogOut } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useLearnerStats } from "@/hooks/useLearnerStats";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — SignBridge" },
      {
        name: "description",
        content:
          "Update your SignBridge display name, profile picture and daily learning goal, and review your streaks and totals.",
      },
      { property: "og:title", content: "Your profile — SignBridge" },
      { property: "og:description", content: "Display name, avatar, daily goal and totals." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <RequireAuth what="your profile">
      <ProfileInner />
    </RequireAuth>
  );
}

const GOALS = [1, 3, 5, 10];

function ProfileInner() {
  const { user } = useAuth();
  const { profile, avatarUrl, saveDisplayName, saveDailyGoal, uploadAvatar } = useProfile();
  const s = useLearnerStats();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.display_name) setName(profile.display_name);
  }, [profile?.display_name]);

  return (
    <AppShell title="PROFILE" subtitle="How you appear to other learners, and what you're aiming for.">
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="ink-lg rounded-2xl bg-card p-6 lg:col-span-2">
          <h2 className="text-xl">ACCOUNT</h2>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <span className="ink flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Your profile picture" className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-8 w-8" />
              )}
            </span>
            <div>
              <button
                onClick={() => fileRef.current?.click()}
                className="ink ink-press label-caps flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs"
              >
                <Upload className="h-3.5 w-3.5" /> Change picture
              </button>
              <p className="mt-2 text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setStatus("Uploading…");
                try {
                  await uploadAvatar(file);
                  setStatus("Picture updated.");
                } catch {
                  setStatus("Upload failed, try a smaller image.");
                }
              }}
            />
          </div>

          <label htmlFor="display-name" className="label-caps mt-6 block text-[11px]">
            Display name
          </label>
          <div className="mt-2 flex flex-wrap gap-3">
            <input
              id="display-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="ink min-w-0 flex-1 rounded-xl bg-background px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={async () => {
                await saveDisplayName(name.trim() || "Learner");
                setStatus("Display name saved.");
              }}
              className="ink ink-press label-caps rounded-xl bg-accent px-5 py-2 text-sm"
            >
              Save
            </button>
          </div>

          <h3 className="label-caps mt-8 text-[11px]">Daily goal</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <button
                key={g}
                onClick={async () => {
                  await saveDailyGoal(g);
                  setStatus(`Daily goal set to ${g} activities.`);
                }}
                className={`ink ink-press label-caps rounded-xl px-4 py-2 text-xs ${
                  profile?.daily_goal === g ? "bg-primary" : "bg-background"
                }`}
              >
                {g} a day
              </button>
            ))}
          </div>

          {status ? <p className="ink mt-6 rounded-xl bg-muted p-3 text-sm">{status}</p> : null}

          <button
            onClick={() => supabase.auth.signOut()}
            className="ink ink-press label-caps mt-8 flex items-center gap-2 rounded-xl bg-background px-4 py-2 text-xs"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </section>

        <section className="ink-lg rounded-2xl bg-card p-6">
          <h2 className="text-xl">TOTALS</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <Row label="XP" value={`${profile?.xp ?? 0}`} />
            <Row label="Current streak" value={`${profile?.streak ?? 0} days`} />
            <Row label="Best streak" value={`${profile?.best_streak ?? 0} days`} />
            <Row label="Lessons completed" value={`${s.stats.lessons}`} />
            <Row label="Courses completed" value={`${s.stats.courses}`} />
            <Row label="Practice attempts" value={`${s.stats.attempts}`} />
            <Row label="Badges" value={`${s.earnedIds.size}`} />
            <Row label="Friends" value={`${s.stats.friends}`} />
          </dl>
        </section>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="ink flex items-center justify-between rounded-xl bg-background px-3 py-2">
      <dt className="label-caps text-[11px]">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
