-- Hosted Postgres/RLS check for public.rooms. A rolled-back subtransaction creates
-- two temporary identities without emails, Auth HTTP or Storage writes. No fixtures persist.
do $smoke$
declare
  owner_a uuid := gen_random_uuid();
  owner_b uuid := gen_random_uuid();
  slug_a text := 'smoke-' || substr(replace(gen_random_uuid()::text,'-',''),1,12);
  affected integer;
  seen integer;
begin
  begin
    insert into auth.users(id) values (owner_a),(owner_b);
    perform set_config('request.jwt.claim.sub',owner_a::text,true);
    set local role authenticated;
    if (select visibility from public.rooms where owner_id=owner_a) is distinct from 'private' then
      raise exception 'New account room is not private by default';
    end if;
    update public.rooms set room_mood='night', led_color='#3fc6ff' where owner_id=owner_a;
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Owner room update failed'; end if;
    begin
      update public.rooms set visibility='public' where owner_id=owner_a;
      raise exception 'Public room without a name was accepted';
    exception when check_violation then null;
    end;
    begin
      update public.rooms set owner_id=owner_b where owner_id=owner_a;
      raise exception 'Room owner change was accepted';
    exception when insufficient_privilege then null;
    end;
    begin
      insert into public.rooms(owner_id) values (owner_b);
      raise exception 'Direct room insert was accepted';
    exception when insufficient_privilege then null;
    end;

    -- Private room: invisible to another account and to a guest.
    perform set_config('request.jwt.claim.sub',owner_b::text,true);
    select count(*) into seen from public.rooms where owner_id=owner_a;
    if seen <> 0 then raise exception 'Owner B can read a private room'; end if;
    perform set_config('request.jwt.claim.sub',owner_a::text,true);
    update public.rooms set slug=slug_a, visibility='public' where owner_id=owner_a;

    -- Public room: readable, never writable by another account.
    perform set_config('request.jwt.claim.sub',owner_b::text,true);
    select count(*) into seen from public.rooms where slug=slug_a;
    if seen <> 1 then raise exception 'Owner B cannot read a public room'; end if;
    update public.rooms set led_color='#000000' where slug=slug_a;
    get diagnostics affected = row_count;
    if affected <> 0 then raise exception 'Foreign room update was accepted'; end if;
    begin
      update public.rooms set slug=slug_a where owner_id=owner_b;
      raise exception 'A taken room name was accepted';
    exception when unique_violation then null;
    end;
    begin
      delete from public.rooms where slug=slug_a;
      raise exception 'Room deletion was accepted';
    exception when insufficient_privilege then null;
    end;

    set local role anon;
    perform set_config('request.jwt.claim.sub','',true);
    select count(*) into seen from public.rooms where slug=slug_a and led_color='#3fc6ff';
    if seen <> 1 then raise exception 'Guest cannot read the public room layout'; end if;
    begin
      update public.rooms set led_color='#000000' where slug=slug_a;
      raise exception 'Guest room update was accepted';
    exception when insufficient_privilege then null;
    end;
    begin
      perform count(*) from public.media_assets;
      raise exception 'Guest can read the owner library';
    exception when insufficient_privilege then null;
    end;
    raise exception using errcode='TS002', message='ThreeStyle room fixture rollback';
  exception when sqlstate 'TS002' then null;
  end;
  if exists(select 1 from auth.users where id in (owner_a,owner_b))
    or exists(select 1 from public.rooms where owner_id in (owner_a,owner_b)) then
    raise exception 'Room smoke fixtures were not rolled back';
  end if;
  raise notice 'ThreeStyle rooms/RLS smoke PASS; fixtures rolled back';
end;
$smoke$;
