import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import aslHello from "@/assets/asl-hello.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SignBridge — Learn ASL & ISL with documented signs" },
      {
        name: "description",
        content:
          "SignBridge teaches sign language through annotated illustrations, written movement notes and a live camera practice studio. Free ASL and ISL starter lessons.",
      },
      { property: "og:title", content: "SignBridge — Learn ASL & ISL" },
      {
        property: "og:description",
        content:
          "Documented ASL and ISL lessons with annotated illustrations plus a camera practice studio.",
      },
    ],
  }),
  component: Home,
});

const pillars = [
  {
    title: "LEARN",
    to: "/learn" as const,
    body: "Documentation-style lessons: annotated illustrations, handshape, location, movement and the mistake to avoid. No video required.",
  },
  {
    title: "SIGNLAB",
    to: "/practice" as const,
    body: "A camera practice studio with mirror mode, so you can watch your own hands while you copy the reference notes.",
  },
  {
    title: "PROGRESS",
    to: "/dashboard" as const,
    body: "Every practice attempt is scored and saved, so you can see which signs still need work.",
  },
];


function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="grid-paper-soft border-b-2 border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <div className="ink-lg mx-auto w-full max-w-6xl rounded-3xl bg-card p-8 sm:p-14">
            <h1 className="text-4xl leading-[1.05] sm:text-6xl">
              Learn the language.
              <br />
              Master the sign.
              <br />
              Bridge the connection.
            </h1>
            <p className="ink mt-8 rounded-xl bg-background p-5 text-sm leading-relaxed sm:text-base">
              SignBridge is a sign-language-first learning space, not a translator. Read the
              documented sign, study the annotated illustration, then turn on your camera and
              practise the motion yourself.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/learn"
                className="ink ink-press label-caps rounded-xl bg-accent px-5 py-3 text-sm"
              >
                Start learning
              </Link>
              <Link
                to="/practice"
                className="ink ink-press label-caps rounded-xl bg-primary px-5 py-3 text-sm"
              >
                Open SignLab
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-border bg-background">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-3">
          {pillars.map((p) => (
            <article key={p.title} className="ink rounded-2xl bg-card p-6">
              <h2 className="text-2xl">{p.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid-paper border-b-2 border-border">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 md:grid-cols-2">
          <div className="ink-lg overflow-hidden rounded-2xl bg-card">
            <img
              src={aslHello}
              alt="Annotated illustration of the ASL sign for hello, with an arrow showing the hand arcing outward from the temple"
              width={1024}
              height={768}
              className="w-full"
            />
          </div>
          <div>
            <h2 className="text-3xl">EVERY SIGN, WRITTEN DOWN</h2>
            <p className="mt-4 text-sm leading-relaxed">
              Each sign entry documents the handshape, where it starts, how it moves, the facial
              expression that carries the meaning, and the mistake learners make most often — with
              a step-by-step breakdown you can follow at your own pace.
            </p>
            <Link
              to="/learn"
              className="ink ink-press label-caps mt-6 inline-block rounded-xl bg-card px-5 py-3 text-sm"
            >
              Browse the lessons
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 py-10 text-xs text-muted-foreground">
        <p className="label-caps">© 2026 SignBridge</p>
        <p className="mt-2">
          Data &amp; credits: reference material informed by the ASLLVD (ASL) and INCLUDE (ISL,
          CC BY 4.0) datasets. Illustrations are original diagrams, not redistributed dataset media.
        </p>
      </footer>
    </div>
  );
}
