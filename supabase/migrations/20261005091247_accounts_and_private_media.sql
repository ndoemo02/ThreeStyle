-- ThreeStyle account library. Apply to a dedicated Supabase project.
begin;

create schema threestyle_private;
revoke all on schema threestyle_private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 80),
  handle text unique check (handle is null or handle ~ '^[a-z0-9_]{3,32}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('audio','video')),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  file_extension text not null,
  mime_type text not null,
  -- The foundation supports 200 MiB. The initial Free-compatible bucket is 50 MiB.
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 209715200),
  duration_seconds double precision check (
    duration_seconds is null or duration_seconds > 0 and duration_seconds < 86400
  ),
  status text not null default 'uploading' check (status in ('uploading','ready','failed','deleting')),
  storage_bucket text not null default 'creator-media' check (storage_bucket = 'creator-media'),
  object_path text generated always as (user_id::text || '/' || id::text || '/original.' || file_extension) stored unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_type_matches check (
    kind = 'audio' and file_extension in ('mp3','wav','m4a','aac','flac','ogg','opus')
      and mime_type in ('audio/mpeg','audio/wav','audio/mp4','audio/aac','audio/flac','audio/ogg')
    or kind = 'video' and file_extension in ('mp4','webm','mov','m4v','ogv')
      and mime_type in ('video/mp4','video/webm','video/quicktime','video/ogg')
  )
);

-- Ownership queries and stable ordering share this index; also covers the FK.
create index media_assets_owner_created_idx on public.media_assets(user_id, created_at desc, id desc);
create index media_assets_owner_status_idx on public.media_assets(user_id, status);

create function threestyle_private.touch_updated_at() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function threestyle_private.touch_updated_at() from public, anon, authenticated;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function threestyle_private.touch_updated_at();
create trigger media_assets_updated_at before update on public.media_assets
  for each row execute function threestyle_private.touch_updated_at();

-- Trigger-only definer: auth signup has no auth.uid() yet. No user metadata is
-- trusted, no roles are assigned, and ordinary roles cannot call this function.
create function threestyle_private.create_account_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function threestyle_private.create_account_profile() from public, anon, authenticated;
create trigger threestyle_auth_user_created after insert on auth.users
  for each row execute function threestyle_private.create_account_profile();
-- Includes accounts created before this migration, without copying email/password.
insert into public.profiles(id) select id from auth.users on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.media_assets enable row level security;
revoke all on public.profiles, public.media_assets from public, anon, authenticated;
grant select on public.profiles, public.media_assets to authenticated;
grant update (display_name,handle) on public.profiles to authenticated;
grant insert (id,user_id,kind,title,original_filename,file_extension,mime_type,size_bytes,duration_seconds,status)
  on public.media_assets to authenticated;
grant update (title,duration_seconds,status) on public.media_assets to authenticated;
grant delete on public.media_assets to authenticated;
grant all on public.profiles, public.media_assets to service_role;

create policy profiles_read_own on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy media_read_own on public.media_assets for select to authenticated
  using (user_id = (select auth.uid()));
create policy media_reserve_own on public.media_assets for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'uploading');

-- A trigger-only definer reads Storage without its media-dependent RLS policies,
-- avoiding circular policy expansion. It never writes Storage metadata. Every
-- ordinary caller must still own the row; this function is not an exposed RPC.
create function threestyle_private.guard_media_lifecycle() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or old.user_id <> (select auth.uid()) then
    raise exception 'Media ownership required' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    if exists (select 1 from storage.objects o
      where o.bucket_id = old.storage_bucket and o.name = old.object_path) then
      raise exception 'Remove the Storage object before its library entry' using errcode = '42501';
    end if;
    return old;
  end if;
  if new.status = 'ready' and not exists (
    select 1 from storage.objects o
    where o.bucket_id = old.storage_bucket and o.name = old.object_path
      and o.metadata->>'size' = old.size_bytes::text
  ) then
    raise exception 'Uploaded object and reserved size must match' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function threestyle_private.guard_media_lifecycle() from public, anon, authenticated;
create trigger media_lifecycle_guard before update or delete on public.media_assets
  for each row execute function threestyle_private.guard_media_lifecycle();

create policy media_update_own on public.media_assets for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy media_delete_after_object on public.media_assets for delete to authenticated
  using (user_id = (select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('creator-media','creator-media',false,52428800,array[
  'audio/mpeg','audio/wav','audio/mp4','audio/aac','audio/flac','audio/ogg',
  'video/mp4','video/webm','video/quicktime','video/ogg'
]);

-- Exact reservation/path checks prevent uploading into somebody else's folder
-- or filling this bucket with objects that have no library entry.
create policy threestyle_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'creator-media' and exists (
    select 1 from public.media_assets m
    where m.user_id = (select auth.uid()) and m.object_path = name
      and m.storage_bucket = bucket_id and m.status = 'uploading'
  ));
create policy threestyle_storage_read on storage.objects for select to authenticated
  using (bucket_id = 'creator-media' and exists (
    select 1 from public.media_assets m
    where m.user_id = (select auth.uid()) and m.object_path = name and m.storage_bucket = bucket_id
  ));
create policy threestyle_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'creator-media' and exists (
    select 1 from public.media_assets m
    where m.user_id = (select auth.uid()) and m.object_path = name
      and m.storage_bucket = bucket_id and m.status = 'deleting'
  ));
-- No UPDATE policy: replacement/upsert must not overwrite existing media.

commit;
