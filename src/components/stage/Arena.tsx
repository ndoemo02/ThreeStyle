import { useTexture, ContactShadows } from '@react-three/drei'
import { useControls } from 'leva'
import * as THREE from 'three'
import { EditingTable } from './EditingTable'
import { StandingMic } from './StandingMic'
import { MonitorSetup } from './MonitorSetup'

export function Arena() {
    // 1. Load Concrete Textures
    const concreteMap = useTexture('/textures/Concrete035_2K-JPG/Concrete035_2K-JPG_Color.jpg')
    const concreteRoughness = useTexture('/textures/Concrete035_2K-JPG/Concrete035_2K-JPG_Roughness.jpg')
    const concreteNormal = useTexture('/textures/Concrete035_2K-JPG/Concrete035_2K-JPG_NormalGL.jpg')

    // Clone for floor to have separate repeat (8x9m = 8x9 repeat)
    const floorMap = concreteMap.clone()
    const floorRoughness = concreteRoughness.clone()
    const floorNormal = concreteNormal.clone()
    floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping; floorMap.repeat.set(8, 9)
    floorRoughness.wrapS = floorRoughness.wrapT = THREE.RepeatWrapping; floorRoughness.repeat.set(8, 9)
    floorNormal.wrapS = floorNormal.wrapT = THREE.RepeatWrapping; floorNormal.repeat.set(8, 9)

    // Clone for back wall (8x3m = 8x3 repeat)
    const backWallMap = concreteMap.clone()
    const backWallRoughness = concreteRoughness.clone()
    const backWallNormal = concreteNormal.clone()
    backWallMap.wrapS = backWallMap.wrapT = THREE.RepeatWrapping; backWallMap.repeat.set(8, 3)
    backWallRoughness.wrapS = backWallRoughness.wrapT = THREE.RepeatWrapping; backWallRoughness.repeat.set(8, 3)
    backWallNormal.wrapS = backWallNormal.wrapT = THREE.RepeatWrapping; backWallNormal.repeat.set(8, 3)

    // Clone for right wall (9x3m = 9x3 repeat)
    const rightWallMap = concreteMap.clone()
    const rightWallRoughness = concreteRoughness.clone()
    const rightWallNormal = concreteNormal.clone()
    rightWallMap.wrapS = rightWallMap.wrapT = THREE.RepeatWrapping; rightWallMap.repeat.set(9, 3)
    rightWallRoughness.wrapS = rightWallRoughness.wrapT = THREE.RepeatWrapping; rightWallRoughness.repeat.set(9, 3)
    rightWallNormal.wrapS = rightWallNormal.wrapT = THREE.RepeatWrapping; rightWallNormal.repeat.set(9, 3)

    // 2. Load Brick Textures for Left Wall (9x3m) - ~4.5x1.5 repeat for realistic scale
    const brickMap = useTexture('/textures/Bricks061_2K-JPG/Bricks061_2K-JPG_Color.jpg')
    const brickRoughness = useTexture('/textures/Bricks061_2K-JPG/Bricks061_2K-JPG_Roughness.jpg')
    const brickNormal = useTexture('/textures/Bricks061_2K-JPG/Bricks061_2K-JPG_NormalGL.jpg')
    brickMap.wrapS = brickMap.wrapT = THREE.RepeatWrapping; brickMap.repeat.set(4.5, 1.5)
    brickRoughness.wrapS = brickRoughness.wrapT = THREE.RepeatWrapping; brickRoughness.repeat.set(4.5, 1.5)
    brickNormal.wrapS = brickNormal.wrapT = THREE.RepeatWrapping; brickNormal.repeat.set(4.5, 1.5)

    const deskControls = useControls('🛠️ Biurko GLB', {
        biurkoX: { value: -1.70, min: -15, max: 15, step: 0.05, label: '↔️ Lewo/Prawo' },
        biurkoY: { value: -1.45, min: -5, max: 5, step: 0.05, label: '↕️ Góra/Dół' },
        biurkoZ: { value: -4.40, min: -15, max: 15, step: 0.05, label: '↗️ Przód/Tył' },
        biurkoRotY: { value: 0.00, min: -Math.PI, max: Math.PI, step: 0.1, label: '🔄 Obrót Y' },
        biurkoScale: { value: 1.35, min: 0.1, max: 5, step: 0.05, label: '📏 Skala' }
    })

    const micControls = useControls('🎤 Mikrofon', {
        mikrofonX: { value: 2.54, min: -15, max: 15, step: 0.01, label: '↔️ Lewo/Prawo' },
        mikrofonY: { value: 0.75, min: -5, max: 5, step: 0.01, label: '↕️ Góra/Dół' },
        mikrofonZ: { value: 0.40, min: -15, max: 15, step: 0.01, label: '↗️ Przód/Tył' },
        mikrofonRotY: { value: -0.90, min: -Math.PI, max: Math.PI, step: 0.01, label: '🔄 Obrót Y' },
        mikrofonScale: { value: 0.80, min: 0.1, max: 50, step: 0.05, label: '📏 Skala' }
    })

    const monitorControls = useControls('🖥️ Monitory (Panoramiczne)', {
        monX: { value: -1.82, min: -15, max: 15, step: 0.01, label: '↔️ Lewo/Prawo' },
        monY: { value: -0.40, min: -5, max: 5, step: 0.01, label: '↕️ Góra/Dół' },
        monZ: { value: -5.42, min: -15, max: 15, step: 0.01, label: '↗️ Przód/Tył' },
        monRotY: { value: -1.41, min: -Math.PI, max: Math.PI, step: 0.01, label: '🔄 Obrót Y' },
        monScale: { value: 0.75, min: 0.05, max: 5.0, step: 0.05, label: '📏 Skala' }
    })

    return (
        <group>
            {/* ========================================================= */}
            {/* ROOM STRUCTURE */}
            {/* ========================================================= */}

            {/* FLOOR: 8m width, 9m depth at y = -1.5 */}
            <mesh position={[0, -1.5, -1.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[8, 9]} />
                <meshStandardMaterial map={floorMap} roughnessMap={floorRoughness} normalMap={floorNormal} color="#777777" roughness={0.3} />
            </mesh>

            {/* CEILING: 8m width, 9m depth at y = 1.5 */}
            <mesh position={[0, 1.5, -1.5]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[8, 9]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
            </mesh>

            {/* BACK WALL: 8m width, 3m height at z = -6 */}
            <mesh position={[0, 0, -6]} receiveShadow>
                <planeGeometry args={[8, 3]} />
                <meshStandardMaterial map={backWallMap} roughnessMap={backWallRoughness} normalMap={backWallNormal} color="#888888" roughness={0.6} />
            </mesh>

            {/* LEFT WALL (BRICK): 9m depth, 3m height at x = -4 */}
            <mesh position={[-4, 0, -1.5]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                <planeGeometry args={[9, 3]} />
                <meshStandardMaterial map={brickMap} roughnessMap={brickRoughness} normalMap={brickNormal} color="#aaaaaa" />
            </mesh>

            {/* RIGHT WALL: 9m depth, 3m height at x = 4 */}
            <mesh position={[4, 0, -1.5]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
                <planeGeometry args={[9, 3]} />
                <meshStandardMaterial map={rightWallMap} roughnessMap={rightWallRoughness} normalMap={rightWallNormal} color="#888888" roughness={0.6} />
            </mesh>

            {/* Contact Shadows to ground objects */}
            <ContactShadows resolution={1024} scale={12} position={[0, -1.49, -1.5]} blur={2} opacity={0.5} far={3} color="#000000" />

            {/* ========================================================= */}
            {/* OBJECT PLACEMENT */}
            {/* ========================================================= */}

            {/* Recording Desk (GLB Model) */}
            <EditingTable
                position={[deskControls.biurkoX, deskControls.biurkoY, deskControls.biurkoZ]}
                scale={deskControls.biurkoScale}
                rotation={[0, deskControls.biurkoRotY, 0]}
            />

            {/* Microphone stand (GLB Model) */}
            <StandingMic
                position={[micControls.mikrofonX, micControls.mikrofonY, micControls.mikrofonZ]}
                rotation={[0, micControls.mikrofonRotY, 0]}
                scale={micControls.mikrofonScale}
            />

            {/* Panoramic Monitors (Independent) */}
            <MonitorSetup 
                position={[monitorControls.monX, monitorControls.monY, monitorControls.monZ]}
                rotation={[0, monitorControls.monRotY, 0]}
                scale={monitorControls.monScale}
            />

            {/* Tall Speakers: Right (2.8, 0, -2.5) */}
            {/* The base is at y=-1.5. A tall speaker could be 1.2m high */}
            <mesh receiveShadow castShadow position={[2.8, -0.9, -2.5]} rotation={[0, -0.4, 0]}>
                <boxGeometry args={[0.4, 1.2, 0.5]} />
                <meshStandardMaterial color="#111" roughness={0.9} />
            </mesh>

        </group>
    )
}
