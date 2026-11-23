import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  leaveRoomFn,
  getCallSignalsFn,
  reportPeerFn,
  roomStateFn,
  saveCaptionFn,
  sendCallSignalFn,
  translateSignFn,
} from "@/lib/signconnect.functions";
import { classifyIslSegment } from "@/lib/isl-model";
import { loadLandmarker, motionEnergy, type Landmark } from "@/lib/sign-recognizer";
import { classifySignAttempt, normalizeFrame, type Point3D } from "@/lib/ml";
import { phraseLabel } from "@/lib/signconnect-phrasing";

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
  const getCallSignals = useServerFn(getCallSignalsFn);
  const sendCallSignal = useServerFn(sendCallSignalFn);
  const reportPeer = useServerFn(reportPeerFn);

  // useServerFn returns a new function identity on every render. Keeping them in a
  // ref stops the call/recognition effects from tearing down the camera and the peer
  // connection each time a caption or status update re-renders this component.
  const fns = useRef({ roomStateCall, translateSign, saveCaption, getCallSignals, sendCallSignal });
  fns.current = { roomStateCall, translateSign, saveCaption, getCallSignals, sendCallSignal };


  const localVideo = useRef<HTMLVideoElement | null>(null);
  const remoteVideo = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const joiningRef = useRef(false);

  const [prompt, setPrompt] = useState<string | null>(null);
  const [mode, setMode] = useState<"random" | "private">("random");
  const [peerId, setPeerId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [status, setStatus] = useState("Camera not started");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [detecting, setDetecting] = useState<string | null>(null);
  const [signLang, setSignLang] = useState<"ISL" | "ASL">("ISL");
  const [showReport, setShowReport] = useState(false);
  const [armed, setArmed] = useState(false);
  const [joining, setJoining] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  const pushCaption = useCallback((c: Caption) => {
    setCaptions((prev) => [...prev.slice(-40), c]);
  }, []);

  // ---- room + webrtc ----
  const userId = user?.id ?? null;

  async function requestMediaAndJoin() {
    if (joiningRef.current) return;
    joiningRef.current = true;
    setJoining(true);
    setMediaError(null);
    setStatus("Waiting for camera permission…");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new Error("unsupported"), { name: "NotSupportedError" });
      }

      // Constrain resolution to 720p 30fps max to avoid burning CPU on 4K cameras
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, max: 1280 },
            height: { ideal: 720, max: 720 },
            frameRate: { ideal: 30, max: 30 },
            facingMode: { ideal: "user" },
          },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch (first) {
        const name = (first as { name?: string })?.name ?? "";
        if (name === "NotAllowedError" || name === "SecurityError") throw first;

        try {
          // A busy or unavailable microphone should not prevent sign video from working.
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280, max: 1280 },
              height: { ideal: 720, max: 720 },
              facingMode: { ideal: "user" },
            },
            audio: false,
          });
        } catch {
          // Relaxed fallback for cameras that don't support facingMode or resolution constraints
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
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
      joiningRef.current = false;
      setJoining(false);
    }
  }

  // Auto-attempt camera start on arrival if not already armed
  useEffect(() => {
    if (!armed && !joiningRef.current) {
      void requestMediaAndJoin();
    }
  }, []);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      remoteStreamRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (armed && localVideo.current && streamRef.current) {
      if (localVideo.current.srcObject !== streamRef.current) {
        localVideo.current.srcObject = streamRef.current;
      }
      void localVideo.current.play().catch(() => {});
    }
  }, [armed]);

  // Ensure remote video element always retains remote stream across React renders
  useEffect(() => {
    if (remoteVideo.current && remoteStreamRef.current) {
      if (remoteVideo.current.srcObject !== remoteStreamRef.current) {
        remoteVideo.current.srcObject = remoteStreamRef.current;
      }
      void remoteVideo.current.play().catch(() => {
        if (remoteVideo.current) {
          remoteVideo.current.muted = true;
          remoteVideo.current.play().catch(() => {});
          setPlaybackBlocked(true);
        }
      });
    }
  }, [hasRemoteVideo, connected]);

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
      if (state.room.status === "ended") {
        setStatus("This call has already ended.");
        return;
      }
      setPrompt(state.room.conversation_prompt);
      setMode(state.room.mode === "private" ? "private" : "random");
      setPeerId(state.peerId);
      setStatus("Connecting to your partner…");

      const pc = new RTCPeerConnection({
        iceCandidatePoolSize: 10,
        iceServers: [
          {
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:stun1.l.google.com:19302",
              "stun:stun2.l.google.com:19302",
              "stun:global.stun.twilio.com:3478",
            ],
          },
          {
            urls: [
              "turn:openrelay.metered.ca:80",
              "turn:openrelay.metered.ca:443",
              "turn:openrelay.metered.ca:443?transport=tcp",
              "turns:openrelay.metered.ca:443?transport=tcp",
            ],
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ],
      });
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.ontrack = (e) => {
        const track = e.track;
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = e.streams && e.streams[0] ? e.streams[0] : new MediaStream();
        }
        if (!remoteStreamRef.current.getTracks().some((t) => t.id === track.id)) {
          remoteStreamRef.current.addTrack(track);
        }
        if (remoteVideo.current && remoteVideo.current.srcObject !== remoteStreamRef.current) {
          remoteVideo.current.srcObject = remoteStreamRef.current;
        }
        setHasRemoteVideo(true);
        setConnected(true);
        setStatus("Live connection");

        if (remoteVideo.current) {
          remoteVideo.current
            .play()
            .then(() => {
              setPlaybackBlocked(false);
            })
            .catch(() => {
              // If unmuted autoplay fails, play muted immediately so partner's video displays
              if (remoteVideo.current) {
                remoteVideo.current.muted = true;
                remoteVideo.current.play().catch(() => {});
                setPlaybackBlocked(true);
              }
            });
        }

        track.onunmute = () => {
          setHasRemoteVideo(true);
          setConnected(true);
          if (remoteVideo.current) {
            if (remoteVideo.current.srcObject !== remoteStreamRef.current) {
              remoteVideo.current.srcObject = remoteStreamRef.current;
            }
            remoteVideo.current.play().catch(() => {
              if (remoteVideo.current) {
                remoteVideo.current.muted = true;
                remoteVideo.current.play().catch(() => {});
                setPlaybackBlocked(true);
              }
            });
          }
        };

        track.onended = () => {
          if (remoteStreamRef.current) {
            const active = remoteStreamRef.current.getTracks().filter((t) => t.readyState === "live");
            if (!active.some((t) => t.kind === "video")) {
              setHasRemoteVideo(false);
            }
          }
        };
      };

      const channel = supabase.channel(`room:${roomId}`, {
        config: {
          broadcast: { self: false, ack: true },
          presence: { key: userId },
        },
      });
      channelRef.current = channel;

      // Queue signalling messages until the channel is actually subscribed
      let subscribed = false;
      const outbox: { event: string; payload: Record<string, unknown> }[] = [];

      const send = (event: string, payload: Record<string, unknown>) => {
        const message = { ...payload, from: userId, to: peer };

        // 1. Instant WebSocket broadcast for sub-50ms peer signaling
        if (subscribed) {
          void channel.send({ type: "broadcast", event, payload: message });
        } else {
          outbox.push({ event, payload: message });
        }

        // 2. Persistent fallback to Postgres via TanStack Start (for offer/answer only, or ice if unsubscribed)
        if (event === "offer" || event === "answer" || (!subscribed && event === "ice")) {
          if (!peer) return;
          const recipientId = peer;
          fns.current
            .sendCallSignal({
              data: {
                roomId,
                recipientId,
                signalType: event as "offer" | "answer" | "ice",
                payload: message,
              },
            })
            .catch(() => {});
        }
      };

      const addressedToMe = (payload: { from?: string; to?: string | null } | undefined) =>
        Boolean(payload?.from && payload.from !== userId && (!payload.to || payload.to === userId));

      // perfect-negotiation state
      let peer: string | null = state.peerId;
      let makingOffer = false;
      let ignoreOffer = false;
      const pendingIce: RTCIceCandidateInit[] = [];
      const pendingLocalIce: RTCIceCandidateInit[] = [];
      let initialDescriptionSent = false;
      const seenSignals = new Set<string>();

      const sendPendingLocalIce = () => {
        while (pendingLocalIce.length) {
          const candidate = pendingLocalIce.shift();
          if (candidate) send("ice", { candidate });
        }
      };

      const drainIce = async () => {
        while (pendingIce.length) {
          const c = pendingIce.shift();
          if (!c) continue;
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
      };

      // Immediate offer creation with deadlock prevention
      const startOffer = async (force = false) => {
        if (!peer) return;
        const polite = userId < peer;
        if (!force && polite) return; // impolite offers by default; polite offers if forced or stalled
        if (makingOffer) return;
        if (pc.remoteDescription && pc.signalingState === "stable") return;
        if (pc.signalingState === "have-local-offer") {
          if (force && pc.localDescription) {
            send("offer", { from: userId, sdp: pc.localDescription });
          }
          return;
        }
        if (pc.signalingState !== "stable") return;
        try {
          makingOffer = true;
          initialDescriptionSent = false;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          send("offer", { sdp: pc.localDescription });
          initialDescriptionSent = true;
          sendPendingLocalIce();
        } catch {
          /* retried by the heartbeat */
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
          initialDescriptionSent = false;
          if (pc.signalingState === "have-local-offer") {
            await pc.setLocalDescription({ type: "rollback" });
          }
          if (pc.signalingState !== "stable") return;
          const offer = await pc.createOffer({ iceRestart: true });
          await pc.setLocalDescription(offer);
          send("offer", { sdp: pc.localDescription });
          initialDescriptionSent = true;
          sendPendingLocalIce();
        } catch {
          /* retried by the heartbeat below */
        } finally {
          makingOffer = false;
        }
      };

      pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        const candidate = e.candidate.toJSON();
        if (!initialDescriptionSent) pendingLocalIce.push(candidate);
        else send("ice", { candidate });
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

      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState;
        if (s === "connected" || s === "completed") {
          setConnected(true);
          setStatus("Live connection");
        } else if (s === "checking") {
          setStatus("Connecting to your partner…");
        }
      };

      const receiveSignal = async (row: {
        id: number | string;
        sender_id: string;
        signal_type: string;
        payload: unknown;
      }) => {
        const payload = row.payload as {
          from?: string;
          to?: string | null;
          sdp?: RTCSessionDescriptionInit;
          candidate?: RTCIceCandidateInit;
        };
        const sigKey = `${row.signal_type}-${row.sender_id}-${JSON.stringify(payload.candidate?.candidate || payload.sdp?.sdp?.slice(0, 30))}`;
        if (seenSignals.has(sigKey) || row.sender_id === userId) return;
        seenSignals.add(sigKey);
        if (!addressedToMe(payload)) return;
        peer = row.sender_id;
        setPeerId(row.sender_id);

        if (row.signal_type === "offer" && payload.sdp) {
          const polite = userId < row.sender_id;
          const collision = makingOffer || pc.signalingState !== "stable";
          ignoreOffer = !polite && collision;
          if (ignoreOffer) return;
          try {
            if (collision) await pc.setLocalDescription({ type: "rollback" });
            await pc.setRemoteDescription(payload.sdp);
            await drainIce();
            initialDescriptionSent = false;
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            // Send answer immediately
            send("answer", { sdp: pc.localDescription });
            initialDescriptionSent = true;
            sendPendingLocalIce();
          } catch (err) {
            console.warn("[WebRTC] Offer handling error:", err);
          }
        } else if (row.signal_type === "answer" && payload.sdp) {
          if (pc.signalingState !== "have-local-offer") return;
          await pc.setRemoteDescription(payload.sdp).then(drainIce).catch((err) => {
            console.warn("[WebRTC] Answer handling error:", err);
          });
        } else if (row.signal_type === "ice" && payload.candidate) {
          if (!pc.remoteDescription) pendingIce.push(payload.candidate);
          else await pc.addIceCandidate(payload.candidate).catch(() => pendingIce.push(payload.candidate as RTCIceCandidateInit));
        }
      };

      channel
        .on("broadcast", { event: "caption" }, ({ payload }) => {
          pushCaption(payload as Caption);
        })
        .on("broadcast", { event: "offer" }, ({ payload }) => {
          if (addressedToMe(payload as Record<string, unknown>)) {
            void receiveSignal({
              id: `ws-${Date.now()}-${Math.random()}`,
              sender_id: (payload as { from: string }).from,
              signal_type: "offer",
              payload,
            });
          }
        })
        .on("broadcast", { event: "answer" }, ({ payload }) => {
          if (addressedToMe(payload as Record<string, unknown>)) {
            void receiveSignal({
              id: `ws-${Date.now()}-${Math.random()}`,
              sender_id: (payload as { from: string }).from,
              signal_type: "answer",
              payload,
            });
          }
        })
        .on("broadcast", { event: "ice" }, ({ payload }) => {
          if (addressedToMe(payload as Record<string, unknown>)) {
            void receiveSignal({
              id: `ws-${Date.now()}-${Math.random()}`,
              sender_id: (payload as { from: string }).from,
              signal_type: "ice",
              payload,
            });
          }
        })
        .on("broadcast", { event: "hello" }, ({ payload }) => {
          if (!addressedToMe(payload)) return;
          const isNewPeer = peer !== payload.from;
          peer = payload.from;
          setPeerId(payload.from);
          if (!payload.reply) send("hello", { reply: true });
          void startOffer(!isNewPeer);
        })
        .on("broadcast", { event: "bye" }, () => {
          setStatus("Your partner has left the call.");
          setConnected(false);
          setHasRemoteVideo(false);
          setPeerId(null);
          if (remoteVideo.current) {
            remoteVideo.current.srcObject = null;
          }
        })
        .on("presence", { event: "sync" }, () => {
          const presentIds = Object.keys(channel.presenceState()).filter((id) => id !== userId);
          const presentPeer = presentIds[0];
          if (!presentPeer) return;
          peer = presentPeer;
          setPeerId(presentPeer);
          send("hello", { reply: false });
          void startOffer(true);
        })
        .subscribe((s) => {
          if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
            setStatus("Reconnecting to the call…");
            return;
          }
          if (s !== "SUBSCRIBED") return;
          subscribed = true;
          void channel.track({ userId, joinedAt: new Date().toISOString() });
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

      let lastSignalId = 0;
      let readingSignals = false;
      const pollSignals = async () => {
        // Back off polling if already connected or busy
        if (readingSignals || pc.signalingState === "closed" || pc.connectionState === "connected") return;
        readingSignals = true;
        try {
          const rows = await fns.current.getCallSignals({ data: { roomId, afterId: lastSignalId } });
          for (const row of rows) {
            lastSignalId = Math.max(lastSignalId, Number(row.id));
            await receiveSignal(row as Parameters<typeof receiveSignal>[0]);
          }
        } finally {
          readingSignals = false;
        }
      };
      void pollSignals();
      const signalPoll = window.setInterval(() => void pollSignals(), 1000);

      let beats = 0;
      let handshakeDone = false;
      const heartbeat = window.setInterval(async () => {
        const s = pc.connectionState;
        if (s === "closed") return;
        beats += 1;
        handshakeDone = Boolean(pc.remoteDescription) && pc.signalingState === "stable";

        if (s === "connected") return;

        // If peer is still unknown, check roomState periodically to break race condition
        if (!peer && beats % 2 === 0) {
          try {
            const freshState = await fns.current.roomStateCall({ data: { roomId } });
            if (freshState.peerId) {
              peer = freshState.peerId;
              setPeerId(freshState.peerId);
              send("hello", { reply: false });
              void startOffer(false);
            }
          } catch {
            /* ignore transient errors */
          }
        }

        if (!handshakeDone) {
          send("hello", { reply: false });
          // Break deadlock: if polite peer waited > 2 beats with no offer, initiate offer
          if (beats % 2 === 0) {
            void startOffer(beats >= 3);
          }
          return;
        }

        // Descriptions exchanged. Give ICE time, then restart it if it stalled.
        if (
          beats % 10 === 0 &&
          (s === "failed" || s === "disconnected" || pc.iceConnectionState === "failed")
        ) {
          void renegotiate();
        }
      }, 1000);

      cleanup = () => {
        window.clearInterval(heartbeat);
        window.clearInterval(signalPoll);
        try {
          void channel.send({ type: "broadcast", event: "bye", payload: { from: userId } });
        } catch {
          /* noop */
        }
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        pc.oniceconnectionstatechange = null;
        pc.onsignalingstatechange = null;
        pc.close();
        pcRef.current = null;
        remoteStreamRef.current = null;
        channelRef.current = null;
        if (localVideo.current) localVideo.current.srcObject = null;
        if (remoteVideo.current) remoteVideo.current.srcObject = null;
        void supabase.removeChannel(channel);
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [roomId, userId, armed, pushCaption]);


  // ---- local sign recognition (throttled to ~13 FPS to keep WebRTC smooth & CPU cool) ----
  useEffect(() => {
    if (!userId || !armed) return;
    let raf = 0;
    let stop = false;
    let buffer: Landmark[][] = [];
    let normBuffer: Float32Array[] = [];
    let quietFrames = 0;
    let lastEmit = 0;
    let lastFrameTime = 0;
    let lastLandmarkTimestamp = 0;
    let isProcessing = false;
    const FRAME_INTERVAL_MS = 75; // ~13 FPS prevents UI thread starvation and audio/video lag

    (async () => {
      const landmarker = await loadLandmarker().catch(() => null);
      if (!landmarker || stop) return;

      const tick = async () => {
        if (stop) return;
        const now = performance.now();

        // If camera is turned off by user, skip detection completely
        if (camOff) {
          if (!stop) raf = requestAnimationFrame(() => void tick());
          return;
        }

        // Throttle frame processing to prevent CPU starvation
        if (now - lastFrameTime >= FRAME_INTERVAL_MS && !isProcessing) {
          lastFrameTime = now;
          isProcessing = true;

          try {
            const video = localVideo.current;
            if (video && video.readyState >= 2 && video.videoWidth > 0) {
              const landmarkTimestamp = Math.max(now, lastLandmarkTimestamp + 1);
              lastLandmarkTimestamp = landmarkTimestamp;
              const res = landmarker.detectForVideo(video, landmarkTimestamp);

              // Flatten up to two detected hands
              const hand = res.landmarks?.flat() as Landmark[] | undefined;
              if (hand && hand.length > 0) {
                const prev = buffer[buffer.length - 1];
                const energy = prev ? motionEnergy(prev, hand) : 1;
                buffer.push(hand);
                if (buffer.length > 40) buffer.shift();

                // Store normalized frame conforming to Schema v2.0.0
                const left = (res.landmarks?.[0] as Point3D[]) ?? null;
                const right = (res.landmarks?.[1] as Point3D[]) ?? null;
                normBuffer.push(normalizeFrame({ leftHand: left, rightHand: right }));
                if (normBuffer.length > 40) normBuffer.shift();

                quietFrames = energy < 0.008 ? quietFrames + 1 : 0;
              } else {
                quietFrames += 1;
              }

              // ~350-400ms pause closes a segment
              if (quietFrames >= 5 && buffer.length >= 6 && now - lastEmit > 2200) {
                const segment = buffer.slice();
                const normSegment = normBuffer.slice();
                buffer = [];
                normBuffer = [];
                quietFrames = 0;

                // Run classification detached so recognition loop doesn't stall
                void (async () => {
                  try {
                    const match = await classifySignAttempt(signLang, normSegment, segment);
                    if (match && match.confidence >= 0.6) {
                      lastEmit = performance.now();
                      setDetecting(match.label);
                      const text = phraseLabel(match.label);
                      setTimeout(() => setDetecting(null), 800);
                      const caption: Caption = { senderId: userId, text, timestamp: Date.now() };
                      pushCaption(caption);
                      channelRef.current?.send({ type: "broadcast", event: "caption", payload: caption });
                      fns.current.saveCaption({
                        data: { roomId, label: match.label, confidence: match.confidence, text },
                      }).catch(() => {});
                    }
                  } catch (classifyErr) {
                    console.warn("[SignConnect Classification Error]", classifyErr);
                  }
                })();
              }
            }
          } catch (err) {
            console.warn("[SignConnect Recognition Error]", err);
          } finally {
            isProcessing = false;
          }
        }

        if (!stop) {
          raf = requestAnimationFrame(() => void tick());
        }
      };
      void tick();
    })();

    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      buffer = [];
      normBuffer = [];
    };
  }, [userId, armed, roomId, pushCaption, signLang, camOff]);

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
            <video
              ref={remoteVideo}
              autoPlay
              playsInline
              className={`aspect-video w-full object-cover ${hasRemoteVideo ? "block" : "bg-muted"}`}
            />
            {!hasRemoteVideo ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {status === "Live connection" ? "Receiving video track…" : status}
                </p>
              </div>
            ) : null}
            <span className="label-caps ink absolute top-3 left-3 rounded-lg bg-card px-2 py-1 text-[10px]">
              Partner
            </span>
            {playbackBlocked ? (
              <button
                type="button"
                className="ink ink-press label-caps absolute right-3 bottom-3 rounded-lg bg-primary px-3 py-2 text-xs"
                onClick={() => {
                  if (remoteVideo.current) {
                    remoteVideo.current.muted = false;
                    void remoteVideo.current
                      .play()
                      .then(() => {
                        setPlaybackBlocked(false);
                      })
                      .catch(() => {});
                  }
                }}
              >
                Unmute partner audio
              </button>
            ) : null}
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
          <div className="flex items-center rounded-xl bg-card p-1 border border-border">
            <button
              className={`label-caps rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                signLang === "ISL"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setSignLang("ISL")}
            >
              ISL
            </button>
            <button
              className={`label-caps rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                signLang === "ASL"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setSignLang("ASL")}
            >
              ASL
            </button>
          </div>
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
