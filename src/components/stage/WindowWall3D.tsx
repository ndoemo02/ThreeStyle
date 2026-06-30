// src/components/stage/WindowWall3D.tsx
'use client'
import React from 'react'
import { TILE_SIZE, WALL_HEIGHT } from '@/config/levelConfig'

/**
 * WindowWall3D — Ściana zewnętrzna z grubym glifem okiennym.
 *
 * Zamiast jednej pełnej bryły, komponent renderuje 4 elementy BoxGeometry
 * ułożone jako rama z pustą przestrzenią w środku (okno).
 *
 *  ┌──────────────────────┐
 *  │      TOP BOX         │  ← Ściana nad oknem
 *  ├────┬────────────┬────┤
 *  │LEFT│            │RGHT│  ← Filary boczne + pusta przestrzeń (okno)
 *  │    │   (okno)   │    │
 *  ├────┴────────────┴────┤
 *  │     BOTTOM BOX       │  ← Murek pod oknem
 *  └──────────────────────┘
 */

interface WindowWall3DProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    material?: THREE.Material;
}

// Stałe geometrii
const DEPTH = 0.8;                       // Grubość ściany — efekt masywności
const PILLAR_WIDTH = 0.5;               // Szerokość filarów bocznych
const BOTTOM_HEIGHT = 1.2;              // Wysokość murku pod oknem
const TOP_HEIGHT = 1.0;                 // Wysokość ściany nad oknem
const WINDOW_WIDTH = TILE_SIZE - PILLAR_WIDTH * 2;                     // ~2.0
const WINDOW_HEIGHT = WALL_HEIGHT - BOTTOM_HEIGHT - TOP_HEIGHT;        // ~2.8

// Materiał betonu — jednolity dla wszystkich elementów ramy
const CONCRETE_COLOR = '#3a3a3a';
const CONCRETE_ROUGHNESS = 0.95;

import * as THREE from 'three';
const defaultMaterial = new THREE.MeshStandardMaterial({ color: CONCRETE_COLOR, roughness: CONCRETE_ROUGHNESS });

export function WindowWall3D({ position, rotation, material }: WindowWall3DProps) {
    const baseY = position[1]
    const wallBottom = baseY - WALL_HEIGHT / 2
    
    const appliedMaterial = material || defaultMaterial;

    return (
        <group position={position} rotation={rotation ?? [0, 0, 0]}>
            {/* ═══ LISTWA PRZYPODŁOGOWA (Disabled - generowana w LevelBuilder3D) ═══ */}
            {/* 
            <mesh position={[0, wallBottom - baseY + 0.1, 0]} castShadow receiveShadow>
                <boxGeometry args={[TILE_SIZE + 0.05, 0.2, DEPTH + 0.05]} />
                <meshStandardMaterial color="#0a0a0a" roughness={0.5} />
            </mesh>
            */}

            {/* ═══ GZYMS SUFITOWY (Disabled - generowany w LevelBuilder3D) ═══ */}
            {/*
            <mesh position={[0, wallBottom + WALL_HEIGHT - baseY - 0.1, 0]} castShadow receiveShadow>
                <boxGeometry args={[TILE_SIZE + 0.05, 0.2, DEPTH + 0.05]} />
                <meshStandardMaterial color="#0a0a0a" roughness={0.5} />
            </mesh>
            */}
            {/* ═══ BOTTOM BOX — murek pod oknem (przebijający posadzkę) ═══ */}
            <mesh
                position={[0, -2.15, 0]}
                castShadow
                receiveShadow
                material={appliedMaterial}
            >
                <boxGeometry args={[TILE_SIZE + 0.1, 1.7, DEPTH + 0.1]} />
            </mesh>

            {/* ═══ TOP BOX — ściana nad oknem (przebijająca sufit) ═══ */}
            <mesh
                position={[0, 2.25, 0]}
                castShadow
                receiveShadow
                material={appliedMaterial}
            >
                <boxGeometry args={[TILE_SIZE + 0.1, 1.5, DEPTH + 0.1]} />
            </mesh>

            {/* ═══ LEFT BOX — lewy filar (poszerzony dla overlapu obok kafelków) ═══ */}
            <mesh
                position={[-1.775, 0.1, 0]}
                castShadow
                receiveShadow
                material={appliedMaterial}
            >
                <boxGeometry args={[0.55, WINDOW_HEIGHT, DEPTH + 0.1]} />
            </mesh>

            {/* ═══ RIGHT BOX — prawy filar (poszerzony dla overlapu obok kafelków) ═══ */}
            <mesh
                position={[1.775, 0.1, 0]}
                castShadow
                receiveShadow
                material={appliedMaterial}
            >
                <boxGeometry args={[0.55, WINDOW_HEIGHT, DEPTH + 0.1]} />
            </mesh>

            {/* ═══ RAMA OKIENNA (Krzyżak) ═══ */}
            <mesh position={[0, wallBottom + BOTTOM_HEIGHT + WINDOW_HEIGHT / 2 - baseY, 0]} castShadow receiveShadow>
                <boxGeometry args={[WINDOW_WIDTH, 0.1, 0.1]} />
                <meshStandardMaterial color="#111111" metalness={0.5} roughness={0.5} />
            </mesh>
            <mesh position={[0, wallBottom + BOTTOM_HEIGHT + WINDOW_HEIGHT / 2 - baseY, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.1, WINDOW_HEIGHT, 0.1]} />
                <meshStandardMaterial color="#111111" metalness={0.5} roughness={0.5} />
            </mesh>

            {/* ═══ SZYBA (Przydymione szkło) ═══ */}
            <mesh position={[0, wallBottom + BOTTOM_HEIGHT + WINDOW_HEIGHT / 2 - baseY, 0]}>
                <boxGeometry args={[WINDOW_WIDTH, WINDOW_HEIGHT, 0.05]} />
                <meshPhysicalMaterial 
                    color="#111111"
                    transparent={true} 
                    opacity={0.6} 
                    roughness={0.2} 
                    metalness={0.1} 
                    transmission={0.9} 
                />
            </mesh>
        </group>
    )
}
