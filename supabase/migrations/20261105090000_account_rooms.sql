-- ThreeStyle rooms, stage 1: one saved room per account, read-only for visitors.
-- Apply after 20261005091247_accounts_and_private_media.sql. No Storage policy is
-- added or changed: the private creator-media bucket stays owner-only.
begin;

create table public.rooms (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  -- Room name used in links (/pokoj/<slug>). Optional until the owner shares the room.
  slug text unique check (slug is null or slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'),
  visibility text not null default 'private' check (visibility in ('private','public')),
  -- Saved look of the frozen Creator Room layout. Mirrors CreatorLightingSettings;
  -- volume, media, camera and the optional host model are never stored here.
  room_mood text not null default 'warm' check (room_mood in ('warm','focus','night')),
  room_brightness double precision not null default 1 check (room_brightness between 0 and 1),
  led_brightness double precision not null default 0.65 check (led_brightness between 0 and 1),
  led_color text not null default '#ff9f45' check (led_color ~ '^#[0-9a-f]{6}$'),
  booth_brightness double precision not null default 0.7 check (booth_brightness between 0 and 1),
  audio_reactive boolean not null default true,
  music_strength double precision not null default 0.65 check (music_strength between 0 and 1),
  led_cycle boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A public room must be reachable by name; a private room may stay unnamed.
  constraint rooms_public_needs_slug check (visibility = 'private' or slug is not null)
);

create trigger rooms_updated_at before update on public.rooms
  for each row execute function threestyle_private.touch_updated_at();

-- Trigger-only definer, like create_account_profile: every profile gets exactly one
-- private room. Ordinary roles cannot call it, insert rooms or delete them.
create function threestyle_private.create_account_room() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.rooms(owner_id) values (new.id) on conflict (owner_id) do nothing;
  return new;
end;
$$;
revoke all on function threestyle_private.create_account_room() from public, anon, authenticated;
create trigger threestyle_profile_room_created after insert on public.profiles
  for each row execute function threestyle_private.create_account_room();
-- Accounts that existed before this migration also start with a private room.
insert into public.rooms(owner_id) select id from public.profiles on conflict (owner_id) do nothing;

alter table public.rooms enable row level security;
revoke all on public.rooms from public, anon, authenticated;
-- Visitors (also guests) read rows the policy lets through: public rooms and their own.
grant select on public.rooms to anon, authenticated;
-- No owner_id, timestamps, INSERT or DELETE: ownership cannot move and the row is
-- managed by the profile lifecycle.
grant update (slug,visibility,room_mood,room_brightness,led_brightness,led_color,
  booth_brightness,audio_reactive,music_strength,led_cycle) on public.rooms to authenticated;
grant all on public.rooms to service_role;

create policy rooms_read_public_or_own on public.rooms for select to anon, authenticated
  using (visibility = 'public' or owner_id = (select auth.uid()));
create policy rooms_update_own on public.rooms for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

commit;
