/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { AppProvider, useAppContext } from './context/AppContext';
import { JoystickModel } from './components/JoystickModel';
import { Hotspot } from './components/Hotspot';
import { UIOverlay } from './components/UIOverlay';
import { TutorialModal } from './components/TutorialModal';

// Dynamic cinematic camera guide coordinating smooth translations during tours
const CameraDirector: React.FC = () => {
  const { tutorialStep, tutorialSteps, tutorialMode } = useAppContext();
  const { camera, controls } = useThree() as any;

  const targetPosition = useMemo(() => {
    if (tutorialMode && tutorialSteps[tutorialStep]) {
      const step = tutorialSteps[tutorialStep];
      if (step.cameraLoc) {
        return new THREE.Vector3(step.cameraLoc[0], step.cameraLoc[1], step.cameraLoc[2]);
      }
    }
    // Default cinematic inspection angle
    return new THREE.Vector3(0, 0.8, 2.8);
  }, [tutorialStep, tutorialMode, tutorialSteps]);

  // Track the current active lerping targets
  const prevTarget = useRef<THREE.Vector3>(new THREE.Vector3());
  const lerping = useRef(false);
  const startTime = useRef(0);

  useEffect(() => {
    if (!prevTarget.current.equals(targetPosition)) {
      prevTarget.current.copy(targetPosition);
      lerping.current = true;
      startTime.current = performance.now();
    }
  }, [targetPosition]);

  // Cancel lerping instantly as soon as the user interacts with OrbitControls manually
  useEffect(() => {
    if (controls) {
      const handleStart = () => {
        lerping.current = false;
      };
      controls.addEventListener('start', handleStart);
      return () => {
        controls.removeEventListener('start', handleStart);
      };
    }
  }, [controls]);

  useFrame(() => {
    if (lerping.current) {
      const elapsed = performance.now() - startTime.current;
      if (elapsed > 1800) {
        // Cut off lerp after 1.8 seconds to avoid locking user rotation
        lerping.current = false;
        return;
      }

      // Smoothly slide the camera
      camera.position.lerp(targetPosition, 0.08);

      // Stop once we get close
      if (camera.position.distanceTo(targetPosition) < 0.01) {
        camera.position.copy(targetPosition);
        lerping.current = false;
      }

      if (controls) {
        controls.update();
      }
    }
  });

  return null;
};

// Scene contents wrapping model, custom lights and reactive dynamic nodes
const SceneContents: React.FC = () => {
  const { hotspots, deviceState } = useAppContext();

  return (
    <>
      <CameraDirector />

      {/* Manual Premium Studio Lighting System */}
      <ambientLight intensity={deviceState !== 'off' ? 0.35 : 0.15} />
      
      {/* Front Soft Spot */}
      <spotLight
        position={[0, 4, 6]}
        angle={0.4}
        penumbra={1}
        intensity={deviceState !== 'off' ? 4.0 : 0.8}
        castShadow
        shadow-bias={-0.001}
      />

      {/* Back Rim Highlights */}
      <directionalLight
        position={[-3, 2, -5]}
        intensity={deviceState !== 'off' ? 2.5 : 0.5}
        color="#a7f3d0" // Subtle cold emerald green rim bleed
      />
      <directionalLight
        position={[3, 2, -5]}
        intensity={deviceState !== 'off' ? 2.5 : 0.5}
        color="#ffffff"
      />

      {/* Fill lights */}
      <directionalLight position={[5, -1, 2]} intensity={0.6} />

      {/* The detailed GP-53 hardware model assembly */}
      <group position={[0, -0.1, 0]}>
        <JoystickModel />

        {/* Dynamic visual annotations floating in 3D coordinate space */}
        {hotspots.map((hs) => (
          <Hotspot key={hs.id} hotspot={hs} />
        ))}
      </group>

      {/* Standard Studio Environment Map to render premium gloss reflections */}
      <Environment preset="studio" />
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <div className="relative w-screen h-screen bg-[#0d0f10] overflow-hidden select-none select-none">
        
        {/* Subtle background tech ambient gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(74,222,128,0.06)_0%,transparent_75%)] pointer-events-none" />

        {/* 1. Full Screen WebGL Canvas */}
        <Canvas
          shadows
          gl={{ localClippingEnabled: true }}
          camera={{ position: [0, 0.8, 2.8], fov: 45 }}
          className="absolute inset-0 z-10 w-full h-full"
        >
          <SceneContents />

          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            enablePan={false}
            minDistance={1.6}
            maxDistance={4.2}
            makeDefault
          />
        </Canvas>

        {/* 2. Glassmorphic 3D walkthrough modals */}
        <TutorialModal />

        {/* 3. Global HUD and Diagnostic Logs Layer */}
        <UIOverlay />
      </div>
    </AppProvider>
  );
}
