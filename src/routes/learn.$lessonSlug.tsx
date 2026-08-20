import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { lessonsQuery, signsQuery, type Sign } from "@/lib/signbridge";
import { signImage } from "@/lib/sign-images";

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
    <article className="ink-lg rounded-2xl bg-card p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="ink label-caps flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm">
          {index + 1}
        </span>
        <h2 className="text-3xl">{sign.gloss}</h2>
        <span className="ink label-caps rounded-full bg-accent px-3 py-1 text-[11px]">
          {sign.meaning}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="ink overflow-hidden rounded-xl bg-background">
          <img
            src={signImage(sign.image_key)}
            alt={`Annotated illustration showing how to sign ${sign.gloss}: ${sign.movement}`}
            width={1024}
            height={768}
            loading="lazy"
            className="w-full"
          />
        </div>

        <div className="grid gap-3">
          <Field label="Handshape" value={sign.handshape} />
          <Field label="Location" value={sign.location} />
          <Field label="Movement" value={sign.movement} />
          <Field label="Expression" value={sign.expression} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
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

      <Link
        to="/practice"
        search={{ sign: sign.slug }}
        className="ink ink-press label-caps mt-6 inline-block rounded-xl bg-primary px-5 py-3 text-sm"
      >
        Try it on camera
      </Link>
    </article>
  );
}

function LessonPage() {
  const { lessonSlug } = Route.useParams();
  const lessons = useQuery(lessonsQuery);
  const signs = useQuery(signsQuery);

  const lesson = (lessons.data ?? []).find((l) => l.slug === lessonSlug);
  const lessonSigns = lesson ? (signs.data ?? []).filter((s) => s.lesson_id === lesson.id) : [];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="grid-paper-soft min-h-screen">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <Link to="/learn" className="label-caps text-xs underline">
            ← All lessons
          </Link>

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
                <h1 className="mt-4 text-4xl">{lesson.title.toUpperCase()}</h1>
                <p className="mt-3 text-sm leading-relaxed">{lesson.summary}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Reference source: {lesson.source}
                </p>
              </div>

              <div className="mt-8 space-y-8">
                {lessonSigns.map((sign, i) => (
                  <SignEntry key={sign.id} sign={sign} index={i} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
