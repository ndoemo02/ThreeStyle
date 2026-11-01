import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseConfig } from './config';
import type { Database } from './database.types';

export async function createAccountServerClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error('Brak konfiguracji kont.');
  const jar = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: values => { for (const { name, value, options } of values) jar.set(name, value, options); },
    },
  });
}
