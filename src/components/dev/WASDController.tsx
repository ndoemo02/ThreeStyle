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

    // Prealokowane wektory — unikamy alokacji w useFrame (60x/s)
    const forward = useRef(new THREE.Vector3())
    const right = useRef(new THREE.Vector3())
    const move = useRef(new THREE.Vector3())
    const up = useRef(new THREE.Vector3(0, 1, 0))

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
        camera.getWorldDirection(forward.current)
        forward.current.y = 0
        forward.current.normalize()

        // Kierunek "prawo" — prostopadły do forward na XZ
        right.current.crossVectors(forward.current, up.current).normalize()

        // Obliczamy wektor przesunięcia
        move.current.set(0, 0, 0)

        if (k['w']) move.current.add(forward.current)
        if (k['s']) move.current.sub(forward.current)
        if (k['d']) move.current.add(right.current)
        if (k['a']) move.current.sub(right.current)
        if (k['e']) move.current.y += 1
        if (k['q']) move.current.y -= 1

        move.current.normalize().multiplyScalar(speed * delta)

        // Przesuwamy JEDNOCZEŚNIE kamerę i target OrbitControls
        camera.position.add(move.current)

        const orbitControls = controls as unknown as { target?: THREE.Vector3 }
        if (orbitControls?.target) {
            orbitControls.target.add(move.current)
        }
    })

    return null
}
