// src/components/stage/LevelBuilder3D.tsx
'use client'
import React, { useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { FLOOR_PLAN, TILE_SIZE, WALL_HEIGHT } from '@/config/levelConfig'
import { SafeHouse } from './SafeHouse'
import { WindowWall3D } from './WindowWall3D'

/**
 * LevelBuilder3D — Proceduralny generator świata.
 *
 * KLUCZOWA ZASADA GEOMETRII:
 *   - Ściana E-W (biegnie wzdłuż X): BoxGeometry(TILE_SIZE, WALL_HEIGHT, WALL_DEPTH)
 *   - Ściana N-S (biegnie wzdłuż Z): BoxGeometry(WALL_DEPTH, WALL_HEIGHT, TILE_SIZE)
 *   - Naroże (obie osie):            BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE) — pełny blok
 *
 * Orientacja wykrywana automatycznie po sąsiadach (ewScore vs nsScore).
 */

export interface LevelBuilder3DProps {
    topTrackName?: string;
}

const WALL_DEPTH = 1.5  // Grubość ściany prostopadle do kierunku biegu

// ─── Helper: czy kafelek to ściana pełna lub okno ───────────────────────────
function isWallLike(tile: number): boolean {
    return tile === 1 || tile === 5
}

export function LevelBuilder3D({ topTrackName = 'TRANSYLVANIA' }: LevelBuilder3DProps) {
    const rows = FLOOR_PLAN.length
    const cols = FLOOR_PLAN[0].length
    const offsetX = (cols * TILE_SIZE) / 2
    const offsetZ = (rows * TILE_SIZE) / 2

    // ── Tekstury PBR ──
    const [wallColor, wallNormal, wallRoughness, floorColor] = useTexture([
        '/textures/Concrete035_2K-JPG/Concrete035_2K-JPG_Color.jpg',
        '/textures/Concrete035_2K-JPG/Concrete035_2K-JPG_NormalGL.jpg',
        '/textures/Concrete035_2K-JPG/Concrete035_2K-JPG_Roughness.jpg',
        '/textures/PaintedMetal005_2K-JPG/PaintedMetal005_2K-JPG_Color.jpg'
    ])

    // ── Współdzielone materiały ──
    const mats = useMemo(() => {
        // Konfiguracja kafelkowania ściany
        [wallColor, wallNormal, wallRoughness].forEach(tex => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping
            tex.repeat.set(1.5, 1.5)
            tex.needsUpdate = true
        })

        // Jeden materiał podłogi dla całego budynku (Wielka wylewka)
        const fl = floorColor.clone()
        fl.wrapS = fl.wrapT = THREE.RepeatWrapping
        fl.repeat.set(30, 30)
        fl.needsUpdate = true

        return {
            wall:     new THREE.MeshStandardMaterial({ 
                map: wallColor, 
                normalMap: wallNormal, 
                roughnessMap: wallRoughness,
                color: '#8a8480', // Lekkie dobarwienie jasnego betonu by zachował hotelowy odcień
                metalness: 0.1 
            }),
            floor:    new THREE.MeshStandardMaterial({ map: fl, color: '#333333', roughness: 0.2, metalness: 0.1 }),
            floorElev:new THREE.MeshStandardMaterial({ map: fl, color: '#2a4060', roughness: 0.2, metalness: 0.3 }),
            ceiling:  new THREE.MeshStandardMaterial({ color: '#222222', roughness: 1.0, side: THREE.DoubleSide }),
            ground:   new THREE.MeshStandardMaterial({ map: fl, color: '#333333', roughness: 0.2, metalness: 0.1 }), // ujednolicone
            neon:     new THREE.MeshStandardMaterial({ emissive: '#ffffff', emissiveIntensity: 2, color: '#ffffff' }),
            skirting: new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.5 }),
        }
    }, [wallColor, wallNormal, wallRoughness, floorColor])


    // ── Współdzielone geometrie ──
    const geos = useMemo(() => ({
        wall:    new THREE.BoxGeometry(TILE_SIZE + 0.1, WALL_HEIGHT + 1.0, TILE_SIZE + 0.1),   // solidne wbijanie w stropy i overlapowanie siatki
        floor:   new THREE.BoxGeometry(TILE_SIZE + 0.1, 1.0, TILE_SIZE + 0.1),
        ceiling: new THREE.BoxGeometry(TILE_SIZE + 0.1, 1.0, TILE_SIZE + 0.1),
        roof:    new THREE.BoxGeometry(cols * TILE_SIZE + 150, 1.0, rows * TILE_SIZE + 150),
        ground:  new THREE.BoxGeometry(cols * TILE_SIZE + 150, 1.0, rows * TILE_SIZE + 150),
        neon:    new THREE.BoxGeometry(0.2, 0.05, 2),
        // Zwiększony rozmiar skiritingu by był odrobinę szerszy niż ściana (TILE_SIZE + 0.2 vs + 0.1) aby rozwiązać Z-fighting!
        skirting:new THREE.BoxGeometry(TILE_SIZE + 0.2, 0.2, TILE_SIZE + 0.2),
    }), [cols, rows])

    const wallY = WALL_HEIGHT / 2

    return (
        <group>
            {/* ── Podłoże (Ogromna jednolita wylewka pod całym obiektem = brak Z-fighting) ── */}
            <mesh
                geometry={geos.ground}
                material={mats.floor}
                position={[0, -0.5, 0]}
                receiveShadow
            />
            {/* ── Dach / Sufit Globalny ── */}
            <mesh
                geometry={geos.roof}
                material={mats.ceiling}
                position={[0, WALL_HEIGHT + 0.5, 0]}
            />

            {/* ── Kafelki ── */}
            {FLOOR_PLAN.map((row, r) =>
                row.map((tile, c) => {
                    const x = c * TILE_SIZE - offsetX + TILE_SIZE / 2
                    const z = r * TILE_SIZE - offsetZ + TILE_SIZE / 2

                    // ── ŚCIANA PEŁNA (1) — solid block ──
                    if (tile === 1) {
                        return (
                            <group key={`w-${r}-${c}`} position={[x, 0, z]}>
                                {/* Grubsza i wyższa ściana: wchodzi idealnie na +-0.5 w podłogę/sufit */}
                                <mesh
                                    geometry={geos.wall}
                                    material={mats.wall}
                                    position={[0, wallY, 0]}
                                    castShadow receiveShadow
                                />
                                {/* Listwy również wsuwamy mocniej żeby zabiły szpary, a overlap uderza boki */}
                                <mesh
                                    geometry={geos.skirting}
                                    material={mats.skirting}
                                    position={[0, 0.1, 0]}
                                    castShadow receiveShadow
                                />
                                {/* Gzyms sufitowy */}
                                <mesh
                                    geometry={geos.skirting}
                                    material={mats.skirting}
                                    position={[0, WALL_HEIGHT - 0.1, 0]}
                                    castShadow receiveShadow
                                />
                            </group>
                        )
                    }

                    // ── OKNO (5) ── auto-orientacja przez sąsiadów ──
                    if (tile === 5) {
                        const tU = r > 0        ? FLOOR_PLAN[r-1][c] : 1
                        const tD = r < rows - 1 ? FLOOR_PLAN[r+1][c] : 1
                        // Fasada N lub S (sąsiad góra/dół jest przestrzenią) → rotation=0
                        // Fasada E lub W (sąsiad lewo/prawo jest przestrzenią) → rotation Y 90°
                        const isNS = (tU === 0 || tD === 0)
                        const rot: [number, number, number] = isNS ? [0, 0, 0] : [0, Math.PI / 2, 0]
                        return (
                            <WindowWall3D
                                key={`win-${r}-${c}`}
                                position={[x, wallY, z]}
                                rotation={rot}
                                material={mats.wall}
                            />
                        )
                    }

                    // ── PODŁOGA (Wylewka generowana globalnie wyżej, tu brak kafelków) i SUFIT ──
                    if (tile === 0 || tile === 2 || tile === 3 || tile === 4) {
                        const hasNeon = tile === 0 && (c % 2 === 0)
                        
                        return (
                            <React.Fragment key={`f-${r}-${c}`}>
                                {/* Jarzeniówka (co drugi kafelek korytarza) */}
                                {hasNeon && (
                                    <mesh
                                        geometry={geos.neon}
                                        material={mats.neon}
                                        position={[x, WALL_HEIGHT - 0.05, z]}
                                        castShadow={false}
                                    />
                                )}
                            </React.Fragment>
                        )
                    }

                    return null
                })
            )}

            {/*
             * ═══ SAFEHOUSE: ANEKS ZACHODNI ═══
             *
             * Pozycja: x=-48 (zachodnia krawędź budynku), z=2 (środek 3-rzędowego otworu)
             * Rotacja: [0, PI/2, 0] — wejście SafeHouse skierowane na WSCHÓD (w stronę korytarza)
             *
             *   Zachód ←──────────[ SafeHouse W=9, D=8 ]──────────→ Wschód (wejście)
             *   x=-56 (tylna ściana+neon)                      x=-48 (otwarte wejście)
             *
             *   Z: od -2.5 do +6.5 — obejmuje oba otwory winda (r=5 z=-2, r=7 z=6)
             *   i środkową lukę (r=6 z=2) po zmianie w levelConfig.ts
             */}
            <group
                position={[-48, 0, 0]}
                rotation={[0, Math.PI / 2, 0]}
            >
                <SafeHouse topTrackName={topTrackName} />
            </group>

            {/* ═══ OŚWIETLENIE ═══ */}

            {/* Ogólne — widoczność całości */}
            <ambientLight intensity={1.2} color="#c8bfb0" />

            {/* ☀️ Złota Godzina — słońce padające przez okna (fasada N) */}
            <directionalLight
                position={[-300, 50, -300]}
                intensity={3.5}
                color="#ffaa00"
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-left={-100}
                shadow-camera-right={100}
                shadow-camera-top={100}
                shadow-camera-bottom={-100}
                shadow-bias={-0.0001}
                shadow-normalBias={0.01}
            >
                <object3D attach="target" position={[0, WALL_HEIGHT / 2, 0]} />
            </directionalLight>

            {/* Zimne niebo z południowej strony */}
            <directionalLight
                position={[-20, 25, 50]}
                intensity={0.6}
                color="#7799cc"
            />
        </group>
    )
}
