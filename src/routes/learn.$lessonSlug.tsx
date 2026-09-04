import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Camera, CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { lessonsQuery, signsQuery, type Sign } from "@/lib/signbridge";
import { SignVisual } from "@/components/SignVisual";
import { useAuth } from "@/hooks/useAuth";
import { coursesQuery, progressQuery, recordActivity } from "@/lib/learning";


export const Route = createFileRoute("/learn/$lessonSlug")({
  head: () => ({
    meta: [
      { title: "Sign documentation — Lesson | SignBridge" },
      {
        name: "description",
        content:
          "Full written documentation for each sign in this SignBridge lesson: handshape, location, movement, expression and step-by-step instructions with annotated illustrations.",
      },
      { property: "og:title", content: "Sign documentation — SignBridge lesson" },
      {
        property: "og:description",
        content: "Handshape, location, movement and step-by-step notes for each sign.",
      },
    ],
  }),
  component: LessonPage,
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="ink rounded-xl bg-background p-4">
      <p className="label-caps text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm leading-relaxed">{value}</p>
    </div>
  );
}

function SignEntry({ sign, index }: { sign: Sign; index: number }) {
  return (
    <article className="ink-lg rounded-2xl bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="ink label-caps flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm">
          {index + 1}
        </span>
        <h2 className="text-2xl break-words sm:text-3xl">{sign.gloss}</h2>
        <span className="ink label-caps rounded-full bg-accent px-3 py-1 text-[11px]">
          {sign.meaning}
        </span>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="ink h-fit overflow-hidden rounded-xl bg-background">
          <SignVisual sign={sign} />
        </div>


        <div className="grid gap-3">
          <Field label="Handshape" value={sign.handshape} />
          <Field label="Location" value={sign.location} />
          <Field label="Movement" value={sign.movement} />
          <Field label="Expression" value={sign.expression} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <p className="label-caps text-xs text-muted-foreground">Step by step</p>
          <ol className="mt-3 space-y-2">
            {sign.steps.map((step, i) => (
              <li key={i} className="ink flex gap-3 rounded-xl bg-background p-3 text-sm">
                <span className="label-caps text-xs text-muted-foreground">{i + 1}</span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="ink h-fit rounded-xl bg-accent p-4">
          <p className="label-caps text-[11px]">Common mistake</p>
          <p className="mt-1 text-sm leading-relaxed">{sign.common_mistake}</p>
        </div>
      </div>

      <Button asChild className="ink ink-press mt-6 h-auto rounded-xl px-5 py-3 label-caps">
        <Link to="/practice" search={{ sign: sign.slug }}>
          <Camera /> Try it on camera
        </Link>
      </Button>
    </article>
  );
}

function LessonPage() {
  const { lessonSlug } = Route.useParams();
  const lessons = useQuery(lessonsQuery);
  const signs = useQuery(signsQuery);
  const courses = useQuery(coursesQuery);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const progress = useQuery(progressQuery(user?.id));
  const [saving, setSaving] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const lesson = (lessons.data ?? []).find((l) => l.slug === lessonSlug);
  const lessonSigns = lesson ? (signs.data ?? []).filter((s) => s.lesson_id === lesson.id) : [];
  const done = !!lesson && (progress.data ?? []).some((p) => p.lesson_id === lesson.id);
  const course = (courses.data ?? []).find((item) => item.id === lesson?.course_id);
  const courseLessons = (lessons.data ?? [])
    .filter((item) => item.course_id === lesson?.course_id)
    .sort((a, b) => a.order_index - b.order_index);
  const lessonIndex = lesson ? courseLessons.findIndex((item) => item.id === lesson.id) : -1;
  const previousLesson = lessonIndex > 0 ? courseLessons[lessonIndex - 1] : undefined;
  const nextLesson = lessonIndex >= 0 ? courseLessons[lessonIndex + 1] : undefined;

  async function markComplete() {
    if (!user || !lesson) return;
    setSaving(true);
    setCompletionError(null);
    try {
      await recordActivity(user.id, "lesson", lesson.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lesson-progress"] }),
        queryClient.invalidateQueries({ queryKey: ["daily-activity"] }),
        queryClient.invalidateQueries({ queryKey: ["profile", user.id] }),
      ]);
    } catch {
      setCompletionError("Your completion could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <RequireAuth what={lesson?.title}>
      <div className="grid-paper-soft min-h-screen">
        <div className="mx-auto max-w-5xl px-4 py-12">
          {course ? (
            <Link
              to="/learn/course/$courseSlug"
              params={{ courseSlug: course.slug }}
              className="label-caps inline-flex items-center gap-1 text-xs underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> {course.title}
            </Link>
          ) : (
            <Link to="/learn" className="label-caps text-xs underline">← All courses</Link>
          )}

          {lessons.isLoading ? (
            <p className="mt-8 text-sm text-muted-foreground">Loading lesson…</p>
          ) : !lesson ? (
            <p className="mt-8 text-sm">That lesson doesn't exist yet.</p>
          ) : (
            <>
              <div className="ink-lg mt-4 rounded-2xl bg-card p-6">
                <span className="ink label-caps inline-block rounded-full bg-primary px-3 py-1 text-xs">
                  {lesson.language} · {lessonSigns.length} signs
                </span>
                <h1 className="mt-4 text-3xl break-words sm:text-4xl">{lesson.title.toUpperCase()}</h1>
                <p className="mt-3 text-sm leading-relaxed">{lesson.summary}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Reference source: {lesson.source}
                </p>
                <Button
                  onClick={() => void markComplete()}
                  disabled={done || saving}
                  variant="outline"
                  className={`ink ink-press mt-5 h-auto rounded-xl px-4 py-2 label-caps ${
                    done ? "bg-accent" : "bg-background"
                  }`}
                >
                  {done ? <CheckCircle2 /> : null}
                  {done ? "Lesson completed" : saving ? "Saving…" : "Mark lesson complete"}
                </Button>
                {completionError ? (
                  <p role="alert" className="mt-3 text-xs text-destructive">{completionError}</p>
                ) : null}
              </div>

              {lessonSigns.length > 0 ? (
                <div className="mt-8 space-y-8">
                  {lessonSigns.map((sign, i) => (
                    <SignEntry key={sign.id} sign={sign} index={i} />
                  ))}
                </div>
              ) : (
                <div className="ink mt-8 rounded-xl bg-card p-5 text-sm text-muted-foreground">
                  The sign references for this lesson are being prepared.
                </div>
              )}

              <nav aria-label="Lesson navigation" className="mt-10 grid gap-3 sm:grid-cols-2">
                {previousLesson ? (
                  <Button asChild variant="outline" className="ink ink-press h-auto justify-start rounded-xl bg-card p-4">
                    <Link to="/learn/$lessonSlug" params={{ lessonSlug: previousLesson.slug }}>
                      <ArrowLeft /> <span className="text-left"><span className="label-caps block text-[10px] text-muted-foreground">Previous</span>{previousLesson.title}</span>
                    </Link>
                  </Button>
                ) : <span />}
                {nextLesson ? (
                  <Button asChild variant="outline" className="ink ink-press h-auto justify-end rounded-xl bg-card p-4">
                    <Link to="/learn/$lessonSlug" params={{ lessonSlug: nextLesson.slug }}>
                      <span className="text-right"><span className="label-caps block text-[10px] text-muted-foreground">Next</span>{nextLesson.title}</span> <ArrowRight />
                    </Link>
                  </Button>
                ) : course ? (
                  <Button asChild variant="outline" className="ink ink-press h-auto justify-end rounded-xl bg-accent p-4">
                    <Link to="/learn/course/$courseSlug" params={{ courseSlug: course.slug }}>
                      Back to course <ArrowRight />
                    </Link>
                  </Button>
                ) : null}
              </nav>
            </>
          )}
        </div>
      </div>
      </RequireAuth>
    </div>
  );
}
