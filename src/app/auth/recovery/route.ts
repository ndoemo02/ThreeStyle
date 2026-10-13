import type { NextRequest } from 'next/server';
import { exchangeAccountCode } from '../../../lib/supabase/authCallback';
export async function GET(request: NextRequest) { return exchangeAccountCode(request, true); }