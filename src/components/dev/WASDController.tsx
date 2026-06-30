import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * FPS-style sterowanie:
 *   WASD     = ruch przód/tył/lewo/prawo
 *   Q / E    = dół / góra
 *   LMB drag = obrót kamery w miejscu (360° yaw, ograniczony pitch)
 *   Scroll   = zoom (przesunięcie przód/tył)
 */
export function WASDController({ speed = 8, sensitivity = 0.003 }: { speed?: number; sensitivity?: number }) {
    const keys = useRef<Record<string, boolean>>({})
    const { camera, gl } = useThree()

    // Prealokowane wektory (zero alokacji w useFrame)
    const forward = useRef(new THREE.Vector3())
    const right = useRef(new THREE.Vector3())
    const move = useRef(new THREE.Vector3())
    const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
    const isDragging = useRef(false)

    useEffect(() => {
        const canvas = gl.domElement

        // ─── Klawiatura ───
        const onKeyDown = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true }
        const onKeyUp = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false }

        // ─── Obrót myszą (LMB drag) ───
        const onMouseDown = (e: MouseEvent) => {
            if (e.button === 0) isDragging.current = true
        }
        const onMouseUp = (e: MouseEvent) => {
            if (e.button === 0) isDragging.current = false
        }
        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return

            euler.current.setFromQuaternion(camera.quaternion)
            euler.current.y -= e.movementX * sensitivity   // yaw — pełny 360°
            euler.current.x -= e.movementY * sensitivity   // pitch — ograniczony
            euler.current.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.current.x))
            camera.quaternion.setFromEuler(euler.current)
        }

        // ─── Scroll = zoom przód/tył ───
        const onWheel = (e: WheelEvent) => {
            camera.getWorldDirection(forward.current)
            const scrollSpeed = e.deltaY * -0.02
            camera.position.addScaledVector(forward.current, scrollSpeed)
        }

        window.addEventListener('keydown', onKeyDown)
        window.addEventListener('keyup', onKeyUp)
        canvas.addEventListener('mousedown', onMouseDown)
        window.addEventListener('mouseup', onMouseUp)
        window.addEventListener('mousemove', onMouseMove)
        canvas.addEventListener('wheel', onWheel, { passive: true })

        return () => {
            window.removeEventListener('keydown', onKeyDown)
            window.removeEventListener('keyup', onKeyUp)
            canvas.removeEventListener('mousedown', onMouseDown)
            window.removeEventListener('mouseup', onMouseUp)
            window.removeEventListener('mousemove', onMouseMove)
            canvas.removeEventListener('wheel', onWheel)
        }
    }, [camera, gl, sensitivity])

    useFrame((_, delta) => {
        const k = keys.current
        if (!k['w'] && !k['s'] && !k['a'] && !k['d'] && !k['q'] && !k['e']) return

        // Kierunek przód — spłaszczony na XZ (ignorujemy pitch)
        camera.getWorldDirection(forward.current)
        forward.current.y = 0
        forward.current.normalize()

        // Kierunek prawo — prostopadły do forward na XZ
        right.current.set(-forward.current.z, 0, forward.current.x)

        // Wektor ruchu
        move.current.set(0, 0, 0)
        if (k['w']) move.current.add(forward.current)
        if (k['s']) move.current.sub(forward.current)
        if (k['d']) move.current.add(right.current)
        if (k['a']) move.current.sub(right.current)
        if (k['e']) move.current.y += 1
        if (k['q']) move.current.y -= 1

        move.current.normalize().multiplyScalar(speed * delta)
        camera.position.add(move.current)
    })

    return null
}
