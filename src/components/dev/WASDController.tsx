import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Sterowanie WASD zintegrowane z OrbitControls.
 * Przesuwa jednocześnie kamerę I target orbity — bez konfliktu.
 *
 * W/S = przód/tył (w kierunku patrzenia, po płaszczyźnie XZ)
 * A/D = lewo/prawo
 * Q/E = góra/dół (oś Y)
 */
export function WASDController({ speed = 5 }: { speed?: number }) {
    const keys = useRef<Record<string, boolean>>({})
    const { controls, camera } = useThree()

    useEffect(() => {
        const onDown = (e: KeyboardEvent) => {
            keys.current[e.key.toLowerCase()] = true
        }
        const onUp = (e: KeyboardEvent) => {
            keys.current[e.key.toLowerCase()] = false
        }
        window.addEventListener('keydown', onDown)
        window.addEventListener('keyup', onUp)
        return () => {
            window.removeEventListener('keydown', onDown)
            window.removeEventListener('keyup', onUp)
        }
    }, [])

    useFrame((_, delta) => {
        const k = keys.current

        // Nic nie wciśnięte — nie licz
        if (!k['w'] && !k['s'] && !k['a'] && !k['d'] && !k['q'] && !k['e']) return

        // Kierunek "przód" kamery SPŁASZCZONY na XZ (ignorujemy pitch)
        const forward = new THREE.Vector3()
        camera.getWorldDirection(forward)
        forward.y = 0
        forward.normalize()

        // Kierunek "prawo" — prostopadły do forward na XZ
        const right = new THREE.Vector3()
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

        // Obliczamy wektor przesunięcia
        const move = new THREE.Vector3(0, 0, 0)

        if (k['w']) move.add(forward)      // przód
        if (k['s']) move.sub(forward)      // tył
        if (k['d']) move.add(right)        // prawo
        if (k['a']) move.sub(right)        // lewo
        if (k['e']) move.y += 1            // góra
        if (k['q']) move.y -= 1            // dół

        move.normalize().multiplyScalar(speed * delta)

        // KLUCZOWE: Przesuwamy JEDNOCZEŚNIE kamerę i target OrbitControls
        camera.position.add(move)

        // OrbitControls przechowuje target jako .target (Vector3)
        const orbitControls = controls as any
        if (orbitControls?.target) {
            orbitControls.target.add(move)
        }
    })

    return null
}
