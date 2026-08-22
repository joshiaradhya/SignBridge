import { supabase } from "@/integrations/supabase/client";

export type PublicProfile = {
  id: string;
  display_name: string;
  avatar_url: string;
  streak: number;
  xp: number;
};

export type FriendRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
};

export function friendRequestsQuery(userId: string | undefined) {
  return {
    queryKey: ["friend-requests", userId],
    enabled: !!userId,
    queryFn: async (): Promise<FriendRequest[]> => {
      const { data, error } = await supabase
        .from("friend_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FriendRequest[];
    },
  };
}

export function friendsQuery(userId: string | undefined) {
  return {
    queryKey: ["friends", userId],
    enabled: !!userId,
    queryFn: async (): Promise<PublicProfile[]> => {
      const { data, error } = await supabase
        .from("friendships")
        .select("friend_id")
        .eq("user_id", userId!);
      if (error) throw error;
      const ids = (data ?? []).map((r) => r.friend_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, streak, xp")
        .in("id", ids);
      return (profiles ?? []) as PublicProfile[];
    },
  };
}

export async function searchLearners(term: string, selfId: string): Promise<PublicProfile[]> {
  const clean = term.trim();
  if (clean.length < 2) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, streak, xp")
    .ilike("display_name", `%${clean}%`)
    .neq("id", selfId)
    .limit(10);
  return (data ?? []) as PublicProfile[];
}

export async function sendFriendRequest(senderId: string, receiverId: string) {
  const { error } = await supabase
    .from("friend_requests")
    .upsert(
      { sender_id: senderId, receiver_id: receiverId, status: "pending" },
      { onConflict: "sender_id,receiver_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function acceptFriendRequest(requestId: string) {
  const { error } = await supabase.rpc("accept_friend_request", { _request_id: requestId });
  if (error) throw error;
}

export async function declineFriendRequest(requestId: string) {
  await supabase.from("friend_requests").update({ status: "declined" }).eq("id", requestId);
}

export async function removeFriend(userId: string, friendId: string) {
  await supabase
    .from("friendships")
    .delete()
    .or(
      `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`,
    );
  await supabase
    .from("friend_requests")
    .delete()
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`,
    );
}
