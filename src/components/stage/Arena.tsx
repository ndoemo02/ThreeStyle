import { useTexture, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

export function Arena() {
    // 1. Ładujemy tekstury z folderu /public/textures/
    // R3F automatycznie wie, że ścieżka zaczyna się w folderze public
    const concreteTexture = useTexture('/textures/concrete_color.jpg')
    const foamTexture = useTexture('/textures/foam_color.jpg')

    // 2. Ustawiamy powtarzalność (Repeat), żeby tekstura betonu nie była
    // rozciągnięta jak guma na tak wielkiej ścianie, tylko ułożyła się w kafelki.
    concreteTexture.wrapS = concreteTexture.wrapT = THREE.RepeatWrapping
    concreteTexture.repeat.set(4, 2)

    foamTexture.wrapS = foamTexture.wrapT = THREE.RepeatWrapping
    foamTexture.repeat.set(1, 2)

    return (
        <group>
            {/* GŁÓWNA ŚCIANA Z TYŁU (BETON) */}
            <mesh position={[0, 4, -8]} receiveShadow>
                <planeGeometry args={[30, 15]} />
                <meshStandardMaterial
                    map={concreteTexture}
                    color="#888888" // Przyciemniamy teksturę bazową
                    roughness={0.9}
                />
            </mesh>

            {/* PODŁOGA (BETON) */}
            <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[30, 30]} />
                <meshStandardMaterial
                    map={concreteTexture}
                    color="#333333" // Podłoga jeszcze ciemniejsza
                    roughness={0.5}
                />
            </mesh>

            {/* LEWA ŚCIANA */}
            <mesh position={[-15, 4, 7]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                <planeGeometry args={[30, 15]} />
                <meshStandardMaterial
                    map={concreteTexture}
                    color="#444444"
                    roughness={0.9}
                />
            </mesh>

            {/* PRAWA ŚCIANA */}
            <mesh position={[15, 4, 7]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
                <planeGeometry args={[30, 15]} />
                <meshStandardMaterial
                    map={concreteTexture}
                    color="#444444"
                    roughness={0.9}
                />
            </mesh>

            {/* SUFIT */}
            <mesh position={[0, 11.5, 7]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[30, 30]} />
                <meshStandardMaterial
                    map={concreteTexture}
                    color="#111111"
                    roughness={0.9}
                />
            </mesh>

            {/* Cien kontaktowy poniżej całego obszaru, wzmacniający odczucie uziemnionych obiektów */}
            <ContactShadows resolution={1024} scale={50} position={[0, -1.99, 0]} blur={2} opacity={0.6} far={5} color="#000000" />

            {/* PANELE AKUSTYCZNE (GĄBKA) */}
            {/* Lewy panel zawieszony na ścianie */}
            <mesh position={[-4, 3, -7.99]} receiveShadow>
                <planeGeometry args={[2, 4]} />
                <meshStandardMaterial map={foamTexture} color="#1a1a1a" roughness={1} />
            </mesh>

            {/* Prawy panel zawieszony na ścianie */}
            <mesh position={[4, 3, -7.99]} receiveShadow>
                <planeGeometry args={[2, 4]} />
                <meshStandardMaterial map={foamTexture} color="#1a1a1a" roughness={1} />
            </mesh>
        </group>
    )
}
