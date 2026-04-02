import React from 'react'
import { useGLTF } from '@react-three/drei'

export function MonitorSetup(props: any) {
  const { nodes, materials } = useGLTF('/models/monitor_setup.glb') as any
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.Object_4.geometry} material={materials.Material} position={[0, -0.69, 0]} scale={[0.625, 1, 1]} castShadow receiveShadow />
      <mesh geometry={nodes.Object_6.geometry} material={materials['Material.001']} position={[-0.252, 0.225, -0.07]} rotation={[-Math.PI, 0, 2.856]} scale={[-0.05, 0.5, 0.05]} castShadow receiveShadow />
      <mesh geometry={nodes.Object_8.geometry} material={materials['Material.001']} position={[-0.252, 0.225, 0.071]} rotation={[0, 0, 0.286]} scale={[0.05, 0.5, 0.05]} castShadow receiveShadow />
      <mesh geometry={nodes.Object_10.geometry} material={materials['Material.002']} position={[-0.212, 0.5, 0]} scale={[0.05, 0.5, 0.05]} castShadow receiveShadow />
      <mesh geometry={nodes.Object_12.geometry} material={materials['Material.003']} position={[-0.123, 0.95, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.05, 0.1, 0.05]} castShadow receiveShadow />
      <mesh geometry={nodes.Object_14.geometry} material={materials['Material.004']} position={[-0.064, 0.95, 0]} scale={0.07} castShadow receiveShadow />
      <mesh geometry={nodes.Object_16.geometry} material={materials['Material.005']} position={[0, -0.69, 0]} scale={[0.625, 1, 1]} castShadow receiveShadow />
      <mesh geometry={nodes.Object_18.geometry} material={materials['Material.006']} position={[0.361, 0.247, 2.332]} rotation={[0, 0, 1.806]} scale={0.077} castShadow receiveShadow />
      <mesh geometry={nodes.Object_20.geometry} material={materials['Material.007']} position={[0.217, 0.219, 2.332]} rotation={[0, 0, 0.236]} scale={[0.05, 0.08, 0.071]} castShadow receiveShadow />
      <mesh geometry={nodes.Object_22.geometry} material={materials['Material.008']} position={[0.2, 0.458, 2.332]} scale={[0.229, 0.458, 0.229]} castShadow receiveShadow />
      <mesh geometry={nodes.Object_24.geometry} material={materials['Material.006']} position={[0.361, 0.247, -2.33]} rotation={[0, 0, 1.806]} scale={0.077} castShadow receiveShadow />
      <mesh geometry={nodes.Object_26.geometry} material={materials['Material.007']} position={[0.217, 0.219, -2.33]} rotation={[0, 0, 0.236]} scale={[0.05, 0.08, 0.071]} castShadow receiveShadow />
      <mesh geometry={nodes.Object_28.geometry} material={materials['Material.008']} position={[0.2, 0.458, -2.33]} scale={[0.229, 0.458, 0.229]} castShadow receiveShadow />
      <mesh geometry={nodes.Object_30.geometry} material={materials['Material.009']} position={[0.041, 0.313, -1.96]} scale={[-0.006, 0.009, 0.019]} castShadow receiveShadow />
    </group>
  )
}

useGLTF.preload('/models/monitor_setup.glb')
