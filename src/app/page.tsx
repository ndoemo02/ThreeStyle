// src/app/page.tsx
'use client'
import { Suspense, useState, useCallback } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, DepthOfField } from '@react-three/postprocessing'
import { useControls } from 'leva'
import { Arena } from '@/components/stage/Arena'
import { CameraInspector } from '@/components/dev/CameraInspector'
import { WASDController } from '@/components/dev/WASDController'
import { HUD } from '@/components/ui/HUD'
import { useRapCoach } from '@/hooks/useRapCoach'

export default function Home() {
  const { getRhymesAndTopics, loading, error } = useRapCoach()
  const [coachData, setCoachData] = useState<{ rhymes: string[]; nextTopic: string } | null>(null)

  const handleAnalyze = useCallback(async (text: string) => {
    const data = await getRhymesAndTopics(text)
    setCoachData(data)
  }, [getRhymesAndTopics]);

  // --- DEV PANEL: OŚWIETLENIE (LEVA) ---
  const light = useControls('💡 Oświetlenie Sceny', {
    envMoc: { value: 0.00, min: 0, max: 2, step: 0.05, label: 'Siła Otoczenia' },
    ambientMoc: { value: 0.60, min: 0, max: 2, step: 0.05, label: 'Ambient' },

    // Key Light (Front-Left 45deg)
    keyMoc: { value: 500, min: 0, max: 500, step: 5, label: 'Key Light Moc' },
    keyX: { value: -10.0, min: -10, max: 10, step: 0.5, label: 'Key X (Lewo)' },
    keyY: { value: -5.0, min: -5, max: 10, step: 0.5, label: 'Key Y (Góra)' },
    keyZ: { value: -10.0, min: -10, max: 10, step: 0.5, label: 'Key Z (Przód)' },
    keyColor: { value: '#765c3a', label: 'Key Color (5600K)' }, // slightly warm/neutral 

    // Rim Light (Behind Mic)
    rimMoc: { value: 215, min: 0, max: 300, step: 5, label: 'Rim Light Moc' },
    rimColor: { value: '#00c3ff', label: 'Rim Color (Cold)' }, // slightly cold

    // Background Spot (Back Wall Center)
    spotMoc: { value: 40, min: 0, max: 500, step: 5, label: 'BG Spot Moc' },
    spotColor: { value: '#ffffff', label: 'BG Spot Color' }
  })

  const nav = useControls('🎮 Nawigacja WASD', {
    predkosc: { value: 5, min: 1, max: 20, step: 0.5, label: 'Prędkość' },
  })

  const ui = useControls('🖥️ UI / HUD', {
    ukryjHUD: { value: false, label: 'Ukryj HUD' },
    hudY: { value: -5.0, min: -20, max: 20, step: 0.1, label: 'Pozycja Y' },
    hudZ: { value: -10.0, min: -20, max: 20, step: 0.1, label: 'Pozycja Z' },
  })

  const post = useControls('🌌 Post-Processing', {
    wlaczGlebie: { value: false, label: 'Włącz Ostrość (DoF)' },
  })

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden">

      {/* WARSTWA 1: Canvas 3D */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows camera={{ position: [0.3, 0.8, 7.5], fov: 55 }} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}>
          <color attach="background" args={['#020202']} />

          <Suspense fallback={null}>

            {/* --- GLOBALNE ODBICIA --- */}
            {light.envMoc > 0 ? (
              <Environment preset="studio" environmentIntensity={light.envMoc} />
            ) : null}

            {/* --- KONTROLA KAMERY --- */}
            {/* LPM: obrót | PPM: przesuwanie | Scroll: zoom */}
            <OrbitControls makeDefault enableDamping dampingFactor={0.12} target={[0, 0, 0]} />

            {/* --- WASD: latanie kamerą --- */}
            {/* W/S = przód/tył, A/D = lewo/prawo, Q/E = góra/dół */}
            <WASDController speed={nav.predkosc} />

            {/* --- INSPEKTOR KAMERY: koordynaty + eksport --- */}
            <CameraInspector />

            {/* --- ŚWIATŁA --- */}
            <ambientLight
              intensity={light.ambientMoc}
              color="#ffffff"
            />

            {/* KEY LIGHT (Front-Left 45deg, 5600K) */}
            <spotLight
              position={[light.keyX, light.keyY, light.keyZ]}
              angle={0.6}
              penumbra={0.5}
              intensity={light.keyMoc}
              castShadow
              color={light.keyColor}
              shadow-bias={-0.0001}
            />

            {/* RIM LIGHT (Behind Mic, cooler) */}
            {/* Mic is at [0, 0, 0.8]. Behind means Z is negative relative to the mic */}
            <spotLight
              position={[-1, 2, -1]}
              angle={0.5}
              penumbra={0.5}
              intensity={light.rimMoc}
              castShadow
              color={light.rimColor}
              target-position={[0, 0, 0.8]} // Pointing at the mic stand
            />

            {/* BACKGROUND SPOT (Center back wall) */}
            <pointLight
              position={[0, 1.5, -2.5]}
              intensity={light.spotMoc}
              color={light.spotColor}
              distance={8}
              decay={2}
            />

            {/* --- SCENA --- */}
            <Arena />

            {/* --- HUD --- */}
            {!ui.ukryjHUD ? <HUD onAnalyze={handleAnalyze} coachData={coachData} loading={loading} positionY={ui.hudY} positionZ={ui.hudZ} /> : null}

            {/* --- POST-PROCESSING --- */}
            {post.wlaczGlebie ? (
              <EffectComposer multisampling={4}>
                <DepthOfField
                  focusDistance={0.015} // Pozycja wirtualnego "mikrofonu"
                  focalLength={0.02} // Z jakim impaktem odcina się tło (ostrość)
                  bokehScale={3.5}
                  height={480}
                />
                <Bloom luminanceThreshold={1.2} luminanceSmoothing={0.5} mipmapBlur intensity={0.2} />
                <Vignette eskil={false} offset={0.1} darkness={0.8} />
              </EffectComposer>
            ) : (
              <EffectComposer multisampling={4}>
                {/* Very subtle bloom just to mimic camera lens glow, no extreme neon thresholds */}
                <Bloom luminanceThreshold={1.2} luminanceSmoothing={0.5} mipmapBlur intensity={0.2} />
                <Vignette eskil={false} offset={0.1} darkness={0.8} />
              </EffectComposer>
            )}

          </Suspense>
        </Canvas>
      </div>

      {/* INFO SKRÓTY KLAWISZOWE (lewy dolny róg) */}
      <div className="absolute bottom-8 left-8 z-20 text-xs text-zinc-500/60 font-mono space-y-0.5 pointer-events-none select-none">
        <p>W/S — przód / tył</p>
        <p>A/D — lewo / prawo</p>
        <p>Q/E — góra / dół</p>
        <p>LPM — obrót kamery</p>
        <p>PPM — przesuwanie</p>
        <p>Scroll — zoom</p>
      </div>
    </main>
  )
}
