import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, LogOut, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

export function ProfileMenu() {
  const { user } = useAuth();
  const { profile, avatarUrl, saveDisplayName, uploadAvatar } = useProfile();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    setName(profile?.display_name ?? "");
  }, [profile?.display_name]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!user) return null;

  const label = profile?.display_name?.trim() || user.email?.split("@")[0] || "You";
  const initials = label.slice(0, 2).toUpperCase();

  async function handleSave() {
    setBusy(true);
    setStatus(null);
    try {
      await saveDisplayName(name.trim() || label);
      setStatus("Saved!");
    } catch {
      setStatus("Could not save that name.");
    }
    setBusy(false);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus(null);
    try {
      await uploadAvatar(file);
      setStatus("Picture updated!");
    } catch {
      setStatus("Upload failed — try a smaller image.");
    }
    setBusy(false);
  }

  async function signOut() {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("sb-auth-flash", { detail: "out" }));
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open your profile"
        aria-expanded={open}
        className="ink ink-press flex items-center gap-2 rounded-md bg-card px-2 py-1.5 transition-transform duration-150 hover:-translate-y-0.5"
      >
        <span className="ink flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-accent text-[10px] font-bold">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <span className="label-caps hidden max-w-[9rem] truncate text-xs sm:inline">{label}</span>
      </button>

      {open ? (
        <div className="ink-lg animate-pop absolute right-0 z-50 mt-2 w-72 origin-top-right rounded-2xl bg-card p-4">
          <p className="label-caps text-[11px] text-muted-foreground">Your profile</p>

          <div className="mt-3 flex items-center gap-3">
            <span className="ink flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-bold">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Your profile picture" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{label}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="label-caps mt-1 inline-flex items-center gap-1 text-[11px] underline"
              >
                <Camera className="h-3 w-3" /> Change picture
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          </div>

          <label htmlFor="display-name" className="label-caps mt-4 block text-[11px]">
            Username
          </label>
          <input
            id="display-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            className="ink mt-1 w-full rounded-xl bg-background px-3 py-2 text-sm outline-none"
            placeholder="Pick a username"
          />

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              className="ink ink-press label-caps flex-1 rounded-xl bg-accent px-3 py-2 text-xs disabled:opacity-60"
            >
              Save
            </button>
            <button
              type="button"
              onClick={signOut}
              className="ink ink-press label-caps inline-flex items-center gap-1 rounded-xl bg-background px-3 py-2 text-xs"
            >
              <LogOut className="h-3 w-3" /> Sign out
            </button>
          </div>

          {status ? <p className="mt-3 text-xs text-muted-foreground">{status}</p> : null}

          <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
            <UserIcon className="h-3 w-3" /> {profile?.xp ?? 0} XP · {profile?.streak ?? 0} day streak
          </p>
        </div>
      ) : null}
    </div>
  );
}
