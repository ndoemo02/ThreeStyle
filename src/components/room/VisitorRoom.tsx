'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { ROOM_ZONE } from '../../3d/navigation/navigationConfig';
import type { AccountRoomRow } from '../../lib/accountRoom';
import { accountRoom, ROOM_UNAVAILABLE } from '../../lib/supabase/accountRoom';
import { createAccountClient } from '../../lib/supabase/browser';
import { getSupabaseConfig } from '../../lib/supabase/config';
import { useHudStore } from '../../stores/useHudStore';
import { RoomFinder } from './RoomFinder';
import './room.css';

const World = dynamic(() => import('../WorldExperience'), { ssr: false });

type VisitState =
  | { status: 'loading' }
  | { status: 'unavailable'; message: string; retry: boolean }
  | { status: 'ready'; room: AccountRoomRow; own: boolean };

/**
 * One read on open, no live updates. A missing room and a private room show the same text,
 * so the link does not reveal whether a private room exists.
 */
export function VisitorRoom({ slug }: { slug: string }) {
  const [state, setState] = useState<VisitState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async (): Promise<VisitState> => {
      if (!getSupabaseConfig()) return { status: 'unavailable', message: 'Pokoje wymagają konfiguracji Supabase.', retry: false };
      const client = createAccountClient();
      try {
        const room = await accountRoom(client).bySlug(slug);
        if (!room) return { status: 'unavailable', message: ROOM_UNAVAILABLE, retry: false };
        // Display only: RLS decides what can be changed, this line only picks the banner text.
        const { data } = await client.auth.getUser().catch(() => ({ data: { user: null } }));
        return { status: 'ready', room, own: data.user?.id === room.owner_id };
      } catch (error) {
        return { status: 'unavailable', message: error instanceof Error ? error.message : 'Nie udało się wczytać pokoju.', retry: true };
      }
    };
    void load().then(next => { if (active) setState(next); });
    return () => { active = false; };
  }, [slug, attempt]);

  if (state.status !== 'ready') return <main className="room-gate">
    <section className="room-gate-card" aria-labelledby="room-gate-title">
      <p className="room-gate-eyebrow">THREESTYLE · POKÓJ</p>
      {state.status === 'loading' ? <h1 id="room-gate-title" role="status">Wczytujemy pokój…</h1> : <>
        <h1 id="room-gate-title">Nie możemy otworzyć tego pokoju</h1>
        <p role="alert">{state.message}</p>
        {state.retry && <button type="button" className="room-gate-primary" onClick={() => { setState({ status: 'loading' }); setAttempt(n => n + 1); }}>Spróbuj ponownie</button>}
        <RoomFinder initial={slug} />
      </>}
      <Link className="room-gate-back" href="/">← Strona główna</Link>
    </section>
  </main>;

  return <>
    <World initialZone={ROOM_ZONE} roomMode="visitor" visitorRoom={state.room} />
    <aside className="room-visit-banner" aria-label="Informacja o pokoju">
      <p><strong>Pokój <span translate="no">{state.room.slug}</span></strong> · {state.own ? 'tak widzą go goście' : 'tylko podgląd'}</p>
      <p><Lock size={13} aria-hidden="true" /> {state.own
        ? 'To Twój pokój. Zmieniasz go po zalogowaniu na stronie głównej, w panelu „Pokój”.'
        : 'Pliki właściciela są prywatne i tu niedostępne. Układu nie można zmienić.'}</p>
      <div><button type="button" onClick={() => useHudStore.getState().openHud('master_catalog')}>Szczegóły</button><Link href="/">Wyjdź</Link></div>
    </aside>
  </>;
}
