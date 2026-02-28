import { useTexture, ContactShadows } from '@react-three/drei'
import { useControls } from 'leva'
import * as THREE from 'three'
import { EditingTable } from './EditingTable'
import { StandingMic } from './StandingMic'

export function Arena() {
    // 1. Load Concrete Textures
    const concreteMap = useTexture('/textures/Concrete035_2K-JPG/Concrete035_2K-JPG_Color.jpg')
    const concreteRoughness = useTexture('/textures/Concrete035_2K-JPG/Concrete035_2K-JPG_Roughness.jpg')
    const concreteNormal = useTexture('/textures/Concrete035_2K-JPG/Concrete035_2K-JPG_NormalGL.jpg')

    // Clone for floor to have separate repeat (8x6m = 8x6 repeat)
    const floorMap = concreteMap.clone()
    const floorRoughness = concreteRoughness.clone()
    const floorNormal = concreteNormal.clone()
    floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping; floorMap.repeat.set(8, 6)
    floorRoughness.wrapS = floorRoughness.wrapT = THREE.RepeatWrapping; floorRoughness.repeat.set(8, 6)
    floorNormal.wrapS = floorNormal.wrapT = THREE.RepeatWrapping; floorNormal.repeat.set(8, 6)

    // Clone for back wall (8x3m = 8x3 repeat)
    const backWallMap = concreteMap.clone()
    const backWallRoughness = concreteRoughness.clone()
    const backWallNormal = concreteNormal.clone()
    backWallMap.wrapS = backWallMap.wrapT = THREE.RepeatWrapping; backWallMap.repeat.set(8, 3)
    backWallRoughness.wrapS = backWallRoughness.wrapT = THREE.RepeatWrapping; backWallRoughness.repeat.set(8, 3)
    backWallNormal.wrapS = backWallNormal.wrapT = THREE.RepeatWrapping; backWallNormal.repeat.set(8, 3)

    // Clone for right wall (6x3m = 6x3 repeat)
    const rightWallMap = concreteMap.clone()
    const rightWallRoughness = concreteRoughness.clone()
    const rightWallNormal = concreteNormal.clone()
    rightWallMap.wrapS = rightWallMap.wrapT = THREE.RepeatWrapping; rightWallMap.repeat.set(6, 3)
    rightWallRoughness.wrapS = rightWallRoughness.wrapT = THREE.RepeatWrapping; rightWallRoughness.repeat.set(6, 3)
    rightWallNormal.wrapS = rightWallNormal.wrapT = THREE.RepeatWrapping; rightWallNormal.repeat.set(6, 3)

    // 2. Load Brick Textures for Left Wall (6x3m) - ~3x1.5 repeat for realistic scale
    const brickMap = useTexture('/textures/Bricks061_2K-JPG/Bricks061_2K-JPG_Color.jpg')
    const brickRoughness = useTexture('/textures/Bricks061_2K-JPG/Bricks061_2K-JPG_Roughness.jpg')
    const brickNormal = useTexture('/textures/Bricks061_2K-JPG/Bricks061_2K-JPG_NormalGL.jpg')
    brickMap.wrapS = brickMap.wrapT = THREE.RepeatWrapping; brickMap.repeat.set(3, 1.5)
    brickRoughness.wrapS = brickRoughness.wrapT = THREE.RepeatWrapping; brickRoughness.repeat.set(3, 1.5)
    brickNormal.wrapS = brickNormal.wrapT = THREE.RepeatWrapping; brickNormal.repeat.set(3, 1.5)

    const deskControls = useControls('🛠️ Biurko GLB', {
        biurkoX: { value: -2.20, min: -8, max: 8, step: 0.05, label: 'Pozycja X' },
        biurkoY: { value: -1.70, min: -3, max: 3, step: 0.05, label: 'Pozycja Y' },
        biurkoZ: { value: -1.70, min: -8, max: 8, step: 0.05, label: 'Pozycja Z' },
        biurkoRotY: { value: 0.00, min: -Math.PI, max: Math.PI, step: 0.01, label: 'Obrót Y' },
        biurkoScale: { value: 1.05, min: 0.1, max: 2, step: 0.05, label: 'Skala' }
    })

    const micControls = useControls('🎤 Mikrofon', {
        mikrofonX: { value: 0.30, min: -8, max: 8, step: 0.01, label: 'Pozycja X' },
        mikrofonY: { value: 0.45, min: -3, max: 3, step: 0.01, label: 'Pozycja Y' },
        mikrofonZ: { value: 3.05, min: -8, max: 8, step: 0.01, label: 'Pozycja Z' },
        mikrofonRotY: { value: -1.40, min: -Math.PI, max: Math.PI, step: 0.01, label: 'Obrót Y' },
        mikrofonScale: { value: 0.8, min: 0.1, max: 50, step: 0.05, label: 'Skala' }
    })

    return (
        <group>
            {/* ========================================================= */}
            {/* ROOM STRUCTURE */}
            {/* ========================================================= */}

            {/* FLOOR: 8m width, 6m depth at y = -1.5 */}
            <mesh position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[8, 6]} />
                <meshStandardMaterial map={floorMap} roughnessMap={floorRoughness} normalMap={floorNormal} color="#777777" roughness={0.3} />
            </mesh>

            {/* CEILING: 8m width, 6m depth at y = 1.5 */}
            <mesh position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[8, 6]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
            </mesh>

            {/* BACK WALL: 8m width, 3m height at z = -3 */}
            <mesh position={[0, 0, -3]} receiveShadow>
                <planeGeometry args={[8, 3]} />
                <meshStandardMaterial map={backWallMap} roughnessMap={backWallRoughness} normalMap={backWallNormal} color="#888888" roughness={0.6} />
            </mesh>

            {/* LEFT WALL (BRICK): 6m depth, 3m height at x = -4 */}
            <mesh position={[-4, 0, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                <planeGeometry args={[6, 3]} />
                <meshStandardMaterial map={brickMap} roughnessMap={brickRoughness} normalMap={brickNormal} color="#aaaaaa" />
            </mesh>

            {/* RIGHT WALL: 6m depth, 3m height at x = 4 */}
            <mesh position={[4, 0, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
                <planeGeometry args={[6, 3]} />
                <meshStandardMaterial map={rightWallMap} roughnessMap={rightWallRoughness} normalMap={rightWallNormal} color="#888888" roughness={0.6} />
            </mesh>

            {/* Contact Shadows to ground objects */}
            <ContactShadows resolution={1024} scale={10} position={[0, -1.49, 0]} blur={2} opacity={0.5} far={3} color="#000000" />

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

            {/* Tall Speakers: Right (2.8, 0, -2.5) */}
            {/* The base is at y=-1.5. A tall speaker could be 1.2m high */}
            <mesh receiveShadow castShadow position={[2.8, -0.9, -2.5]} rotation={[0, -0.4, 0]}>
                <boxGeometry args={[0.4, 1.2, 0.5]} />
                <meshStandardMaterial color="#111" roughness={0.9} />
            </mesh>

        </group>
    )
}
