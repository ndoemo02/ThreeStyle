export function shouldUseMobileRoomProfile({
  viewportWidth,
  coarsePointer,
  touchPoints,
}: {
  viewportWidth: number;
  coarsePointer: boolean;
  touchPoints: number;
}) {
  const hasTouchInput = coarsePointer || touchPoints > 0;
  const hasCompactViewport = viewportWidth < 900;
  const isTouchLandscape = hasTouchInput && viewportWidth < 1200;

  return hasCompactViewport || isTouchLandscape;
}

export function shouldUseMobileRoomProfileInBrowser() {
  return shouldUseMobileRoomProfile({
    viewportWidth: window.innerWidth,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    touchPoints: navigator.maxTouchPoints,
  });
}
