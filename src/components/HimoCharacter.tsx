import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, PerspectiveCamera, OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

interface HimoCharacterProps {
  isListening: boolean;
  isSpeaking: boolean;
}

function Scene({ isListening, isSpeaking }: HimoCharacterProps) {
  const sphereRef = useRef<THREE.Mesh>(null);
  
  // Dynamic distortion based on state
  const distortAmount = isSpeaking ? 0.6 : isListening ? 0.4 : 0.2;
  const speedAmount = isSpeaking ? 2 : isListening ? 1.5 : 1;

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
      
      <Float
        speed={2} 
        rotationIntensity={0.5} 
        floatIntensity={0.5} 
      >
        <Sphere ref={sphereRef} args={[1, 64, 64]}>
          <MeshDistortMaterial
            color={isSpeaking ? "#ec4899" : isListening ? "#06b6d4" : "#8b5cf6"}
            speed={speedAmount}
            distort={distortAmount}
            radius={1}
            emissive={isSpeaking ? "#ec4899" : isListening ? "#06b6d4" : "#8b5cf6"}
            emissiveIntensity={0.5}
            roughness={0.2}
            metalness={0.8}
          />
        </Sphere>
        
        {/* Core Glow */}
        <mesh scale={[1.2, 1.2, 1.2]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial 
            color={isSpeaking ? "#ec4899" : isListening ? "#06b6d4" : "#8b5cf6"} 
            transparent 
            opacity={0.05} 
            wireframe 
          />
        </mesh>

        {/* Eyes (Stylized & Animated) */}
        <group position={[0, 0.2, 0.9]}>
          <mesh position={[-0.3, 0, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="white" emissive="white" emissiveIntensity={2} />
          </mesh>
          <mesh position={[0.3, 0, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="white" emissive="white" emissiveIntensity={2} />
          </mesh>
        </group>
      </Float>

      <ContactShadows 
        position={[0, -2, 0]} 
        opacity={0.4} 
        scale={10} 
        blur={2.5} 
        far={4} 
      />
      <Environment preset="city" />
    </>
  );
}

export default function HimoCharacter({ isListening, isSpeaking }: HimoCharacterProps) {
  return (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center relative cursor-grab active:cursor-grabbing">
      <Canvas shadows>
        <Scene isListening={isListening} isSpeaking={isSpeaking} />
      </Canvas>
      <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-8">
        <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest">
           Himo AI • Interactive 3D Mode
        </div>
      </div>
    </div>
  );
}
