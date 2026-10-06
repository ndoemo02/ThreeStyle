-- One read-only result: CLI transports do not consistently emit all result sets.
select
  (select jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'rls',c.relrowsecurity))
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname in ('profiles','media_assets')) as tables,
  (select jsonb_build_object('id',id,'public',public,'file_size_limit',file_size_limit,'mime_types',allowed_mime_types)
    from storage.buckets where id='creator-media') as bucket,
  (select jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename,'policy',policyname,'command',cmd,'roles',roles))
    from pg_policies where (schemaname='public' and tablename in ('profiles','media_assets'))
      or (schemaname='storage' and policyname like 'threestyle_%')) as policies,
  has_table_privilege('anon','public.media_assets','SELECT') as anon_can_list,
  has_table_privilege('authenticated','public.media_assets','SELECT') as account_can_list,
  has_column_privilege('authenticated','public.media_assets','user_id','UPDATE') as can_change_owner,
  has_column_privilege('authenticated','public.media_assets','size_bytes','UPDATE') as can_change_size,
  has_schema_privilege('authenticated','threestyle_private','USAGE') as can_access_internal_schema,
  (select jsonb_agg(jsonb_build_object('function',p.proname,'definer',p.prosecdef,'config',p.proconfig,
    'account_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
    'guest_execute',has_function_privilege('anon',p.oid,'EXECUTE')))
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='threestyle_private') as internal_functions;
