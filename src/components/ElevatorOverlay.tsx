'use client';

import { useTransitionStore } from '../store/useTransitionStore';
import { useElevatorUiStore } from '../stores/useElevatorUiStore';
import { useHudStore } from '../stores/useHudStore';

export function ElevatorOverlay() {
  const zone = useTransitionStore(s => s.activeZone);
  const phase = useTransitionStore(s => s.elevatorState);
  const active = useTransitionStore(s => s.activeElevator === 'A');
  const target = useTransitionStore(s => s.targetZone);
  const available = useElevatorUiStore(s => s.available);
  const status = useElevatorUiStore(s => s.rideStatus);
  const activate = useElevatorUiStore(s => s.activate);
  const recover = useElevatorUiStore(s => s.recover);
  const hudOpen = useHudStore(s => s.isOpen);
  if (hudOpen || (!available && !active)) return null;
  const descending = (target ?? (zone === 'room1' ? 'hub' : 'room1')) === 'hub';
  const label = descending ? 'Zjedź do lobby' : 'Wjedź do Creator Roomu';
  const message = phase === 'doors_closing' ? 'Zamykanie drzwi'
    : phase === 'doors_opening' ? 'Jesteś na miejscu'
    : status === 'error' ? 'Nie udało się przygotować pokoju'
    : status === 'waiting' ? 'Przygotowujemy pokój…' : descending ? 'Zjazd do lobby' : 'Wjazd do Creator Roomu';

  return <div data-elevator-overlay style={{
    position: 'fixed', bottom: 'max(20px, env(safe-area-inset-bottom))', left: '50%',
    transform: 'translateX(-50%)', zIndex: 70, maxWidth: 'calc(100vw - 32px)',
    padding: active ? '14px 20px' : 0, borderRadius: 18,
    background: active ? '#11191ff2' : undefined, color: '#f7eee4',
    fontFamily: 'sans-serif', textAlign: 'center', pointerEvents: 'none',
  }}>
    {active ? <div role="status" aria-live="polite" style={{ fontSize: 14, lineHeight: 1.5 }}>
      <span style={{ color: '#f3ad70', fontSize: 18, marginRight: 10 }}>{descending ? '↓' : '↑'}</span>{message}
    </div> : <button type="button" onClick={() => activate?.()} style={{
      pointerEvents: 'auto', minHeight: 52, padding: '14px 24px', borderRadius: 16,
      border: '1px solid #d6a371', background: '#192127', color: '#fff4e4',
      fontSize: 14, fontWeight: 600, cursor: 'pointer', touchAction: 'manipulation',
    }}>{label}</button>}
    {active && status === 'error' && <button type="button" onClick={() => recover?.()} style={{
      pointerEvents: 'auto', minHeight: 44, marginTop: 12, borderRadius: 12,
      border: '1px solid #c99769', background: '#2c2520', color: '#fff4e4', padding: '10px 18px',
    }}>Wróć do poprzedniego pokoju</button>}
  </div>;
}
