-- Read-only: inspect the target project before applying the account migration.
select current_database() as database_name,
  to_regclass('public.profiles') is not null as profiles_exists,
  to_regclass('public.media_assets') is not null as media_assets_exists,
  to_regnamespace('threestyle_private') is not null as private_schema_exists,
  (select count(*) from auth.users) as account_count,
  (select count(*) from storage.buckets where id = 'creator-media') as creator_bucket_count,
  coalesce((select jsonb_agg(jsonb_build_object(
    'name',policyname,'command',cmd,'roles',roles,'using',qual,'check',with_check
  )) from pg_policies where schemaname = 'storage' and tablename = 'objects'), '[]'::jsonb) as storage_policies;
