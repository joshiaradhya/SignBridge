import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRound, UserPlus, Check, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  acceptFriendRequest,
  declineFriendRequest,
  friendRequestsQuery,
  friendsQuery,
  removeFriend,
  searchLearners,
  sendFriendRequest,
  type PublicProfile,
} from "@/lib/friends";

export const Route = createFileRoute("/friends")({
  head: () => ({
    meta: [
      { title: "Friends — learn sign language together | SignBridge" },
      {
        name: "description",
        content:
          "Find other SignBridge learners, send friend requests and compare streaks and progress.",
      },
      { property: "og:title", content: "Friends — SignBridge" },
      { property: "og:description", content: "Find learners and compare streaks and progress." },
    ],
  }),
  component: FriendsPage,
});

function FriendsPage() {
  return (
    <RequireAuth what="your friends list">
      <FriendsInner />
    </RequireAuth>
  );
}

function FriendsInner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const friends = useQuery(friendsQuery(user?.id));
  const requests = useQuery(friendRequestsQuery(user?.id));

  const incoming = (requests.data ?? []).filter(
    (r) => r.receiver_id === user?.id && r.status === "pending",
  );
  const outgoing = (requests.data ?? []).filter(
    (r) => r.sender_id === user?.id && r.status === "pending",
  );

  const senderIds = incoming.map((r) => r.sender_id);
  const senders = useQuery({
    queryKey: ["request-profiles", senderIds.join(",")],
    enabled: senderIds.length > 0,
    queryFn: async (): Promise<PublicProfile[]> => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, streak, xp")
        .in("id", senderIds);
      return (data ?? []) as PublicProfile[];
    },
  });

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setResults(await searchLearners(term, user.id));
  }

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["friends", user?.id] });
    void queryClient.invalidateQueries({ queryKey: ["friend-requests", user?.id] });
  }

  return (
    <AppShell title="FRIENDS" subtitle="Learning sticks better when someone else is doing it too.">
      <section className="ink-lg rounded-2xl bg-card p-6">
        <h2 className="text-xl">FIND LEARNERS</h2>
        <form onSubmit={runSearch} className="mt-4 flex flex-wrap gap-3">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search by display name"
            className="ink min-w-0 flex-1 rounded-xl bg-background px-3 py-2 text-sm outline-none"
          />
          <button className="ink ink-press label-caps rounded-xl bg-accent px-5 py-2 text-sm">
            Search
          </button>
        </form>
        {note ? <p className="mt-3 text-xs text-muted-foreground">{note}</p> : null}
        <div className="mt-4 grid gap-3">
          {results.map((r) => (
            <div key={r.id} className="ink flex items-center justify-between gap-3 rounded-xl bg-background p-3">
              <div className="flex items-center gap-3">
                <span className="ink flex h-9 w-9 items-center justify-center rounded-full bg-primary">
                  <UserRound className="h-4 w-4" />
                </span>
                <div>
                  <p className="label-caps text-sm">{r.display_name}</p>
                  <p className="text-xs text-muted-foreground">{r.streak} day streak</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!user) return;
                  await sendFriendRequest(user.id, r.id);
                  setNote(`Request sent to ${r.display_name}.`);
                  refresh();
                }}
                className="ink ink-press label-caps flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs"
              >
                <UserPlus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl">REQUESTS</h2>
        <div className="mt-4 grid gap-3">
          {incoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending requests.</p>
          ) : (
            incoming.map((r) => {
              const p = (senders.data ?? []).find((s) => s.id === r.sender_id);
              return (
                <div key={r.id} className="ink flex items-center justify-between gap-3 rounded-xl bg-card p-4">
                  <p className="label-caps text-sm">{p?.display_name ?? "A learner"}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        await acceptFriendRequest(r.id);
                        refresh();
                      }}
                      className="ink ink-press label-caps flex items-center gap-1 rounded-lg bg-accent px-3 py-2 text-xs"
                    >
                      <Check className="h-3.5 w-3.5" /> Accept
                    </button>
                    <button
                      onClick={async () => {
                        await declineFriendRequest(r.id);
                        refresh();
                      }}
                      className="ink ink-press label-caps flex items-center gap-1 rounded-lg bg-background px-3 py-2 text-xs"
                    >
                      <X className="h-3.5 w-3.5" /> Decline
                    </button>
                  </div>
                </div>
              );
            })
          )}
          {outgoing.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {outgoing.length} request{outgoing.length === 1 ? "" : "s"} waiting for a reply.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl">YOUR FRIENDS</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(friends.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No friends yet.</p>
          ) : (
            (friends.data ?? []).map((f) => (
              <div key={f.id} className="ink rounded-2xl bg-card p-5">
                <div className="flex items-center gap-3">
                  <span className="ink flex h-10 w-10 items-center justify-center rounded-full bg-sky">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="label-caps text-sm">{f.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.streak} day streak · {f.xp} XP
                    </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (!user) return;
                    await removeFriend(user.id, f.id);
                    refresh();
                  }}
                  className="mt-4 text-xs underline"
                >
                  Remove friend
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}
