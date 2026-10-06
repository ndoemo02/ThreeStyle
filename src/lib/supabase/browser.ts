'use client';
import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseConfig } from './config';
import type { Database } from './database.types';

export function createAccountClient() {
  const config=getSupabaseConfig();
  if(!config) throw new Error('Biblioteka konta wymaga konfiguracji Supabase.');
  return createBrowserClient<Database>(config.url,config.key);
}
