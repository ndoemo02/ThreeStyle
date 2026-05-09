import React, { useMemo } from 'react'
import { useGLTF, Center } from '@react-three/drei'

export function StandingMic(props: any) {
    const { scene } = useGLTF('/models/optimized/mic-transformed.glb')

    const clonedScene = useMemo(() => {
        const clone = scene.clone()
        clone.traverse((child: any) => {
            if (child.isMesh) {
                child.castShadow = true
                child.receiveShadow = true
            }
        })
        return clone
    }, [scene])

    return (
        <group {...props}>
            <Center bottom>
                <primitive object={clonedScene} />
            </Center>
        </group>
    )
}

useGLTF.preload('/models/optimized/mic-transformed.glb')
