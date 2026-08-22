import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { RequireAuth } from "@/components/RequireAuth";
import {
  cancelQueueFn,
  createRoomFn,
  findPartnerFn,
  joinRoomFn,
  pollQueueFn,
} from "@/lib/signconnect.functions";

export const Route = createFileRoute("/connect/")({
  head: () => ({
    meta: [
      { title: "SignConnect — live sign video calls with captions | SignBridge" },
      {
        name: "description",
        content:
          "Match with another signer or open a private room with a share code, then talk over video while your own device turns your signs into live captions.",
      },
      { property: "og:title", content: "SignConnect — live sign video calls" },
      {
        property: "og:description",
        content: "Random matching or a private room code, with live sign-to-text captions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth what="SignConnect">
      <ConnectLanding />
    </RequireAuth>
  ),
});

const LANGUAGES = ["EITHER", "ASL", "ISL"] as const;
const LEVELS = ["beginner", "intermediate", "fluent"] as const;
const INTERESTS = ["Everyday chat", "Travel", "Study", "Gaming", "Work"] as const;

type Screen = "choose" | "filters" | "private";

function ConnectLanding() {
  const navigate = useNavigate();
  const findPartner = useServerFn(findPartnerFn);
  const pollQueue = useServerFn(pollQueueFn);
  const cancelQueue = useServerFn(cancelQueueFn);
  const createRoom = useServerFn(createRoomFn);
  const joinRoom = useServerFn(joinRoomFn);

  const [screen, setScreen] = useState<Screen>("choose");
  const [language, setLanguage] = useState<string>("EITHER");
  const [level, setLevel] = useState<string>("beginner");
  const [interests, setInterests] = useState<string[]>([]);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdRoom, setCreatedRoom] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!queueId) return;
    timer.current = setInterval(async () => {
      const res = await pollQueue({ data: { queueId } });
      if (res.status === "matched" && res.roomId) {
        setQueueId(null);
        navigate({ to: "/connect/$roomId", params: { roomId: res.roomId } });
      }
    }, 2500);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [queueId, pollQueue, navigate]);

  useEffect(() => {
    if (!createdRoom) return;
    const id = setInterval(async () => {
      const { roomStateFn } = await import("@/lib/signconnect.functions");
      try {
        const state = await roomStateFn({ data: { roomId: createdRoom } });
        if (state.participants.length >= 2) {
          navigate({ to: "/connect/$roomId", params: { roomId: createdRoom } });
        }
      } catch {
        /* keep waiting */
      }
    }, 2500);
    return () => clearInterval(id);
  }, [createdRoom, navigate]);

  async function run<T>(fn: () => Promise<T>, after: (v: T) => void) {
    setBusy(true);
    setError(null);
    try {
      after(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid-paper-soft min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-4xl">CONNECT WITH SOMEONE</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          A 1:1 video call where each device reads your own signs locally and turns them into live
          captions both of you can read.
        </p>

        {error ? (
          <p className="ink mt-6 rounded-xl bg-destructive/10 p-3 text-sm">{error}</p>
        ) : null}

        {queueId ? (
          <div className="ink-lg mt-8 rounded-2xl bg-card p-8">
            <h2 className="text-2xl">LOOKING FOR A PARTNER…</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Hang tight — we'll drop you into the call as soon as someone compatible is waiting.
            </p>
            <button
              className="ink ink-press label-caps mt-6 rounded-xl bg-card px-5 py-3 text-sm"
              onClick={() =>
                run(
                  () => cancelQueue({ data: { queueId } }),
                  () => setQueueId(null),
                )
              }
            >
              Cancel
            </button>
          </div>
        ) : screen === "choose" ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <button
              className="ink-lg ink-press rounded-2xl bg-card p-8 text-left"
              onClick={() => setScreen("filters")}
            >
              <h2 className="text-2xl">MEET SOMEONE NEW</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Get matched with another signer at your level.
              </p>
            </button>
            <button
              className="ink-lg ink-press rounded-2xl bg-primary p-8 text-left"
              onClick={() => setScreen("private")}
            >
              <h2 className="text-2xl">TALK TO SOMEONE YOU KNOW</h2>
              <p className="mt-3 text-sm">Create a code to share, or join with one.</p>
            </button>
          </div>
        ) : screen === "filters" ? (
          <div className="ink-lg mt-8 rounded-2xl bg-card p-8">
            <h2 className="text-2xl">FIND A PARTNER</h2>

            <p className="label-caps mt-6 text-xs text-muted-foreground">Language</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`ink ink-press label-caps rounded-lg px-3 py-2 text-xs ${language === l ? "bg-accent" : "bg-card"}`}
                >
                  {l}
                </button>
              ))}
            </div>

            <p className="label-caps mt-6 text-xs text-muted-foreground">Level</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`ink ink-press label-caps rounded-lg px-3 py-2 text-xs ${level === l ? "bg-accent" : "bg-card"}`}
                >
                  {l}
                </button>
              ))}
            </div>

            <p className="label-caps mt-6 text-xs text-muted-foreground">Interests</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <button
                  key={i}
                  onClick={() =>
                    setInterests((prev) =>
                      prev.includes(i) ? prev.filter((p) => p !== i) : [...prev, i],
                    )
                  }
                  className={`ink ink-press label-caps rounded-lg px-3 py-2 text-xs ${interests.includes(i) ? "bg-primary" : "bg-card"}`}
                >
                  {i}
                </button>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                disabled={busy}
                className="ink ink-press label-caps rounded-xl bg-accent px-5 py-3 text-sm"
                onClick={() =>
                  run(
                    () => findPartner({ data: { language, level, interests } }),
                    (res) => {
                      if (res.status === "matched" && res.roomId) {
                        navigate({ to: "/connect/$roomId", params: { roomId: res.roomId } });
                      } else if (res.queueId) {
                        setQueueId(res.queueId);
                      }
                    },
                  )
                }
              >
                {busy ? "Searching…" : "Find a partner"}
              </button>
              <button
                className="ink ink-press label-caps rounded-xl bg-card px-5 py-3 text-sm"
                onClick={() => setScreen("choose")}
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <div className="ink-lg mt-8 rounded-2xl bg-card p-8">
            <h2 className="text-2xl">PRIVATE ROOM</h2>
            {createdCode ? (
              <div className="mt-6">
                <p className="label-caps text-xs text-muted-foreground">Share this code</p>
                <p className="mt-2 text-5xl tracking-[0.2em]">{createdCode}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    className="ink ink-press label-caps rounded-xl bg-accent px-5 py-3 text-sm"
                    onClick={() => navigator.clipboard?.writeText(createdCode)}
                  >
                    Copy code
                  </button>
                  {createdRoom ? (
                    <button
                      className="ink ink-press label-caps rounded-xl bg-card px-5 py-3 text-sm"
                      onClick={() =>
                        navigate({ to: "/connect/$roomId", params: { roomId: createdRoom } })
                      }
                    >
                      Enter room now
                    </button>
                  ) : null}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">Waiting for them to join…</p>
              </div>
            ) : (
              <>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    disabled={busy}
                    className="ink ink-press label-caps rounded-xl bg-accent px-5 py-3 text-sm"
                    onClick={() =>
                      run(
                        () => createRoom({}),
                        (res) => {
                          setCreatedCode(res.code);
                          setCreatedRoom(res.roomId);
                        },
                      )
                    }
                  >
                    Create a room
                  </button>
                </div>
                <p className="label-caps mt-8 text-xs text-muted-foreground">Join with a code</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="F3K9QX"
                    maxLength={6}
                    className="ink rounded-xl bg-background px-4 py-3 text-lg tracking-[0.2em] uppercase"
                  />
                  <button
                    disabled={busy || code.length < 4}
                    className="ink ink-press label-caps rounded-xl bg-primary px-5 py-3 text-sm"
                    onClick={() =>
                      run(
                        () => joinRoom({ data: { code } }),
                        (res) =>
                          navigate({ to: "/connect/$roomId", params: { roomId: res.roomId } }),
                      )
                    }
                  >
                    Join
                  </button>
                </div>
                <button
                  className="ink ink-press label-caps mt-8 rounded-xl bg-card px-5 py-3 text-sm"
                  onClick={() => setScreen("choose")}
                >
                  Back
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
