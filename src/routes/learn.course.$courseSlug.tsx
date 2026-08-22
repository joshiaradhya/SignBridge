import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { RequireAuth } from "@/components/RequireAuth";
import { useLearnerStats } from "@/hooks/useLearnerStats";

export const Route = createFileRoute("/learn/course/$courseSlug")({
  head: () => ({
    meta: [
      { title: "Course lessons — SignBridge" },
      {
        name: "description",
        content:
          "Work through this SignBridge course lesson by lesson with annotated sign documentation and completion tracking.",
      },
      { property: "og:title", content: "Course lessons — SignBridge" },
      {
        property: "og:description",
        content: "Annotated sign documentation with lesson-by-lesson completion tracking.",
      },
    ],
  }),
  component: CoursePage,
});

function CoursePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <RequireAuth what="this course">
        <CourseInner />
      </RequireAuth>
    </div>
  );
}

function CourseInner() {
  const { courseSlug } = Route.useParams();
  const s = useLearnerStats();
  const entry = s.courseProgress.find((c) => c.course.slug === courseSlug);

  if (s.loading) {
    return (
      <div className="grid-paper-soft min-h-screen">
        <p className="mx-auto max-w-5xl px-4 py-12 text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="grid-paper-soft min-h-screen">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <p className="text-sm">That course doesn't exist.</p>
          <Link to="/learn" className="mt-4 inline-block text-xs underline">
            Back to catalogue
          </Link>
        </div>
      </div>
    );
  }

  const { course, lessons, done, total, percent } = entry;

  return (
    <div className="grid-paper-soft min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <Link to="/learn" className="label-caps text-xs underline">
          ← Catalogue
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="ink label-caps rounded-full bg-primary px-3 py-1 text-[10px]">
            {course.language}
          </span>
          <span className="ink label-caps rounded-full bg-card px-3 py-1 text-[10px]">
            {course.difficulty}
          </span>
        </div>
        <h1 className="mt-4 text-4xl">{course.title.toUpperCase()}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed">{course.description}</p>

        <div className="ink-lg mt-6 rounded-2xl bg-card p-5">
          <div className="flex items-center justify-between text-xs">
            <span className="label-caps">
              {done}/{total} lessons complete
            </span>
            <span className="label-caps">{percent}%</span>
          </div>
          <div className="ink mt-2 h-3 overflow-hidden rounded-full bg-background">
            <div className="h-full bg-accent" style={{ width: `${percent}%` }} />
          </div>
        </div>

        <h2 className="mt-10 text-2xl">LESSONS</h2>
        <div className="mt-4 grid gap-3">
          {lessons.map((lesson, i) => {
            const complete = s.completed.has(lesson.id);
            return (
              <Link
                key={lesson.id}
                to="/learn/$lessonSlug"
                params={{ lessonSlug: lesson.slug }}
                className="ink flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-4 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3">
                  {complete ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5" />
                  ) : (
                    <Circle className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="label-caps text-sm">
                      {i + 1}. {lesson.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{lesson.summary}</p>
                  </div>
                </div>
                <span className="label-caps flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {lesson.estimated_minutes} min
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
