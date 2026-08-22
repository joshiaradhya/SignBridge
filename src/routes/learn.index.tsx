import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { RequireAuth } from "@/components/RequireAuth";
import { useLearnerStats } from "@/hooks/useLearnerStats";
import { DIFFICULTIES, type Difficulty } from "@/lib/learning";

type Search = { level?: Difficulty; lang?: string; topic?: string };

export const Route = createFileRoute("/learn/")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const out: Search = {};
    const level = search["level"];
    if (typeof level === "string" && DIFFICULTIES.some((d) => d.key === level))
      out.level = level as Difficulty;
    const lang = search["lang"];
    if (lang === "ASL" || lang === "ISL") out.lang = lang;
    const topic = search["topic"];
    if (typeof topic === "string" && topic) out.topic = topic;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Course catalogue — ASL & ISL courses | SignBridge" },
      {
        name: "description",
        content:
          "Browse SignBridge courses across Basic, Intermediate, Advanced and Conversation levels in American and Indian Sign Language, with lesson-by-lesson progress.",
      },
      { property: "og:title", content: "Course catalogue — SignBridge" },
      {
        property: "og:description",
        content: "ASL and ISL courses from alphabet fundamentals to real conversations.",
      },
    ],
  }),
  component: LearnIndex,
});

function LearnIndex() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <RequireAuth what="the course catalogue">
        <Catalogue />
      </RequireAuth>
    </div>
  );
}

function Catalogue() {
  const { level, lang, topic } = Route.useSearch();
  const s = useLearnerStats();

  const topics = [...new Set(s.courses.map((c) => c.topic))];

  const shown = s.courseProgress.filter(
    ({ course }) =>
      (!level || course.difficulty === level) &&
      (!lang || course.language === lang) &&
      (!topic || course.topic === topic),
  );

  const completedByLevel = (d: Difficulty) =>
    s.courseProgress.filter(
      (c) => c.course.difficulty === d && c.total > 0 && c.done === c.total,
    ).length;

  const isLocked = (d: Difficulty) => {
    if (d === "basic" || d === "conversation") return false;
    if (d === "intermediate") return completedByLevel("basic") === 0;
    return completedByLevel("intermediate") === 0;
  };

  return (
    <div className="grid-paper-soft min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-4xl">COURSE CATALOGUE</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed">
          Documented, image-and-text courses in ASL and ISL. Work through Basic before
          Intermediate, Intermediate before Advanced — Conversation courses are always open when
          you want practical phrases.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Chip to={{}} active={!level && !lang && !topic} label="All" />
          {DIFFICULTIES.map((d) => (
            <Chip key={d.key} to={{ level: d.key }} active={level === d.key} label={d.label} />
          ))}
          <span className="mx-1 w-px bg-border" />
          <Chip to={{ lang: "ASL" }} active={lang === "ASL"} label="ASL" />
          <Chip to={{ lang: "ISL" }} active={lang === "ISL"} label="ISL" />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {topics.map((t) => (
            <Chip key={t} to={{ topic: t }} active={topic === t} label={t} />
          ))}
        </div>

        {s.loading ? <p className="mt-10 text-sm text-muted-foreground">Loading courses…</p> : null}

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {shown.map(({ course, done, total, percent }) => {
            const locked = isLocked(course.difficulty);
            return (
              <article key={course.id} className="ink-lg flex flex-col rounded-2xl bg-card p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="ink label-caps rounded-full bg-primary px-3 py-1 text-[10px]">
                    {course.language}
                  </span>
                  <span className="ink label-caps rounded-full bg-background px-3 py-1 text-[10px]">
                    {course.difficulty}
                  </span>
                  <span className="label-caps text-[10px] text-muted-foreground">
                    {course.topic}
                  </span>
                </div>
                <h2 className="mt-4 text-xl">{course.title.toUpperCase()}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {course.description}
                </p>

                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="label-caps">
                    {done}/{total} lessons
                  </span>
                  <span className="label-caps">{percent}%</span>
                </div>
                <div className="ink mt-2 h-3 overflow-hidden rounded-full bg-background">
                  <div className="h-full bg-accent" style={{ width: `${percent}%` }} />
                </div>

                {locked ? (
                  <p className="mt-5 text-xs text-muted-foreground">
                    Finish a{" "}
                    {course.difficulty === "intermediate" ? "Basic" : "Intermediate"} course to
                    unlock — you can still peek inside.
                  </p>
                ) : null}

                <Link
                  to="/learn/course/$courseSlug"
                  params={{ courseSlug: course.slug }}
                  className="ink ink-press label-caps mt-5 inline-block w-fit rounded-xl bg-accent px-5 py-3 text-sm"
                >
                  {done > 0 ? "Continue" : "Start course"}
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Chip({ to, active, label }: { to: Search; active: boolean; label: string }) {
  return (
    <Link
      to="/learn"
      search={to}
      className={`ink label-caps rounded-full px-3 py-1 text-[11px] ${
        active ? "bg-primary" : "bg-card"
      }`}
    >
      {label}
    </Link>
  );
}
