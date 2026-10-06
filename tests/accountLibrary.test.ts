import test from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, AccountMediaRow } from '../src/lib/supabase/database.types.ts';
import { accountLibrary } from '../src/lib/supabase/accountLibrary.ts';

const USER='11111111-1111-4111-8111-111111111111';
const FILE='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const row:AccountMediaRow={id:FILE,user_id:USER,kind:'audio',title:'Utwór',original_filename:'Utwór.mp3',file_extension:'mp3',mime_type:'audio/mpeg',size_bytes:4096,duration_seconds:null,status:'ready',storage_bucket:'creator-media',object_path:`${USER}/${FILE}/original.mp3`,created_at:'2026-10-05T00:00:00Z',updated_at:'2026-10-05T00:00:00Z'};
type Result={data:unknown;error:unknown};

// Isolates service failures at the adapter boundary. Real SQL authorization is
// covered separately with two accounts in accountDatabase.test.mjs.
function fixture(options:{anonymous?:boolean;loggedOut?:boolean;status?:AccountMediaRow['status'];storageFails?:boolean;finalizeFails?:boolean;deleteFails?:boolean}={}) {
  const events:string[]=[];
  const filters:Array<[string,unknown]>=[];
  const client={
    auth:{getUser:async()=>({data:{user:options.loggedOut?null:{id:USER,is_anonymous:options.anonymous??false}},error:null})},
    from:()=>{
      let operation='read';
      const query={
        select:()=>query,
        eq:(column:string,value:unknown)=>{filters.push([column,value]);return query;},
        update:(value:{status:string})=>{operation=value.status;return query;},
        delete:()=>{operation='delete';return query;},
        single:async():Promise<Result>=>{
          events.push(operation);
          if(operation==='ready' && options.finalizeFails || operation==='delete' && options.deleteFails) return {data:null,error:{message:'Service failure'}};
          return {data:{...row,status:options.status??row.status},error:null};
        },
      };
      return query;
    },
    storage:{from:(bucket:string)=>({
      remove:async(paths:string[])=>{
        assert.equal(bucket,'creator-media');assert.deepEqual(paths,[row.object_path]);events.push('storage.remove');
        return {data:options.storageFails?null:[{name:row.object_path}],error:options.storageFails?{message:'Storage unavailable'}:null};
      },
      createSignedUrl:async(path:string,ttl:number)=>{
        assert.equal(path,row.object_path);assert.equal(ttl,3600);events.push('storage.sign');
        return {data:{signedUrl:'https://storage.example/private-signed'},error:null};
      },
    })},
  } as unknown as SupabaseClient<Database>;
  return {library:accountLibrary(client),events,filters};
}

test('guests and anonymous identities cannot request account playback',async()=>{
  for(const options of [{loggedOut:true},{anonymous:true}]) {
    const {library,events}=fixture(options);
    await assert.rejects(library.playbackUrl(FILE),/Zaloguj się/);
    assert.deepEqual(events,[]);
  }
});
test('an unfinished upload is never presented as playable or confirmed',async()=>{
  const pending=fixture({status:'uploading'});
  await assert.rejects(pending.library.playbackUrl(FILE),/nie jest jeszcze gotowy/);
  assert.deepEqual(pending.events,['read']);
  const failed=fixture({finalizeFails:true});
  await assert.rejects(failed.library.finalize(FILE),/nie został jeszcze potwierdzony/);
});
test('Storage failure leaves the metadata for a deletion retry',async()=>{
  const {library,events}=fixture({storageFails:true});
  await assert.rejects(library.remove(FILE),/Ponów usuwanie/);
  assert.deepEqual(events,['read','deleting','storage.remove']);
});
test('metadata failure after blob deletion is reported instead of false success',async()=>{
  const {library,events}=fixture({deleteFails:true});
  await assert.rejects(library.remove(FILE),/wpis wymaga ponowienia/);
  assert.deepEqual(events,['read','deleting','storage.remove','delete']);
});
test('confirmed deletion uses the reserved path and constrains every query to the account',async()=>{
  const {library,events,filters}=fixture();
  await library.remove(FILE);
  assert.deepEqual(events,['read','deleting','storage.remove','delete']);
  assert.equal(filters.filter(([column,value])=>column==='user_id'&&value===USER).length,3);
});
test('private playback links have an explicit expiry',async()=>{
  const {library,events}=fixture();
  const before=Date.now();const result=await library.playbackUrl(FILE);
  assert.equal(result.url,'https://storage.example/private-signed');
  assert.ok(result.expiresAt>=before+3600*1000);
  assert.deepEqual(events,['read','storage.sign']);
});
