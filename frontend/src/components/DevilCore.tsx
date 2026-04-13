import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Float, Box, Cylinder, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface DevilCoreProps {
  isThinking: boolean;
  isSpeaking: boolean;
  mode: 'core' | 'sphere' | 'car';
  handData?: {
    x: number;
    y: number;
    pinchDist: number;
    gesture: string;
  };
}

const DevilCar = () => {
  return (
    <group>
      {/* Body */}
      <Box args={[1.5, 0.5, 3]} position={[0, 0.4, 0]}>
        <meshStandardMaterial color="#333" metalness={1} roughness={0.1} />
      </Box>
      <Box args={[1.2, 0.6, 1.5]} position={[0, 0.9, -0.2]}>
        <meshStandardMaterial color="#ffd700" metalness={1} roughness={0} />
      </Box>
      {/* Wheels */}
      {[[-0.8, 0.2, 1], [0.8, 0.2, 1], [-0.8, 0.2, -1], [0.8, 0.2, -1]].map((pos, i) => (
        <Cylinder key={i} args={[0.3, 0.3, 0.2, 16]} position={pos as any} rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial color="#111" />
        </Cylinder>
      ))}
      {/* Lights */}
      <Box args={[0.4, 0.1, 0.1]} position={[0.4, 0.4, 1.5]}>
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={2} />
      </Box>
      <Box args={[0.4, 0.1, 0.1]} position={[-0.4, 0.4, 1.5]}>
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={2} />
      </Box>
    </group>
  );
};

const DevilCore = ({ isThinking, isSpeaking, mode, handData }: DevilCoreProps) => {
  const groupRef = useRef<THREE.Group>(null!);
  const contentRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // 1. Handle Scale (Pinch or Thinking state)
    let targetScale = 1;
    if (isThinking) targetScale = 1.5 + Math.sin(time * 10) * 0.2;
    else if (isSpeaking) targetScale = 1.2 + Math.sin(time * 5) * 0.1;
    
    // Gesture Override: Pinch to Zoom
    if (handData && handData.gesture === 'pinch') {
      targetScale = THREE.MathUtils.lerp(0.5, 3, handData.pinchDist * 4);
    }
    
    const scaleVec = new THREE.Vector3(targetScale, targetScale, targetScale);
    if (groupRef.current) {
      groupRef.current.scale.lerp(scaleVec, 0.1);
    }

    // 2. Handle Rotation (Manual or Automatic)
    if (contentRef.current) {
      if (handData && handData.gesture !== 'none') {
        const targetRotY = (handData.x - 0.5) * Math.PI * 2;
        const targetRotX = (handData.y - 0.5) * Math.PI;
        contentRef.current.rotation.y = THREE.MathUtils.lerp(contentRef.current.rotation.y, targetRotY, 0.12);
        contentRef.current.rotation.x = THREE.MathUtils.lerp(contentRef.current.rotation.x, targetRotX, 0.12);
      } else {
        contentRef.current.rotation.y += 0.005;
        contentRef.current.rotation.x = THREE.MathUtils.lerp(contentRef.current.rotation.x, Math.sin(time * 0.5) * 0.2, 0.05);
      }
    }
  });

  return (
    <>
      <OrbitControls enablePan={false} minDistance={2} maxDistance={15} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={2} color="#ffd700" />
      <pointLight position={[-10, -5, -5]} intensity={1} color="#ff8c00" />
      
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <group ref={groupRef}>
          <group ref={contentRef}>
            {mode === 'core' && (
              <>
                <Sphere args={[1, 64, 64]}>
                  <MeshDistortMaterial
                    color={isThinking ? "#ffd700" : "#d4af37"}
                    speed={isThinking ? 5 : 2}
                    distort={isThinking ? 0.6 : 0.3}
                    radius={1}
                    metalness={0.9}
                    roughness={0.1}
                    emissive={isThinking ? "#ff8c00" : "#b8860b"}
                    emissiveIntensity={isThinking ? 1 : 0.5}
                  />
                </Sphere>
                <Box args={[1.5, 1.5, 1.5]}>
                  <meshStandardMaterial 
                    color="#ffd700" 
                    wireframe 
                    transparent 
                    opacity={0.3}
                  />
                </Box>
              </>
            )}

            {mode === 'sphere' && (
              <Sphere args={[1.2, 64, 64]}>
                <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.1} />
              </Sphere>
            )}

            {mode === 'car' && <DevilCar />}
          </group>
        </group>
      </Float>
    </>
  );
};

export default DevilCore;
