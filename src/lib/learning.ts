import { supabase } from "@/integrations/supabase/client";

export type Difficulty = "basic" | "intermediate" | "advanced" | "conversation";

export const DIFFICULTIES: { key: Difficulty; label: string; blurb: string }[] = [
  { key: "basic", label: "Basic", blurb: "Absolute beginners" },
  { key: "intermediate", label: "Intermediate", blurb: "Vocabulary & sentences" },
  { key: "advanced", label: "Advanced", blurb: "Grammar & nuance" },
  { key: "conversation", label: "Conversation", blurb: "Practical communication" },
];

export type Course = {
  id: string;
  slug: string;
  title: string;
  language: string;
  difficulty: Difficulty;
  topic: string;
  description: string;
  order_index: number;
};

export type LessonRow = {
  id: string;
  slug: string;
  title: string;
  language: string;
  summary: string;
  order_index: number;
  course_id: string | null;
  estimated_minutes: number;
};

export type Achievement = {
  id: string;
  code: string;
  name: string;
  description: string;
  criteria_type: string;
  criteria_value: number;
  icon: string;
  order_index: number;
};

export type Insight = {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  body: string;
  read_minutes: number;
};

export const coursesQuery = {
  queryKey: ["courses"],
  queryFn: async (): Promise<Course[]> => {
    const { data, error } = await supabase.from("courses").select("*").order("order_index");
    if (error) throw error;
    return (data ?? []) as Course[];
  },
};

export const courseLessonsQuery = {
  queryKey: ["course-lessons"],
  queryFn: async (): Promise<LessonRow[]> => {
    const { data, error } = await supabase
      .from("lessons")
      .select("id, slug, title, language, summary, order_index, course_id, estimated_minutes")
      .order("order_index");
    if (error) throw error;
    return (data ?? []) as LessonRow[];
  },
};

export const achievementsQuery = {
  queryKey: ["achievements"],
  queryFn: async (): Promise<Achievement[]> => {
    const { data, error } = await supabase.from("achievements").select("*").order("order_index");
    if (error) throw error;
    return (data ?? []) as Achievement[];
  },
};

export const insightsQuery = {
  queryKey: ["insights"],
  queryFn: async (): Promise<Insight[]> => {
    const { data, error } = await supabase
      .from("insights")
      .select("id, slug, title, category, excerpt, body, read_minutes")
      .order("order_index");
    if (error) throw error;
    return (data ?? []) as Insight[];
  },
};

export function progressQuery(userId: string | undefined) {
  return {
    queryKey: ["lesson-progress", userId],
    enabled: !!userId,
    queryFn: async (): Promise<{ lesson_id: string; completed_at: string }[]> => {
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed_at");
      if (error) throw error;
      return data ?? [];
    },
  };
}

export function earnedAchievementsQuery(userId: string | undefined) {
  return {
    queryKey: ["user-achievements", userId],
    enabled: !!userId,
    queryFn: async (): Promise<{ achievement_id: string; earned_at: string }[]> => {
      const { data, error } = await supabase
        .from("user_achievements")
        .select("achievement_id, earned_at");
      if (error) throw error;
      return data ?? [];
    },
  };
}

export function todayActivityQuery(userId: string | undefined) {
  return {
    queryKey: ["daily-activity", userId],
    enabled: !!userId,
    queryFn: async (): Promise<{ lessons_completed: number; practice_sessions: number }> => {
      const { data } = await supabase
        .from("daily_activity")
        .select("lessons_completed, practice_sessions")
        .eq("activity_date", utcToday())
        .maybeSingle();
      return data ?? { lessons_completed: 0, practice_sessions: 0 };
    },
  };
}

export function utcToday() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/** Records a qualifying learning action: bumps today's counters and the streak (idempotent per day). */
export async function recordActivity(
  userId: string,
  kind: "lesson" | "practice",
  lessonId?: string,
) {
  const today = utcToday();

  if (kind === "lesson" && lessonId) {
    const { error } = await supabase
      .from("lesson_progress")
      .upsert(
        { user_id: userId, lesson_id: lessonId, status: "completed" },
        { onConflict: "user_id,lesson_id", ignoreDuplicates: true },
      );
    if (error) throw error;
  }

  const { data: existing } = await supabase
    .from("daily_activity")
    .select("id, lessons_completed, practice_sessions")
    .eq("activity_date", today)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("daily_activity")
      .update({
        lessons_completed: existing.lessons_completed + (kind === "lesson" ? 1 : 0),
        practice_sessions: existing.practice_sessions + (kind === "practice" ? 1 : 0),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("daily_activity").insert({
      user_id: userId,
      activity_date: today,
      lessons_completed: kind === "lesson" ? 1 : 0,
      practice_sessions: kind === "practice" ? 1 : 0,
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("streak, best_streak, last_active_date, xp")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return;

  // A refresh or duplicate request on the same day must never change the streak.
  if (profile.last_active_date === today) {
    await supabase
      .from("profiles")
      .update({ xp: (profile.xp ?? 0) + 5 })
      .eq("id", userId);
    return;
  }

  const gap = profile.last_active_date ? daysBetween(profile.last_active_date, today) : null;
  const streak = gap === 1 ? (profile.streak ?? 0) + 1 : 1;

  await supabase
    .from("profiles")
    .update({
      streak,
      best_streak: Math.max(streak, profile.best_streak ?? 0),
      last_active_date: today,
      xp: (profile.xp ?? 0) + 5,
    })
    .eq("id", userId);
}

export type AchievementStats = {
  lessons: number;
  courses: number;
  conversationCourses: number;
  streak: number;
  attempts: number;
  bestScore: number;
  friends: number;
};

export function achievementProgress(a: Achievement, s: AchievementStats) {
  const current =
    a.criteria_type === "lessons"
      ? s.lessons
      : a.criteria_type === "courses"
        ? s.courses
        : a.criteria_type === "conversation_course"
          ? s.conversationCourses
          : a.criteria_type === "streak"
            ? s.streak
            : a.criteria_type === "attempts"
              ? s.attempts
              : a.criteria_type === "high_score"
                ? s.bestScore
                : a.criteria_type === "friends"
                  ? s.friends
                  : 0;
  return { current: Math.min(current, a.criteria_value), target: a.criteria_value };
}

/** Grants any achievement whose criteria are now met. Safe to call repeatedly. */
export async function syncAchievements(
  userId: string,
  all: Achievement[],
  stats: AchievementStats,
  earnedIds: Set<string>,
) {
  const newly = all.filter((a) => {
    if (earnedIds.has(a.id)) return false;
    const { current, target } = achievementProgress(a, stats);
    return current >= target;
  });
  if (newly.length === 0) return [];
  await supabase
    .from("user_achievements")
    .upsert(
      newly.map((a) => ({ user_id: userId, achievement_id: a.id })),
      { onConflict: "user_id,achievement_id", ignoreDuplicates: true },
    );
  return newly;
}
