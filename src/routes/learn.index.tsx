import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { lessonsQuery, signsQuery } from "@/lib/signbridge";
import { signImage } from "@/lib/sign-images";

export const Route = createFileRoute("/learn/")({
  head: () => ({
    meta: [
      { title: "Learn ASL & ISL — Documented sign lessons | SignBridge" },
      {
        name: "description",
        content:
          "Browse SignBridge's documented starter lessons in American and Indian Sign Language: annotated illustrations, movement notes and step-by-step breakdowns.",
      },
      { property: "og:title", content: "Learn ASL & ISL — SignBridge lessons" },
      {
        property: "og:description",
        content: "Documented ASL and ISL starter lessons with annotated illustrations.",
      },
    ],
  }),
  component: LearnIndex,
});

function LearnIndex() {
  const lessons = useQuery(lessonsQuery);
  const signs = useQuery(signsQuery);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="grid-paper-soft min-h-screen">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="text-4xl">LESSON LIBRARY</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed">
            Text and image documentation — read the sign, study the diagram, then practise it in
            SignLab. Two starter lessons are available: one in ASL, one in ISL.
          </p>

          {lessons.isLoading ? (
            <p className="mt-10 text-sm text-muted-foreground">Loading lessons…</p>
          ) : null}

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {(lessons.data ?? []).map((lesson) => {
              const lessonSigns = (signs.data ?? []).filter((s) => s.lesson_id === lesson.id);
              return (
                <article key={lesson.id} className="ink-lg rounded-2xl bg-card p-6">
                  <span className="ink label-caps inline-block rounded-full bg-primary px-3 py-1 text-xs">
                    {lesson.language}
                  </span>
                  <h2 className="mt-4 text-2xl">{lesson.title.toUpperCase()}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {lesson.summary}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {lessonSigns.map((s) => (
                      <span
                        key={s.id}
                        className="ink label-caps rounded-md bg-background px-2 py-1 text-[11px]"
                      >
                        {s.gloss}
                      </span>
                    ))}
                  </div>

                  {lessonSigns[0] ? (
                    <div className="ink mt-5 overflow-hidden rounded-xl">
                      <img
                        src={signImage(lessonSigns[0].image_key)}
                        alt={`Illustration of the ${lesson.language} sign for ${lessonSigns[0].gloss}`}
                        width={1024}
                        height={768}
                        loading="lazy"
                        className="w-full"
                      />
                    </div>
                  ) : null}

                  <Link
                    to="/learn/$lessonSlug"
                    params={{ lessonSlug: lesson.slug }}
                    className="ink ink-press label-caps mt-6 inline-block rounded-xl bg-accent px-5 py-3 text-sm"
                  >
                    Open lesson
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
