import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig } from './lib/supabase/config';

export async function proxy(request: NextRequest) {
  const config = getSupabaseConfig();
  let response = NextResponse.next({ request });
  response.headers.set('Cache-Control', 'private, no-store');
  if (!config) return response;
  const client = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: values => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        response.headers.set('Cache-Control', 'private, no-store');
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // A network interruption must leave the public landing and its retry reachable.
  try { await client.auth.getClaims(); } catch { /* Browser verifies the account with getUser. */ }
  return response;
}

export const config = { matcher: ['/', '/auth/callback', '/auth/recovery'] };
