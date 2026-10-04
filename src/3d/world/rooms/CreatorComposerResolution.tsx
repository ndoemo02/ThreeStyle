'use client';

import { useContext, useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { EffectComposerContext } from '@react-three/postprocessing';

/** The upstream composer resizes on CSS size changes, but not on adaptive DPR changes. */
export function CreatorComposerResolution({ enabled }: { enabled: boolean }) {
  const { composer } = useContext(EffectComposerContext);
  const size = useThree(state => state.size);
  const dpr = useThree(state => state.viewport.dpr);

  useLayoutEffect(() => {
    if (enabled && dpr > 0) composer.setSize(size.width, size.height);
  }, [composer, enabled, size.width, size.height, dpr]);

  return null;
}
