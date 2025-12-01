import React, { useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useGraph } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, useGLTF, Loader, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { FaceData } from '../types';

interface FaceMeshProps {
  faceData: FaceData | null;
}

// Verified Ready Player Me Avatar URL with ARKit support
const AVATAR_URL = "https://models.readyplayer.me/658be9e8fc8bec93d06806f3.glb?morphTargets=ARKit&textureAtlas=1024";

// Mapping for potential naming differences if needed, 
// though standard ARKit names usually match MediaPipe.
const BLENDSHAPE_MAP: Record<string, string> = {
  // 'MediaPipeName': 'ModelMorphTargetName'
  // Usually 1:1, but useful for debugging or specific models
};

const Avatar: React.FC<FaceMeshProps> = ({ faceData }) => {
  const { scene } = useGLTF(AVATAR_URL);
  const { nodes } = useGraph(scene);
  const headRef = useRef<THREE.Group>(null);

  // Analyze the model once loaded to find meshes with morph targets
  // and create a lookup map for faster access during the frame loop
  const targetMap = useMemo(() => {
    const map: Array<{
      mesh: THREE.Mesh;
      dictionary: Record<string, number>; // Normalized Name -> Index
    }> = [];

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
          console.log(`Mesh ${mesh.name} has ${Object.keys(mesh.morphTargetDictionary).length} morph targets.`);
          
          // Create a normalized dictionary (strip prefixes, handle case)
          const dict: Record<string, number> = {};
          Object.entries(mesh.morphTargetDictionary).forEach(([key, index]) => {
            // Remove common prefixes like "ARKit.", "blendShape1."
            const cleanKey = key.replace(/^.*?\./, ''); 
            const idx = index as number;
            dict[cleanKey] = idx;
            // Also store original just in case
            dict[key] = idx;
          });
          
          map.push({ mesh, dictionary: dict });
        }
      }
    });
    return map;
  }, [scene]);

  useFrame(() => {
    if (!faceData) {
        // Optional: Lerp back to neutral if no face detected
        return;
    }

    // 1. Apply Blend Shapes (Facial Expression)
    faceData.blendshapes.forEach((blendShape) => {
      const name = blendShape.categoryName;
      const score = blendShape.score;

      targetMap.forEach(({ mesh, dictionary }) => {
        // Try to find the index using the clean name
        const index = dictionary[name];

        if (index !== undefined && mesh.morphTargetInfluences) {
          // Smoothly interpolate current value to new value
          mesh.morphTargetInfluences[index] = THREE.MathUtils.lerp(
            mesh.morphTargetInfluences[index],
            score,
            0.5
          );
        }
      });
    });

    // 2. Apply Head Pose (Rotation)
    if (headRef.current && faceData.transformMatrix && faceData.transformMatrix.length === 16) {
        const matrix = new THREE.Matrix4();
        matrix.fromArray(faceData.transformMatrix);

        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        
        matrix.decompose(position, quaternion, scale);
        
        // Apply rotation
        headRef.current.quaternion.slerp(quaternion, 0.3);
    }
  });

  return (
    <primitive 
        object={scene} 
        ref={headRef}
        position={[0, -1.5, 0]} 
        scale={1.1} // Adjusted scale to fit screen better
    />
  );
};

const LoadingAvatar = () => (
    <mesh visible={true} position={[0, 0, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#333" wireframe opacity={0.2} transparent />
    </mesh>
);

export const FaceCanvas: React.FC<FaceMeshProps> = ({ faceData }) => {
  return (
    <div className="w-full h-full bg-gradient-to-b from-gray-900 via-[#0a0a10] to-black relative">
      <Canvas shadows gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}>
        {/* Adjusted Camera for better framing */}
        <PerspectiveCamera makeDefault position={[0, 0, 0.6]} fov={45} />

        <ambientLight intensity={0.4} color="#ffffff" />
        <spotLight position={[2, 2, 2]} angle={0.5} penumbra={0.5} intensity={2} color="#ffecd1" castShadow />
        <spotLight position={[-2, 1, 2]} angle={0.5} penumbra={1} intensity={1} color="#d1e8ff" />
        <spotLight position={[0, 2, -2]} angle={0.8} penumbra={1} intensity={3} color="#00f0ff" />

        <Suspense fallback={<LoadingAvatar />}>
            <Avatar faceData={faceData} />
        </Suspense>

        <ContactShadows opacity={0.4} scale={10} blur={2.5} far={4} color="#000000" />
        <Environment preset="city" blur={0.8} />
        
        <OrbitControls 
            enablePan={false} 
            minPolarAngle={Math.PI / 2.5} 
            maxPolarAngle={Math.PI / 1.8}
            minAzimuthAngle={-Math.PI / 4}
            maxAzimuthAngle={Math.PI / 4}
            minDistance={0.4}
            maxDistance={1.5}
            target={[0, 0, 0]}
        />
      </Canvas>
      <Loader 
        containerStyles={{ background: 'rgba(0,0,0,0.8)' }} 
        innerStyles={{ background: '#333', width: '200px' }} 
        barStyles={{ background: '#00f0ff', height: '4px' }}
        dataInterpolation={(p) => `Loading Avatar ${p.toFixed(0)}%`}
      />
    </div>
  );
};