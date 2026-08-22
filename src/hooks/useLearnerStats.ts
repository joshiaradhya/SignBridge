import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import {
  achievementsQuery,
  courseLessonsQuery,
  coursesQuery,
  earnedAchievementsQuery,
  progressQuery,
  syncAchievements,
  todayActivityQuery,
  type AchievementStats,
} from "@/lib/learning";
import { friendsQuery } from "@/lib/friends";

export function useLearnerStats() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const courses = useQuery(coursesQuery);
  const lessons = useQuery(courseLessonsQuery);
  const achievements = useQuery(achievementsQuery);
  const progress = useQuery(progressQuery(userId));
  const earned = useQuery(earnedAchievementsQuery(userId));
  const today = useQuery(todayActivityQuery(userId));
  const friends = useQuery(friendsQuery(userId));

  const attempts = useQuery({
    queryKey: ["attempt-stats", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("attempts").select("confidence");
      const rows = data ?? [];
      return {
        count: rows.length,
        best: rows.reduce((m, r) => Math.max(m, Number(r.confidence)), 0),
      };
    },
  });

  const completed = new Set((progress.data ?? []).map((p) => p.lesson_id));
  const allLessons = lessons.data ?? [];
  const allCourses = courses.data ?? [];

  const courseProgress = allCourses.map((course) => {
    const own = allLessons.filter((l) => l.course_id === course.id);
    const done = own.filter((l) => completed.has(l.id)).length;
    return {
      course,
      lessons: own,
      done,
      total: own.length,
      percent: own.length ? Math.round((done / own.length) * 100) : 0,
    };
  });

  const completedCourses = courseProgress.filter((c) => c.total > 0 && c.done === c.total);

  const stats: AchievementStats = {
    lessons: completed.size,
    courses: completedCourses.length,
    conversationCourses: completedCourses.filter((c) => c.course.difficulty === "conversation")
      .length,
    streak: profile?.streak ?? 0,
    attempts: attempts.data?.count ?? 0,
    bestScore: Math.round(attempts.data?.best ?? 0),
    friends: (friends.data ?? []).length,
  };

  const earnedIds = new Set((earned.data ?? []).map((e) => e.achievement_id));

  // Grant any newly-qualified achievements once the underlying data has loaded.
  useEffect(() => {
    if (!userId || !achievements.data || !earned.data || !progress.data || !attempts.data) return;
    let cancelled = false;
    void syncAchievements(userId, achievements.data, stats, earnedIds).then((newly) => {
      if (!cancelled && newly.length > 0) {
        void queryClient.invalidateQueries({ queryKey: ["user-achievements", userId] });
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userId,
    achievements.data,
    earned.data,
    progress.data,
    attempts.data,
    stats.lessons,
    stats.courses,
    stats.streak,
    stats.friends,
  ]);

  const goal = profile?.daily_goal ?? 3;
  const todayDone = (today.data?.lessons_completed ?? 0) + (today.data?.practice_sessions ?? 0);

  return {
    loading: courses.isLoading || lessons.isLoading,
    profile,
    courses: allCourses,
    lessons: allLessons,
    completed,
    courseProgress,
    completedCourses,
    achievements: achievements.data ?? [],
    earnedIds,
    earnedAt: new Map((earned.data ?? []).map((e) => [e.achievement_id, e.earned_at])),
    stats,
    goal,
    todayDone,
    todayPercent: goal ? Math.min(100, Math.round((todayDone / goal) * 100)) : 0,
    friends: friends.data ?? [],
  };
}
