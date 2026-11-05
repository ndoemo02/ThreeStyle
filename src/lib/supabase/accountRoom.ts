import type { SupabaseClient } from '@supabase/supabase-js';
import { isValidRoomSlug, normalizeRoomSlug, roomColumnsFromLayout, type AccountRoomRow, type RoomLayout, type RoomVisibility } from '../accountRoom.ts';
import type { Database } from './database.types';

const ROOM_COLUMNS = 'owner_id,slug,visibility,room_mood,room_brightness,led_brightness,led_color,booth_brightness,audio_reactive,music_strength,led_cycle,created_at,updated_at';

/** Same text for "does not exist" and "private": a visitor must not learn that a private room exists. */
export const ROOM_UNAVAILABLE = 'Nie ma takiego pokoju albo właściciel go nie udostępnia.';

type ServiceError = { code?: string } | null;
function sharingMessage(error: ServiceError) {
  if (error?.code === '23505') return 'Ta nazwa jest już zajęta. Wybierz inną.';
  if (error?.code === '23514') return 'Pokój publiczny potrzebuje poprawnej nazwy.';
  return 'Nie udało się zapisać udostępniania. Sprawdź połączenie i spróbuj ponownie.';
}

/**
 * Room adapter. The owner client edits only its own row; every other caller reads.
 * Authorization lives in RLS, the filters here only select the intended row.
 */
export function accountRoom(client: SupabaseClient<Database>) {
  const userId = async () => {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user || data.user.is_anonymous) throw new Error('Zaloguj się, aby zapisać swój pokój.');
    return data.user.id;
  };
  return {
    /** The signed-in account's room; the migration creates it with the profile. */
    async mine(): Promise<AccountRoomRow> {
      const id = await userId();
      const { data, error } = await client.from('rooms').select(ROOM_COLUMNS).eq('owner_id', id).maybeSingle();
      if (error) throw new Error('Nie udało się wczytać Twojego pokoju.');
      if (!data) throw new Error('Twoje konto nie ma jeszcze pokoju. Spróbuj ponownie później.');
      return data as AccountRoomRow;
    },
    async saveLayout(layout: RoomLayout): Promise<AccountRoomRow> {
      const id = await userId();
      const { data, error } = await client.from('rooms').update(roomColumnsFromLayout(layout)).eq('owner_id', id).select(ROOM_COLUMNS).single();
      if (error || !data) throw new Error('Nie udało się zapisać układu pokoju.');
      return data as AccountRoomRow;
    },
    async saveSharing(input: { slug: string; visibility: RoomVisibility }): Promise<AccountRoomRow> {
      const slug = normalizeRoomSlug(input.slug);
      if (slug && !isValidRoomSlug(slug)) throw new Error('Nazwa: 3–32 znaki, małe litery bez polskich znaków, cyfry i myślniki w środku.');
      if (input.visibility === 'public' && !slug) throw new Error('Nadaj pokojowi nazwę, zanim go udostępnisz.');
      const id = await userId();
      const { data, error } = await client.from('rooms').update({ slug: slug || null, visibility: input.visibility }).eq('owner_id', id).select(ROOM_COLUMNS).single();
      if (error || !data) throw new Error(sharingMessage(error));
      return data as AccountRoomRow;
    },
    /** Works without an account. Returns null for a missing and for a private room alike. */
    async bySlug(value: string): Promise<AccountRoomRow | null> {
      const slug = normalizeRoomSlug(value);
      if (!isValidRoomSlug(slug)) return null;
      const { data, error } = await client.from('rooms').select(ROOM_COLUMNS).eq('slug', slug).maybeSingle();
      if (error) throw new Error('Nie udało się wczytać pokoju. Sprawdź połączenie i spróbuj ponownie.');
      return (data as AccountRoomRow | null) ?? null;
    },
  };
}
