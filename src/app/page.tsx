// src/app/page.tsx
'use client'
import { Suspense, useState } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, ChromaticAberration, Noise } from '@react-three/postprocessing'
import { useControls, Leva } from 'leva'
import { IntroCamera } from '@/components/stage/IntroCamera'
import { Onboarding } from '@/components/ui/Onboarding'
import { WASDController } from '@/components/dev/WASDController'
import { useRapCoach } from '@/hooks/useRapCoach'

import { LevelBuilder3D } from '@/components/stage/LevelBuilder3D'
import { Minimap2D } from '@/components/ui/Minimap2D'

export default function Home() {
  const [onboarded, setOnboarded] = useState(false)
  const { getRhymesAndTopics, loading, error } = useRapCoach()
  const [coachData, setCoachData] = useState<{ rhymes: string[]; nextTopic: string } | null>(null)

  const dev = useControls('🛠️ ADMIN_OVERRIDE', {
    showDevTools: { value: false, label: 'Bypass Onboarding' },
    debugLighting: { value: false, label: 'Debug Lighting' }
  })

  const isAccessGranted = onboarded || dev.showDevTools

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden font-mono selection:bg-cyan-500">
      
      {/* 2D Minimap Overlay (lewy dolny róg — nie nachodzi na status) */}
      {isAccessGranted && <Minimap2D />}

      {/* 📍 STAGE 1: Bramka (2D Landing) */}
      {!isAccessGranted && (
        <Onboarding onComplete={() => setOnboarded(true)} />
      )}

      {/* 📍 STAGE 2: Safe House (3D Immersive) */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${isAccessGranted ? 'opacity-100' : 'opacity-20 pointer-events-none grayscale'}`}>
        <Canvas
          shadows
          frameloop="always"
          dpr={[1, 1.5]}
          camera={{ position: [15, 12, 15], fov: 55 }}
          gl={{
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 0.85,
            antialias: true
          }}
        >
          <color attach="background" args={['#050505']} />

          <Suspense fallback={null}>
            {/* Cinematic Camera Intro */}
            <IntroCamera active={isAccessGranted} />
            
            {/* Sterowanie FPS: WASD + QE + mysz */}
            {isAccessGranted && <WASDController speed={8} />}

            {/* --- Proceduralnie generowany świat --- */}
            <LevelBuilder3D topTrackName={coachData?.nextTopic || "TRANSYLVANIA"} />

            {/* Atmosfera */}
            <Sparkles count={80} scale={20} size={1} speed={0.4} color="#ffaa44" opacity={0.2} />

            {/* --- Post-Processing --- */}
            <EffectComposer multisampling={0}>
              <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.5} intensity={1.0} mipmapBlur />
              {/* <ChromaticAberration offset={[0.0018, 0.0018]} /> */}
              {/* <Noise opacity={0.3} /> */}
              <Vignette offset={0.15} darkness={0.75} />
            </EffectComposer>
          </Suspense>
        </Canvas>
      </div>

      {/* Status UI (prawy górny róg) */}
      {isAccessGranted && (
        <div className="absolute top-8 right-8 z-10 pointer-events-none text-right">
            <h2 className="text-[10px] text-cyan-400/50 tracking-[0.5em]">STATUS: SESSION_ACTIVE</h2>
            <div className="mt-2 h-[1px] w-24 ml-auto bg-gradient-to-l from-cyan-500/50 to-transparent" />
        </div>
      )}

      {/* Leva ukryta dla nie-adminów */}
      <Leva hidden={!dev.showDevTools} />
    </main>
  )
}
