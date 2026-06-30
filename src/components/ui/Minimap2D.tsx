// src/components/ui/Minimap2D.tsx
'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { FLOOR_PLAN, TileType } from '@/config/levelConfig'

export interface Minimap2DProps {
    className?: string;
}

const TILE_COLORS: Record<TileType, string> = {
    0: '#111',    // Korytarz / Podłoga
    1: '#333',    // Ściana pełna
    2: '#555',    // Drzwi
    3: '#0055ff', // Winda (Start)
    4: '#00ffff', // Studio / SafeHouse
    5: '#665533', // Ściana z oknem (Window Wall)
}

const TILE_LABELS: Record<TileType, string> = {
    0: 'Korytarz',
    1: 'Ściana',
    2: 'Drzwi',
    3: 'Winda',
    4: 'Studio',
    5: 'Okno',
}

export function Minimap2D({ className }: Minimap2DProps) {
    const gridRows = FLOOR_PLAN.length
    const gridCols = FLOOR_PLAN[0].length

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`fixed bottom-8 left-8 z-[200] p-2 border border-zinc-800 bg-black/85 backdrop-blur-md rounded-md select-none ${className ?? ''}`}
        >
            {/* Nagłówek */}
            <div className="mb-2 px-1 flex justify-between items-center">
                <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono font-bold">
                    LEVEL_MAP: BLOK_B3P
                </span>
                <span className="text-[8px] text-cyan-400 font-mono animate-pulse">
                    LIVE
                </span>
            </div>

            {/* Siatka kafelków */}
            <div
                className="grid gap-[1px]"
                style={{
                    gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                    width: `${gridCols * 10}px`,
                    height: `${gridRows * 10}px`,
                }}
            >
                {FLOOR_PLAN.map((row, y) =>
                    row.map((tile, x) => (
                        <div
                            key={`${x}-${y}`}
                            className="w-full h-full rounded-[1px] transition-colors duration-200"
                            style={{
                                backgroundColor: TILE_COLORS[tile],
                                border: tile === 3 ? '1px solid #0055ff' : 'none',
                                boxShadow:
                                    tile === 4 ? '0 0 4px rgba(0,255,255,0.5)'
                                  : tile === 5 ? 'inset 0 0 2px rgba(255,200,100,0.3)'
                                  : 'none',
                            }}
                            title={`(${x},${y}) ${TILE_LABELS[tile]}`}
                        />
                    ))
                )}
            </div>

            {/* Legenda */}
            <div className="mt-2 flex flex-wrap gap-3 text-[7px] text-zinc-600 font-bold font-mono">
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" /> WINDA
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-cyan-400" /> STUDIO
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: '#665533' }} /> OKNO
                </div>
            </div>
        </motion.div>
    )
}
