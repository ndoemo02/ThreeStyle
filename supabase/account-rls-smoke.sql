-- Hosted Postgres/RLS check. A rolled-back subtransaction creates two temporary
-- identities without emails, Auth HTTP or Storage writes. No fixtures persist.
do $smoke$
declare
  owner_a uuid := gen_random_uuid();
  owner_b uuid := gen_random_uuid();
  asset uuid := gen_random_uuid();
  affected integer;
  expected_path text;
begin
  begin
    insert into auth.users(id) values (owner_a),(owner_b);
    perform set_config('request.jwt.claim.sub',owner_a::text,true);
    set local role authenticated;
    if (select count(*) from public.profiles) <> 1 then
      raise exception 'Owner A profile isolation failed';
    end if;
    update public.profiles set display_name='ThreeStyle smoke' where id=owner_a;
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Owner profile update failed'; end if;
    insert into public.media_assets(id,kind,title,original_filename,file_extension,mime_type,size_bytes)
      values (asset,'audio','Smoke','smoke.mp3','mp3','audio/mpeg',4096);
    select object_path into expected_path from public.media_assets where id=asset;
    if expected_path is distinct from owner_a::text || '/' || asset::text || '/original.mp3' then
      raise exception 'Generated Storage path mismatch';
    end if;
    begin
      update public.media_assets set status='ready' where id=asset;
      raise exception 'Unuploaded file was accepted as ready';
    exception when insufficient_privilege then null;
    end;
    perform set_config('request.jwt.claim.sub',owner_b::text,true);
    if (select count(*) from public.media_assets) <> 0 then
      raise exception 'Owner B can read owner A media';
    end if;
    update public.media_assets set title='Foreign edit' where id=asset;
    get diagnostics affected = row_count;
    if affected <> 0 then raise exception 'Foreign update was accepted'; end if;
    delete from public.media_assets where id=asset;
    get diagnostics affected = row_count;
    if affected <> 0 then raise exception 'Foreign deletion was accepted'; end if;
    begin
      insert into public.media_assets(user_id,kind,title,original_filename,file_extension,mime_type,size_bytes)
        values (owner_a,'audio','Foreign insert','smoke.mp3','mp3','audio/mpeg',4096);
      raise exception 'Foreign-owner reservation was accepted';
    exception when insufficient_privilege then null;
    end;
    perform set_config('request.jwt.claim.sub',owner_a::text,true);
    delete from public.media_assets where id=asset;
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Cancelled reservation cleanup failed'; end if;
    set local role anon;
    perform set_config('request.jwt.claim.sub','',true);
    begin
      perform count(*) from public.media_assets;
      raise exception 'Guest can read the account library';
    exception when insufficient_privilege then null;
    end;
    raise exception using errcode='TS001', message='ThreeStyle fixture rollback';
  exception when sqlstate 'TS001' then null;
  end;
  if exists(select 1 from auth.users where id in (owner_a,owner_b))
    or exists(select 1 from public.profiles where id in (owner_a,owner_b))
    or exists(select 1 from public.media_assets where id=asset) then
    raise exception 'Smoke fixtures were not rolled back';
  end if;
  raise notice 'ThreeStyle account/RLS smoke PASS; fixtures rolled back';
end;
$smoke$;
