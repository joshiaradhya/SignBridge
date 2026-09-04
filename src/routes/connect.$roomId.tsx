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

  // useServerFn returns a new function identity on every render. Keeping them in a
  // ref stops the call/recognition effects from tearing down the camera and the peer
  // connection each time a caption or status update re-renders this component.
  const fns = useRef({ roomStateCall, translateSign, saveCaption });
  fns.current = { roomStateCall, translateSign, saveCaption };


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
  const [status, setStatus] = useState("Camera not started");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [detecting, setDetecting] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [armed, setArmed] = useState(false);
  const [joining, setJoining] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const pushCaption = useCallback((c: Caption) => {
    setCaptions((prev) => [...prev.slice(-40), c]);
  }, []);

  // ---- room + webrtc ----
  const userId = user?.id ?? null;

  async function requestMediaAndJoin() {
    if (joining) return;
    setJoining(true);
    setMediaError(null);
    setStatus("Waiting for camera permission…");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new Error("unsupported"), { name: "NotSupportedError" });
      }

      // Keep these constraints deliberately relaxed. Exact device, resolution, and
      // frame-rate constraints can reject before browsers display their permission UI.
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch (first) {
        const name = (first as { name?: string })?.name ?? "";
        if (name === "NotAllowedError" || name === "SecurityError") throw first;

        // A busy or unavailable microphone should not prevent sign video from working.
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      if (localVideo.current) {
        localVideo.current.srcObject = stream;
        await localVideo.current.play().catch(() => {});
      }
      setArmed(true);
      setStatus("Joining the room…");
    } catch (err) {
      const name = (err as { name?: string })?.name ?? "";
      setMediaError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Camera and microphone access was blocked. Allow it in your browser's address bar, then try again."
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? "No available camera was found on this device."
            : name === "NotReadableError" || name === "AbortError"
              ? "Your camera is in use by another app. Close it, then try again."
              : "Could not start your camera. Open this page in a new browser tab and try again.",
      );
      setStatus("Camera not started");
    } finally {
      setJoining(false);
    }
  }

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!userId || !armed) return;
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      const stream = streamRef.current;
      if (!stream || stream.getVideoTracks().every((track) => track.readyState === "ended")) {
        setArmed(false);
        setStatus("Camera not started");
        return;
      }
      if (cancelled) {
        return;
      }
      if (localVideo.current) localVideo.current.srcObject = stream;
      setStatus("Joining the room…");

      let state;
      try {
        state = await fns.current.roomStateCall({ data: { roomId } });
      } catch {
        setStatus("You are not part of this call.");
        return;
      }
      if (cancelled) {
        return;
      }
      setPrompt(state.room.conversation_prompt);
      setMode(state.room.mode === "private" ? "private" : "random");
      setPeerId(state.peerId);
      setStatus("Connecting to your partner…");


      const pc = new RTCPeerConnection({
        iceCandidatePoolSize: 10,
        iceServers: [
          { urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] },
          {
            urls: [
              "turn:openrelay.metered.ca:80",
              "turn:openrelay.metered.ca:443",
              "turn:openrelay.metered.ca:443?transport=tcp",
            ],
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ],
      });
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const remoteStream = new MediaStream();
      if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream;
      pc.ontrack = (e) => {
        const tracks = e.streams[0]?.getTracks() ?? [e.track];
        tracks.forEach((t) => {
          if (!remoteStream.getTracks().includes(t)) remoteStream.addTrack(t);
        });
        if (remoteVideo.current && remoteVideo.current.srcObject !== remoteStream) {
          remoteVideo.current.srcObject = remoteStream;
        }
        void remoteVideo.current?.play().catch(() => {});
      };

      const channel = supabase.channel(`room:${roomId}`, {
        config: { broadcast: { self: false, ack: false } },
      });
      channelRef.current = channel;

      // queue signalling messages until the channel is actually subscribed
      let subscribed = false;
      const outbox: { event: string; payload: Record<string, unknown> }[] = [];
      const send = (event: string, payload: Record<string, unknown>) => {
        if (subscribed) void channel.send({ type: "broadcast", event, payload });
        else outbox.push({ event, payload });
      };

      // perfect-negotiation state
      let peer: string | null = state.peerId;
      let makingOffer = false;
      let ignoreOffer = false;
      const pendingIce: RTCIceCandidateInit[] = [];

      const drainIce = async () => {
        while (pendingIce.length) {
          const c = pendingIce.shift();
          if (!c) continue;
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
      };

      // Only the peer with the larger id creates the offer (the "impolite" side).
      // `force` re-broadcasts an offer we already made: the very first offer is often
      // sent before the other side has finished subscribing, so it is simply lost.
      const startOffer = async (force = false) => {
        if (!peer || userId < peer) return;
        if (makingOffer) return;
        if (pc.signalingState === "have-local-offer") {
          if (force && pc.localDescription) {
            send("offer", { from: userId, sdp: pc.localDescription });
          }
          return;
        }
        if (pc.signalingState !== "stable") return;
        try {
          makingOffer = true;
          await pc.setLocalDescription(await pc.createOffer());
          send("offer", { from: userId, sdp: pc.localDescription });
        } catch {
          /* retried by the heartbeat below */
        } finally {
          makingOffer = false;
        }
      };

      // Throw away a stalled negotiation and start a fresh one with new ICE candidates.
      const renegotiate = async () => {
        if (!peer || userId < peer) return;
        if (makingOffer || pc.signalingState === "closed") return;
        try {
          makingOffer = true;
          if (pc.signalingState === "have-local-offer") {
            await pc.setLocalDescription({ type: "rollback" });
          }
          if (pc.signalingState !== "stable") return;
          await pc.setLocalDescription(await pc.createOffer({ iceRestart: true }));
          send("offer", { from: userId, sdp: pc.localDescription });
        } catch {
          /* retried by the heartbeat below */
        } finally {
          makingOffer = false;
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) send("ice", { from: userId, candidate: e.candidate.toJSON() });
      };
      pc.onnegotiationneeded = () => {
        void startOffer();
      };
      pc.onsignalingstatechange = () => {
        if (pc.signalingState === "stable" && pc.remoteDescription) void drainIce();
      };


      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === "connected") {
          setConnected(true);
          setStatus("Live connection");
        } else if (s === "disconnected") {
          setStatus("Reconnecting…");
        } else if (s === "failed") {
          setConnected(false);
          setStatus("Connection failed — try leaving and rejoining.");
          try {
            pc.restartIce();
          } catch {
            /* noop */
          }
        } else if (s === "closed") {
          setConnected(false);
        }
      };

      channel
        .on("broadcast", { event: "offer" }, async ({ payload }) => {
          if (!payload?.from || payload.from === userId) return;
          peer = payload.from;
          setPeerId(payload.from);
          const polite = userId < payload.from;
          const collision = makingOffer || pc.signalingState !== "stable";
          ignoreOffer = !polite && collision;
          if (ignoreOffer) return;
          try {
            if (collision) {
              await pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit);
            }
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            await drainIce();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            send("answer", { from: userId, sdp: pc.localDescription });
          } catch {
            /* ignore malformed offer */
          }
        })
        .on("broadcast", { event: "answer" }, async ({ payload }) => {
          if (!payload?.from || payload.from === userId) return;
          if (pc.signalingState !== "have-local-offer") return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            await drainIce();
          } catch {
            /* ignore */
          }
        })
        .on("broadcast", { event: "ice" }, async ({ payload }) => {
          if (!payload?.from || payload.from === userId) return;
          if (!pc.remoteDescription) {
            pendingIce.push(payload.candidate);
            return;
          }
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {
            if (!ignoreOffer) pendingIce.push(payload.candidate);
          });
        })
        .on("broadcast", { event: "caption" }, ({ payload }) => {
          pushCaption(payload as Caption);
        })
        .on("broadcast", { event: "hello" }, ({ payload }) => {
          if (!payload?.from || payload.from === userId) return;
          const isNewPeer = peer !== payload.from;
          peer = payload.from;
          setPeerId(payload.from);
          if (!payload.reply) send("hello", { from: userId, reply: true });
          // A peer that just (re)appeared may have missed our earlier offer.
          void startOffer(!isNewPeer);
        })
        .subscribe((s) => {
          if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
            setStatus("Reconnecting to the call…");
            return;
          }
          if (s !== "SUBSCRIBED") return;
          subscribed = true;
          void channel.send({
            type: "broadcast",
            event: "hello",
            payload: { from: userId, reply: false },
          });
          while (outbox.length) {
            const m = outbox.shift();
            if (!m) continue;
            void channel.send({ type: "broadcast", event: m.event, payload: m.payload });
          }
          void startOffer();
        });

      // Re-announce ourselves until the media actually flows. This covers the case
      // where one side subscribed to the channel before the other was listening,
      // and re-sends the offer if the first one was lost (which is what stalled
      // desktop-to-desktop calls: both tabs subscribe at almost the same moment).
      let beats = 0;
      const heartbeat = window.setInterval(() => {
        const s = pc.connectionState;
        if (s === "connected" || s === "closed") {
          beats = 0;
          return;
        }
        beats += 1;
        send("hello", { from: userId, reply: false });
        // Still stuck after ~6s: gather fresh candidates and send a new offer.
        if (beats % 6 === 0 && (pc.signalingState === "have-local-offer" || s === "failed")) {
          void renegotiate();
        } else {
          void startOffer(true);
        }
      }, 1000);


      cleanup = () => {
        window.clearInterval(heartbeat);
        pc.close();
        pcRef.current = null;
        channelRef.current = null;
        void supabase.removeChannel(channel);
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [roomId, userId, armed, pushCaption]);


  // ---- local sign recognition ----
  useEffect(() => {
    if (!userId || !armed) return;
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
              const { text } = await fns.current.translateSign({ data: { label: match.label } }).catch(() => ({
                text: match.label,
              }));
              setDetecting(null);
              const caption: Caption = { senderId: userId, text, timestamp: Date.now() };
              pushCaption(caption);
              channelRef.current?.send({ type: "broadcast", event: "caption", payload: caption });
              fns.current.saveCaption({
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
  }, [userId, armed, roomId, pushCaption]);

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

        {!armed ? (
          <section className="ink-lg mt-6 rounded-2xl bg-card p-6">
            <h2 className="text-xl">READY TO JOIN?</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              This call needs your camera and microphone. Press the button below and your browser
              will ask for permission — nothing is recorded, and sign recognition runs on your own
              device.
            </p>
            {mediaError ? (
              <p className="ink mt-4 rounded-xl bg-destructive/20 p-3 text-sm">{mediaError}</p>
            ) : null}
            <button
              type="button"
              disabled={joining}
              className="ink ink-press label-caps mt-5 rounded-xl bg-primary px-5 py-3 text-sm"
              onClick={() => void requestMediaAndJoin()}
            >
              {joining ? "Waiting for permission…" : mediaError ? "Try again" : "Allow camera & mic and join"}
            </button>
          </section>
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
                // Skip means "next partner", so go straight back into matchmaking.
                navigate({ to: "/connect", search: { auto: true } });
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
