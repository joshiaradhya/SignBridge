import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  leaveRoomFn,
  reportPeerFn,
  roomStateFn,
  saveCaptionFn,
  translateSignFn,
} from "@/lib/signconnect.functions";
import { classifySegment, loadLandmarker, motionEnergy, type Landmark } from "@/lib/sign-recognizer";

export const Route = createFileRoute("/connect/$roomId")({
  head: () => ({
    meta: [
      { title: "Live sign call — SignConnect | SignBridge" },
      {
        name: "description",
        content:
          "A peer-to-peer sign language video call with a live transcript of the signs each side makes.",
      },
      { property: "og:title", content: "Live sign call — SignConnect" },
      { property: "og:description", content: "Peer-to-peer video with live sign captions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth what="this call">
      <CallRoom />
    </RequireAuth>
  ),
});

type Caption = { senderId: string; text: string; timestamp: number };

const REPORT_REASONS = ["Inappropriate behaviour", "Nudity", "Harassment", "Spam"];

function CallRoom() {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roomStateCall = useServerFn(roomStateFn);
  const translateSign = useServerFn(translateSignFn);
  const saveCaption = useServerFn(saveCaptionFn);
  const leaveRoomCall = useServerFn(leaveRoomFn);
  const reportPeer = useServerFn(reportPeerFn);

  const localVideo = useRef<HTMLVideoElement | null>(null);
  const remoteVideo = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [prompt, setPrompt] = useState<string | null>(null);
  const [mode, setMode] = useState<"random" | "private">("random");
  const [peerId, setPeerId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [status, setStatus] = useState("Starting camera…");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [detecting, setDetecting] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  const pushCaption = useCallback((c: Caption) => {
    setCaptions((prev) => [...prev.slice(-40), c]);
  }, []);

  // ---- room + webrtc ----
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      let state;
      try {
        state = await roomStateCall({ data: { roomId } });
      } catch {
        setStatus("You are not part of this call.");
        return;
      }
      if (cancelled) return;
      setPrompt(state.room.conversation_prompt);
      setMode(state.room.mode === "private" ? "private" : "random");
      setPeerId(state.peerId);

      const stream = await navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .catch(() => null);
      if (!stream) {
        setStatus("Camera or microphone blocked — allow access and reload.");
        return;
      }
      streamRef.current = stream;
      if (localVideo.current) localVideo.current.srcObject = stream;
      setStatus("Connecting to your partner…");

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.ontrack = (e) => {
        if (remoteVideo.current && e.streams[0]) remoteVideo.current.srcObject = e.streams[0];
        setConnected(true);
        setStatus("Live connection");
      };

      const channel = supabase.channel(`room:${roomId}`, {
        config: { broadcast: { self: false } },
      });
      channelRef.current = channel;

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          channel.send({
            type: "broadcast",
            event: "ice",
            payload: { from: user.id, candidate: e.candidate.toJSON() },
          });
        }
      };

      const initiator = !!state.peerId && user.id < state.peerId;

      channel
        .on("broadcast", { event: "offer" }, async ({ payload }) => {
          if (payload.from === user.id) return;
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.send({ type: "broadcast", event: "answer", payload: { from: user.id, sdp: answer } });
        })
        .on("broadcast", { event: "answer" }, async ({ payload }) => {
          if (payload.from === user.id) return;
          if (!pc.currentRemoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          }
        })
        .on("broadcast", { event: "ice" }, async ({ payload }) => {
          if (payload.from === user.id) return;
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch {
            /* ignore */
          }
        })
        .on("broadcast", { event: "caption" }, ({ payload }) => {
          pushCaption(payload as Caption);
        })
        .on("broadcast", { event: "hello" }, async ({ payload }) => {
          if (payload.from === user.id) return;
          setPeerId(payload.from);
          if (user.id < payload.from) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            channel.send({ type: "broadcast", event: "offer", payload: { from: user.id, sdp: offer } });
          }
        })
        .subscribe(async (s) => {
          if (s !== "SUBSCRIBED") return;
          channel.send({ type: "broadcast", event: "hello", payload: { from: user.id } });
          if (initiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            channel.send({ type: "broadcast", event: "offer", payload: { from: user.id, sdp: offer } });
          }
        });

      cleanup = () => {
        stream.getTracks().forEach((t) => t.stop());
        pc.close();
        supabase.removeChannel(channel);
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [roomId, user, roomStateCall, pushCaption]);

  // ---- local sign recognition ----
  useEffect(() => {
    if (!user) return;
    let raf = 0;
    let stop = false;
    let buffer: Landmark[][] = [];
    let quietFrames = 0;
    let lastEmit = 0;

    (async () => {
      const landmarker = await loadLandmarker().catch(() => null);
      if (!landmarker || stop) return;

      const tick = async () => {
        const video = localVideo.current;
        if (video && video.readyState >= 2) {
          const res = landmarker.detectForVideo(video, performance.now());
          const hand = res.landmarks?.[0] as Landmark[] | undefined;
          if (hand) {
            const prev = buffer[buffer.length - 1];
            const energy = prev ? motionEnergy(prev, hand) : 1;
            buffer.push(hand);
            if (buffer.length > 60) buffer.shift();
            quietFrames = energy < 0.006 ? quietFrames + 1 : 0;
          } else {
            quietFrames += 1;
          }

          // ~400ms pause closes a segment
          if (quietFrames >= 10 && buffer.length >= 8 && Date.now() - lastEmit > 2500) {
            const segment = buffer.slice();
            buffer = [];
            quietFrames = 0;
            const match = classifySegment(segment);
            if (match && match.confidence >= 0.6) {
              lastEmit = Date.now();
              setDetecting(match.label);
              const { text } = await translateSign({ data: { label: match.label } }).catch(() => ({
                text: match.label,
              }));
              setDetecting(null);
              const caption: Caption = { senderId: user.id, text, timestamp: Date.now() };
              pushCaption(caption);
              channelRef.current?.send({ type: "broadcast", event: "caption", payload: caption });
              saveCaption({
                data: { roomId, label: match.label, confidence: match.confidence, text },
              }).catch(() => {});
            }
          }
        }
        if (!stop) raf = requestAnimationFrame(() => void tick());
      };
      void tick();
    })();

    return () => {
      stop = true;
      cancelAnimationFrame(raf);
    };
  }, [user, roomId, translateSign, saveCaption, pushCaption]);

  function toggleMute() {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMuted(!track.enabled);
    }
  }

  function toggleCam() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOff(!track.enabled);
    }
  }

  async function leave() {
    await leaveRoomCall({ data: { roomId } }).catch(() => {});
    navigate({ to: "/connect" });
  }

  return (
    <div className="grid-paper-soft min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl">LIVE SIGN CALL</h1>
          <span
            className={`ink label-caps rounded-lg px-3 py-1 text-xs ${connected ? "bg-primary" : "bg-card"}`}
          >
            {connected ? "● Live connection" : status}
          </span>
        </div>
        {prompt ? (
          <p className="ink mt-4 rounded-xl bg-accent p-3 text-sm">
            Conversation starter: <strong>{prompt}</strong>
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="ink-lg relative overflow-hidden rounded-2xl bg-card">
            <video
              ref={localVideo}
              autoPlay
              playsInline
              muted
              className="aspect-video w-full scale-x-[-1] object-cover"
            />
            <span className="label-caps ink absolute top-3 left-3 rounded-lg bg-card px-2 py-1 text-[10px]">
              You
            </span>
            {detecting ? (
              <span className="label-caps ink absolute right-3 bottom-3 rounded-lg bg-accent px-2 py-1 text-[10px]">
                Translating “{detecting}”…
              </span>
            ) : null}
          </div>
          <div className="ink-lg relative overflow-hidden rounded-2xl bg-card">
            <video ref={remoteVideo} autoPlay playsInline className="aspect-video w-full object-cover" />
            {!connected ? (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Waiting for your partner…
              </p>
            ) : null}
            <span className="label-caps ink absolute top-3 left-3 rounded-lg bg-card px-2 py-1 text-[10px]">
              Partner
            </span>
          </div>
        </div>

        <section className="ink mt-6 rounded-2xl bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">LIVE TRANSCRIPT</h2>
            <span className="label-caps ink rounded-md bg-accent px-2 py-1 text-[10px]">CC</span>
          </div>
          <div className="mt-4 flex max-h-64 flex-col gap-2 overflow-y-auto">
            {captions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sign one of: hello, thank you, please, yes, no, good, sorry, help — captions appear
                here for both of you.
              </p>
            ) : (
              captions.map((c) => (
                <p
                  key={`${c.senderId}-${c.timestamp}`}
                  className={`ink max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    c.senderId === user?.id ? "self-end bg-primary" : "self-start bg-secondary"
                  }`}
                >
                  “{c.text}”
                </p>
              ))
            )}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button className="ink ink-press label-caps rounded-xl bg-card px-4 py-2 text-sm" onClick={toggleMute}>
            {muted ? "Unmute" : "Mute"}
          </button>
          <button className="ink ink-press label-caps rounded-xl bg-card px-4 py-2 text-sm" onClick={toggleCam}>
            {camOff ? "Camera on" : "Camera off"}
          </button>
          {mode === "random" ? (
            <button
              className="ink ink-press label-caps rounded-xl bg-accent px-4 py-2 text-sm"
              onClick={async () => {
                await leaveRoomCall({ data: { roomId } }).catch(() => {});
                navigate({ to: "/connect" });
              }}
            >
              Skip
            </button>
          ) : null}
          <button className="ink ink-press label-caps rounded-xl bg-destructive/20 px-4 py-2 text-sm" onClick={leave}>
            Leave
          </button>
          <button
            className="ink ink-press label-caps ml-auto rounded-xl bg-card px-4 py-2 text-sm"
            onClick={() => setShowReport((v) => !v)}
          >
            Report
          </button>
        </div>

        {showReport ? (
          <div className="ink mt-4 rounded-xl bg-card p-4">
            <p className="label-caps text-xs text-muted-foreground">Why are you reporting?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r}
                  className="ink ink-press label-caps rounded-lg bg-background px-3 py-2 text-xs"
                  onClick={async () => {
                    await reportPeer({
                      data: { roomId, reason: r, ...(peerId ? { reportedId: peerId } : {}) },
                    }).catch(() => {});
                    setShowReport(false);
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
