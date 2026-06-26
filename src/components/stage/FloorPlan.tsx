import { useFBX } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

interface FloorPlanProps {
    path?: string
    position?: [number, number, number]
    scale?: number
    rotation?: [number, number, number]
}

export function FloorPlan({ 
    path = '/models/floorplan.fbx', 
    position = [0, -1.5, -1.5], 
    scale = 0.01, 
    rotation = [0, 0, 0] 
}: FloorPlanProps) {
    const fbx = useFBX(path)

    // Ensure all children cast/receive shadows
    useMemo(() => {
        fbx.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true
                child.receiveShadow = true
                // Optional: apply a neutral material if missing or messy
                // child.material = new THREE.MeshStandardMaterial({ color: '#888' })
            }
        })
    }, [fbx])

    return (
        <primitive 
            object={fbx} 
            position={position} 
            scale={scale} 
            rotation={rotation} 
        />
    )
}
