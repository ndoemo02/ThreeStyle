import { useState, useRef, Suspense, useEffect, useMemo } from 'react';
import { Html, useTexture, useGLTF } from '@react-three/drei';
import { useFrame, type ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import { FakeLightCone } from '../../modules/fx/FakeLightCone';
import { EditingTable } from '../../modules/furniture/EditingTable';
import { VocalBooth } from './VocalBooth';
import { useControls } from 'leva';
import { useHudStore } from '../../../stores/useHudStore';
import { RoomDoor } from '../../modules/doors/RoomDoor';

type PrimitiveModelProps = Omit<ThreeElements['primitive'], 'object'>;
type UrlModelProps = PrimitiveModelProps & { url: string };
type GltfScene = { scene: THREE.Group };
type MaterialCompileShader = {
  uniforms: Record<string, { value: unknown }>;
  fragmentShader: string;
};

function TechnicalTrim({ args, position, rotation = [0, 0, 0] }: { args: [number, number, number], position: [number, number, number], rotation?: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color="#080808" roughness={0.95} metalness={0} />
    </mesh>
  );
}

function WarmLedStrip({ args, position, rotation = [0, 0, 0], intensity = 0.65 }: { args: [number, number, number], position: [number, number, number], rotation?: [number, number, number], intensity?: number }) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={args} />
      <meshStandardMaterial
        color="#fff1d2"
        emissive="#ffc46f"
        emissiveIntensity={intensity}
        roughness={0.45}
        metalness={0}
        toneMapped={false}
      />
    </mesh>
  );
}

function SoftWallWash({ position, rotation = [0, 0, 0], width, height, intensity = 1.8 }: { position: [number, number, number], rotation?: [number, number, number], width: number, height: number, intensity?: number }) {
  return (
    <rectAreaLight
      position={position}
      rotation={rotation}
      args={['#ffcf8a', intensity, width, height]}
    />
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

export function AcousticFoamWall({ args, position, rotation = [0, 0, 0], repeat }: { args: [number, number, number], position: [number, number, number], rotation?: [number, number, number], repeat?: [number, number] }) {
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
        clone.repeat.set(args[2] / 2, args[1] / 2);
      }
      clone.needsUpdate = true;
      return clone;
    });
  }, [textures, args, repeat]);

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

function GoldenPlayButton(props: PrimitiveModelProps) {
  const { scene } = useGLTF("/models/golden_play_button.glb") as unknown as GltfScene;
  const processedScene = useMemo(() => {
    const clone = scene.clone(true);
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

const LOGO_ASPECT = 1344 / 768;

function LogoBackGlow({ width, height }: { width: number, height: number }) {
  const shadowMaterial = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      color: { value: new THREE.Color('#090604') },
      opacity: { value: 0.34 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 color;
      uniform float opacity;
      void main() {
        vec2 d = abs(vUv - 0.5) * vec2(1.0, 1.55);
        float falloff = smoothstep(0.58, 0.04, length(d));
        gl_FragColor = vec4(color, opacity * falloff);
      }
    `,
  }), []);

  const glowMaterial = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      color: { value: new THREE.Color('#ffc06a') },
      opacity: { value: 0.085 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 color;
      uniform float opacity;
      void main() {
        vec2 d = abs(vUv - 0.5) * vec2(1.0, 1.45);
        float falloff = smoothstep(0.64, 0.08, length(d));
        gl_FragColor = vec4(color, opacity * falloff);
      }
    `,
  }), []);

  return (
    <>
      <mesh position={[0.04, -0.04, -0.006]} material={shadowMaterial}>
        <planeGeometry args={[width * 1.18, height * 1.38]} />
      </mesh>
      <mesh position={[0, 0, -0.008]} material={glowMaterial}>
        <planeGeometry args={[width * 1.36, height * 1.7]} />
      </mesh>
    </>
  );
}

type WallLogoProps = Omit<ThreeElements['group'], 'scale'> & {
  url: string;
  scale?: number;
};

function WallLogo({ url, scale = 1, ...props }: WallLogoProps) {
  const sourceTexture = useTexture(url) as THREE.Texture;
  const texture = useMemo(() => {
    const clone = sourceTexture.clone();
    clone.colorSpace = THREE.SRGBColorSpace;
    clone.anisotropy = 8;
    clone.needsUpdate = true;
    return clone;
  }, [sourceTexture]);

  useEffect(() => () => texture.dispose(), [texture]);

  const width = 1.95 * scale;
  const height = width / LOGO_ASPECT;

  const frameWidth = width * 1.34;
  const frameHeight = height * 1.62;
  const rail = 0.055;

  return (
    <group {...props}>
      <mesh position={[0, 0, -0.018]} castShadow receiveShadow>
        <planeGeometry args={[frameWidth, frameHeight]} />
        <meshStandardMaterial color="#12100d" roughness={0.88} metalness={0.04} />
      </mesh>
      <mesh position={[0, frameHeight / 2 - rail / 2, 0.006]} castShadow>
        <boxGeometry args={[frameWidth + rail, rail, 0.045]} />
        <meshStandardMaterial color="#221a12" roughness={0.72} metalness={0.16} />
      </mesh>
      <mesh position={[0, -frameHeight / 2 + rail / 2, 0.006]} castShadow>
        <boxGeometry args={[frameWidth + rail, rail, 0.045]} />
        <meshStandardMaterial color="#0d0a08" roughness={0.8} metalness={0.12} />
      </mesh>
      <mesh position={[-frameWidth / 2 + rail / 2, 0, 0.006]} castShadow>
        <boxGeometry args={[rail, frameHeight, 0.045]} />
        <meshStandardMaterial color="#1a130d" roughness={0.75} metalness={0.14} />
      </mesh>
      <mesh position={[frameWidth / 2 - rail / 2, 0, 0.006]} castShadow>
        <boxGeometry args={[rail, frameHeight, 0.045]} />
        <meshStandardMaterial color="#1a130d" roughness={0.75} metalness={0.14} />
      </mesh>
      <LogoBackGlow width={width} height={height} />
      <mesh position={[0, 0, 0.018]} castShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          map={texture}
          transparent
          alphaTest={0.08}
          roughness={0.58}
          metalness={0}
          side={THREE.FrontSide}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>
    </group>
  );
}

function AutoCenteredModel({ url, ...props }: UrlModelProps) {
  const { scene } = useGLTF(url) as unknown as GltfScene;
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
  const { scene } = useGLTF('/models/models/sofa.glb') as unknown as GltfScene;
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
  // Imperative refs – never stored in state to avoid re-render cycles
  const screenMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const videoTexRef = useRef<THREE.VideoTexture | null>(null);

  const { openHud, masterVideoRef } = useHudStore();
  const [laptopHovered, setLaptopHovered] = useState(false);

  // Keep a plain ref so useFrame closure always reads the latest value
  const videoElemRef = useRef<HTMLVideoElement | null>(null);
  const textureAssigned = useRef(false);

  useEffect(() => {
    videoElemRef.current = masterVideoRef;
    // If video is removed, reset state so useFrame can re-assign next time
    if (!masterVideoRef) {
      textureAssigned.current = false;
      videoTexRef.current = null;
      if (screenMatRef.current) {
        screenMatRef.current.map = null;
        screenMatRef.current.color.set('#333333');
        screenMatRef.current.transparent = true;
        screenMatRef.current.opacity = 0.1;
        screenMatRef.current.needsUpdate = true;
      }
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
    hudPosY: { value: 3.1, min: -5, max: 10, step: 0.1 },
    hudPosZ: { value: -5.6, min: -15, max: 10, step: 0.1 },
    hudRotX: { value: 0, min: -180, max: 180, step: 1 },
    hudRotY: { value: 0, min: -180, max: 180, step: 1 },
    hudRotZ: { value: 0, min: -180, max: 180, step: 1 },
    hudScale: { value: 1.70, min: 0.1, max: 5, step: 0.05 },
  });

  const lightControls = useControls('Lighting', {
    conePosX: { value: -3.0, min: -10, max: 10, step: 0.1 },
    conePosY: { value: 4.6, min: 0, max: 10, step: 0.1 },
    conePosZ: { value: -5.5, min: -15, max: 10, step: 0.1 },
  });

  const boothControls = useControls('Vocal Booth Glass', {
    posX:   { value: -3.1, min: -14, max: 14,  step: 0.1 },
    posY:   { value: 2.0,  min: 0,   max: 10,  step: 0.1 },  // glass center Y
    posZ:   { value: -6.0, min: -15, max: 10,  step: 0.1 },  // wall center Z (embedded)
    rotY:   { value: 0,    min: -180, max: 180, step: 1 },
    width:  { value: 5.0,  min: 0.5, max: 10,  step: 0.1 },
    height: { value: 1.6,  min: 0.5, max: 5,   step: 0.1 },
  });

  const decorControls = useControls('Room Decor', {
    chairPosX: { value: 3.8, min: -10, max: 10, step: 0.1 },
    chairPosY: { value: 0.0, min: -5, max: 5, step: 0.1 },
    chairPosZ: { value: -2.6, min: -10, max: 10, step: 0.1 },
    chairRotY: { value: -78, min: -180, max: 180, step: 1 },
    chairScale: { value: 0.5, min: 0.1, max: 5, step: 0.05 },

    organizerPosX: { value: 4.85, min: -10, max: 10, step: 0.05 },
    organizerPosY: { value: 1.47, min: -5, max: 5, step: 0.01 },
    organizerPosZ: { value: -4.41, min: -10, max: 10, step: 0.05 },
    organizerRotY: { value: 0, min: -180, max: 180, step: 1 },
    organizerScale: { value: 1.96, min: 0.01, max: 2, step: 0.01 },

    buttonPosX: { value: -6.7, min: -10, max: 10, step: 0.1 },
    buttonPosY: { value: 2.0, min: -5, max: 5, step: 0.1 },
    buttonPosZ: { value: -2.4, min: -10, max: 10, step: 0.1 },
    buttonRotY: { value: 0, min: -180, max: 180, step: 1 },
    buttonScale: { value: 1.0, min: 0.1, max: 10, step: 0.1 },

    laptopPosX: { value: 6.0, min: -10, max: 10, step: 0.1 },
    laptopPosY: { value: 1.1, min: -5, max: 5, step: 0.05 },
    laptopPosZ: { value: -2.0, min: -10, max: 10, step: 0.1 },
    laptopRotY: { value: -157, min: -180, max: 180, step: 1 },
    laptopScale: { value: 3.3, min: 0.01, max: 50, step: 0.1 },

    sofaPosX: { value: 4.2, min: -10, max: 10, step: 0.1 },
    sofaPosY: { value: 0.72, min: -5, max: 5, step: 0.1 },
    sofaPosZ: { value: 3.2, min: -10, max: 10, step: 0.1 },
    sofaRotY: { value: -180, min: -180, max: 180, step: 1 },
    sofaScale: { value: 0.72, min: 0.01, max: 5, step: 0.01 },

    rtvPosX: { value: -6.3, min: -12, max: 12, step: 0.1 },
    rtvPosY: { value: 0.0, min: -5, max: 5, step: 0.05 },
    rtvPosZ: { value: 2.8, min: -12, max: 12, step: 0.1 },
    rtvRotY: { value: 90, min: -180, max: 180, step: 1 },
    rtvScale: { value: 2.48, min: 0.01, max: 10, step: 0.1 },
  });

  const logoControls = useControls('Wall Logo', {
    logoPosX: { value: -2.7, min: -10, max: 10, step: 0.01, label: 'X: do sciany - / do pokoju +' },
    logoPosY: { value: 3.7, min: 0, max: 10, step: 0.1, label: 'Y: dol / gora' },
    logoPosZ: { value: -5.5, min: -15, max: 10, step: 0.05, label: 'Z: tyl - / przod +' },
    logoRotX: { value: 0, min: -180, max: 180, step: 1, label: 'Rot X: przechyl gora/dol' },
    logoRotY: { value: 0, min: -180, max: 180, step: 1, label: 'Rot Y: ustaw do sciany' },
    logoRotZ: { value: 0, min: -180, max: 180, step: 1, label: 'Rot Z: obrot jak obraz' },
    logoScale: { value: 0.74, min: 0.1, max: 5, step: 0.05, label: 'Skala: glowny branding' },
  });

  // Derived values for wall segments
  const glassBottom = boothControls.posY - boothControls.height / 2;
  const glassTop    = boothControls.posY + boothControls.height / 2;
  const glassLeft   = boothControls.posX - boothControls.width / 2;
  const glassRight  = boothControls.posX + boothControls.width / 2;

  return (
    <group position={new THREE.Vector3(...position)} rotation={new THREE.Euler(...rotation)}>
      <ambientLight intensity={0.28} color="#6b4a2c" />
      <hemisphereLight args={['#ffe4bd', '#1b100b', 0.55]} />
      <SoftWallWash position={[0, 4.92, -5.66]} rotation={[-0.25, 0, 0]} width={12.8} height={0.55} intensity={2.4} />
      <SoftWallWash position={[-6.72, 4.72, -0.5]} rotation={[0, Math.PI / 2, 0]} width={13.4} height={0.45} intensity={1.45} />
      <SoftWallWash position={[6.72, 4.72, -0.5]} rotation={[0, -Math.PI / 2, 0]} width={13.4} height={0.45} intensity={1.45} />
      <pointLight position={[-1.0, 3.4, -4.5]} intensity={4.2} color="#ffd095" distance={4.8} decay={2.4} />
      <pointLight position={[3.8, 3.2, -3.2]} intensity={2.0} color="#ffbd76" distance={5.8} decay={2.2} />

      <Suspense fallback={null}>
        {/* Floor - Diamond Plate */}
        <DiamondPlateFloor args={[14.2, 15.2]} position={[0, 0, -0.5]} />
        {/* Ceiling */}
        <AcousticFoamWall position={[0, 5.1, -0.5]} args={[14.2, 0.2, 15.2]} repeat={[14.2 / 2, 15.2 / 2]} />
        {/* Warm indirect LED channels around ceiling edges */}
        <WarmLedStrip position={[0, 4.96, -5.66]} args={[13.45, 0.035, 0.035]} intensity={0.78} />
        <WarmLedStrip position={[0, 4.96, 6.73]} args={[13.3, 0.03, 0.03]} intensity={0.45} />
        <WarmLedStrip position={[-6.73, 4.96, -0.5]} args={[0.035, 0.035, 14.1]} intensity={0.58} />
        <WarmLedStrip position={[6.73, 4.96, -0.5]} args={[0.035, 0.035, 14.1]} intensity={0.58} />

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

        {/*
          Back Wall – segments around the booth glass opening.
          All segments share Z=-6 (wall center, thickness 0.5). Frame is embedded in wall.
        */}
        <pointLight position={[-3.4, 2.5, -4.5]} intensity={8} color="#ffe0a0" distance={5} decay={2} />

        {/* Left flank – from room left wall (X=-7) to glass left edge */}
        <mesh position={[(-7 + glassLeft) / 2, 2.5, -6]} castShadow receiveShadow>
          <boxGeometry args={[glassLeft + 7, 5, 0.5]} />
          <meshStandardMaterial color="#5c3a1e" roughness={0.65} metalness={0.05} />
        </mesh>
        {/* Right section – from glass right edge to room right wall, full height 
            Extended slightly (overlap 0.1) to avoid gaps behind the frame.
        */}
        <mesh position={[(glassRight - 0.1 + 7) / 2, 2.5, -6]} castShadow receiveShadow>
          <boxGeometry args={[7 - (glassRight - 0.1), 5, 0.5]} />
          <meshStandardMaterial color="#5c3a1e" roughness={0.65} metalness={0.05} />
        </mesh>
        {/* Bottom fill – from floor to glass bottom edge (flush with wall) */}
        {glassBottom > 0.01 && (
          <mesh position={[boothControls.posX, glassBottom / 2, -6]} castShadow receiveShadow>
            <boxGeometry args={[boothControls.width, glassBottom, 0.5]} />
            <meshStandardMaterial color="#5c3a1e" roughness={0.65} metalness={0.05} />
          </mesh>
        )}
        {/* Top beam – from glass top edge to ceiling */}
        {glassTop < 5 && (
          <mesh position={[boothControls.posX, (glassTop + 5) / 2, -6]} castShadow receiveShadow>
            <boxGeometry args={[boothControls.width, 5 - glassTop, 0.5]} />
            <meshStandardMaterial color="#5c3a1e" roughness={0.65} metalness={0.05} />
          </mesh>
        )}

        {/* ── SELECTIVE SLIM TRIMS – Back wall transitions ── */}
        <TechnicalTrim 
          position={[-6.735, 2.5, -5.74]} 
          args={[0.03, 5.0, 0.02]} 
        />
        <TechnicalTrim 
          position={[6.735, 2.5, -5.74]} 
          args={[0.03, 5.0, 0.02]} 
        />
        {/* Horizontal transition: Back wall top edge */}
        <TechnicalTrim 
          position={[0, 4.99, -5.74]} 
          args={[13.44, 0.02, 0.02]} 
        />
        {/* Bottom transition: Back wall meets metal floor */}
        <TechnicalTrim 
          position={[0, 0.015, -5.74]} 
          args={[13.44, 0.03, 0.02]} 
        />

        {/* Side Walls */}
        <AcousticFoamWall position={[-7, 2.5, -0.5]} rotation={[0, Math.PI / 2, 0]} args={[15.2, 5.2, 0.5]} />
        <AcousticFoamWall position={[7, 2.5, -0.5]} rotation={[0, -Math.PI / 2, 0]} args={[15.2, 5.2, 0.5]} />

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

        {/* Golden Play Button on left wall */}
        <GoldenPlayButton 
          position={[decorControls.buttonPosX, decorControls.buttonPosY, decorControls.buttonPosZ]}
          rotation={[0, THREE.MathUtils.degToRad(decorControls.buttonRotY), 0]}
          scale={decorControls.buttonScale}
        />

        {/* 3S identity wall logo - primary branding on the black acoustic wall */}
        <WallLogo 
          url="/textures/logos/3S.png"
          position={[logoControls.logoPosX, logoControls.logoPosY, logoControls.logoPosZ]}
          rotation={[
            THREE.MathUtils.degToRad(logoControls.logoRotX),
            THREE.MathUtils.degToRad(logoControls.logoRotY),
            THREE.MathUtils.degToRad(logoControls.logoRotZ),
          ]}
          scale={logoControls.logoScale}
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

        {/*
          Glass frame – embedded in wall (posZ = wall center = -6).
          Frame bars depth = 0.5 (= wall thickness) → front face flush at Z=-5.75.
        */}
        <group
          position={[boothControls.posX, boothControls.posY, boothControls.posZ]}
          rotation={[0, THREE.MathUtils.degToRad(boothControls.rotY), 0]}
        >
          {/* Glass pane */}
          <mesh renderOrder={2}>
            <boxGeometry args={[boothControls.width, boothControls.height, 0.035]} />
            <meshPhysicalMaterial
              color="#ffffff"
              transparent
              transmission={1}
              opacity={0.22}
              roughness={0.045}
              metalness={0}
              ior={1.08}
              thickness={0.015}
              attenuationColor="#ffffff"
              attenuationDistance={8}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* PREMIUM SLIM FRAME (Matte Black) - No protrusions */}
          {/* Top bar */}
          <TechnicalTrim 
            position={[0, boothControls.height / 2, 0.26]} 
            args={[boothControls.width, 0.025, 0.02]} 
          />
          {/* Bottom bar */}
          <TechnicalTrim 
            position={[0, -boothControls.height / 2, 0.26]} 
            args={[boothControls.width, 0.025, 0.02]} 
          />
          {/* Left bar */}
          <TechnicalTrim 
            position={[-boothControls.width / 2, 0, 0.26]} 
            args={[0.025, boothControls.height + 0.025, 0.02]} 
          />
          {/* Right bar */}
          <TechnicalTrim 
            position={[boothControls.width / 2, 0, 0.26]} 
            args={[0.025, boothControls.height + 0.025, 0.02]} 
          />
        </group>

        {/* ── VOCAL BOOTH INTERIOR (behind the glass pane) ── */}
        {/* Booth interior sits just behind the back wall, synchronized with window X */}
        <VocalBooth position={[boothControls.posX, 0, -6.0]} />

        {/* ── FOCAL SCREEN – always rendered, texture swapped imperatively ── */}
        <group 
           position={[hudControls.hudPosX, hudControls.hudPosY, hudControls.hudPosZ]}
           rotation={[
             THREE.MathUtils.degToRad(hudControls.hudRotX),
             THREE.MathUtils.degToRad(hudControls.hudRotY),
             THREE.MathUtils.degToRad(hudControls.hudRotZ)
           ]}
           scale={[hudControls.hudScale, hudControls.hudScale, hudControls.hudScale]}
        >
           <pointLight position={[0, 0, 0.2]} intensity={1.2} color="#ffc278" distance={3} decay={2} />
           <mesh position={[0, 1.02, -0.012]}>
             <boxGeometry args={[3.38, 0.025, 0.015]} />
             <meshStandardMaterial color="#fff0d2" emissive="#ffb861" emissiveIntensity={0.45} toneMapped={false} />
           </mesh>
           <mesh position={[0, -1.02, -0.012]}>
             <boxGeometry args={[3.38, 0.025, 0.015]} />
             <meshStandardMaterial color="#fff0d2" emissive="#ffb861" emissiveIntensity={0.34} toneMapped={false} />
           </mesh>
           {/* Wall screen – pure video display, no interaction */}
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

        {/* Volumetric glow */}
        <FakeLightCone position={[lightControls.conePosX, lightControls.conePosY, lightControls.conePosZ]} height={3.5} radius={1.4} color="#ff8c42" opacity={0.15} />

      </Suspense>
    </group>
  );
}
