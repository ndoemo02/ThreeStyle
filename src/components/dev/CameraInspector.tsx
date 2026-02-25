import { useCallback } from 'react'
import { useThree } from '@react-three/fiber'
import { useControls, button } from 'leva'
import * as THREE from 'three'

/**
 * Komponent wewnątrz <Canvas> pozwalający na eksport obecnych koordynatów kamery 
 * za pomocą jednego kliknięcia w menu Leva, bez obciążania pętli renderowania.
 */
export function CameraInspector() {
    const { camera } = useThree()

    const generateSnippet = useCallback(() => {
        const p = camera.position
        const r = camera.rotation

        const px = +p.x.toFixed(2)
        const py = +p.y.toFixed(2)
        const pz = +p.z.toFixed(2)

        const rx = +(r.x * (180 / Math.PI)).toFixed(2)
        const ry = +(r.y * (180 / Math.PI)).toFixed(2)
        const rz = +(r.z * (180 / Math.PI)).toFixed(2)

        return `camera={{ position: [${px}, ${py}, ${pz}], fov: ${camera instanceof THREE.PerspectiveCamera ? camera.fov : 45} }}
// rotation (deg): [${rx}, ${ry}, ${rz}]`
    }, [camera])

    // Zamiast renderować ciągle wartości, mamy guzik logujący i kopiujący koordynaty.
    useControls('📍 Koordynaty Kamery', () => ({
        '📋 Kopiuj / Konsola': button(() => {
            const snippet = generateSnippet()
            console.log("Cordsy Kamery:\n" + snippet)
            navigator.clipboard.writeText(snippet).then(() => {
                alert('✅ Skopiowano do schowka!\n\n' + snippet)
            }).catch(e => console.error("Clipboard error:", e))
        }),
    }))

    return null
}
