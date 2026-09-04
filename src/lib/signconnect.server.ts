import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

const PROMPTS = [
  "Introduce yourself",
  "Talk about your favorite game",
  "Order food without speaking",
];

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

async function addParticipant(roomId: string, userId: string) {
  await supabaseAdmin
    .from("room_participants")
    .upsert({ room_id: roomId, user_id: userId }, { onConflict: "room_id,user_id" });
}

export async function findPartner(
  userId: string,
  input: { language: string; level: string; interests: string[] },
) {
  // clear any stale rows for this user
  await supabaseAdmin
    .from("match_queue")
    .update({ status: "cancelled" })
    .eq("user_id", userId)
    .eq("status", "waiting");

  const { data: waiting } = await supabaseAdmin
    .from("match_queue")
    .select("*")
    .eq("status", "waiting")
    .neq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(10);

  const partner = (waiting ?? []).find(
    (row) =>
      row.language === input.language || row.language === "EITHER" || input.language === "EITHER",
  );

  if (partner) {
    const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)]!;
    const { data: room, error } = await supabaseAdmin
      .from("rooms")
      .insert({ mode: "random", status: "active", conversation_prompt: prompt })
      .select("id")
      .single();
    if (error || !room) throw new Error("Could not open a room");

    await addParticipant(room.id, userId);
    await addParticipant(room.id, partner.user_id);
    await supabaseAdmin
      .from("match_queue")
      .update({ status: "matched", room_id: room.id })
      .in("id", [partner.id]);

    return { status: "matched" as const, roomId: room.id, queueId: null };
  }

  const { data: row, error } = await supabaseAdmin
    .from("match_queue")
    .insert({
      user_id: userId,
      language: input.language,
      level: input.level,
      interests: input.interests,
    })
    .select("id")
    .single();
  if (error || !row) throw new Error("Could not join the queue");
  return { status: "waiting" as const, roomId: null, queueId: row.id };
}

export async function pollQueue(userId: string, queueId: string) {
  const { data } = await supabaseAdmin
    .from("match_queue")
    .select("status, room_id")
    .eq("id", queueId)
    .eq("user_id", userId)
    .maybeSingle();
  return { status: data?.status ?? "cancelled", roomId: data?.room_id ?? null };
}

export async function cancelQueue(userId: string, queueId: string) {
  await supabaseAdmin
    .from("match_queue")
    .update({ status: "cancelled" })
    .eq("id", queueId)
    .eq("user_id", userId);
  return { ok: true };
}

export async function createPrivateRoom(userId: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = makeCode();
    const { data, error } = await supabaseAdmin
      .from("rooms")
      .insert({ mode: "private", status: "waiting_for_peer", room_code: code })
      .select("id, room_code")
      .single();
    if (!error && data) {
      await addParticipant(data.id, userId);
      return { roomId: data.id, code: data.room_code! };
    }
  }
  throw new Error("Could not create a room, please try again");
}

export async function joinPrivateRoom(userId: string, code: string) {
  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("id, status")
    .eq("room_code", code.trim().toUpperCase())
    .maybeSingle();
  if (!room) throw new Error("No room with that code");
  if (room.status === "ended") throw new Error("That room has already ended");

  const { count } = await supabaseAdmin
    .from("room_participants")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id);

  const { data: mine } = await supabaseAdmin
    .from("room_participants")
    .select("id")
    .eq("room_id", room.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!mine && (count ?? 0) >= 2) throw new Error("That room is already full");

  await addParticipant(room.id, userId);
  await supabaseAdmin.from("rooms").update({ status: "active" }).eq("id", room.id);
  return { roomId: room.id };
}

export async function roomState(userId: string, roomId: string) {
  const { data: participants } = await supabaseAdmin
    .from("room_participants")
    .select("user_id")
    .eq("room_id", roomId);
  const ids = (participants ?? []).map((p) => p.user_id);
  if (!ids.includes(userId)) throw new Error("You are not part of this call");

  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("id, mode, status, room_code, conversation_prompt")
    .eq("id", roomId)
    .maybeSingle();
  if (!room) throw new Error("Room not found");

  return {
    room,
    participants: ids,
    peerId: ids.find((id) => id !== userId) ?? null,
  };
}

export async function leaveRoom(userId: string, roomId: string) {
  await supabaseAdmin.from("rooms").update({ status: "ended" }).eq("id", roomId);
  await supabaseAdmin
    .from("match_queue")
    .update({ status: "cancelled" })
    .eq("user_id", userId)
    .eq("status", "waiting");
  return { ok: true };
}

export async function sendCallSignal(
  userId: string,
  input: {
    roomId: string;
    recipientId: string;
    signalType: "offer" | "answer" | "ice";
    payload: Json;
  },
) {
  const state = await roomState(userId, input.roomId);
  if (!state.participants.includes(input.recipientId)) throw new Error("Partner is not in this room");
  const { error } = await supabaseAdmin.from("call_signals").insert({
    room_id: input.roomId,
    sender_id: userId,
    recipient_id: input.recipientId,
    signal_type: input.signalType,
    payload: input.payload,
  });
  if (error) throw new Error("Could not send call connection data");
  return { ok: true };
}

export async function getCallSignals(userId: string, roomId: string, afterId: number) {
  await roomState(userId, roomId);
  const { data, error } = await supabaseAdmin
    .from("call_signals")
    .select("id, sender_id, signal_type, payload")
    .eq("room_id", roomId)
    .eq("recipient_id", userId)
    .gt("id", afterId)
    .order("id", { ascending: true })
    .limit(100);
  if (error) throw new Error("Could not receive call connection data");
  return data ?? [];
}

export async function saveCaption(
  userId: string,
  input: { roomId: string; label: string; confidence: number; text: string },
) {
  await supabaseAdmin.from("call_transcripts").insert({
    room_id: input.roomId,
    sender_id: userId,
    matched_label: input.label,
    confidence: input.confidence,
    text: input.text,
  });
  return { ok: true };
}

export async function reportPeer(
  userId: string,
  input: { roomId: string; reason: string; reportedId?: string | undefined },
) {
  await supabaseAdmin.from("reports").insert({
    reporter_id: userId,
    reported_id: input.reportedId ?? null,
    room_id: input.roomId,
    reason: input.reason,
  });
  return { ok: true };
}

const FALLBACK: Record<string, string> = {
  HELLO: "Hello there!",
  "THANK YOU": "Thank you so much.",
  PLEASE: "Please.",
  YES: "Yes.",
  NO: "No.",
  YOU: "You.",
  ME: "Me.",
  GOOD: "That's good!",
  SORRY: "I'm sorry.",
  HELP: "Can you help me?",
  "NICE TO MEET YOU": "It's nice to meet you.",
};

export async function phraseLabel(label: string) {
  const key = process.env["LOVABLE_API_KEY"];
  const fallback = FALLBACK[label] ?? `${label.charAt(0)}${label.slice(1).toLowerCase()}.`;
  if (!key) return { text: fallback };
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "You turn a single sign-language gloss into one short, natural English sentence. Reply with the sentence only, max 8 words.",
          },
          { role: "user", content: label },
        ],
      }),
    });
    if (!res.ok) return { text: fallback };
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content?.trim();
    return { text: text && text.length < 90 ? text : fallback };
  } catch {
    return { text: fallback };
  }
}
