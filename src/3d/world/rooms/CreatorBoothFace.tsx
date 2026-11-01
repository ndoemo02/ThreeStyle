'use client';
import { lazy, Suspense, useState } from 'react';
import { useCreatorFaceStore } from '../../../stores/useCreatorFaceStore';
import { DestinationBoundary } from '../../systems/DestinationBoundary';

const Face = lazy(() => import('../../modules/fx/AudioReactiveFace'));
const Lucky = lazy(() => import('./LuckyHost'));

/** Opt-in booth host: Lucky where his model is deployed, otherwise the standalone face. */
export function CreatorBoothFace() {
  const enabled = useCreatorFaceStore(s => s.enabled), revision = useCreatorFaceStore(s => s.revision);
  const [luckyMissing, setLuckyMissing] = useState(false);
  if (!enabled) return null;
  return <DestinationBoundary key={`${revision}-${luckyMissing}`} onFailure={() => useCreatorFaceStore.getState().setStatus('error', revision)}>
    <Suspense fallback={null}>
      {luckyMissing ? <Face revision={revision} /> : <Lucky revision={revision} onUnavailable={() => setLuckyMissing(true)} />}
    </Suspense>
  </DestinationBoundary>;
}
