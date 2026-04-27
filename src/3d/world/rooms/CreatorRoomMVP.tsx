import { useState, useRef, Suspense, useEffect, useMemo } from 'react';
import { Html, useTexture, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EditingTable } from '../../modules/furniture/EditingTable';
import { VocalBooth } from './VocalBooth';
import { useControls } from 'leva';
import { useHudStore } from '../../../stores/useHudStore';
import { RoomDoor } from '../../modules/doors/RoomDoor';

type SceneObjectProps = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
};

function TechnicalTrim({ args, position, rotation = [0, 0, 0] }: { args: [number, number, number], position: [number, number, number], rotation?: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color="#080808" roughness={0.95} metalness={0} />
    </mesh>
  );
}

function BrickWall({ args, position }: { args: [number, number, number], position: [number, number, number] }) {
  const textures = useTexture([
    '/textures/Bricks061_2K-JPG/Bricks061_2K-JPG_Color.jpg',
    '/textures/Bricks061_2K-JPG/Bricks061_2K-JPG_AmbientOcclusion.jpg',
    '/textures/Bricks061_2K-JPG/Bricks061_2K-JPG_NormalGL.jpg',
    '/textures/Bricks061_2K-JPG/Bricks061_2K-JPG_Roughness.jpg',
  ]);

  const maps = useMemo(() => {
    return textures.map(tex => {
      const clone = tex.clone();
      clone.wrapS = clone.wrapT = THREE.RepeatWrapping;
      clone.repeat.set(args[0] / 3, args[1] / 3);
      // Align textures in world space so seams match perfectly
      const leftEdge = position[0] - args[0] / 2;
      const bottomEdge = position[1] - args[1] / 2;
      clone.offset.set(leftEdge / 3, bottomEdge / 3);
      clone.needsUpdate = true;
      return clone;
    });
  }, [textures, args, position]);

  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial 
        map={maps[0]} 
        aoMap={maps[1]} 
        normalMap={maps[2]} 
        roughnessMap={maps[3]} 
        color="#888888" // darken slightly
      />
    </mesh>
  );
}

export function AcousticFoamWall({ args, position, rotation = [0, 0, 0], repeat, textureOffset = [0, 0] }: { args: [number, number, number], position: [number, number, number], rotation?: [number, number, number], repeat?: [number, number], textureOffset?: [number, number] }) {
  const textures = useTexture([
    '/textures/AcousticFoam002_2K-JPG/AcousticFoam002_2K-JPG_Color.jpg',
    '/textures/AcousticFoam002_2K-JPG/AcousticFoam002_2K-JPG_NormalGL.jpg',
    '/textures/AcousticFoam002_2K-JPG/AcousticFoam002_2K-JPG_Roughness.jpg',
    '/textures/AcousticFoam002_2K-JPG/AcousticFoam002_2K-JPG_Metalness.jpg',
  ]);

  const maps = useMemo(() => {
    return textures.map(tex => {
      const clone = tex.clone();
      clone.wrapS = clone.wrapT = THREE.RepeatWrapping;
      if (repeat) {
        clone.repeat.set(repeat[0], repeat[1]);
      } else {
        clone.repeat.set(args[0] / 2, args[1] / 2);
      }
      clone.offset.set(textureOffset[0], textureOffset[1]);
      clone.needsUpdate = true;
      return clone;
    });
  }, [textures, args, repeat, textureOffset]);

  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial 
        map={maps[0]} 
        normalMap={maps[1]} 
        roughnessMap={maps[2]} 
        metalnessMap={maps[3]} 
        color="#888888" // darken slightly to fit the dark studio vibe
      />
    </mesh>
  );
}

function DiamondPlateFloor({ args, position }: { args: [number, number], position: [number, number, number] }) {
  const textures = useTexture([
    '/textures/DiamondPlate/DiamondPlate006C_2K-JPG_Color.jpg',
    '/textures/DiamondPlate/DiamondPlate006C_2K-JPG_NormalGL.jpg',
    '/textures/DiamondPlate/DiamondPlate006C_2K-JPG_Roughness.jpg',
    '/textures/DiamondPlate/DiamondPlate006C_2K-JPG_Metalness.jpg',
    '/textures/DiamondPlate/DiamondPlate006C_2K-JPG_AmbientOcclusion.jpg',
  ]);

  const maps = useMemo(() => {
    return textures.map(tex => {
      const clone = tex.clone();
      clone.wrapS = clone.wrapT = THREE.RepeatWrapping;
      clone.repeat.set(args[0] / 1.5, args[1] / 1.5);
      clone.needsUpdate = true;
      return clone;
    });
  }, [textures, args]);

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={args} />
      <meshStandardMaterial 
        map={maps[0]} 
        normalMap={maps[1]} 
        roughnessMap={maps[2]} 
        metalnessMap={maps[3]} 
        aoMap={maps[4]}
        color="#555555"
      />
    </mesh>
  );
}

function GoldenPlayButton(props: SceneObjectProps) {
  const { scene } = useGLTF("/models/golden_play_button.glb") as { scene: THREE.Group };
  const processedScene = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        // Map based on discovered names: Object_2, Object_3, Object_4
        if (node.name === 'Object_4') {
          // Play protrusion = white
          node.material = new THREE.MeshStandardMaterial({
            color: "#ffffff",
            roughness: 0.2,
            metalness: 0.1,
          });
        } else if (node.name === 'Object_3') {
          // Triangular indentation = gold
          node.material = new THREE.MeshStandardMaterial({
            color: "#ffd700",
            metalness: 0.9,
            roughness: 0.1,
          });
        } else {
          // Main plate (Object_2) = red
          node.material = new THREE.MeshStandardMaterial({
            color: "#ff0000",
            roughness: 0.4,
            metalness: 0.0,
          });
        }
      }
    });
    return clone;
  }, [scene]);

  return <primitive object={processedScene} {...props} />;
}

function createSoftFrameTexture({ color, strength, bottomFactor = 0.35, shadow = false }: { color: [number, number, number], strength: number, bottomFactor?: number, shadow?: boolean }) {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  const frameX = shadow ? 0.74 : 0.72;
  const frameY = shadow ? 0.65 : 0.65;
  const spread = shadow ? 0.18 : 0.058;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1);
      const v = y / (size - 1);
      const nx = (u - 0.5) * 2;
      const ny = (v - 0.5) * 2;
      const ax = Math.abs(nx);
      const ay = Math.abs(ny);

      const dx = ax - frameX;
      const dy = ay - frameY;
      const outsideX = Math.max(dx, 0);
      const outsideY = Math.max(dy, 0);
      const outsideDistance = Math.hypot(outsideX, outsideY);
      const outsideMask = THREE.MathUtils.smoothstep(Math.max(dx, dy), -0.006, 0.012);
      const edgeFalloff = Math.exp(-Math.pow(outsideDistance / spread, 2));
      const edgeBlend = THREE.MathUtils.smoothstep(dy - dx, -0.025, 0.025);
      const sideBlend = 1 - edgeBlend;
      const sideVariation = 1 + (nx > 0 ? -0.12 : 0.06) + Math.sin((ny * 4.7 + nx * 1.3) * Math.PI) * 0.045;
      const horizontalBias = ny > 0 ? 0.82 : bottomFactor;
      const sideBias = 0.42 * sideVariation * THREE.MathUtils.clamp(1.05 - Math.max(-ny, 0) * 0.45, 0.58, 1.08);
      const directionalBias = shadow ? 0.65 : edgeBlend * horizontalBias + sideBlend * sideBias;
      const outerFeather = 1 - THREE.MathUtils.smoothstep(Math.max(ax, ay), 0.94, 1);
      const shadowFill = shadow ? Math.exp(-(Math.pow(ax / 0.84, 4) + Math.pow(ay / 0.74, 4))) * 0.16 : 0;
      const alpha = Math.min(1, ((edgeFalloff * outsideMask * directionalBias * outerFeather) + shadowFill) * strength);
      const i = (y * size + x) * 4;

      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = Math.round(alpha * 255);
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function Thr3StyleWallArt({ url, ...props }: { url: string } & SceneObjectProps) {
  const texture = useTexture(url) as THREE.Texture;
  const glowTexture = useMemo(() => createSoftFrameTexture({ color: [255, 170, 96], strength: 0.81, bottomFactor: 0.065 }), []);
  const shadowTexture = useMemo(() => createSoftFrameTexture({ color: [0, 0, 0], strength: 0.58, bottomFactor: 0.72, shadow: true }), []);
  const logoAspect = 1344 / 768;
  const artworkWidth = 2.7;
  const artworkHeight = 1.45;
  const logoHeight = 0.92;
  const logoWidth = logoHeight * logoAspect;

  return (
    <group {...props}>
      <mesh position={[0, 0.06, -0.118]} renderOrder={1}>
        <planeGeometry args={[artworkWidth + 1.34, artworkHeight + 1.08]} />
        <meshBasicMaterial map={glowTexture} transparent opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0.045, -0.035, -0.108]} renderOrder={2}>
        <planeGeometry args={[artworkWidth + 0.5, artworkHeight + 0.38]} />
        <meshBasicMaterial map={shadowTexture} transparent opacity={0.5} depthWrite={false} />
      </mesh>

      <mesh position={[0, 0, -0.055]} castShadow receiveShadow renderOrder={4}>
        <boxGeometry args={[artworkWidth + 0.18, artworkHeight + 0.18, 0.09]} />
        <meshStandardMaterial color="#050403" roughness={0.82} metalness={0.18} />
      </mesh>
      <mesh position={[0, 0, 0]} receiveShadow renderOrder={5}>
        <planeGeometry args={[artworkWidth, artworkHeight]} />
        <meshStandardMaterial
          color="#0d0a08"
          roughness={0.7}
          metalness={0.06}
          emissive="#0d0603"
          emissiveIntensity={0.08}
        />
      </mesh>

      <mesh position={[0, artworkHeight / 2 + 0.055, 0.04]} castShadow>
        <boxGeometry args={[artworkWidth + 0.22, 0.1, 0.1]} />
        <meshStandardMaterial color="#050505" roughness={0.58} metalness={0.32} />
      </mesh>
      <mesh position={[0, -artworkHeight / 2 - 0.055, 0.04]} castShadow>
        <boxGeometry args={[artworkWidth + 0.22, 0.1, 0.1]} />
        <meshStandardMaterial color="#050505" roughness={0.58} metalness={0.32} />
      </mesh>
      <mesh position={[-artworkWidth / 2 - 0.055, 0, 0.04]} castShadow>
        <boxGeometry args={[0.1, artworkHeight + 0.2, 0.1]} />
        <meshStandardMaterial color="#050505" roughness={0.58} metalness={0.32} />
      </mesh>
      <mesh position={[artworkWidth / 2 + 0.055, 0, 0.04]} castShadow>
        <boxGeometry args={[0.1, artworkHeight + 0.2, 0.1]} />
        <meshStandardMaterial color="#050505" roughness={0.58} metalness={0.32} />
      </mesh>

      <mesh position={[0, artworkHeight / 2 - 0.08, 0.06]}>
        <boxGeometry args={[artworkWidth - 0.18, 0.018, 0.018]} />
        <meshBasicMaterial color="#d59a58" transparent opacity={0.18} />
      </mesh>
      <mesh position={[0, -artworkHeight / 2 + 0.08, 0.06]}>
        <boxGeometry args={[artworkWidth - 0.18, 0.018, 0.018]} />
        <meshBasicMaterial color="#d59a58" transparent opacity={0.08} />
      </mesh>

      <mesh position={[0.04, -0.04, 0.035]} renderOrder={8}>
        <planeGeometry args={[logoWidth * 1.06, logoHeight * 1.08]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.34} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.095]} renderOrder={20}>
        <planeGeometry args={[logoWidth, logoHeight]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.02} side={THREE.DoubleSide} depthWrite={false} depthTest={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.08, 0.075]} renderOrder={9}>
        <planeGeometry args={[artworkWidth - 0.22, artworkHeight - 0.22]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.035} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Thr3StyleScreenBranding({ screenUrl, panelHeight = 0.92, showBase = true, ...props }: { screenUrl: string, panelHeight?: number, showBase?: boolean } & SceneObjectProps) {
  const sourceTexture = useTexture(screenUrl) as THREE.Texture;
  const screenTexture = useMemo(() => {
    const clone = sourceTexture.clone();
    clone.colorSpace = THREE.SRGBColorSpace;
    clone.minFilter = THREE.LinearFilter;
    clone.magFilter = THREE.LinearFilter;
    clone.needsUpdate = true;
    return clone;
  }, [sourceTexture]);
  const screenAspect = useMemo(() => {
    const image = screenTexture.image as { width?: number; height?: number } | undefined;
    if (image?.width && image?.height) {
      return image.width / image.height;
    }
    return 1344 / 768;
  }, [screenTexture]);
  const panelWidth = panelHeight * screenAspect;

  return (
    <group {...props}>
      {showBase && (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[panelWidth + 0.02, panelHeight + 0.02, 0.02]} />
          <meshStandardMaterial color="#06080a" roughness={0.94} metalness={0.04} />
        </mesh>
      )}
      <mesh position={[0, 0, showBase ? 0.012 : 0.001]} renderOrder={4}>
        <planeGeometry args={[panelWidth, panelHeight]} />
        <meshBasicMaterial map={screenTexture} toneMapped={false} />
      </mesh>
    </group>
  );
}

function AutoCenteredModel({ url, ...props }: { url: string } & SceneObjectProps) {
  const { scene } = useGLTF(url) as { scene: THREE.Group };
  const processed = useMemo(() => {
    const clone = scene.clone(true);

    // Force double-side rendering and ensure everything is visible
    clone.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.visible = true;
        node.frustumCulled = false;
        if (node.material) {
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          mats.forEach((mat) => {
            mat.side = THREE.DoubleSide;
            mat.transparent = false;
            mat.opacity = 1;
            mat.visible = true;
            mat.needsUpdate = true;
          });
        }
      }
    });

    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    console.log(`[AutoCenteredModel] ${url}`, {
      size: size.toArray().map(v => v.toFixed(3)),
      center: center.toArray().map(v => v.toFixed(3)),
    });

    // If bounding box is valid, center it
    if (size.length() > 0.0001) {
      clone.position.sub(center);
    }

    return clone;
  }, [scene, url]);

  return <primitive object={processed} {...props} />;
}

function SofaRaw() {
  const { scene } = useGLTF('/models/models/sofa.glb') as { scene: THREE.Group };
  const processed = useMemo(() => {
    const clone = scene.clone(true);

    // Force materials
    clone.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.frustumCulled = false;
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        mats.forEach((mat) => {
          if (mat) {
            mat.side = THREE.DoubleSide;
            mat.transparent = false;
            mat.opacity = 1;
            mat.needsUpdate = true;
          }
        });
      }
    });

    // updateMatrixWorld so bbox includes full hierarchy transforms
    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    console.log('[SofaRaw] center:', center.toArray(), 'size:', size.toArray());

    // Shift entire root so center is at [0,0,0] in local space,
    // BEFORE scale is applied by the parent group
    clone.position.sub(center);

    return clone;
  }, [scene]);

  return <primitive object={processed} />;
}

export function CreatorRoomMVP({ position = [0, 0, 0], rotation = [0, 0, 0], onExit }: { position?: [number, number, number], rotation?: [number, number, number], onExit?: () => void }) {
  const spotLightTarget = useMemo(() => new THREE.Object3D(), []);
  // Imperative refs – never stored in state to avoid re-render cycles
  const screenMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const videoTexRef = useRef<THREE.VideoTexture | null>(null);

  const { openHud, masterVideoRef } = useHudStore();
  const [laptopHovered, setLaptopHovered] = useState(false);

  // Keep a plain ref so useFrame closure always reads the latest value
  const videoElemRef = useRef<HTMLVideoElement | null>(null);
  const textureAssigned = useRef(false);

  useEffect(() => {
    const previousTexture = videoTexRef.current;
    const screenMaterial = screenMatRef.current;

    if (previousTexture) {
      if (screenMaterial?.map === previousTexture) {
        screenMaterial.map = null;
      }
      previousTexture.dispose();
    }

    videoElemRef.current = masterVideoRef;
    videoTexRef.current = null;
    textureAssigned.current = false;

    if (screenMaterial) {
      screenMaterial.map = null;
      screenMaterial.color.set(masterVideoRef ? '#111111' : '#333333');
      screenMaterial.transparent = true;
      screenMaterial.opacity = masterVideoRef ? 0.35 : 0.1;
      screenMaterial.needsUpdate = true;
    }
  }, [masterVideoRef]);

  // Every frame: (a) assign texture once both refs are ready; (b) tick needsUpdate
  useFrame(() => {
    const vid  = videoElemRef.current;
    const mat  = screenMatRef.current;

    // One-time assignment – waits until R3F has populated screenMatRef
    if (!textureAssigned.current && vid && mat) {
      const tex = new THREE.VideoTexture(vid);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter  = THREE.LinearFilter;
      tex.magFilter  = THREE.LinearFilter;
      tex.format     = THREE.RGBAFormat;
      videoTexRef.current = tex;
      mat.map          = tex;
      mat.color.set('#ffffff');
      mat.opacity      = 1;
      mat.transparent  = false;
      mat.needsUpdate  = true;
      textureAssigned.current = true;
    }

    // Every frame: push new decoded frame to GPU
    if (videoTexRef.current) {
      videoTexRef.current.needsUpdate = true;
    }
  });

  const tableControls = useControls('Editing Table', {
    posX: { value: 3.5, min: -10, max: 10, step: 0.1 },
    posY: { value: -0.1, min: -5, max: 5, step: 0.1 },
    posZ: { value: -3.4, min: -15, max: 10, step: 0.1 },
    rotY: { value: 0, min: -180, max: 180, step: 1 },
    scale: { value: 1.85, min: 0.1, max: 5, step: 0.05 },
  });

  const hudControls = useControls('HUD Screen', {
    hudPosX: { value: 3.6, min: -10, max: 10, step: 0.1 },
    hudPosY: { value: 3.0, min: -5, max: 10, step: 0.1 },
    hudPosZ: { value: -5.6, min: -15, max: 10, step: 0.1 },
    hudRotX: { value: 0, min: -180, max: 180, step: 1 },
    hudRotY: { value: 0, min: -180, max: 180, step: 1 },
    hudRotZ: { value: 0, min: -180, max: 180, step: 1 },
    hudScale: { value: 1.55, min: 0.1, max: 5, step: 0.05 },
  });

  const lightControls = useControls('Lighting', {
    lightPosX: { value: -3.6, min: -10, max: 10, step: 0.1 },
    lightPosY: { value: 5.3, min: 0, max: 10, step: 0.1 },
    lightPosZ: { value: -6.3, min: -15, max: 10, step: 0.1 },
    conePosX: { value: -3.0, min: -10, max: 10, step: 0.1 },
    conePosY: { value: 4.6, min: 0, max: 10, step: 0.1 },
    conePosZ: { value: -5.5, min: -15, max: 10, step: 0.1 }, // moved even further forward to clear wall textures
    targetPosX: { value: 7.2, min: -10, max: 10, step: 0.1 },
    targetPosY: { value: 4.2, min: 0, max: 10, step: 0.1 },
    targetPosZ: { value: 9.8, min: -15, max: 10, step: 0.1 },
  });

  const boothControls = useControls('Vocal Booth Glass', {
    posX:   { value: -6.7,  min: -7.2, max: -6.2, step: 0.01 }, // left wall depth
    posY:   { value: 2.2,   min: 0,    max: 10,   step: 0.1 },
    posZ:   { value: -2.5,  min: -5.2, max: 4.8,  step: 0.1 },  // along left wall
    rotY:   { value: 0,     min: -12,  max: 12,   step: 1 },
    width:  { value: 4.4,   min: 1.0,  max: 6.2,  step: 0.1 },
    height: { value: 1.4,   min: 0.6,  max: 2.5,  step: 0.1 },
  });

  const decorControls = useControls('Room Decor', {
    chairPosX: { value: 3.8, min: -10, max: 10, step: 0.1 },
    chairPosY: { value: 0.0, min: -5, max: 5, step: 0.1 },
    chairPosZ: { value: -2.6, min: -10, max: 10, step: 0.1 },
    chairRotY: { value: -78, min: -180, max: 180, step: 1 },
    chairScale: { value: 0.5, min: 0.1, max: 5, step: 0.05 },

    organizerPosX: { value: 4.85, min: -10, max: 10, step: 0.05 },
    organizerPosY: { value: 1.47, min: -5, max: 5, step: 0.01 },
    organizerPosZ: { value: -4.4, min: -10, max: 10, step: 0.05 },
    organizerRotY: { value: 0, min: -180, max: 180, step: 1 },
    organizerScale: { value: 1.96, min: 0.01, max: 2, step: 0.01 },

    buttonPosX: { value: 6.3, min: -10, max: 10, step: 0.1 },
    buttonPosY: { value: 1.9, min: -5, max: 5, step: 0.1 },
    buttonPosZ: { value: -2.2, min: -10, max: 10, step: 0.1 },
    buttonRotY: { value: 180, min: -180, max: 180, step: 1 },
    buttonScale: { value: 0.7, min: 0.1, max: 10, step: 0.1 },

    laptopPosX: { value: 6.0, min: -10, max: 10, step: 0.1 },
    laptopPosY: { value: 1.10, min: -5, max: 5, step: 0.05 },
    laptopPosZ: { value: -2.0, min: -10, max: 10, step: 0.1 },
    laptopRotY: { value: -157, min: -180, max: 180, step: 1 },
    laptopScale: { value: 3.3, min: 0.01, max: 50, step: 0.1 },

    sofaPosX: { value: 4.2, min: -10, max: 10, step: 0.1 },
    sofaPosY: { value: 0.7, min: -5, max: 5, step: 0.1 },
    sofaPosZ: { value: 3.2, min: -10, max: 10, step: 0.1 },
    sofaRotY: { value: -180, min: -180, max: 180, step: 1 },
    sofaScale: { value: 0.72, min: 0.01, max: 5, step: 0.01 },

    rtvPosX: { value: -5.9, min: -12, max: 12, step: 0.1 },
    rtvPosY: { value: 0.0, min: -5, max: 5, step: 0.05 },
    rtvPosZ: { value: 3.2, min: -12, max: 12, step: 0.1 },
    rtvRotY: { value: 90, min: -180, max: 180, step: 1 },
    rtvScale: { value: 2.5, min: 0.01, max: 10, step: 0.1 },
  });

  const logoControls = useControls('Wall Logo', {
    logoPosX: { value: -2.8, min: -10, max: 10, step: 0.1 },
    logoPosY: { value: 3.0, min: 0, max: 10, step: 0.1 },
    logoPosZ: { value: -5.6, min: -15, max: 10, step: 0.01 },
    logoScale: { value: 1.4, min: 0.1, max: 5, step: 0.1 },
  });

  const brandTestControls = useControls('THR3STYLE Screen State', {
    posX: { value: 6.72, min: -10, max: 10, step: 0.01 },
    posY: { value: 2.25, min: 0, max: 10, step: 0.01 },
    posZ: { value: 0.6, min: -10, max: 10, step: 0.01 },
    rotY: { value: -90, min: -180, max: 180, step: 1 },
    scale: { value: 1.2, min: 0.1, max: 5, step: 0.05 },
  });

  const roomBackZ = -6;
  const roomFrontZ = 7;
  const leftWallX = -7;
  const wallHeight = 5.2;
  const boothWindowBottom = boothControls.posY - boothControls.height / 2;
  const boothWindowTop = boothControls.posY + boothControls.height / 2;
  const boothWindowBackZ = boothControls.posZ - boothControls.width / 2;
  const boothWindowFrontZ = boothControls.posZ + boothControls.width / 2;
  const boothBackSegmentLength = boothWindowBackZ - roomBackZ;
  const boothFrontSegmentLength = roomFrontZ - boothWindowFrontZ;

  return (
    <group position={new THREE.Vector3(...position)} rotation={new THREE.Euler(...rotation)}>
      <ambientLight intensity={0.15} color="#ffeedd" />
      <primitive object={spotLightTarget} position={[lightControls.targetPosX, lightControls.targetPosY, lightControls.targetPosZ]} />
      <spotLight 
        position={[lightControls.lightPosX, lightControls.lightPosY, lightControls.lightPosZ]} 
        target={spotLightTarget}
        intensity={60} 
        angle={0.6} 
        penumbra={0.8} 
        color="#ff8c42" 
        distance={10} 
        castShadow 
      />

      <Suspense fallback={null}>
        {/* Floor - Diamond Plate */}
        <DiamondPlateFloor args={[14.2, 15.2]} position={[0, 0, -0.5]} />
        {/* Ceiling */}
        <AcousticFoamWall position={[0, 5.1, -0.5]} args={[14.2, 0.2, 15.2]} repeat={[14.2 / 2, 15.2 / 2]} />

        {/* Entrance Area -> Front Wall + RoomDoor */}
        <group position={[0, 0, 7]}> {/* Z=7 is the front wall */}
          {/* Front Wall - Left of door */}
          <BrickWall 
            position={[-4.125, 2.5, 0]} 
            args={[5.75, 5.2, 0.5]} 
          />
          {/* Front Wall - Right of door */}
          <BrickWall 
            position={[4.125, 2.5, 0]} 
            args={[5.75, 5.2, 0.5]} 
          />
          {/* Front Wall - Above door */}
          <BrickWall 
            position={[0, 4.6, 0]} 
            args={[2.5, 1.0, 0.5]} 
          />
          
          <RoomDoor 
            position={[0, 0, -0.25]} // slightly inside the room to be flush
            rotation={[0, Math.PI, 0]} 
            label="EXIT" 
            status="active" 
            onEnter={() => onExit?.()} 
          />
          <pointLight position={[0, 2.5, -2]} intensity={5} color="#ff8c42" distance={6} decay={2} />
        </group>

        {/* Back wall: clean brown identity wall for the framed 3S artwork. */}
        <pointLight position={[1.9, 3.0, -4.8]} intensity={7} color="#ffe0a0" distance={5} decay={2} />
        <mesh position={[0, 2.5, -6]} castShadow receiveShadow>
          <boxGeometry args={[14, 5, 0.5]} />
          <meshStandardMaterial color="#5c3a1e" roughness={0.65} metalness={0.05} />
        </mesh>

        {/* Back wall trims keep the brown wall visually finished, without a booth cutout. */}
        <TechnicalTrim position={[-6.72, 2.5, -5.74]} args={[0.06, 5.0, 0.04]} />
        <TechnicalTrim position={[6.72, 2.5, -5.74]} args={[0.06, 5.0, 0.04]} />
        <TechnicalTrim position={[0, 4.97, -5.74]} args={[13.44, 0.06, 0.04]} />
        <TechnicalTrim position={[0, 0.03, -5.74]} args={[13.44, 0.06, 0.04]} />

        {/* Left acoustic wall: segmented around the new horizontal vocal booth window. */}
        {boothBackSegmentLength > 0.08 && (
          <AcousticFoamWall
            position={[leftWallX, wallHeight / 2, roomBackZ + boothBackSegmentLength / 2]}
            rotation={[0, Math.PI / 2, 0]}
            args={[boothBackSegmentLength, wallHeight, 0.5]}
            repeat={[boothBackSegmentLength / 2, wallHeight / 2]}
            textureOffset={[0, 0]}
          />
        )}
        {boothFrontSegmentLength > 0.08 && (
          <AcousticFoamWall
            position={[leftWallX, wallHeight / 2, boothWindowFrontZ + boothFrontSegmentLength / 2]}
            rotation={[0, Math.PI / 2, 0]}
            args={[boothFrontSegmentLength, wallHeight, 0.5]}
            repeat={[boothFrontSegmentLength / 2, wallHeight / 2]}
            textureOffset={[(boothWindowFrontZ - roomBackZ) / 2, 0]}
          />
        )}
        {boothWindowBottom > 0.08 && (
          <AcousticFoamWall
            position={[leftWallX, boothWindowBottom / 2, boothControls.posZ]}
            rotation={[0, Math.PI / 2, 0]}
            args={[boothControls.width, boothWindowBottom, 0.5]}
            repeat={[boothControls.width / 2, boothWindowBottom / 2]}
            textureOffset={[(boothWindowBackZ - roomBackZ) / 2, 0]}
          />
        )}
        {boothWindowTop < wallHeight - 0.08 && (
          <AcousticFoamWall
            position={[leftWallX, (boothWindowTop + wallHeight) / 2, boothControls.posZ]}
            rotation={[0, Math.PI / 2, 0]}
            args={[boothControls.width, wallHeight - boothWindowTop, 0.5]}
            repeat={[boothControls.width / 2, (wallHeight - boothWindowTop) / 2]}
            textureOffset={[(boothWindowBackZ - roomBackZ) / 2, boothWindowTop / 2]}
          />
        )}

        {/* Right acoustic wall remains the desk/screen zone boundary. */}
        <AcousticFoamWall position={[7, wallHeight / 2, -0.5]} rotation={[0, -Math.PI / 2, 0]} args={[15.2, wallHeight, 0.5]} />


        {/* Production Desk */}
        <EditingTable 
          position={[tableControls.posX, tableControls.posY, tableControls.posZ]} 
          rotation={[0, THREE.MathUtils.degToRad(tableControls.rotY), 0]} 
          scale={tableControls.scale}
        />

        {/* Office Chair */}
        <AutoCenteredModel 
          url="/models/office_chair.glb" 
          position={[decorControls.chairPosX, decorControls.chairPosY, decorControls.chairPosZ]}
          rotation={[0, THREE.MathUtils.degToRad(decorControls.chairRotY), 0]}
          scale={decorControls.chairScale}
        />

        {/* Organizer on table */}
        <AutoCenteredModel 
          url="/models/organizer.glb" 
          position={[decorControls.organizerPosX, decorControls.organizerPosY, decorControls.organizerPosZ]}
          rotation={[0, THREE.MathUtils.degToRad(decorControls.organizerRotY), 0]}
          scale={decorControls.organizerScale}
        />

        {/* Golden Play Button as a secondary accent near the desk zone */}
        <GoldenPlayButton 
          position={[decorControls.buttonPosX, decorControls.buttonPosY, decorControls.buttonPosZ]}
          rotation={[0, THREE.MathUtils.degToRad(decorControls.buttonRotY), 0]}
          scale={decorControls.buttonScale}
        />

        {/* Framed 3S artwork on the brown identity wall */}
        <Thr3StyleWallArt
          url="/textures/logos/3S.png"
          position={[logoControls.logoPosX, logoControls.logoPosY, logoControls.logoPosZ]}
          scale={[logoControls.logoScale, logoControls.logoScale, 1]}
        />

        {/* THR3STYLE Screen Branding: cleaner digital usage mode for room displays. */}
        <Thr3StyleScreenBranding
          screenUrl="/textures/branding/logo3s.jpeg"
          position={[brandTestControls.posX, brandTestControls.posY, brandTestControls.posZ]}
          rotation={[0, THREE.MathUtils.degToRad(brandTestControls.rotY), 0]}
          scale={brandTestControls.scale}
        />

        {/* iPad Pro on table (replacing laptop) */}
        <AutoCenteredModel 
          url="/models/models/ipad_pro_2024.glb" 
          position={[decorControls.laptopPosX, decorControls.laptopPosY, decorControls.laptopPosZ]}
          rotation={[0, THREE.MathUtils.degToRad(decorControls.laptopRotY), 0]}
          scale={decorControls.laptopScale}
        />

        {/* Sofa in the room */}
        <group 
          position={[decorControls.sofaPosX, decorControls.sofaPosY, decorControls.sofaPosZ]}
          rotation={[0, THREE.MathUtils.degToRad(decorControls.sofaRotY), 0]}
          scale={decorControls.sofaScale}
        >
          {/* SofaRaw self-centers via bbox; scale is on the GROUP, not on primitive */}
          <SofaRaw />
        </group>

        {/* RTV Cabinet */}
        <AutoCenteredModel 
          url="/models/modern_wooden_cabinet_4k.blend/modern_wooden_cabinet_4k.glb"
          position={[decorControls.rtvPosX, decorControls.rtvPosY, decorControls.rtvPosZ]}
          rotation={[0, THREE.MathUtils.degToRad(decorControls.rtvRotY), 0]}
          scale={decorControls.rtvScale}
        />

        {/* Horizontal vocal booth window integrated into the left acoustic wall. */}
        <group
          position={[boothControls.posX, boothControls.posY, boothControls.posZ]}
          rotation={[0, THREE.MathUtils.degToRad(boothControls.rotY), 0]}
        >
          <mesh position={[-0.04, boothControls.height / 2 + 0.16, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.08, 0.24, boothControls.width + 0.65]} />
            <meshStandardMaterial color="#030303" roughness={0.88} metalness={0.18} />
          </mesh>
          <mesh position={[-0.04, -boothControls.height / 2 - 0.16, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.08, 0.24, boothControls.width + 0.65]} />
            <meshStandardMaterial color="#030303" roughness={0.88} metalness={0.18} />
          </mesh>
          <mesh position={[-0.04, 0, -boothControls.width / 2 - 0.16]} castShadow receiveShadow>
            <boxGeometry args={[0.08, boothControls.height + 0.32, 0.24]} />
            <meshStandardMaterial color="#030303" roughness={0.88} metalness={0.18} />
          </mesh>
          <mesh position={[-0.04, 0, boothControls.width / 2 + 0.16]} castShadow receiveShadow>
            <boxGeometry args={[0.08, boothControls.height + 0.32, 0.24]} />
            <meshStandardMaterial color="#030303" roughness={0.88} metalness={0.18} />
          </mesh>
          <mesh renderOrder={2}>
            <boxGeometry args={[0.06, boothControls.height, boothControls.width]} />
            <meshStandardMaterial
              color="#cfefff"
              transparent
              opacity={0.055}
              roughness={0.02}
              metalness={0}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0.045, boothControls.height * 0.23, 0]} rotation={[0, Math.PI / 2, 0]} renderOrder={3}>
            <planeGeometry args={[boothControls.width * 0.82, 0.035]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0.047, -boothControls.height * 0.18, 0]} rotation={[0, Math.PI / 2, 0]} renderOrder={3}>
            <planeGeometry args={[boothControls.width * 0.64, 0.024]} />
            <meshBasicMaterial color="#bfefff" transparent opacity={0.08} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <TechnicalTrim position={[0.08, boothControls.height / 2 + 0.12, 0]} args={[0.16, 0.16, boothControls.width + 0.64]} />
          <TechnicalTrim position={[0.08, -boothControls.height / 2 - 0.12, 0]} args={[0.16, 0.16, boothControls.width + 0.64]} />
          <TechnicalTrim position={[0.08, 0, -boothControls.width / 2 - 0.12]} args={[0.16, boothControls.height + 0.32, 0.16]} />
          <TechnicalTrim position={[0.08, 0, boothControls.width / 2 + 0.12]} args={[0.16, boothControls.height + 0.32, 0.16]} />
        </group>

        {/* Vocal booth interior sits outside the left wall, aligned with the window. */}
        <group position={[leftWallX - 0.06, 0, boothControls.posZ]} rotation={[0, Math.PI / 2, 0]}>
          <VocalBooth />
        </group>

        {/* Focal screen: always rendered, texture swapped imperatively. */}
        <group
           position={[hudControls.hudPosX, hudControls.hudPosY, hudControls.hudPosZ]}
           rotation={[
             THREE.MathUtils.degToRad(hudControls.hudRotX),
             THREE.MathUtils.degToRad(hudControls.hudRotY),
             THREE.MathUtils.degToRad(hudControls.hudRotZ)
           ]}
           scale={[hudControls.hudScale, hudControls.hudScale, hudControls.hudScale]}
        >
           <pointLight position={[0, 0, 0.2]} intensity={2} color="#ff8c42" distance={3} decay={2} />
           {/* Wall screen - pure video display, no interaction */}
           <mesh>
             <planeGeometry args={[3.2, 1.8]} />
             <meshBasicMaterial
               ref={screenMatRef}
               color="#333333"
               transparent
               opacity={0.1}
               side={THREE.DoubleSide}
             />
           </mesh>
           {!masterVideoRef && (
             <Thr3StyleScreenBranding
               screenUrl="/textures/branding/logo3s.jpeg"
               panelHeight={1.8}
               showBase={false}
               position={[0, 0, 0.002]}
             />
           )}
        </group>

        {/* ── LAPTOP INTERACTIVE ZONE – otwiera HUD panel ── */}
        <group
          position={[decorControls.laptopPosX, decorControls.laptopPosY + 0.35, decorControls.laptopPosZ]}
          rotation={[0, THREE.MathUtils.degToRad(decorControls.laptopRotY), 0]}
        >
          {/* Large invisible hit-test plane covering full iPad screen */}
          <mesh
            onClick={(e) => {
              if (document.pointerLockElement) return;
              e.stopPropagation();
              openHud('master_catalog');
            }}
            onPointerOver={() => setLaptopHovered(true)}
            onPointerOut={() => setLaptopHovered(false)}
            onPointerEnter={() => {
              if (document.pointerLockElement) {
                const onKeyDown = (ke: KeyboardEvent) => {
                  if (ke.code === 'KeyE' || ke.key === 'e') {
                    document.exitPointerLock();
                    openHud('master_catalog');
                  }
                };
                document.addEventListener('keydown', onKeyDown, { once: true });
              }
            }}
          >
            {/* 2.0×1.6 covers the full iPad Pro screen at scale 3.3 */}
            <planeGeometry args={[2.0, 1.6]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>

          {/* Hover hint – NO transform, renders as screen-space HTML anchored to 3D pos */}
          {laptopHovered && (
            <Html position={[0, 1.1, 0]} center pointerEvents="none" zIndexRange={[10, 11]}>
              <div style={{
                fontFamily: 'monospace',
                color: 'rgba(255,255,255,0.9)',
                fontSize: 13,
                letterSpacing: '0.2em',
                background: 'rgba(0,0,0,0.85)',
                padding: '8px 18px',
                borderRadius: 6,
                border: '1px solid rgba(255,140,66,0.6)',
                whiteSpace: 'nowrap',
                boxShadow: '0 0 12px rgba(255,140,66,0.3)',
              }}>
                [E] OPEN STUDIO HUD
              </div>
            </Html>
          )}
        </group>

      </Suspense>
    </group>
  );
}
