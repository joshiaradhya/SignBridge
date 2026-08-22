
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  mode text not null default 'random' check (mode in ('random','private')),
  room_code text unique,
  status text not null default 'open',
  conversation_prompt text,
  created_at timestamptz not null default now()
);
create table public.room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (room_id, user_id)
);
create table public.match_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  language text not null default 'EITHER' check (language in ('ASL','ISL','EITHER')),
  level text not null default 'beginner' check (level in ('beginner','intermediate','fluent')),
  interests jsonb not null default '[]',
  status text not null default 'waiting' check (status in ('waiting','matched','cancelled')),
  room_id uuid references public.rooms(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.call_transcripts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  matched_label text,
  confidence double precision,
  text text not null,
  created_at timestamptz not null default now()
);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid references auth.users(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.rooms to authenticated;
grant select, insert, update, delete on public.room_participants to authenticated;
grant select, insert, update, delete on public.match_queue to authenticated;
grant select, insert on public.call_transcripts to authenticated;
grant select, insert on public.reports to authenticated;
grant all on public.rooms, public.room_participants, public.match_queue, public.call_transcripts, public.reports to service_role;

alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.match_queue enable row level security;
alter table public.call_transcripts enable row level security;
alter table public.reports enable row level security;

create or replace function public.is_room_member(_room_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.room_participants p where p.room_id = _room_id and p.user_id = _user_id)
$$;

create policy "members read rooms" on public.rooms for select to authenticated
  using (public.is_room_member(id, auth.uid()));
create policy "members update rooms" on public.rooms for update to authenticated
  using (public.is_room_member(id, auth.uid()));

create policy "read own participation" on public.room_participants for select to authenticated
  using (public.is_room_member(room_id, auth.uid()));

create policy "manage own queue rows" on public.match_queue for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "members read transcripts" on public.call_transcripts for select to authenticated
  using (public.is_room_member(room_id, auth.uid()));
create policy "members write transcripts" on public.call_transcripts for insert to authenticated
  with check (sender_id = auth.uid() and public.is_room_member(room_id, auth.uid()));

create policy "own reports" on public.reports for select to authenticated using (reporter_id = auth.uid());
create policy "create reports" on public.reports for insert to authenticated with check (reporter_id = auth.uid());

alter publication supabase_realtime add table public.match_queue;
alter publication supabase_realtime add table public.room_participants;
