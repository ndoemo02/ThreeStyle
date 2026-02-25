import { Text } from '@react-three/drei'
import { useControls } from 'leva'

export function NeonSign() {
    const neonColor = "#00f0ff"

    const neonProps = useControls('🚥 Neon (Napis)', {
        swiatloMoc: { value: 20, min: 0, max: 200, step: 1, label: 'Moc Światła na Ścianę' },
        tekstMoc: { value: 1.2, min: 0, max: 10, step: 0.1, label: 'Siła Emisji Tekstu' },
    })

    return (
        <group position={[0, 6, -7.8]}>

            <Text
                fontSize={1.5}
                letterSpacing={-0.05}
                color={neonColor}
            >
                THREESTYLE
                <meshStandardMaterial emissive={neonColor} emissiveIntensity={neonProps.tekstMoc} toneMapped={false} />
            </Text>

            <pointLight
                intensity={neonProps.swiatloMoc}
                distance={10}
                color={neonColor}
                position={[0, 0, 0.5]}
            />
        </group>
    )
}
