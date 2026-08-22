import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string;
  xp: number;
  streak: number;
};

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const profile = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, xp, streak")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as Profile) ?? null;
    },
  });

  const avatarPath = profile.data?.avatar_url ?? "";

  const avatar = useQuery({
    queryKey: ["avatar-url", avatarPath],
    enabled: !!avatarPath,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.storage
        .from("avatars")
        .createSignedUrl(avatarPath, 60 * 60);
      if (error) return null;
      return data?.signedUrl ?? null;
    },
  });

  async function saveDisplayName(name: string) {
    if (!userId) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name })
      .eq("id", userId);
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
  }

  async function uploadAvatar(file: File) {
    if (!userId) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: path })
      .eq("id", userId);
    if (updateError) throw updateError;
    await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
  }

  return {
    profile: profile.data ?? null,
    loading: profile.isLoading,
    avatarUrl: avatar.data ?? null,
    saveDisplayName,
    uploadAvatar,
  };
}
