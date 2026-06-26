import React from 'react'
import { useGLTF } from '@react-three/drei'

export function EditingTable(props: any) {
    const { nodes, materials } = useGLTF('/models/optimized/editing_table.glb') as any
    return (
        <group {...props} dispose={null}>
            <group rotation={[-Math.PI / 2, 0, 0]} scale={0.063}>
                <group rotation={[Math.PI / 2, 0, 0]}>
                    <mesh geometry={nodes.Mouse_mat_Matte_Black_0.geometry} material={materials.Matte_Black} castShadow receiveShadow />
                    
                    {/* HIDDEN ORIGINAL SCREENS */}
                    {/* <mesh geometry={nodes.Screen_B_Shiny_Black_0.geometry} material={materials.Shiny_Black} castShadow receiveShadow />
                    <mesh geometry={nodes.Screen_B_Screen_0.geometry} material={materials.Screen} castShadow receiveShadow />
                    <mesh geometry={nodes.Screen_A_White_Shiny_0.geometry} material={materials.White_Shiny} castShadow receiveShadow />
                    <mesh geometry={nodes.Screen_A_Screen_0.geometry} material={materials.Screen} castShadow receiveShadow />
                    <mesh geometry={nodes.Screen_C_Shiny_Black_0.geometry} material={materials.Shiny_Black} castShadow receiveShadow />
                    <mesh geometry={nodes.Screen_C_Screen_0.geometry} material={materials.Screen} castShadow receiveShadow /> */}
                    
                    <mesh geometry={nodes.Main_Table_Wood_0.geometry} material={materials.Wood} castShadow receiveShadow />
                    <mesh geometry={nodes.Main_Table_Matte_Black_0.geometry} material={materials.Matte_Black} castShadow receiveShadow />
                    <mesh geometry={nodes.Main_Table_Pegs_Texture_0.geometry} material={materials.Pegs_Texture} castShadow receiveShadow />
                </group>
            </group>
        </group>
    )
}

useGLTF.preload('/models/optimized/editing_table.glb')
