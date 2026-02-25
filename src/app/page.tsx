// src/app/page.tsx
'use client'
import { Suspense, useState, useCallback } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, DepthOfField } from '@react-three/postprocessing'
import { useControls } from 'leva'
import { Arena } from '@/components/stage/Arena'
import { NeonSign } from '@/components/stage/NeonSign'
import { LedStrips } from '@/components/stage/LedStrips'
import { CameraInspector } from '@/components/dev/CameraInspector'
import { WASDController } from '@/components/dev/WASDController'
import { HUD } from '@/components/ui/HUD'
import { useRapCoach } from '@/hooks/useRapCoach'

export default function Home() {
  const { getRhymesAndTopics, loading, error } = useRapCoach()
  // Stworzymy pusty stan dla feedbacku do czasu wpięcia się w system logów (obecnie użyjemy local state)
  const [coachData, setCoachData] = useState<{ rhymes: string[]; nextTopic: string } | null>(null)

  const handleAnalyze = useCallback(async (text: string) => {
    const data = await getRhymesAndTopics(text)
    setCoachData(data)
  }, [getRhymesAndTopics]);
  // --- DEV PANEL: OŚWIETLENIE (LEVA) ---
  const light = useControls('💡 Oświetlenie Sceny', {
    envMoc: { value: 0.5, min: 0, max: 2, step: 0.05, label: 'Siła Otoczenia' },
    ambientMoc: { value: 0.1, min: 0, max: 2, step: 0.05, label: 'Ambient' },
    spotMoc: { value: 800, min: 0, max: 2000, step: 10, label: 'Spot Moc' },
    spotKat: { value: 0.6, min: 0.1, max: 1.5, step: 0.05, label: 'Spot Kąt' },
    spotMiekkosc: { value: 1, min: 0, max: 1, step: 0.1, label: 'Spot Miękkość' },
    spotKolor: { value: '#cceeff', label: 'Spot Kolor' },
    spotWysokosc: { value: 8, min: 0, max: 15, step: 0.5, label: 'Spot Y' },
    spotOsZ: { value: 4, min: -10, max: 10, step: 0.5, label: 'Spot Z' },
    fillMoc: { value: 50, min: 0, max: 200, step: 5, label: 'Fill Moc' },
    fillKolor: { value: '#00f0ff', label: 'Fill Kolor' },
  })

  // --- DEV PANEL: LED STRIPS ---
  const led = useControls('🔦 Paski LED (Progi)', {
    lewyKolor: { value: '#00f0ff', label: 'Lewy Kolor' },
    prawyKolor: { value: '#ff00aa', label: 'Prawy Kolor' },
    ledMoc: { value: 80, min: 0, max: 300, step: 5, label: 'Moc' },
    ledWysokosc: { value: -1.8, min: -3, max: 2, step: 0.1, label: 'Wysokość' },
  })

  const nav = useControls('🎮 Nawigacja WASD', {
    predkosc: { value: 5, min: 1, max: 20, step: 0.5, label: 'Prędkość' },
  })

  const ui = useControls('🖥️ UI / HUD', {
    ukryjHUD: { value: false, label: 'Ukryj HUD' },
  })

  const post = useControls('🌌 Post-Processing', {
    wlaczGlebie: { value: false, label: 'Włącz Ostrość (DoF)' },
    bloomMoc: { value: 1.5, min: 0, max: 5, step: 0.1, label: 'Bloom Moc' },
    bloomProg: { value: 1.0, min: 0, max: 2, step: 0.1, label: 'Bloom Próg' },
    bloomWygladzenie: { value: 0.9, min: 0, max: 1, step: 0.05, label: 'Wygładzanie' },
  })

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden">

      {/* WARSTWA 1: Canvas 3D */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows camera={{ position: [0, 2, 10], fov: 45 }} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}>
          <color attach="background" args={['#020202']} />

          <Suspense fallback={null}>

            {/* --- GLOBALNE ODBICIA --- */}
            {light.envMoc > 0 ? (
              <Environment preset="studio" environmentIntensity={light.envMoc} />
            ) : null}

            {/* --- KONTROLA KAMERY --- */}
            {/* LPM: obrót | PPM: przesuwanie | Scroll: zoom */}
            <OrbitControls makeDefault enableDamping dampingFactor={0.12} />

            {/* --- WASD: latanie kamerą --- */}
            {/* W/S = przód/tył, A/D = lewo/prawo, Q/E = góra/dół */}
            <WASDController speed={nav.predkosc} />

            {/* --- INSPEKTOR KAMERY: koordynaty + eksport --- */}
            <CameraInspector />

            {/* --- ŚWIATŁA PODPIĘTE POD PANEL DEV --- */}
            <ambientLight
              intensity={light.ambientMoc}
              color="#ffffff"
            />

            <spotLight
              position={[0, light.spotWysokosc, light.spotOsZ]}
              angle={light.spotKat}
              penumbra={light.spotMiekkosc}
              intensity={light.spotMoc}
              castShadow
              color={light.spotKolor}
              shadow-bias={-0.0001}
            />

            {/* Światło wypełniające z dołu (odbicie od podłogi) */}
            <pointLight
              position={[0, -2, 2]}
              intensity={light.fillMoc}
              color={light.fillKolor}
              distance={10}
            />

            {/* --- EFEKTY WOLUMETRYCZNE --- */}
            <Sparkles
              count={200}
              scale={12}
              size={1}
              speed={0.2}
              opacity={0.3}
              color={light.spotKolor}
              position={[0, 4, 0]}
            />            {/* --- SCENA --- */}
            <Arena />
            <NeonSign />
            <LedStrips
              leftColor={led.lewyKolor}
              rightColor={led.prawyKolor}
              leftIntensity={led.ledMoc}
              rightIntensity={led.ledMoc}
              height={led.ledWysokosc}
            />

            {/* --- HUD --- */}
            {!ui.ukryjHUD && <HUD onAnalyze={handleAnalyze} coachData={coachData} loading={loading} />}

            {/* --- POST-PROCESSING --- */}
            {post.wlaczGlebie ? (
              <EffectComposer multisampling={4}>
                <DepthOfField
                  focusDistance={0.015} // Pozycja wirtualnego "mikrofonu"
                  focalLength={0.02} // Z jakim impaktem odcina się tło (ostrość)
                  bokehScale={3.5}
                  height={480}
                />
                <Bloom luminanceThreshold={post.bloomProg} luminanceSmoothing={post.bloomWygladzenie} mipmapBlur intensity={post.bloomMoc} />
                <Vignette eskil={false} offset={0.1} darkness={0.8} />
              </EffectComposer>
            ) : (
              <EffectComposer multisampling={4}>
                <Bloom luminanceThreshold={post.bloomProg} luminanceSmoothing={post.bloomWygladzenie} mipmapBlur intensity={post.bloomMoc} />
                <Vignette eskil={false} offset={0.1} darkness={0.8} />
              </EffectComposer>
            )}

          </Suspense>
        </Canvas>
      </div>

      {/* INFO SKRÓTY KLAWISZOWE (lewy dolny róg) */}
      <div className="absolute bottom-8 left-8 z-20 text-xs text-cyan-500/60 font-mono space-y-0.5 pointer-events-none select-none">
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
