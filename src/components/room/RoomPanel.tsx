'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, Eye, Lock, RefreshCw } from 'lucide-react';
import { isValidRoomSlug, normalizeRoomSlug, roomPath, type RoomVisibility } from '../../lib/accountRoom';
import { accountRoom } from '../../lib/supabase/accountRoom';
import { createAccountClient } from '../../lib/supabase/browser';
import { useRoomStore } from '../../stores/useRoomStore';

const MOOD_LABELS = { warm: 'Ciepło', focus: 'Skupienie', night: 'Noc' } as const;
const SAVE_LABELS = { idle: '', saving: 'Zapisywanie układu…', saved: 'Układ zapisany na koncie.', error: 'Układ nie został zapisany.' } as const;

/** Visitor: read-only facts about the room and its limits. */
export function VisitorRoomPanel() {
  const room = useRoomStore(s => s.room);
  if (!room) return null;
  return <div className="creator-room-panel">
    <div className="creator-lighting-intro"><h2>Pokój {room.slug ? <span translate="no">{room.slug}</span> : null}</h2><p className="is-kept">Oglądasz cudzy pokój. Widzisz układ ustawiony przez właściciela i nie możesz go zmienić.</p></div>
    <p className="creator-message" role="note"><Lock size={14} aria-hidden="true" /> Pliki właściciela (muzyka i wideo) są prywatne i niedostępne w tym pokoju. Ekran pokazuje tylko wystrój, bez odtwarzania.</p>
    <dl className="creator-room-facts"><dt>Nastrój</dt><dd>{MOOD_LABELS[room.room_mood]}</dd><dt>Ostatnia zmiana</dt><dd>{new Date(room.updated_at).toLocaleString('pl-PL')}</dd></dl>
    <p className="creator-session-note">Zmiany właściciela zobaczysz po ponownym otwarciu linku. Pokój nie odświeża się na żywo.</p>
  </div>;
}

/** Owner: autosave status of the look, room name, visibility and the share link. */
export function OwnerRoomPanel() {
  const room = useRoomStore(s => s.room);
  const loadStatus = useRoomStore(s => s.loadStatus);
  const saveStatus = useRoomStore(s => s.saveStatus);
  const message = useRoomStore(s => s.message);
  const retry = useRoomStore(s => s.retry);
  const [slug, setSlug] = useState('');
  const [visibility, setVisibility] = useState<RoomVisibility>('private');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const roomSlug = room?.slug ?? null, roomVisibility = room?.visibility ?? 'private';

  useEffect(() => { setSlug(roomSlug ?? ''); setVisibility(roomVisibility); }, [roomSlug, roomVisibility]);

  if (loadStatus === 'loading' || loadStatus === 'idle') return <div className="creator-room-panel"><p className="creator-empty" role="status">Wczytywanie Twojego pokoju…</p></div>;
  if (loadStatus === 'error' || !room) return <div className="creator-room-panel">
    <p className="creator-message error" role="alert">{message ?? 'Nie udało się wczytać Twojego pokoju.'}</p>
    <p className="creator-session-note">Do czasu wczytania zmiany światła zostają tylko na tym urządzeniu.</p>
    <button type="button" className="creator-secondary-button" onClick={retry}><RefreshCw size={15} />Ponów wczytanie</button>
  </div>;

  const normalized = normalizeRoomSlug(slug);
  const slugProblem = normalized && !isValidRoomSlug(normalized) ? 'Nazwa: 3–32 znaki — małe litery bez polskich znaków, cyfry i myślniki w środku.' : null;
  const changed = normalized !== (room.slug ?? '') || visibility !== room.visibility;
  const link = room.visibility === 'public' && room.slug && typeof window !== 'undefined' ? `${window.location.origin}${roomPath(room.slug)}` : null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || slugProblem) return;
    setBusy(true); setError(null); setNotice(null); setCopied(false);
    try {
      const row = await accountRoom(createAccountClient()).saveSharing({ slug: normalized, visibility });
      useRoomStore.getState().set({ room: row });
      setNotice(row.visibility === 'public' ? 'Pokój jest publiczny. Każdy z linkiem lub nazwą może go oglądać.' : 'Pokój jest prywatny. Widzisz go tylko Ty.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Nie udało się zapisać udostępniania.');
    } finally { setBusy(false); }
  };
  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopied(true); }
    catch { setError('Nie udało się skopiować. Zaznacz link i skopiuj go ręcznie.'); }
  };

  return <div className="creator-room-panel">
    <div className="creator-lighting-intro"><h2>Twój pokój</h2><p>Nastrój i światło zapisują się na Twoim koncie. Goście widzą ten sam układ, bez możliwości zmian.</p></div>
    <p className={`creator-session-note ${saveStatus === 'error' ? 'is-error' : ''}`} role="status">{SAVE_LABELS[saveStatus]}</p>
    {saveStatus === 'error' && <><p className="creator-message error" role="alert">{message}</p><button type="button" className="creator-secondary-button" onClick={retry}><RefreshCw size={15} />Ponów zapis</button></>}
    <form className="creator-room-share" onSubmit={event => void submit(event)}>
      <label className="creator-room-field"><span>Nazwa pokoju</span>
        <input name="slug" value={slug} onChange={event => { setSlug(event.target.value); setNotice(null); }} placeholder="np. studio-ani" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={40} aria-invalid={Boolean(slugProblem)} aria-describedby="creator-room-slug-hint" disabled={busy} />
      </label>
      <small id="creator-room-slug-hint" className="creator-session-note">{slugProblem ?? 'Nazwa tworzy link /pokoj/nazwa. Prywatny pokój może zostać bez nazwy.'}</small>
      <fieldset className="creator-moods creator-room-visibility" disabled={busy}><legend>Kto może wejść</legend>
        <button type="button" aria-pressed={visibility === 'private'} onClick={() => { setVisibility('private'); setNotice(null); }}><Lock size={14} aria-hidden="true" />Prywatny</button>
        <button type="button" aria-pressed={visibility === 'public'} onClick={() => { setVisibility('public'); setNotice(null); }}><Eye size={14} aria-hidden="true" />Publiczny</button>
      </fieldset>
      <small className="creator-session-note">{visibility === 'public' ? 'Publiczny: każdy z linkiem lub nazwą zobaczy układ, także bez konta. Twoje pliki, kamera i głośność zostają prywatne.' : 'Prywatny: tylko Ty. Link nie działa dla innych osób.'}</small>
      <button type="submit" className="creator-add-button" disabled={busy || !changed || Boolean(slugProblem) || (visibility === 'public' && !normalized)}>{busy ? 'Zapisywanie…' : 'Zapisz udostępnianie'}</button>
      {visibility === 'public' && !normalized && <small className="creator-session-note">Nadaj nazwę, żeby udostępnić pokój.</small>}
    </form>
    {error && <p className="creator-message error" role="alert">{error}</p>}
    {notice && <p className="creator-message" role="status">{notice}</p>}
    {link && <div className="creator-room-link"><p className="creator-label">LINK DO POKOJU</p><output translate="no">{link}</output>
      <button type="button" className="creator-secondary-button" onClick={() => void copy()}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Skopiowano' : 'Kopiuj link'}</button></div>}
  </div>;
}
