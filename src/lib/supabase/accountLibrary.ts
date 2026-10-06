import type { SupabaseClient } from '@supabase/supabase-js';
import { inspectAccountFile,ACCOUNT_MEDIA_BUCKET,DEFAULT_ACCOUNT_FILE_BYTES } from '../accountMedia.ts';
import type { Database } from './database.types';

/** Foundation adapter. Call from authenticated UI; never inject a service-role client. */
export function accountLibrary(client:SupabaseClient<Database>) {
  const userId=async()=>{
    const {data,error}=await client.auth.getUser();
    if(error || !data.user || data.user.is_anonymous) throw new Error('Zaloguj się, aby otworzyć swoją bibliotekę.');
    return data.user.id;
  };
  const find=async(id:string)=>{
    const user_id=await userId();
    const {data,error}=await client.from('media_assets').select('*').eq('user_id',user_id).eq('id',id).single();
    if(error || !data) throw new Error('Nie znaleziono pliku w Twojej bibliotece.');
    return data;
  };
  return {
    async list(page=0) {
      if(!Number.isSafeInteger(page)||page<0||page>10000) throw new Error('Nieprawidłowa strona biblioteki.');
      const id=await userId();
      const {data,error}=await client.from('media_assets').select('*').eq('user_id',id).eq('status','ready')
        .order('created_at',{ascending:false}).order('id',{ascending:false}).range(page*50,page*50+49);
      if(error) throw new Error('Nie udało się wczytać biblioteki konta.');
      return data ?? [];
    },
    async reserve(file:{name:string;size:number},limit=DEFAULT_ACCOUNT_FILE_BYTES) {
      const checked=inspectAccountFile(file,limit);
      const user_id=await userId();
      const {data,error}=await client.from('media_assets').insert({...checked,user_id,status:'uploading'}).select('*').single();
      if(error || !data) throw new Error('Nie udało się przygotować uploadu.');
      return data;
    },
    async listPending() {
      const id=await userId();
      const {data,error}=await client.from('media_assets').select('*').eq('user_id',id)
        .in('status',['uploading','failed','deleting']).order('created_at',{ascending:false}).limit(50);
      if(error) throw new Error('Nie udało się sprawdzić przerwanych operacji.');
      return data ?? [];
    },
    async finalize(id:string) {
      const row=await find(id);
      const {data,error}=await client.from('media_assets').update({status:'ready'}).eq('id',row.id).eq('user_id',row.user_id).select('*').single();
      if(error || !data) throw new Error('Plik nie został jeszcze potwierdzony w magazynie. Spróbuj ponownie.');
      return data;
    },
    async playbackUrl(id:string) {
      const row=await find(id);
      if(row.status!=='ready') throw new Error('Ten upload nie jest jeszcze gotowy.');
      const {data,error}=await client.storage.from(ACCOUNT_MEDIA_BUCKET).createSignedUrl(row.object_path,3600);
      if(error || !data) throw new Error('Nie udało się przygotować odtwarzania.');
      return {url:data.signedUrl,expiresAt:Date.now()+3600*1000};
    },
    async remove(id:string) {
      const row=await find(id);
      // A failed deletion stays visible to recovery tooling as 'deleting'.
      const pending=await client.from('media_assets').update({status:'deleting'}).eq('id',row.id).eq('user_id',row.user_id).select('id').single();
      if(pending.error || !pending.data) throw new Error('Nie udało się rozpocząć usuwania.');
      const removed=await client.storage.from(ACCOUNT_MEDIA_BUCKET).remove([row.object_path]);
      if(removed.error) throw new Error('Plik nie został usunięty. Ponów usuwanie.');
      const result=await client.from('media_assets').delete().eq('id',row.id).eq('user_id',row.user_id).select('id').single();
      if(result.error || !result.data) throw new Error('Plik usunięto z magazynu, ale wpis wymaga ponowienia usunięcia.');
    },
  };
}
