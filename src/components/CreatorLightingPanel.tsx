'use client';

import { RotateCcw } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useHudStore } from '../stores/useHudStore';
import type { CreatorLightingSettings, RoomMood } from '../lib/creatorLighting';

const moods: { id: RoomMood; label: string }[] = [{ id: 'warm', label: 'Ciepło' }, { id: 'focus', label: 'Skupienie' }, { id: 'night', label: 'Noc' }];
const colors = [{ color: '#ff9f45', label: 'Bursztyn' }, { color: '#a5d8ff', label: 'Lód' }, { color: '#bc8aff', label: 'Fiolet' }, { color: '#ff739e', label: 'Róż' }];
type SliderKey = 'roomBrightness' | 'ledBrightness' | 'boothBrightness' | 'musicStrength';

function LightingSlider({ name, label, value, disabled, onChange }: { name: SliderKey; label: string; value: number; disabled?: boolean; onChange: (patch: Partial<CreatorLightingSettings>) => void }) {
  return <label className={`creator-light-slider ${disabled ? 'is-disabled' : ''}`}>
    <span>{label}<output>{Math.round(value * 100)}%</output></span>
    <input type="range" aria-label={label} min={0} max={1} step={0.01} value={value} disabled={disabled} onChange={event => onChange({ [name]: Number(event.target.value) })} />
  </label>;
}

export function CreatorLightingPanel() {
  const mood = useHudStore(s => s.roomMood);
  const settings = useHudStore(s => s.lighting);
  const setMood = useHudStore(s => s.setRoomMood);
  const setLighting = useHudStore(s => s.setLighting);
  const reset = useHudStore(s => s.resetLighting);
  return <div className="creator-lighting-panel">
    <div className="creator-lighting-intro"><h2>Twój nastrój</h2><p>Ustaw światło. Posłuchaj, jak zmienia się pokój.</p></div>
    <fieldset className="creator-moods"><legend>Wybierz nastrój</legend>{moods.map(item => <button type="button" key={item.id} aria-pressed={mood === item.id} onClick={() => setMood(item.id)}>{item.label}</button>)}</fieldset>
    <div className="creator-lighting-controls">
      <LightingSlider name="roomBrightness" label="Jasność pokoju" value={settings.roomBrightness} onChange={setLighting} />
      <LightingSlider name="ledBrightness" label="Moc LED" value={settings.ledBrightness} onChange={setLighting} />
      <LightingSlider name="boothBrightness" label="Podświetlenie kabiny" value={settings.boothBrightness} onChange={setLighting} />
      <LightingSlider name="musicStrength" label="Siła reakcji" value={settings.musicStrength} disabled={!settings.audioReactive} onChange={setLighting} />
    </div>
    <fieldset className="creator-light-colors"><legend>Kolor LED i kabiny</legend><div>{colors.map(item => <button type="button" key={item.color} aria-label={`Kolor LED: ${item.label}`} aria-pressed={settings.ledColor === item.color} title={item.label} style={{ '--swatch': item.color } as CSSProperties} onClick={() => setLighting({ ledColor: item.color })} />)}<label className="creator-custom-color" title="Własny kolor"><input type="color" aria-label="Własny kolor LED" value={settings.ledColor} onChange={event => setLighting({ ledColor: event.target.value })} /><span>Własny</span></label></div></fieldset>
    <label className="creator-light-reactive"><span><strong>Reaguj na muzykę</strong><small>LED i kabina pulsują do odtwarzanego dźwięku.</small></span><input type="checkbox" role="switch" aria-label="Reaguj na muzykę" checked={settings.audioReactive} onChange={event => setLighting({ audioReactive: event.target.checked })} /></label>
    <p className="creator-session-note">W trybie Noc główne lampy gasną. Ekran, LED i kabinę ustawisz niezależnie.</p>
    <button type="button" className="creator-secondary-button creator-light-reset" onClick={reset}><RotateCcw size={15} />Przywróć ustawienia</button>
  </div>;
}
