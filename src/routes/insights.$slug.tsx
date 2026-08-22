import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { insightsQuery } from "@/lib/learning";

export const Route = createFileRoute("/insights/$slug")({
  head: () => ({
    meta: [
      { title: "Insight — Deaf culture & sign language | SignBridge" },
      {
        name: "description",
        content:
          "An in-depth SignBridge read on Deaf culture, sign language or accessibility.",
      },
      { property: "og:title", content: "SignBridge Insights" },
      {
        property: "og:description",
        content: "Reading on Deaf culture, sign language and accessibility.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InsightDetail,
});

function InsightDetail() {
  const { slug } = Route.useParams();
  const insights = useQuery(insightsQuery);
  const article = (insights.data ?? []).find((i) => i.slug === slug);
  const others = (insights.data ?? []).filter((i) => i.slug !== slug).slice(0, 3);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="grid-paper-soft min-h-screen">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <Link to="/insights" className="label-caps text-xs underline">
            ← All insights
          </Link>

          {insights.isLoading ? (
            <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
          ) : !article ? (
            <p className="mt-8 text-sm">That article doesn't exist.</p>
          ) : (
            <>
              <span className="ink label-caps mt-6 inline-block rounded-full bg-primary px-3 py-1 text-[10px]">
                {article.category} · {article.read_minutes} min read
              </span>
              <h1 className="mt-4 text-4xl leading-tight">{article.title}</h1>
              <p className="mt-3 text-sm text-muted-foreground">{article.excerpt}</p>
              <div className="ink-lg mt-8 space-y-4 rounded-2xl bg-card p-6 text-sm leading-relaxed">
                {article.body.split("\n\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>

              <h2 className="mt-12 text-2xl">KEEP READING</h2>
              <div className="mt-4 grid gap-3">
                {others.map((o) => (
                  <Link
                    key={o.id}
                    to="/insights/$slug"
                    params={{ slug: o.slug }}
                    className="ink rounded-xl bg-card p-4 transition-transform hover:-translate-y-0.5"
                  >
                    <p className="label-caps text-sm">{o.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{o.excerpt}</p>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
