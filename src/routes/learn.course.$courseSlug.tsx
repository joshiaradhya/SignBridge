import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Camera, CheckCircle2, Circle, Clock, MoveRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { useLearnerStats } from "@/hooks/useLearnerStats";
import { signsQuery } from "@/lib/signbridge";

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
  const signs = useQuery(signsQuery);
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

        <div className="mt-10 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="label-caps text-[11px] text-muted-foreground">Course pathway</p>
            <h2 className="mt-1 text-2xl">LESSONS</h2>
          </div>
          <p className="text-xs text-muted-foreground">Open the notes or practise a sign on camera.</p>
        </div>
        <div className="mt-4 grid gap-5">
          {lessons.map((lesson, i) => {
            const complete = s.completed.has(lesson.id);
            const lessonSigns = (signs.data ?? []).filter((sign) => sign.lesson_id === lesson.id);
            const firstSign = lessonSigns[0];
            return (
              <article
                key={lesson.id}
                className="ink-lg hover-lift grid gap-4 rounded-2xl bg-card p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="flex min-w-0 items-start gap-4">
                  {complete ? (
                    <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-primary" />
                  ) : (
                    <Circle className="mt-0.5 h-7 w-7 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0">
                    <h3 className="label-caps text-base break-words sm:text-lg">
                      {i + 1}. {lesson.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {lesson.summary}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
                      <span className="label-caps flex items-center gap-1.5">
                        <Clock className="h-4 w-4" /> {lesson.estimated_minutes} min
                      </span>
                      <span className="label-caps flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4" /> {lessonSigns.length} signs
                      </span>
                      {complete ? <span className="label-caps">Completed</span> : null}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:max-w-44 sm:justify-end">
                  <Button asChild className="ink ink-press h-auto rounded-xl px-4 py-2.5 label-caps">
                    <Link to="/learn/$lessonSlug" params={{ lessonSlug: lesson.slug }}>
                      Open lesson <MoveRight />
                    </Link>
                  </Button>
                  {firstSign ? (
                    <Button
                      asChild
                      variant="secondary"
                      className="ink ink-press h-auto rounded-xl px-4 py-2.5 label-caps"
                    >
                      <Link to="/practice" search={{ sign: firstSign.slug }}>
                        <Camera /> Practise
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
          {lessons.length === 0 ? (
            <div className="ink rounded-xl bg-card p-5 text-sm text-muted-foreground">
              Lessons for this course are being prepared. Choose another course from the catalogue.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
