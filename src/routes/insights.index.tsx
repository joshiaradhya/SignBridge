import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { insightsQuery } from "@/lib/learning";

export const Route = createFileRoute("/insights/")({
  head: () => ({
    meta: [
      { title: "Insights — Deaf culture & sign language articles | SignBridge" },
      {
        name: "description",
        content:
          "Short, sourced reads about Deaf culture, the history of ASL and ISL, etiquette when meeting Deaf people, accessibility technology and learning strategy.",
      },
      { property: "og:title", content: "Insights — Deaf culture & sign language" },
      {
        property: "og:description",
        content: "Articles on Deaf culture, sign language history, etiquette and accessibility.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InsightsIndex,
});

function InsightsIndex() {
  const insights = useQuery(insightsQuery);
  const categories = [...new Set((insights.data ?? []).map((i) => i.category))];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="grid-paper-soft min-h-screen">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="text-4xl">INSIGHTS</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed">
            Learning the signs is half of it. These short reads cover Deaf culture, how sign
            languages actually work, etiquette, accessibility technology and how to get fluent
            faster.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {categories.map((c) => (
              <span key={c} className="ink label-caps rounded-full bg-card px-3 py-1 text-[11px]">
                {c}
              </span>
            ))}
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(insights.data ?? []).map((article) => (
              <article key={article.id} className="ink-lg flex flex-col rounded-2xl bg-card p-6">
                <span className="ink label-caps inline-block w-fit rounded-full bg-primary px-3 py-1 text-[10px]">
                  {article.category}
                </span>
                <h2 className="mt-4 text-xl">{article.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {article.excerpt}
                </p>
                <Link
                  to="/insights/$slug"
                  params={{ slug: article.slug }}
                  className="ink ink-press label-caps mt-5 inline-block w-fit rounded-xl bg-accent px-4 py-2 text-xs"
                >
                  Read · {article.read_minutes} min
                </Link>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
