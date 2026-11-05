-- One read-only result for public.rooms (run after verify.sql).
select
  (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='rooms') as rooms_rls,
  (select jsonb_agg(jsonb_build_object('policy',policyname,'command',cmd,'roles',roles) order by policyname)
    from pg_policies where schemaname='public' and tablename='rooms') as room_policies,
  (select count(*) from pg_policies where schemaname='storage' and policyname not like 'threestyle_%'
    and (qual like '%creator-media%' or with_check like '%creator-media%')) as foreign_creator_media_policies,
  (select public from storage.buckets where id='creator-media') as creator_media_public,
  has_table_privilege('anon','public.rooms','SELECT') as anon_can_read_rooms,
  has_table_privilege('anon','public.rooms','UPDATE') as anon_can_update_rooms,
  has_table_privilege('authenticated','public.rooms','INSERT') as account_can_insert_room,
  has_table_privilege('authenticated','public.rooms','DELETE') as account_can_delete_room,
  has_column_privilege('authenticated','public.rooms','owner_id','UPDATE') as can_change_room_owner,
  has_column_privilege('authenticated','public.rooms','led_color','UPDATE') as owner_can_update_layout,
  (select column_default from information_schema.columns
    where table_schema='public' and table_name='rooms' and column_name='visibility') as visibility_default,
  (select has_function_privilege('authenticated',p.oid,'EXECUTE') or has_function_privilege('anon',p.oid,'EXECUTE')
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='threestyle_private' and p.proname='create_account_room') as room_trigger_callable;
