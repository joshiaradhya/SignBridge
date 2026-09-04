import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const findPartnerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { language: string; level: string; interests: string[] }) => d)
  .handler(async ({ data, context }) => {
    const { findPartner } = await import("./signconnect.server");
    return findPartner(context.userId, data);
  });

export const pollQueueFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { queueId: string }) => d)
  .handler(async ({ data, context }) => {
    const { pollQueue } = await import("./signconnect.server");
    return pollQueue(context.userId, data.queueId);
  });

export const cancelQueueFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { queueId: string }) => d)
  .handler(async ({ data, context }) => {
    const { cancelQueue } = await import("./signconnect.server");
    return cancelQueue(context.userId, data.queueId);
  });

export const createRoomFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { createPrivateRoom } = await import("./signconnect.server");
    return createPrivateRoom(context.userId);
  });

export const joinRoomFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => d)
  .handler(async ({ data, context }) => {
    const { joinPrivateRoom } = await import("./signconnect.server");
    return joinPrivateRoom(context.userId, data.code);
  });

export const roomStateFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { roomId: string }) => d)
  .handler(async ({ data, context }) => {
    const { roomState } = await import("./signconnect.server");
    return roomState(context.userId, data.roomId);
  });

export const leaveRoomFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { roomId: string }) => d)
  .handler(async ({ data, context }) => {
    const { leaveRoom } = await import("./signconnect.server");
    return leaveRoom(context.userId, data.roomId);
  });

export const sendCallSignalFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    roomId: string;
    recipientId: string;
    signalType: "offer" | "answer" | "ice";
    payload: Record<string, unknown>;
  }) => d)
  .handler(async ({ data, context }) => {
    const { sendCallSignal } = await import("./signconnect.server");
    return sendCallSignal(context.userId, data);
  });

export const getCallSignalsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { roomId: string; afterId: number }) => d)
  .handler(async ({ data, context }) => {
    const { getCallSignals } = await import("./signconnect.server");
    return getCallSignals(context.userId, data.roomId, data.afterId);
  });

export const saveCaptionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { roomId: string; label: string; confidence: number; text: string }) => d)
  .handler(async ({ data, context }) => {
    const { saveCaption } = await import("./signconnect.server");
    return saveCaption(context.userId, data);
  });

export const reportPeerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { roomId: string; reason: string; reportedId?: string }) => d)
  .handler(async ({ data, context }) => {
    const { reportPeer } = await import("./signconnect.server");
    return reportPeer(context.userId, data);
  });

export const translateSignFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { label: string }) => d)
  .handler(async ({ data }) => {
    const { phraseLabel } = await import("./signconnect.server");
    return phraseLabel(data.label);
  });
