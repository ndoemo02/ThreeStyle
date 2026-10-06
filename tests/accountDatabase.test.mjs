import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Actual Postgres engine, with minimal Auth/Storage service tables. This exercises
// SQL/RLS, not hosted GoTrue/Storage HTTP, binary uploads or signed URL delivery.
const db = new PGlite();
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const LEGACY='33333333-3333-4333-8333-333333333333';
const FILE='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PATH=`${A}/${FILE}/original.mp3`;
const asUser=(id,action,role='authenticated')=>db.transaction(async tx=>{
  await tx.exec(`set local role ${role}`);
  await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[id??'']);
  return action(tx);
});
const insert=(tx,id=FILE,user=A,status='uploading',bytes=4096)=>tx.query(
  `insert into public.media_assets(id,user_id,kind,title,original_filename,file_extension,mime_type,size_bytes,status)
   values ($1,$2,'audio','Mój utwór','Mój utwór.mp3','mp3','audio/mpeg',$3,$4) returning *`,[id,user,bytes,status]);

before(async()=>{
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;create schema storage;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,metadata jsonb,unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant usage on schema auth,storage to anon,authenticated,service_role;
    grant select,insert,update,delete on storage.objects to anon,authenticated;
    grant select on storage.buckets to authenticated;
    insert into auth.users(id) values ('${LEGACY}');
  `);
  const sql=await fs.readFile(new URL('../supabase/migrations/20261005091247_accounts_and_private_media.sql',import.meta.url),'utf8');
  await db.exec(sql);
  await db.query(`insert into auth.users(id,raw_user_meta_data) values ($1,'{"role":"admin"}'),($2,'{}')`,[A,B]);
});
after(()=>db.close());

test('signup trigger/backfill create private profiles without granting metadata privileges',async()=>{
  const own=await asUser(A,tx=>tx.query('select * from public.profiles'));
  assert.deepEqual(own.rows.map(r=>r.id),[A]);assert.equal(own.rows[0].display_name,null);
  const legacy=await asUser(LEGACY,tx=>tx.query('select id from public.profiles'));
  assert.equal(legacy.rows[0].id,LEGACY);
  await assert.rejects(asUser(A,tx=>tx.exec('select threestyle_private.create_account_profile()')),/permission denied/);
  await assert.rejects(asUser(A,tx=>tx.query('update public.profiles set id=$1 where id=$2',[B,A])),/permission denied/);
});
test('anonymous clients cannot list profiles, reserve metadata or access objects',async()=>{
  await assert.rejects(asUser(null,tx=>tx.exec('select * from public.profiles'),'anon'),/permission denied/);
  await assert.rejects(asUser(null,tx=>insert(tx),'anon'),/permission denied/);
  const files=await asUser(null,tx=>tx.query('select * from storage.objects'),'anon');assert.equal(files.rows.length,0);
});
test('owners may edit their profile while another account cannot',async()=>{
  await asUser(A,tx=>tx.query('update public.profiles set display_name=$1 where id=$2',['Artysta',A]));
  const denied=await asUser(B,tx=>tx.query('update public.profiles set display_name=$1 where id=$2 returning id',['Podszycie',A]));
  assert.equal(denied.rows.length,0);
  const owned=await asUser(A,tx=>tx.query('select display_name from public.profiles'));assert.equal(owned.rows[0].display_name,'Artysta');
});
test('a reservation uses an immutable account-specific object path',async()=>{
  const created=await asUser(A,tx=>insert(tx));assert.equal(created.rows[0].object_path,PATH);
  await assert.rejects(asUser(A,tx=>tx.query('update public.media_assets set user_id=$1 where id=$2',[B,FILE])),/permission denied/);
  await assert.rejects(asUser(A,tx=>tx.query('update public.media_assets set size_bytes=1 where id=$1',[FILE])),/permission denied/);
});
test('foreign-owner and precompleted reservations are rejected by RLS',async()=>{
  const id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  await assert.rejects(asUser(B,tx=>insert(tx,id,A)),/row-level security/);
  await assert.rejects(asUser(A,tx=>insert(tx,id,A,'ready')),/row-level security/);
});
test('ready metadata requires the actual uploaded object and matching size',async()=>{
  await assert.rejects(asUser(A,tx=>tx.query(`update public.media_assets set status='ready' where id=$1`,[FILE])),/Uploaded object and reserved size/);
  await asUser(A,tx=>tx.query('insert into storage.objects(bucket_id,name,metadata) values ($1,$2,$3)', ['creator-media',PATH,{size:2}]));
  await assert.rejects(asUser(A,tx=>tx.query(`update public.media_assets set status='ready' where id=$1`,[FILE])),/Uploaded object and reserved size/);
  // Storage service populates byte metadata after transfer; ordinary users have no UPDATE policy.
  await db.query('update storage.objects set metadata=$1 where name=$2',[{size:4096},PATH]);
  await asUser(A,tx=>tx.query(`update public.media_assets set status='ready' where id=$1`,[FILE]));
});
test('account B cannot list, read, rename or delete account A media/blob',async()=>{
  const result=await asUser(B,async tx=>({
    rows:(await tx.query('select * from public.media_assets')).rows,
    blobs:(await tx.query('select * from storage.objects')).rows,
    rename:(await tx.query(`update public.media_assets set title='Podszycie' where id=$1 returning id`,[FILE])).rows,
    deleted:(await tx.query('delete from public.media_assets where id=$1 returning id',[FILE])).rows,
    objects:(await tx.query('delete from storage.objects where name=$1 returning name',[PATH])).rows,
  }));
  for(const rows of Object.values(result))assert.equal(rows.length,0);
});
test('another account cannot upload to the reserved path or to arbitrary storage keys',async()=>{
  for(const [owner,name] of [[B,PATH],[A,`${A}/unreserved.mp3`],[A,`${B}/${FILE}/original.mp3`]]) {
    await assert.rejects(asUser(owner,tx=>tx.query('insert into storage.objects(bucket_id,name,metadata) values ($1,$2,$3)', ['creator-media',name,{size:4096}])),/row-level security/);
  }
});
test('no object overwrite and no record-first deletion can orphan the file',async()=>{
  const update=await asUser(A,tx=>tx.query('update storage.objects set metadata=$1 where name=$2 returning id',[{size:1},PATH]));assert.equal(update.rows.length,0);
  await assert.rejects(asUser(A,tx=>tx.query('delete from public.media_assets where id=$1 returning id',[FILE])),/Remove the Storage object/);
  const blob=await asUser(A,tx=>tx.query('delete from storage.objects where name=$1 returning id',[PATH]));assert.equal(blob.rows.length,0);
});
test('deletion proceeds only through deleting -> Storage removal -> metadata removal',async()=>{
  await asUser(A,tx=>tx.query(`update public.media_assets set status='deleting' where id=$1`,[FILE]));
  const before=await asUser(A,tx=>tx.query(`select id from public.media_assets where status='ready'`));assert.equal(before.rows.length,0);
  const blob=await asUser(A,tx=>tx.query('delete from storage.objects where name=$1 returning id',[PATH]));assert.equal(blob.rows.length,1);
  const record=await asUser(A,tx=>tx.query('delete from public.media_assets where id=$1 returning id',[FILE]));assert.equal(record.rows.length,1);
});
test('invalid sizes and MIME/kind mismatches cannot enter the database',async()=>{
  for(const bytes of [-1,0,209715201])await assert.rejects(asUser(A,tx=>insert(tx,FILE,A,'uploading',bytes)),/check constraint/);
  await assert.rejects(asUser(A,tx=>tx.query(`insert into public.media_assets(kind,title,original_filename,file_extension,mime_type,size_bytes) values ('audio','Zły','bad.mp3','mp3','text/html',4096)`)),/check constraint/);
});
test('bucket is private and the library owner index exists',async()=>{
  const config=await db.query('select * from storage.buckets where id=$1',['creator-media']);
  assert.equal(config.rows[0].public,false);assert.equal(Number(config.rows[0].file_size_limit),52428800);
  const indexes=await db.query(`select indexdef from pg_indexes where tablename='media_assets'`);
  assert.ok(indexes.rows.some(r=>r.indexdef.includes('(user_id, created_at DESC, id DESC)')));
});

test('hosted verification scripts run and the RLS smoke rolls back all fixtures',async()=>{
  const sql=await fs.readFile(new URL('../supabase/account-rls-smoke.sql',import.meta.url),'utf8');
  const before=(await db.query('select count(*) as count from auth.users')).rows[0].count;
  await db.exec(sql);
  const after=(await db.query('select count(*) as count from auth.users')).rows[0].count;
  assert.equal(after,before);
  const verify=await fs.readFile(new URL('../supabase/verify.sql',import.meta.url),'utf8');
  const rows=(await db.query(verify)).rows;
  assert.equal(rows[0].anon_can_list,false);
  assert.equal(rows[0].can_change_owner,false);
  assert.equal(rows[0].can_access_internal_schema,false);
});
