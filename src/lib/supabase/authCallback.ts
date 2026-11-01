import { NextResponse, type NextRequest } from 'next/server';
import { createAccountServerClient } from './server';

export async function exchangeAccountCode(request: NextRequest, recovery = false) {
  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    try {
      const client = await createAccountServerClient();
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) {
        const response = NextResponse.redirect(new URL(recovery ? '/?mode=reset' : '/?auth=confirmed', request.url));
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
      }
    } catch { /* An invalid/expired exchange returns to the accessible form. */ }
  }
  const response = NextResponse.redirect(new URL('/?auth=error', request.url));
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
