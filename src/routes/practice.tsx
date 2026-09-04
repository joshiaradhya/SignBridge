import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { signsQuery, lessonsQuery } from "@/lib/signbridge";
import { coursesQuery, DIFFICULTIES, type Difficulty } from "@/lib/learning";
import { SignVisual } from "@/components/SignVisual";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { analyseAttempt, type Result } from "@/lib/attempt-analysis";

export const Route = createFileRoute("/practice")({
  validateSearch: (search: Record<string, unknown>): { sign?: string } =>
    typeof search["sign"] === "string" ? { sign: search["sign"] } : {},

  head: () => ({
    meta: [
      { title: "SignLab practice studio — sign on camera | SignBridge" },
      {
        name: "description",
        content:
          "Turn on your camera, mirror your hands and practise ASL or ISL signs against the reference illustration. Attempts are scored and saved to your progress.",
      },
      { property: "og:title", content: "SignLab practice studio — SignBridge" },
      {
        property: "og:description",
        content: "Practise ASL and ISL signs on camera with mirror mode and instant feedback.",
      },
    ],
  }),
  component: Practice,
});

function Practice() {
  const { sign: signParam } = Route.useSearch();
  const signs = useQuery(signsQuery);
  const lessons = useQuery(lessonsQuery);
  const { user } = useAuth();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [mirror, setMirror] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [selected, setSelected] = useState<string | undefined>(signParam);
  const [lang, setLang] = useState<"all" | "ASL" | "ISL">("all");
  const [level, setLevel] = useState<"all" | Difficulty>("all");
  const [search, setSearch] = useState("");
  // Arriving from "Try it on camera" should show that sign only, not the whole library.
  const [browseAll, setBrowseAll] = useState(!signParam);


  const courses = useQuery(coursesQuery);
  const allSigns = signs.data ?? [];
  const allLessons = lessons.data ?? [];
  const allCourses = courses.data ?? [];
  const activeSign = allSigns.find((s) => s.slug === (selected ?? signParam)) ?? allSigns[0];
  const activeLesson = allLessons.find((l) => l.id === activeSign?.lesson_id);

  const groups = allLessons
    .map((lesson) => {
      const course = allCourses.find((c) => c.id === lesson.course_id);
      const language = course?.language ?? lesson.language;
      const q = search.trim().toLowerCase();
      const items = allSigns.filter(
        (s) =>
          s.lesson_id === lesson.id &&
          (!q || s.gloss.toLowerCase().includes(q) || s.meaning.toLowerCase().includes(q)),
      );
      return {
        key: lesson.id,
        title: (course ? `${course.title} · ${lesson.title}` : lesson.title).toUpperCase(),
        language,
        difficulty: course?.difficulty ?? null,
        signs: items,
      };
    })
    .filter(
      (g) =>
        g.signs.length > 0 &&
        (lang === "all" || g.language === lang) &&
        (level === "all" || g.difficulty === level),
    );

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (!signParam) return;
    setSelected(signParam);
    setBrowseAll(false);
    setResult(null);
  }, [signParam]);


  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      // the <video> element mounts once cameraOn is true
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setError(
        "We couldn't access your camera. Allow camera permission in your browser and try again.",
      );
    }
  }

  async function runAttempt() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraOn) return;

    setRecording(true);
    setResult(null);

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const W = (canvas.width = 160);
    const H = (canvas.height = 120);

    let prev: Uint8ClampedArray | null = null;
    let total = 0;
    let samples = 0;
    let activePixels = 0;
    let sampledPixels = 0;
    let weightX = 0;
    let weightY = 0;
    let weightSum = 0;
    let faceMotion = 0;
    const energies: number[] = [];
    const durationMs = 3000;
    const start = performance.now();

    await new Promise<void>((resolve) => {
      const tick = () => {
        const elapsed = performance.now() - start;
        setCountdown(Math.max(0, Math.ceil((durationMs - elapsed) / 1000)));
        ctx.drawImage(video, 0, 0, W, H);
        const frame = ctx.getImageData(0, 0, W, H).data;
        if (prev) {
          const previous: Uint8ClampedArray = prev;
          let diff = 0;
          let count = 0;
          for (let i = 0; i < frame.length; i += 16) {
            const d = Math.abs((frame[i] ?? 0) - (previous[i] ?? 0));
            diff += d;
            count += 1;
            if (d > 18) {
              const px = (i / 4) % W;
              const py = Math.floor(i / 4 / W);
              activePixels += 1;
              weightX += px / W;
              weightY += py / H;
              weightSum += 1;
              if (py / H < 0.35) faceMotion += 1;
            }
          }
          sampledPixels += count;
          const e = diff / count / 255;
          energies.push(e * 100);
          total += e;
          samples += 1;
        }
        prev = new Uint8ClampedArray(frame);
        if (elapsed < durationMs) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });

    setRecording(false);
    setCountdown(0);

    const energy = samples > 0 ? (total / samples) * 100 : 0;
    const mean = energy;
    const jitter =
      energies.length > 1
        ? Math.sqrt(
            energies.reduce((s, e) => s + (e - mean) ** 2, 0) / energies.length,
          )
        : 0;

    const analysis = analyseAttempt(
      {
        energy,
        detail: sampledPixels > 0 ? activePixels / sampledPixels : 0,
        centroidX: weightSum > 0 ? weightX / weightSum : 0.5,
        centroidY: weightSum > 0 ? weightY / weightSum : 0.5,
        faceBand: activePixels > 0 ? faceMotion / activePixels : 0,
        jitter,
      },
      activeSign,
    );
    setResult(analysis);

    if (user && activeSign) {
      await supabase.from("attempts").insert({
        user_id: user.id,
        sign_id: activeSign.id,
        confidence: analysis.score,
        feedback: analysis.feedback,
      });
    }
  }


  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="grid-paper min-h-screen">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h1 className="text-4xl">SIGNLAB</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed">
            Your camera feed stays in your browser — nothing is uploaded. Pick a sign, read the
            movement note, then record a three-second attempt.
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section className="ink-lg rounded-2xl bg-card p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl">CAMERA</h2>
                <button
                  onClick={() => setMirror((m) => !m)}
                  className="ink ink-press label-caps rounded-full bg-background px-3 py-1.5 text-[11px]"
                >
                  Mirror mode: {mirror ? "on" : "off"}
                </button>
              </div>

              <div className="ink mt-4 aspect-video w-full overflow-hidden rounded-xl bg-muted">
                {cameraOn ? (
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="h-full w-full object-cover"
                    style={mirror ? { transform: "scaleX(-1)" } : undefined}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Your camera preview will appear here.
                    </p>
                    <button
                      onClick={startCamera}
                      className="ink ink-press label-caps rounded-xl bg-primary px-5 py-3 text-sm"
                    >
                      Turn on camera
                    </button>
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />

              {error ? (
                <p className="ink mt-4 rounded-xl bg-destructive/10 p-3 text-sm">{error}</p>
              ) : null}

              {cameraOn ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={runAttempt}
                    disabled={recording}
                    className="ink ink-press label-caps rounded-xl bg-accent px-5 py-3 text-sm disabled:opacity-60"
                  >
                    {recording ? `Recording… ${countdown}` : "Record 3s attempt"}
                  </button>
                  <button
                    onClick={stopCamera}
                    className="ink ink-press label-caps rounded-xl bg-background px-4 py-3 text-xs"
                  >
                    Stop camera
                  </button>
                </div>
              ) : null}

              {result ? (
                <div className="ink mt-4 rounded-xl bg-primary p-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="label-caps text-[11px]">Attempt score</p>
                      <p className="font-display text-4xl font-extrabold">{result.score}%</p>
                    </div>
                    <p className="label-caps text-[11px]">
                      {result.criteria.filter((c) => c.matched).length}/4 components matched
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{result.feedback}</p>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {result.criteria.map((c) => (
                      <div key={c.key} className="ink rounded-xl bg-card p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="label-caps text-[11px]">{c.label}</span>
                          <span
                            className={`ink label-caps rounded-full px-2 py-0.5 text-[10px] ${
                              c.matched ? "bg-accent" : "bg-background"
                            }`}
                          >
                            {c.matched ? "Matched" : "Needs work"} · {c.score}%
                          </span>
                        </div>
                        <div className="ink mt-2 h-2 w-full overflow-hidden rounded-full bg-background">
                          <div
                            className={c.matched ? "h-full bg-accent" : "h-full bg-muted-foreground"}
                            style={{ width: `${c.score}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{c.note}</p>
                      </div>
                    ))}
                  </div>

                  <div className="ink mt-4 rounded-xl bg-card p-3">
                    <p className="label-caps text-[11px]">Tips for your next attempt</p>
                    <ul className="mt-2 space-y-1.5 text-xs leading-relaxed">
                      {result.tips.map((t) => (
                        <li key={t} className="flex gap-2">
                          <span aria-hidden>→</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {!user ? (
                    <p className="mt-3 text-xs">
                      <Link to="/auth" className="underline">
                        Sign in
                      </Link>{" "}
                      to save attempts to your progress.
                    </p>
                  ) : null}
                </div>
              ) : null}

            </section>

            <section className="ink-lg rounded-2xl bg-card p-4 sm:p-6">
              <h2 className="text-xl">REFERENCE</h2>

              {activeSign ? (
                <div className="mt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="ink label-caps rounded-full bg-accent px-3 py-1 text-[11px]">
                      {activeSign.gloss}
                    </span>
                    <span className="text-xs text-muted-foreground">{activeSign.meaning}</span>
                  </div>
                  <div className="ink mt-3 overflow-hidden rounded-xl">
                    <SignVisual sign={activeSign} />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed">{activeSign.movement}</p>
                  {activeLesson ? (
                    <Link
                      to="/learn/$lessonSlug"
                      params={{ lessonSlug: activeLesson.slug }}
                      className="label-caps mt-3 inline-block text-xs underline"
                    >
                      Read full documentation
                    </Link>
                  ) : null}
                </div>
              ) : null}

              <button
                onClick={() => setBrowseAll((v) => !v)}
                className="ink ink-press label-caps mt-5 w-full rounded-xl bg-background px-3 py-2 text-[11px]"
              >
                {browseAll ? "Hide the full sign library" : "Browse all signs"}
              </button>

              {browseAll ? (
                <>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Categorised the same way as the course catalogue — filter, then pick a sign.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Chip active={lang === "all"} onClick={() => setLang("all")} label="All" />
                    <Chip active={lang === "ASL"} onClick={() => setLang("ASL")} label="ASL" />
                    <Chip active={lang === "ISL"} onClick={() => setLang("ISL")} label="ISL" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Chip
                      active={level === "all"}
                      onClick={() => setLevel("all")}
                      label="Any level"
                    />
                    {DIFFICULTIES.map((d) => (
                      <Chip
                        key={d.key}
                        active={level === d.key}
                        onClick={() => setLevel(d.key)}
                        label={d.label}
                      />
                    ))}
                  </div>
                  <div className="mt-2">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search a sign…"
                      className="ink ink-focus w-full rounded-xl bg-background px-3 py-2 text-sm outline-none"
                    />
                  </div>

                  <div className="mt-4 max-h-[420px] space-y-4 overflow-y-auto pr-1">
                    {groups.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No signs match these filters yet — try another category.
                      </p>
                    ) : null}
                    {groups.map((g) => (
                      <div key={g.key}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="label-caps text-[11px]">{g.title}</span>
                          <span className="ink label-caps rounded-full bg-background px-2 py-0.5 text-[9px]">
                            {g.language}
                          </span>
                          {g.difficulty ? (
                            <span className="label-caps text-[9px] text-muted-foreground">
                              {g.difficulty}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 grid gap-2">
                          {g.signs.map((s) => {
                            const isActive = s.id === activeSign?.id;
                            return (
                              <button
                                key={s.id}
                                onClick={() => {
                                  setSelected(s.slug);
                                  setResult(null);
                                }}
                                className={`ink ink-press hover-lift rounded-xl px-3 py-2 text-left text-sm ${
                                  isActive ? "bg-accent" : "bg-background"
                                }`}
                              >
                                <span className="label-caps text-xs">{s.gloss}</span>
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {s.meaning}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`ink ink-press label-caps rounded-full px-3 py-1 text-[11px] ${
        active ? "bg-primary" : "bg-background"
      }`}
    >
      {label}
    </button>
  );
}
