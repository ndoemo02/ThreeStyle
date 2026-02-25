/**
 * Świecące paski LED — listwy przylegające do ścian i podłogi.
 * Układ: tylna ściana (dolna krawędź) + boki podłogi (lewy/prawy).
 */
export function LedStrips({
    leftColor = '#00f0ff',
    rightColor = '#ff00aa',
    leftIntensity = 80,
    rightIntensity = 80,
    height = -1.9,
}: {
    leftColor?: string
    rightColor?: string
    leftIntensity?: number
    rightIntensity?: number
    height?: number
}) {
    // Pozycja Y tuż nad podłogą (podłoga jest na y=-2)
    const y = height

    return (
        <group>

            {/* ================================================ */}
            {/*  TYLNA ŚCIANA — pasek na dole, wzdłuż osi X     */}
            {/*  Ściana jest na z=-8, więc pasek na z=-7.95      */}
            {/* ================================================ */}
            <group position={[0, y, -7.95]}>
                {/* Fizyczny pasek — długi, cienki, świecący */}
                <mesh>
                    <boxGeometry args={[20, 0.06, 0.04]} />
                    <meshStandardMaterial
                        color={leftColor}
                        emissive={leftColor}
                        emissiveIntensity={5}
                        toneMapped={false}
                    />
                </mesh>
                {/* Światło na beton */}
                <pointLight
                    color={leftColor}
                    intensity={leftIntensity}
                    distance={6}
                    decay={2}
                />
            </group>

            {/* ================================================ */}
            {/*  LEWA KRAWĘDŹ PODŁOGI — pasek wzdłuż osi Z      */}
            {/*  Biegnie od tylnej ściany (z=-8) do przodu (z=5) */}
            {/* ================================================ */}

            {/* Segment tylny */}
            <group position={[-14.9, y, -4]}>
                <mesh>
                    <boxGeometry args={[0.04, 0.06, 8]} />
                    <meshStandardMaterial
                        color={leftColor}
                        emissive={leftColor}
                        emissiveIntensity={5}
                        toneMapped={false}
                    />
                </mesh>
                <pointLight
                    color={leftColor}
                    intensity={leftIntensity * 0.7}
                    distance={5}
                    decay={2}
                />
            </group>

            {/* Segment przedni */}
            <group position={[-14.9, y, 3]}>
                <mesh>
                    <boxGeometry args={[0.04, 0.06, 6]} />
                    <meshStandardMaterial
                        color={leftColor}
                        emissive={leftColor}
                        emissiveIntensity={5}
                        toneMapped={false}
                    />
                </mesh>
                <pointLight
                    color={leftColor}
                    intensity={leftIntensity * 0.5}
                    distance={4}
                    decay={2}
                />
            </group>

            {/* ================================================ */}
            {/*  PRAWA KRAWĘDŹ PODŁOGI — pasek wzdłuż osi Z     */}
            {/* ================================================ */}

            {/* Segment tylny */}
            <group position={[14.9, y, -4]}>
                <mesh>
                    <boxGeometry args={[0.04, 0.06, 8]} />
                    <meshStandardMaterial
                        color={rightColor}
                        emissive={rightColor}
                        emissiveIntensity={5}
                        toneMapped={false}
                    />
                </mesh>
                <pointLight
                    color={rightColor}
                    intensity={rightIntensity * 0.7}
                    distance={5}
                    decay={2}
                />
            </group>

            {/* Segment przedni */}
            <group position={[14.9, y, 3]}>
                <mesh>
                    <boxGeometry args={[0.04, 0.06, 6]} />
                    <meshStandardMaterial
                        color={rightColor}
                        emissive={rightColor}
                        emissiveIntensity={5}
                        toneMapped={false}
                    />
                </mesh>
                <pointLight
                    color={rightColor}
                    intensity={rightIntensity * 0.5}
                    distance={4}
                    decay={2}
                />
            </group>

            {/* ================================================ */}
            {/*  NAROŻNIKI — łączenie tylnej ściany z bokami     */}
            {/* ================================================ */}

            {/* Lewy narożnik (tylna ściana + lewa krawędź) */}
            <group position={[-14.9, y, -7.95]}>
                <pointLight
                    color={leftColor}
                    intensity={leftIntensity * 0.3}
                    distance={4}
                    decay={2}
                />
            </group>

            {/* Prawy narożnik (tylna ściana + prawa krawędź) */}
            <group position={[14.9, y, -7.95]}>
                <pointLight
                    color={rightColor}
                    intensity={rightIntensity * 0.3}
                    distance={4}
                    decay={2}
                />
            </group>

        </group>
    )
}
