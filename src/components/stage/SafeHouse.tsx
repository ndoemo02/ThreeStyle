'use client'
import { useTexture, Text, Environment } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { WindowWall3D } from './WindowWall3D'

interface SafeHouseProps {
    topTrackName?: string
}


export function SafeHouse({ topTrackName = "TRANSYLVANIA" }: SafeHouseProps) {
    const neonBlueRef = useRef<THREE.PointLight>(null)
    const neonPinkRef = useRef<THREE.PointLight>(null)

    // Tekstura betonu dla ścian
    const concreteTextures = useTexture({
        map: '/textures/Concrete035_2K-JPG/Concrete035_2K-JPG_Color.jpg',
        roughnessMap: '/textures/Concrete035_2K-JPG/Concrete035_2K-JPG_Roughness.jpg',
        normalMap: '/textures/Concrete035_2K-JPG/Concrete035_2K-JPG_NormalGL.jpg',
    })

    // Wspólna tekstura flat — 1 tekstura JPG dla podłogi
    const floorTexture = useTexture('/textures/Concrete035_2K.jpg')

    // Mapowanie UV — podłoga i ściany z różnym repeatem
    const floorMat = useMemo(() => {
        const t = floorTexture.clone()
        t.wrapS = t.wrapT = THREE.RepeatWrapping
        t.repeat.set(5, 5)
        t.needsUpdate = true
        return t
    }, [floorTexture])

    const wallMat = useMemo(() => {
        const t = concreteTextures.map.clone()
        t.wrapS = t.wrapT = THREE.RepeatWrapping
        t.repeat.set(3, 1.5)
        t.needsUpdate = true
        return t
    }, [concreteTextures.map])

    const wallRoughMat = useMemo(() => {
        const t = concreteTextures.roughnessMap.clone()
        t.wrapS = t.wrapT = THREE.RepeatWrapping
        t.repeat.set(3, 1.5)
        t.needsUpdate = true
        return t
    }, [concreteTextures.roughnessMap])

    const wallNormMat = useMemo(() => {
        const t = concreteTextures.normalMap.clone()
        t.wrapS = t.wrapT = THREE.RepeatWrapping
        t.repeat.set(3, 1.5)
        t.needsUpdate = true
        return t
    }, [concreteTextures.normalMap])

    // Animacja pulsowania neonów
    useFrame((state) => {
        const t = state.clock.getElapsedTime()
        const flicker = 1 + Math.sin(t * 11.3) * 0.06 + Math.sin(t * 31) * 0.025
        if (neonBlueRef.current) {
            neonBlueRef.current.intensity = 55 * flicker
        }
        if (neonPinkRef.current) {
            neonPinkRef.current.intensity = 18 * flicker
        }
    })

    const W = 12    // Zmienione na 12 na sztywno, co pokrywa obszar 3 murów korytarza (3 * 4 = 12).
    const H = 5     // Wysokość zgodna z korytarzem
    const D = 8     // Głębokość
    const T = 1.0   // Grubość twardych bloków ściennych

    const safeHouseBoxMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        map: wallMat,
        roughnessMap: wallRoughMat,
        normalMap: wallNormMat,
        color: '#b8a89a',
        roughness: 0.9,
        metalness: 0.0,
    }), [wallMat, wallRoughMat, wallNormMat]);

    return (
        <group>
            {/* HDRI — subtelne odbicia środowiskowe (preset zamiast 4K EXR oszczędza ~64MB VRAM) */}
            <Environment
                preset="studio"
                environmentIntensity={0.05}
                backgroundIntensity={0}
            />

            {/* ─── OŚWIETLENIE ─── */}
            <ambientLight intensity={0.04} color="#1a1a2e" />

            {/* 🔵 Neon cyan — główne Fill Light sceny */}
            <pointLight
                ref={neonBlueRef}
                position={[0, 2.5, -D / 2]}
                distance={10}
                intensity={55}
                color="#33ccff"
            />

            {/* 🩷 Neon pink — lewa ściana */}
            <pointLight
                ref={neonPinkRef}
                position={[-W / 2 + 1.0, 1.5, -2]}
                distance={5}
                intensity={18}
                color="#ff33cc"
            />

            {/* ─── GEOMETRIA POKOJU (ZAMKNIĘTE PUDEŁKO) ─── */}
            
            {/* UWAGA: PODŁOGA i SUFIT są teraz zapewniane przez globalne 'ground' i 'roof' w LevelBuilder3D.tsx */}
            {/* Dzięki temu unikamy Z-fightingu, a bryła budynku jest idealnie uszczelniona od góry i dołu.  */}

            {/* LEWA ŚCIANA - Zwiększona grubość z 1.0 na 3.0 i wydłużona, aby zapobiec przeciekom (Peter Panning) */}
            <mesh position={[-W / 2 - 1.5, H / 2, -D / 2]} castShadow receiveShadow material={safeHouseBoxMaterial}>
                <boxGeometry args={[3, H + 6, D + 6]} />
            </mesh>

            {/* PRAWA ŚCIANA - Zwiększona grubość z 1.0 na 3.0 i wydłużona */}
            <mesh position={[W / 2 + 1.5, H / 2, -D / 2]} castShadow receiveShadow material={safeHouseBoxMaterial}>
                <boxGeometry args={[3, H + 6, D + 6]} />
            </mesh>

            {/* TYLNA ŚCIANA - Pełna betonowa ściana, mocno powiększona i nałożona na inne (overlap) */}
            <mesh position={[0, H / 2, -D - 1.5]} castShadow receiveShadow material={safeHouseBoxMaterial}>
                <boxGeometry args={[W + 6, H + 6, 3]} />
            </mesh>

            {/* 🛡️ TARCZE ANTY-ŚWIETLNE (Shadow Blockers) 🛡️ 
                Umieszczone bezpiecznie h=1 w ścianach z 0.5m marginesem, więc od środka widzisz tylko beton. */}
            
            {/* Blocker Lewy (wewnątrz [-9.0, -6.0]) */}
            <mesh position={[-W / 2 - 1.0, H / 2, -D / 2]} castShadow receiveShadow={false}>
                <boxGeometry args={[1, H + 4, D + 4]} />
                <meshBasicMaterial color="#000000" />
            </mesh>

            {/* Blocker Prawy (wewnątrz [6.0, 9.0]) */}
            <mesh position={[W / 2 + 1.0, H / 2, -D / 2]} castShadow receiveShadow={false}>
                <boxGeometry args={[1, H + 4, D + 4]} />
                <meshBasicMaterial color="#000000" />
            </mesh>

            {/* Blocker Tylny (wewnątrz [-11.0, -8.0]) */}
            <mesh position={[0, H / 2, -D - 1.0]} castShadow receiveShadow={false}>
                <boxGeometry args={[W + 2, H + 4, 1]} />
                <meshBasicMaterial color="#000000" />
            </mesh>


            {/* ─── NEONY ─── */}

            {/* 🔵 BLOK TRZECH PIĘTER — tylna ściana */}
            <group position={[0.5, 2.6, -D + 0.05]}>
                <Text
                    fontSize={1.05}
                    maxWidth={7.5}
                    textAlign="center"
                    anchorX="center"
                    anchorY="middle"
                    lineHeight={1.25}
                >
                    {`BLOK\nTRZECH\nPIĘTER`}
                    <meshStandardMaterial
                        color="#33ccff"
                        emissive="#33ccff"
                        emissiveIntensity={4.0}
                        toneMapped={false}
                    />
                </Text>
            </group>

            {/* 🩷 Napis na lewej ścianie */}
            <group position={[-W / 2 + 0.06, 1.8, -2.5]} rotation={[0, Math.PI / 2, 0]}>
                <Text
                    fontSize={0.28}
                    textAlign="left"
                    anchorX="left"
                    anchorY="middle"
                    lineHeight={1.4}
                >
                    {`interactive\nmusic\nvideos`}
                    <meshStandardMaterial
                        color="#ff44cc"
                        emissive="#ff44cc"
                        emissiveIntensity={3.5}
                        toneMapped={false}
                    />
                </Text>
            </group>

            {/* Kabel neonu — schodzi do podłogi */}
            <mesh position={[2.2, 0.8, -D + 0.05]}>
                <boxGeometry args={[0.015, 1.6, 0.015]} />
                <meshStandardMaterial color="#111111" />
            </mesh>
        </group>
    )
}
