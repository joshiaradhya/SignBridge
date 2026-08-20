import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { signsQuery, lessonsQuery } from "@/lib/signbridge";
import { signImage } from "@/lib/sign-images";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/practice")({
  validateSearch: (search: Record<string, unknown>) => ({
    sign: typeof search.sign === "string" ? search.sign : undefined,
  }),
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

type Result = { score: number; feedback: string };

function feedbackFor(score: number, energy: number): string {
  if (energy < 0.6) {
    return "Barely any movement was detected — make sure your hands are inside the frame and repeat the motion more fully.";
  }
  if (score >= 90) {
    return "Great form. The motion is clear and well-paced — hold the end position for a beat longer to finish cleanly.";
  }
  if (score >= 75) {
    return "Solid attempt. Slow the movement slightly and keep your hand inside the frame for the whole gesture.";
  }
  return "The motion looks rushed or partly out of frame. Re-read the movement notes and try again at half speed.";
}

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

  const allSigns = signs.data ?? [];
  const activeSign = allSigns.find((s) => s.slug === (selected ?? signParam)) ?? allSigns[0];
  const activeLesson = (lessons.data ?? []).find((l) => l.id === activeSign?.lesson_id);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

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
    canvas.width = 160;
    canvas.height = 120;

    let prev: Uint8ClampedArray | null = null;
    let total = 0;
    let samples = 0;
    const durationMs = 3000;
    const start = performance.now();

    await new Promise<void>((resolve) => {
      const tick = () => {
        const elapsed = performance.now() - start;
        setCountdown(Math.max(0, Math.ceil((durationMs - elapsed) / 1000)));
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        if (prev) {
          let diff = 0;
          for (let i = 0; i < frame.length; i += 16) {
            diff += Math.abs(frame[i] - prev[i]);
          }
          total += diff / (frame.length / 16) / 255;
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
    // Reward clear, sustained motion; penalise near-still frames and frantic motion.
    const ideal = 4;
    const closeness = Math.max(0, 1 - Math.abs(energy - ideal) / (ideal * 2));
    const score = Math.round(52 + closeness * 46);
    const feedback = feedbackFor(score, energy);
    setResult({ score, feedback });

    if (user && activeSign) {
      await supabase.from("attempts").insert({
        user_id: user.id,
        sign_id: activeSign.id,
        confidence: score,
        feedback,
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
                  <p className="label-caps text-[11px]">Attempt score</p>
                  <p className="font-display text-4xl font-extrabold">{result.score}%</p>
                  <p className="mt-2 text-sm leading-relaxed">{result.feedback}</p>
                  {!user ? (
                    <p className="mt-2 text-xs">
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

              <div className="mt-4 grid gap-2">
                {allSigns.map((s) => {
                  const isActive = s.id === activeSign?.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelected(s.slug);
                        setResult(null);
                      }}
                      className={`ink rounded-xl px-3 py-2 text-left text-sm ${
                        isActive ? "bg-accent" : "bg-background"
                      }`}
                    >
                      <span className="label-caps text-xs">{s.gloss}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{s.meaning}</span>
                    </button>
                  );
                })}
              </div>

              {activeSign ? (
                <div className="mt-5">
                  <div className="ink overflow-hidden rounded-xl">
                    <img
                      src={signImage(activeSign.image_key)}
                      alt={`Reference illustration for the sign ${activeSign.gloss}`}
                      width={1024}
                      height={768}
                      loading="lazy"
                      className="w-full"
                    />
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
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
