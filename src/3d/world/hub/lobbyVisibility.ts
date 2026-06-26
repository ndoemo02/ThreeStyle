export type Vec3Tuple = [number, number, number];

export function shouldShowLobbyWorldLabel(
  cameraPosition: Vec3Tuple,
  cameraForward: Vec3Tuple,
  labelPosition: Vec3Tuple,
  maxDistance: number,
): boolean {
  const dx = labelPosition[0] - cameraPosition[0];
  const dy = labelPosition[1] - cameraPosition[1];
  const dz = labelPosition[2] - cameraPosition[2];
  const distanceSquared = dx * dx + dy * dy + dz * dz;
  if (distanceSquared > maxDistance * maxDistance) return false;
  return dx * cameraForward[0] + dy * cameraForward[1] + dz * cameraForward[2] > 0;
}
