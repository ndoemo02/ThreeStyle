'use client'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'

interface IntroCameraProps {
    active: boolean
}

export function IntroCamera({ active }: IntroCameraProps) {
    const { camera } = useThree()
    const animated = useRef(false)
    const lookTarget = useRef(new THREE.Vector3(0, 0, 0))

    useEffect(() => {
        if (active && !animated.current) {
            camera.position.set(10, 8, 15)
            camera.lookAt(lookTarget.current)

            const tween = gsap.to(camera.position, {
                x: 0,
                y: 1.2,
                z: 6.5,
                duration: 5,
                ease: 'power3.inOut',
                onUpdate: () => camera.lookAt(lookTarget.current),
                onComplete: () => { animated.current = true },
            })

            return () => { tween.kill() }
        }
    }, [active, camera])

    return null
}
