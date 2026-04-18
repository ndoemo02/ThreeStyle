import { useState, useRef, Suspense, useEffect, useMemo } from 'react';
import { Html, useTexture, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AcousticFoamMaterial, ConcreteFloorMaterial, WoodPanelMaterial } from '../../core/AcousticDarkMaterial';
import { FakeLightCone } from '../../modules/fx/FakeLightCone';
import { EditingTable } from '../../modules/furniture/EditingTable';
import { VocalBooth } from './VocalBooth';
import { useControls } from 'leva';
import { useHudStore } from '../../../stores/useHudStore';
import { RoomDoor } from '../../modules/doors/RoomDoor';

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

function AcousticFoamWall({ args, position, rotation = [0, 0, 0], repeat }: { args: [number, number, number], position: [number, number, number], rotation?: [number, number, number], repeat?: [number, number] }) {
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

function GoldenPlayButton({ ...props }: any) {
  const { scene } = useGLTF("/models/golden_play_button.glb");
  const processedScene = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((node: any) => {
      if (node.isMesh) {
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

function WallLogo({ url, ...props }: any) {
  const texture = useTexture(url);
  return (
    <group {...props}>
      {/* Optional circular background */}
      <mesh position={[0, 0, -0.01]}>
        <circleGeometry args={[0.55, 32]} />
        <meshStandardMaterial color="#ffffff" opacity={0.1} transparent />
      </mesh>
      <mesh>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function SimpleModel({ url, ...props }: any) {
  const { scene } = useGLTF(url);
  return <primitive object={scene.clone()} {...props} />;
}

export function CreatorRoomMVP({ position = [0, 0, 0], rotation = [0, 0, 0], onExit }: { position?: [number, number, number], rotation?: [number, number, number], onExit?: () => void }) {
  const spotLightTarget = useRef<THREE.Object3D>(new THREE.Object3D());
  // Imperative refs – never stored in state to avoid re-render cycles
  const screenMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const videoTexRef = useRef<THREE.VideoTexture | null>(null);

  const { openHud, isPlaying, masterVideoRef } = useHudStore();
  const [hovered, setHovered] = useState(false);

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
        screenMatRef.current.color.set(hovered ? '#ff8c42' : '#333333');
        screenMatRef.current.transparent = true;
        screenMatRef.current.opacity = hovered ? 0.4 : 0.1;
        screenMatRef.current.needsUpdate = true;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    lightPosX: { value: 1.5, min: -10, max: 10, step: 0.1 },
    lightPosY: { value: 4.5, min: 0, max: 10, step: 0.1 },
    lightPosZ: { value: -3.5, min: -15, max: 10, step: 0.1 },
    conePosX: { value: 1.5, min: -10, max: 10, step: 0.1 },
    conePosY: { value: 2.5, min: 0, max: 10, step: 0.1 },
    conePosZ: { value: -4.5, min: -15, max: 10, step: 0.1 },
    targetPosX: { value: 1.5, min: -10, max: 10, step: 0.1 },
    targetPosY: { value: 0.9, min: 0, max: 10, step: 0.1 },
    targetPosZ: { value: -4.5, min: -15, max: 10, step: 0.1 },
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

    organizerPosX: { value: 2.60, min: -10, max: 10, step: 0.05 },
    organizerPosY: { value: 1.34, min: -5, max: 5, step: 0.01 },
    organizerPosZ: { value: -3.4, min: -10, max: 10, step: 0.05 },
    organizerRotY: { value: 45, min: -180, max: 180, step: 1 },
    organizerScale: { value: 0.46, min: 0.01, max: 1, step: 0.01 },

    buttonPosX: { value: -6.0, min: -10, max: 10, step: 0.1 },
    buttonPosY: { value: 1.6, min: -5, max: 5, step: 0.1 },
    buttonPosZ: { value: -2.9, min: -10, max: 10, step: 0.1 },
    buttonRotY: { value: 80, min: -180, max: 180, step: 1 },
    buttonScale: { value: 1.0, min: 0.1, max: 10, step: 0.1 },

    laptopPosX: { value: 6.0, min: -10, max: 10, step: 0.1 },
    laptopPosY: { value: 1.1, min: -5, max: 5, step: 0.05 },
    laptopPosZ: { value: -2.0, min: -10, max: 10, step: 0.1 },
    laptopRotY: { value: -157, min: -180, max: 180, step: 1 },
    laptopScale: { value: 0.16, min: 0.01, max: 1, step: 0.01 },
  });

  const logoControls = useControls('Wall Logo', {
    logoPosX: { value: 0.1, min: -10, max: 10, step: 0.1 },
    logoPosY: { value: 3.7, min: 0, max: 10, step: 0.1 },
    logoPosZ: { value: -5.4, min: -15, max: 10, step: 0.01 },
    logoScale: { value: 1.0, min: 0.1, max: 5, step: 0.1 },
  });

  // Derived values for wall segments
  const glassBottom = boothControls.posY - boothControls.height / 2;
  const glassTop    = boothControls.posY + boothControls.height / 2;
  const glassLeft   = boothControls.posX - boothControls.width / 2;
  const glassRight  = boothControls.posX + boothControls.width / 2;

  return (
    <group position={new THREE.Vector3(...position)} rotation={new THREE.Euler(...rotation)}>
      <ambientLight intensity={0.15} color="#ffeedd" />
      <primitive object={spotLightTarget.current} position={[lightControls.targetPosX, lightControls.targetPosY, lightControls.targetPosZ]} />
      <spotLight 
        position={[lightControls.lightPosX, lightControls.lightPosY, lightControls.lightPosZ]} 
        target={spotLightTarget.current} 
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
        {/* Right section – from glass right edge to room right wall, full height */}
        <mesh position={[(glassRight + 7) / 2, 2.5, -6]} castShadow receiveShadow>
          <boxGeometry args={[7 - glassRight, 5, 0.5]} />
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

        {/* Side Walls */}
        <AcousticFoamWall position={[-7, 2.5, -0.5]} rotation={[0, Math.PI / 2, 0]} args={[15.2, 5.2, 0.5]} />
        <AcousticFoamWall position={[7, 2.5, -0.5]} rotation={[0, -Math.PI / 2, 0]} args={[15.2, 5.2, 0.5]} />

        {/* Vinyl Plaque */}
        <group position={[0, 3.8, -5.73]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 0.05, 32]} />
            <meshStandardMaterial color="#050505" roughness={0.1} metalness={0.9} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <ringGeometry args={[0.2, 0.6, 32]} />
            <meshBasicMaterial color="#ff8c42" transparent opacity={0.3} />
          </mesh>
        </group>

        {/* Production Desk */}
        <EditingTable 
          position={[tableControls.posX, tableControls.posY, tableControls.posZ]} 
          rotation={[0, THREE.MathUtils.degToRad(tableControls.rotY), 0]} 
          scale={tableControls.scale}
        />

        {/* Office Chair */}
        <SimpleModel 
          url="/models/office_chair.glb" 
          position={[decorControls.chairPosX, decorControls.chairPosY, decorControls.chairPosZ]}
          rotation={[0, THREE.MathUtils.degToRad(decorControls.chairRotY), 0]}
          scale={decorControls.chairScale}
        />

        {/* Organizer on table */}
        <SimpleModel 
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

        {/* 3S Logo on wall */}
        <WallLogo 
          url="/textures/logos/3S.png"
          position={[logoControls.logoPosX, logoControls.logoPosY, logoControls.logoPosZ]}
          scale={[logoControls.logoScale, logoControls.logoScale, 1]}
        />

        {/* Laptop on table */}
        <SimpleModel 
          url="/models/laptop_dell_xps.glb" 
          position={[decorControls.laptopPosX, decorControls.laptopPosY, decorControls.laptopPosZ]}
          rotation={[0, THREE.MathUtils.degToRad(decorControls.laptopRotY), 0]}
          scale={decorControls.laptopScale}
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
          <mesh>
            <boxGeometry args={[boothControls.width, boothControls.height, 0.1]} />
            <meshPhysicalMaterial
              color="#e8f4ff"
              transparent
              transmission={0.98}
              opacity={1}
              roughness={0.02}
              metalness={0.05}
              ior={1.3}
              thickness={0.1}
            />
          </mesh>
          {/* Top frame bar */}
          <mesh position={[0,  boothControls.height / 2, 0]}>
            <boxGeometry args={[boothControls.width + 0.12, 0.1, 0.5]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Bottom frame bar */}
          <mesh position={[0, -boothControls.height / 2, 0]}>
            <boxGeometry args={[boothControls.width + 0.12, 0.1, 0.5]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Left frame bar */}
          <mesh position={[-boothControls.width / 2, 0, 0]}>
            <boxGeometry args={[0.1, boothControls.height + 0.12, 0.5]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Right frame bar */}
          <mesh position={[boothControls.width / 2, 0, 0]}>
            <boxGeometry args={[0.1, boothControls.height + 0.12, 0.5]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.3} metalness={0.8} />
          </mesh>
        </group>

        {/* ── VOCAL BOOTH INTERIOR (behind the glass pane) ── */}
        {/* Booth interior sits just behind the back wall */}
        <VocalBooth position={[-3.4, 0, -6.0]} />

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
           <pointLight position={[0, 0, 0.2]} intensity={2} color="#ff8c42" distance={3} decay={2} />
           <mesh
             onClick={() => openHud('master_catalog')}
             onPointerOver={() => setHovered(true)}
             onPointerOut={() => setHovered(false)}
             onPointerEnter={() => {
               if (document.pointerLockElement) {
                 const onKeyDown = (e: KeyboardEvent) => {
                   if (e.code === 'KeyE' || e.key === 'e') {
                     document.exitPointerLock();
                     openHud('master_catalog');
                   }
                 };
                 document.addEventListener('keydown', onKeyDown, { once: true });
               }
             }}
           >
             <planeGeometry args={[3.2, 1.8]} />
             {/* Material is always present; texture is swapped imperatively by useEffect */}
             <meshBasicMaterial
               ref={screenMatRef}
               color="#333333"
               transparent
               opacity={0.1}
               side={THREE.DoubleSide}
             />
           </mesh>

           {(!isPlaying) && (
              <Html transform distanceFactor={2.5} position={[0, 0, 0.05]} pointerEvents="none">
                 <div style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)', fontSize: 18, letterSpacing: '0.3em', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, background: 'rgba(0,0,0,0.5)', padding: 32, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
                   <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg,#ff8c42,#e040fb)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 28, color: '#000' }}>V</div>
                   <span style={{ textAlign: 'center' }}>VEO3 GENERATED VIDEO<br/><span style={{ fontSize: 12, opacity: 0.5 }}>PRESS [E] TO INTERACT</span></span>
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
