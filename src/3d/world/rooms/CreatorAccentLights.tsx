'use client';

import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useCreatorLightingFrame } from './CreatorLighting';
import { ACCENT_LED_BARS, FRONT_WALL_FACE_Z } from './creatorAccentLayout';
import { CREATOR_ACCENT_UNIFORMS } from './creatorAccentShader';
import { perimeterLedColor } from './CreatorPerimeterLights';

/**
 * LED accents of the Room.B look: the emissive bars are one draw call; the light they throw on the
 * floor and the brick is drawn by those surfaces' shaders from the uniforms set here.
 */
export function CreatorAccentLights() {
  const frameRef = useCreatorLightingFrame();
  const resources = useMemo(() => {
    const parts = ACCENT_LED_BARS.map(bar => new THREE.BoxGeometry(...bar.size).translate(...bar.position));
    const bars = mergeGeometries(parts);
    parts.forEach(part => part.dispose());
    bars.computeBoundingSphere();
    return { bars, led: new THREE.MeshBasicMaterial({ toneMapped: false }), color: new THREE.Color(), rgb: { r: 0, g: 0, b: 0 } };
  }, []);
  useEffect(() => () => {
    resources.bars.dispose(); resources.led.dispose();
    CREATOR_ACCENT_UNIFORMS.uAccentStrength.value = 0;
  }, [resources]);
  useFrame(() => {
    const frame = frameRef.current;
    // While the palette cycles, the accents take the colour of the ceiling strip above the brick wall.
    const color = perimeterLedColor(frame, 0, FRONT_WALL_FACE_Z, resources.color, resources.rgb);
    resources.led.color.copy(color).multiplyScalar(0.6 + frame.led * 1.4);
    CREATOR_ACCENT_UNIFORMS.uAccentColor.value.copy(color);
    CREATOR_ACCENT_UNIFORMS.uAccentStrength.value = frame.led;
  }, -1);
  return <mesh name="creator-accent-led" geometry={resources.bars} material={resources.led} raycast={() => {}} />;
}
