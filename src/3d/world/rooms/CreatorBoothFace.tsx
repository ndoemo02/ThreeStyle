'use client';
import { lazy, Suspense } from 'react';
import { useCreatorFaceStore } from '../../../stores/useCreatorFaceStore';
import { DestinationBoundary } from '../../systems/DestinationBoundary';

const Face = lazy(() => import('../../modules/fx/AudioReactiveFace'));
export function CreatorBoothFace() {
  const enabled = useCreatorFaceStore(s => s.enabled), revision = useCreatorFaceStore(s => s.revision);
  if (!enabled) return null;
  return <DestinationBoundary key={revision} onFailure={() => useCreatorFaceStore.getState().setStatus('error', revision)}>
    <Suspense fallback={null}><Face revision={revision} /></Suspense>
  </DestinationBoundary>;
}
