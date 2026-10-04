'use client';

import { createContext, useContext } from 'react';

export const CreatorRoomProfileContext = createContext(false);
export function useCreatorRoomMobile() { return useContext(CreatorRoomProfileContext); }

const mobileModels = new Set(['ipad_pro_2024', 'mic-transformed', 'organizer']);
export function creatorModelUrl(original: string, mobile: boolean) {
  const name = original.split('/').pop()?.replace(/\.glb$/, '') ?? '';
  return mobile && mobileModels.has(name) ? `/models/creator-room/mobile/${name}.glb` : original;
}

export function creatorParameterMap(family: string, map: string, mobile: boolean) {
  return mobile
    ? `/textures/runtime/creator-room/mobile/${family}/${map}.webp`
    : `/textures/runtime/${family}/${map}.webp`;
}
