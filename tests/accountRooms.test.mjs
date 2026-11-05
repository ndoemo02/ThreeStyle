import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Real Postgres engine with minimal Auth/Storage tables, all migrations applied in order.
// This exercises SQL/RLS for rooms, not hosted PostgREST or GoTrue HTTP.
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
const asGuest=action=>asUser(null,action,'anon');

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
  const dir=new URL('../supabase/migrations/',import.meta.url);
  const files=(await fs.readdir(dir)).filter(name=>name.endsWith('.sql')).sort();
  assert.ok(files.length>=2,'expected the account and room migrations');
  // The legacy account exists before the room migration: its room comes from the backfill.
  for(const file of files) await db.exec(await fs.readFile(new URL(file,dir),'utf8'));
  await db.query(`insert into auth.users(id,raw_user_meta_data) values ($1,'{"role":"admin"}'),($2,'{}')`,[A,B]);
  // Owner A's private media, written by the service (as Storage would after an upload).
  await db.query(`insert into public.media_assets(id,user_id,kind,title,original_filename,file_extension,mime_type,size_bytes,status)
    values ($1,$2,'audio','Utwór','Utwór.mp3','mp3','audio/mpeg',4096,'ready')`,[FILE,A]);
  await db.query('insert into storage.objects(bucket_id,name,metadata) values ($1,$2,$3)',['creator-media',PATH,{size:4096}]);
});
after(()=>db.close());

test('every account, also one created before the migration, gets one private room',async()=>{
  for(const id of [A,B,LEGACY]) {
    const rows=(await asUser(id,tx=>tx.query('select owner_id,visibility,slug,room_mood,led_color from public.rooms where owner_id=$1',[id]))).rows;
    assert.equal(rows.length,1);
    assert.deepEqual(rows[0],{owner_id:id,visibility:'private',slug:null,room_mood:'warm',led_color:'#ff9f45'});
  }
});

test('a private room is invisible to a guest and to another account',async()=>{
  assert.equal((await asGuest(tx=>tx.query('select * from public.rooms'))).rows.length,0);
  const foreign=(await asUser(B,tx=>tx.query('select owner_id from public.rooms'))).rows.map(r=>r.owner_id);
  assert.deepEqual(foreign,[B]);
});

test('the owner edits the saved layout and must name a room before making it public',async()=>{
  const saved=await asUser(A,tx=>tx.query(`update public.rooms set room_mood='night',led_color='#3fc6ff',led_brightness=0.3,led_cycle=true where owner_id=$1 returning led_brightness`,[A]));
  assert.equal(saved.rows[0].led_brightness,0.3);
  await assert.rejects(asUser(A,tx=>tx.query(`update public.rooms set visibility='public' where owner_id=$1`,[A])),/rooms_public_needs_slug/);
  await asUser(A,tx=>tx.query(`update public.rooms set slug='studio-a',visibility='public' where owner_id=$1`,[A]));
});

test('a public room is readable by a guest and another account, by name',async()=>{
  for(const read of [tx=>tx.query(`select room_mood,led_color,led_cycle from public.rooms where slug='studio-a'`)]) {
    const guest=(await asGuest(read)).rows, foreign=(await asUser(B,read)).rows;
    assert.deepEqual(guest,[{room_mood:'night',led_color:'#3fc6ff',led_cycle:true}]);
    assert.deepEqual(foreign,guest);
  }
});

test('a guest cannot change, create or delete a room',async()=>{
  await assert.rejects(asGuest(tx=>tx.query(`update public.rooms set led_color='#000000' where slug='studio-a'`)),/permission denied/);
  await assert.rejects(asGuest(tx=>tx.query(`insert into public.rooms(owner_id) values ($1)`,[B])),/permission denied/);
  await assert.rejects(asGuest(tx=>tx.query(`delete from public.rooms where slug='studio-a'`)),/permission denied/);
});

test('another account cannot change, take over or delete a public room',async()=>{
  const edit=await asUser(B,tx=>tx.query(`update public.rooms set led_color='#000000',visibility='private' where slug='studio-a' returning owner_id`));
  assert.equal(edit.rows.length,0);
  await assert.rejects(asUser(B,tx=>tx.query(`update public.rooms set slug='studio-a' where owner_id=$1`,[B])),/duplicate key|unique/);
  await assert.rejects(asUser(B,tx=>tx.query(`delete from public.rooms where slug='studio-a'`)),/permission denied/);
  const room=(await asGuest(tx=>tx.query(`select led_color,visibility from public.rooms where slug='studio-a'`))).rows[0];
  assert.deepEqual(room,{led_color:'#3fc6ff',visibility:'public'});
});

test('room ownership cannot be changed or forged, also by the owner',async()=>{
  await assert.rejects(asUser(A,tx=>tx.query('update public.rooms set owner_id=$1 where owner_id=$2',[B,A])),/permission denied/);
  await assert.rejects(asUser(B,tx=>tx.query('update public.rooms set owner_id=$1 where owner_id=$2',[B,A])),/permission denied/);
  await assert.rejects(asUser(A,tx=>tx.query('insert into public.rooms(owner_id) values ($1)',[B])),/permission denied/);
  await assert.rejects(asUser(A,tx=>tx.query('update public.rooms set created_at=now() where owner_id=$1',[A])),/permission denied/);
  await assert.rejects(asUser(A,tx=>tx.exec('select threestyle_private.create_account_room()')),/permission denied/);
});

test('invalid names and layout values cannot enter the database',async()=>{
  for(const slug of ['ab','-studio','studio-','Studio','stu dio','pokój','a'.repeat(33)]) {
    await assert.rejects(asUser(B,tx=>tx.query('update public.rooms set slug=$1 where owner_id=$2',[slug,B])),/check constraint/,slug);
  }
  for(const [column,value] of [['led_color','#FFF'],['led_color','red'],['room_mood','disco'],['room_brightness',1.5],['music_strength',-0.1]]) {
    await assert.rejects(asUser(B,tx=>tx.query(`update public.rooms set ${column}=$1 where owner_id=$2`,[value,B])),/check constraint/,column);
  }
});

test('a public room never opens the owner media library or private bucket',async()=>{
  for(const run of [asGuest,action=>asUser(B,action)]) {
    const objects=(await run(tx=>tx.query('select * from storage.objects where name=$1',[PATH]))).rows;
    assert.equal(objects.length,0);
    const removed=(await run(tx=>tx.query('delete from storage.objects where name=$1 returning id',[PATH]))).rows;
    assert.equal(removed.length,0);
  }
  await assert.rejects(asGuest(tx=>tx.query('select * from public.media_assets')),/permission denied/);
  assert.equal((await asUser(B,tx=>tx.query('select * from public.media_assets'))).rows.length,0);
  const bucket=(await db.query(`select public from storage.buckets where id='creator-media'`)).rows[0];
  assert.equal(bucket.public,false);
});

test('making the room private again hides it from visitors',async()=>{
  await asUser(A,tx=>tx.query(`update public.rooms set visibility='private' where owner_id=$1`,[A]));
  assert.equal((await asGuest(tx=>tx.query(`select * from public.rooms where slug='studio-a'`))).rows.length,0);
  assert.equal((await asUser(B,tx=>tx.query(`select * from public.rooms where slug='studio-a'`))).rows.length,0);
  assert.equal((await asUser(A,tx=>tx.query(`select * from public.rooms where slug='studio-a'`))).rows.length,1);
});

test('deleting an account removes its room',async()=>{
  const TEMP='44444444-4444-4444-8444-444444444444';
  await db.query('insert into auth.users(id) values ($1)',[TEMP]);
  assert.equal((await db.query('select count(*)::int as n from public.rooms where owner_id=$1',[TEMP])).rows[0].n,1);
  await db.query('delete from auth.users where id=$1',[TEMP]);
  assert.equal((await db.query('select count(*)::int as n from public.rooms where owner_id=$1',[TEMP])).rows[0].n,0);
});

test('hosted room scripts run and the smoke rolls back all fixtures',async()=>{
  const smoke=await fs.readFile(new URL('../supabase/rooms-rls-smoke.sql',import.meta.url),'utf8');
  const before=(await db.query('select count(*)::int as n from public.rooms')).rows[0].n;
  await db.exec(smoke);
  assert.equal((await db.query('select count(*)::int as n from public.rooms')).rows[0].n,before);
  const verify=await fs.readFile(new URL('../supabase/rooms-verify.sql',import.meta.url),'utf8');
  const row=(await db.query(verify)).rows[0];
  assert.equal(row.rooms_rls,true);
  assert.equal(row.creator_media_public,false);
  assert.equal(Number(row.foreign_creator_media_policies),0);
  assert.equal(row.anon_can_read_rooms,true);
  assert.equal(row.anon_can_update_rooms,false);
  assert.equal(row.account_can_insert_room,false);
  assert.equal(row.account_can_delete_room,false);
  assert.equal(row.can_change_room_owner,false);
  assert.equal(row.owner_can_update_layout,true);
  assert.match(row.visibility_default,/private/);
  assert.equal(row.room_trigger_callable,false);
});
