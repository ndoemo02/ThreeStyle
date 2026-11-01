'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, X } from 'lucide-react';
import { createAccountClient } from '../../lib/supabase/browser';
import { getSupabaseConfig } from '../../lib/supabase/config';
import { entryImageFraming, ENTRY_TIMING } from '../../lib/entryTransition';
import { useEntryStore } from '../../stores/useEntryStore';
import { useHudStore } from '../../stores/useHudStore';
import './entry.css';

const World = dynamic(() => import('../WorldExperience'), { ssr: false });
type Mode = 'login' | 'register' | 'forgot' | 'reset';
function authMessage(error: { code?: string }) {
  if (error.code === 'invalid_credentials') return 'Sprawdź adres e-mail i hasło.';
  if (error.code === 'email_not_confirmed') return 'Potwierdź adres e-mail przez link z wiadomości, a potem się zaloguj.';
  if (error.code?.includes('rate_limit')) return 'Za dużo prób. Odczekaj chwilę i spróbuj ponownie.';
  if (error.code === 'weak_password') return 'Wybierz mocniejsze hasło — co najmniej 8 znaków.';
  return 'Nie udało się zakończyć operacji. Sprawdź połączenie i spróbuj ponownie.';
}
export function EntryLanding() {
  const client = useMemo(() => getSupabaseConfig() ? createAccountClient() : null, []);
  const phase = useEntryStore(s => s.phase);
  const [mode, setMode] = useState<Mode>('login');
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true), [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState(''), [error, setError] = useState('');
  const [scene, setScene] = useState(false), [sceneKey, setSceneKey] = useState(0);
  const [demo, setDemo] = useState(false), [framing, setFraming] = useState({ transform: 'none', origin: 'center' });
  const [reducedMotion, setReducedMotion] = useState(false);
  const accountGeneration = useRef(0);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { setReducedMotion(media.matches); useEntryStore.setState({ reducedMotion: media.matches }); setFraming(entryImageFraming(innerWidth, innerHeight)); };
    update(); media.addEventListener('change', update); addEventListener('resize', update);
    const query = new URLSearchParams(location.search);
    if (query.get('mode') === 'reset') setMode('reset');
    if (query.get('auth') === 'confirmed') setNotice('Adres potwierdzony. Możesz wejść do ThreeStyle.');
    if (query.get('auth') === 'error') setError('Link wygasł albo został już użyty. Zaloguj się lub poproś o nowy link.');
    return () => { media.removeEventListener('change', update); removeEventListener('resize', update); };
  }, []);
  useEffect(() => {
    let mounted = true;
    const verify = async () => {
      const generation = ++accountGeneration.current;
      try { const result = client ? await client.auth.getUser() : null; if (mounted && generation === accountGeneration.current) setUser(result?.data.user && !result.data.user.is_anonymous ? result.data.user : null); }
      catch { if (mounted && generation === accountGeneration.current) setUser(null); }
      finally { if (mounted) setChecking(false); }
    };
    void verify();
    const subscription = client?.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') { ++accountGeneration.current; setUser(null); if (!demo) { setScene(false); useEntryStore.getState().reset(reducedMotion); } }
      else queueMicrotask(() => { if (mounted) void verify(); });
      if (event === 'PASSWORD_RECOVERY') setMode('reset');
    });
    return () => { mounted = false; subscription?.data.subscription.unsubscribe(); };
  }, [client, demo, reducedMotion]);
  const failScene = useCallback(() => {
    if (!['preparing', 'approaching', 'opening', 'entering'].includes(useEntryStore.getState().phase)) return;
    setError('Lobby nie zostało wczytane. Sprawdź połączenie i ponów wejście.');
    useEntryStore.getState().setPhase('error');
  }, []);
  const readyScene = useCallback(() => { if (useEntryStore.getState().phase === 'preparing') useEntryStore.getState().setPhase('approaching'); }, []);
  useEffect(() => { if (phase !== 'preparing') return; const timer = setTimeout(failScene, ENTRY_TIMING.timeout); return () => clearTimeout(timer); }, [phase, failScene]);
  useEffect(() => { if (phase === 'complete') document.querySelector<HTMLButtonElement>('[data-entry-interactive="true"] button')?.focus({ preventScroll: true }); }, [phase]);
  const enter = async (asDemo: boolean) => {
    setBusy(true); setError('');
    try {
      if (!asDemo) { if (!client) throw new Error('configuration'); const { data, error: authError } = await client.auth.getUser(); if (authError || !data.user || data.user.is_anonymous) { setUser(null); setError('Zaloguj się, aby wejść ze swoim kontem.'); return; } setUser(data.user); }
      useHudStore.getState().closeHud(); setDemo(asDemo); setSceneKey(key => key + 1);
      useEntryStore.getState().reset(reducedMotion); useEntryStore.getState().setPhase('preparing'); setScene(true);
    } catch { setError('Nie udało się potwierdzić sesji. Sprawdź połączenie i spróbuj ponownie.'); } finally { setBusy(false); }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!client || busy) return; setBusy(true); setError(''); setNotice('');
    const fields = new FormData(event.currentTarget), email = String(fields.get('email') ?? '').trim(), password = String(fields.get('password') ?? '');
    try {
      if (mode === 'login') { const result = await client.auth.signInWithPassword({ email, password }); if (result.error) setError(authMessage(result.error)); else await enter(false); }
      else if (mode === 'register') {
        if (password !== fields.get('confirm')) { setError('Hasła muszą być takie same.'); return; }
        const result = await client.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
        if (result.error) setError(authMessage(result.error)); else if (result.data.session) await enter(false); else setNotice('Sprawdź pocztę, aby potwierdzić konto. Jeśli adres już ma konto, użyj logowania lub odzyskaj hasło.');
      } else if (mode === 'forgot') { const result = await client.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/recovery` }); if (result.error) setError(authMessage(result.error)); else setNotice('Jeśli ten adres ma konto, otrzymasz wiadomość z linkiem do zmiany hasła.'); }
      else {
        if (password !== fields.get('confirm')) { setError('Hasła muszą być takie same.'); return; }
        const verified = await client.auth.getUser(); if (verified.error || !verified.data.user || verified.data.user.is_anonymous) { setError('Otwórz aktualny link odzyskiwania z wiadomości e-mail.'); return; }
        const result = await client.auth.updateUser({ password }); if (result.error) setError(authMessage(result.error)); else { setMode('login'); setNotice('Hasło zmienione. Możesz wejść do ThreeStyle.'); }
      }
    } catch { setError('Połączenie zostało przerwane. Spróbuj ponownie.'); } finally { setBusy(false); }
  };
  const back = () => { if (document.pointerLockElement) document.exitPointerLock(); useHudStore.getState().closeHud(); setScene(false); useEntryStore.getState().reset(reducedMotion); };
  const signOut = async () => { setBusy(true); try { const result = await client?.auth.signOut({ scope: 'local' }); if (result?.error) { setError('Nie udało się wylogować. Spróbuj ponownie.'); return; } setUser(null); back(); } catch { setError('Sprawdź połączenie i ponów wylogowanie.'); } finally { setBusy(false); } };
  const changing = ['preparing', 'approaching', 'opening', 'entering'].includes(phase);
  return <>
    {scene && <World key={sceneKey} initialZone="hub" entry onReady={readyScene} onFailure={failScene} />}
    {phase !== 'complete' && <main className={`entry-stage entry-${phase}`} aria-label="Wejście do ThreeStyle" data-entry-phase={phase}>
      <div className="entry-photo" aria-hidden="true" style={{ transformOrigin: framing.origin, transform: ['approaching', 'opening', 'entering'].includes(phase) && !reducedMotion ? framing.transform : 'none', opacity: ['opening', 'entering'].includes(phase) ? 0 : 1 }} /><div className="entry-shade" aria-hidden="true" />
      <div className="entry-content" inert={changing} style={{ opacity: changing ? 0 : 1, pointerEvents: changing ? 'none' : undefined }}>
        <header className="entry-header"><Link className="entry-brand" href="/">ThreeStyle<span>Blok Trzech Pięter</span></Link><Link className="entry-demo-nav" href="/b3p" prefetch={false}>Demo pokoju <ArrowRight size={17} /></Link></header>
        <div className="entry-layout"><section className="entry-story"><span className="entry-eyebrow">TWOJA MUZYKA MA SWÓJ ADRES</span><h1>Twój styl.<br /><em>Twoje miejsce.</em></h1><p>Wejdź do pokoju, puść swoje materiały i ustaw światło pod swój nastrój.</p><span className="entry-story-mark">3S</span></section>
          <section className="entry-card" aria-labelledby="entry-card-title"><div className="entry-card-number">01 <span>WEJŚCIE DO BLOKU</span></div>
            {user && mode !== 'reset' ? <><h2 id="entry-card-title">Dobrze Cię widzieć.</h2><p className="entry-account-email">{user.email}</p><button className="entry-primary" disabled={busy || checking} onClick={() => void enter(false)}>Wejdź do ThreeStyle <ArrowRight size={20} /></button><button className="entry-text" disabled={busy} onClick={() => void signOut()}>Wyloguj się</button></> : <>
              <div className="entry-tabs" aria-label="Konto"><button aria-pressed={mode === 'login'} disabled={busy} onClick={() => { setMode('login'); setError(''); setNotice(''); }}>Logowanie</button><button aria-pressed={mode === 'register'} disabled={busy} onClick={() => { setMode('register'); setError(''); setNotice(''); }}>Rejestracja</button></div>
              <h2 id="entry-card-title">{mode === 'login' ? 'Wejdź po swojemu.' : mode === 'register' ? 'Twoje miejsce czeka.' : mode === 'forgot' ? 'Odzyskaj dostęp.' : 'Nowe hasło.'}</h2>
              <form onSubmit={event => void submit(event)}>
                {mode !== 'reset' && <label className="entry-field"><span>Adres e-mail</span><div><Mail size={18} /><input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="twoj@email.pl" disabled={busy} /></div></label>}
                {mode !== 'forgot' && <label className="entry-field"><span>Hasło</span><div><LockKeyhole size={18} /><input name="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'login' ? undefined : 8} required maxLength={128} placeholder={mode === 'login' ? 'Twoje hasło' : 'Co najmniej 8 znaków'} disabled={busy} /><button type="button" aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'} aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>}
                {['register', 'reset'].includes(mode) && <label className="entry-field"><span>Powtórz hasło</span><div><LockKeyhole size={18} /><input name="confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={128} disabled={busy} /></div></label>}
                {mode === 'login' && <button type="button" className="entry-forgot" disabled={busy} onClick={() => { setMode('forgot'); setError(''); }}>Nie pamiętasz hasła?</button>}
                <button className="entry-primary" disabled={busy || checking || !client} type="submit">{busy ? 'Chwila…' : mode === 'login' ? 'Zaloguj się' : mode === 'register' ? 'Utwórz konto' : mode === 'forgot' ? 'Wyślij link' : 'Zapisz hasło'} <ArrowRight size={20} /></button>
              </form>{!client && <p className="entry-notice">Logowanie wymaga konfiguracji Supabase. Demo jest dostępne poniżej.</p>}
            </>}
            {error && <p className="entry-error" role="alert">{error}</p>}{notice && <p className="entry-notice" role="status">{notice}</p>}
            {phase === 'error' && <button className="entry-primary" disabled={busy} onClick={() => void enter(demo)}>Ponów wejście <ArrowRight size={18} /></button>}
            <div className="entry-demo"><button id="entry-demo-button" disabled={busy} onClick={() => void enter(true)}>Zobacz demo <ArrowRight size={17} /></button><small>Bez konta · pliki tylko w tej sesji</small></div>
          </section></div><footer className="entry-footer"><span>THREESTYLE · TWÓJ RYTM, TWOJA PRZESTRZEŃ</span><span>Creator Room / Lobby / Muzyka</span></footer>
      </div>
      {changing && <div className="entry-loading" role="status" aria-live="polite"><span className="entry-loading-light" /><span>{phase === 'preparing' ? 'Przygotowujemy lobby…' : 'Witaj w ThreeStyle'}</span><button onClick={back} aria-label="Anuluj wejście"><X size={18} /></button></div>}
    </main>}
    {phase === 'complete' && <nav className="entry-session" aria-label="Sesja"><button onClick={back}>← Wejście</button><span>{demo ? 'DEMO · MEDIA SESYJNE' : 'TWOJE KONTO'}</span>{!demo && <button disabled={busy} onClick={() => void signOut()}>Wyloguj</button>}{error && <span role="alert">{error}</span>}</nav>}
  </>;
}
