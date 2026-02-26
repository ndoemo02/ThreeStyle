import { useTexture } from '@react-three/drei'
import { useControls } from 'leva'
import * as THREE from 'three'

export function NeonSign() {
    const neonColor = "#00f0ff"

    // Zaktualizowane leve controls dla obrazka
    const neonProps = useControls('🚥 Neon (Logo)', {
        swiatloMoc: { value: 20, min: 0, max: 200, step: 1, label: 'Moc Światła na Ścianę' },
        logoMoc: { value: 2.0, min: 0, max: 10, step: 0.1, label: 'Siła Podświetlenia Logo' },
        width: { value: 10, min: 1, max: 20, step: 0.1, label: 'Szerokość Logo' },
        height: { value: 5, min: 1, max: 20, step: 0.1, label: 'Wysokość Logo' }
    })

    const texture = useTexture('/logo.png')
    // Zapewniamy ładne renderowanie kolorów SRGB
    texture.colorSpace = THREE.SRGBColorSpace

    return (
        <group position={[0, 6, -7.8]}>
            <mesh>
                <planeGeometry args={[neonProps.width, neonProps.height]} />
                <meshStandardMaterial
                    map={texture}
                    transparent={true}
                    emissive={neonColor}
                    emissiveMap={texture}
                    emissiveIntensity={neonProps.logoMoc}
                    toneMapped={false}
                />
            </mesh>

            <pointLight
                intensity={neonProps.swiatloMoc}
                distance={10}
                color={neonColor}
                position={[0, 0, 0.5]}
            />
        </group>
    )
}

useTexture.preload('/logo.png')
