'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { isValidRoomSlug, normalizeRoomSlug, roomPath } from '../../lib/accountRoom';

/** Opens /pokoj/<nazwa>. Only the format is checked here; the room page asks the database. */
export function RoomFinder({ initial = '' }: { initial?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const slug = normalizeRoomSlug(value);
    if (!isValidRoomSlug(slug)) { setError('Nazwa pokoju ma 3–32 znaki: małe litery bez polskich znaków, cyfry i myślniki w środku.'); return; }
    setError(null);
    router.push(roomPath(slug));
  };
  return <form className="room-finder" onSubmit={submit}>
    <label><span>Nazwa pokoju</span>
      <input value={value} onChange={event => { setValue(event.target.value); setError(null); }} placeholder="np. studio-ani" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={40} required aria-invalid={Boolean(error)} />
    </label>
    <button type="submit" className="room-gate-primary">Wejdź do pokoju</button>
    {error && <p role="alert">{error}</p>}
  </form>;
}
