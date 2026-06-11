import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RoundedBox, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAppContext } from '../context/AppContext';
import { playClickSound, playSlideSound, playPowerBeep } from '../utils/audio';

// Button depression component mimicking precise physical mechanical travel
interface PressableButtonProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  args?: [number, number, number]; // size
  radius?: number; // for rounded box
  color?: string;
  hoverColor?: string;
  onClick?: () => void;
  id?: string;
  name?: string;
  children?: React.ReactNode;
}

export const PressableDeviceButton: React.FC<PressableButtonProps> = ({
  position,
  rotation = [0, 0, 0],
  args = [0.22, 0.22, 0.15],
  radius = 0.05,
  color = '#151515',
  hoverColor = '#222222',
  onClick,
  id,
  name,
  children
}) => {
  const { soundOn, setActiveHotspot, addLog } = useAppContext();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
    if (id) {
      setActiveHotspot(id);
    }
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    setPressed(true);
    if (soundOn) {
      playClickSound(false);
    }
    if (onClick) {
      onClick();
    }
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    setPressed(false);
    if (soundOn) {
      playClickSound(true);
    }
  };

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={pressed ? [0.9, 0.9, 0.9] : hovered ? [1.02, 1.02, 1.02] : [1, 1, 1]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <RoundedBox args={args} radius={radius} smoothness={4} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={pressed ? '#4ade80' : hovered ? hoverColor : color}
          roughness={0.6}
          metalness={0.1}
          clearcoat={0.1}
        />
      </RoundedBox>
      {children}
    </group>
  );
};

// Physical slider switch with drag deactivation, raycasting mapping, and boundary clamping
interface SlideSwitchProps {
  position: [number, number, number];
  onToggle: (on: boolean) => void;
  isOn: boolean;
}

export const PhysicalSlideSwitch: React.FC<SlideSwitchProps> = ({ position, onToggle, isOn }) => {
  const { soundOn, setActiveHotspot } = useAppContext();
  const { controls } = useThree() as any;
  const groupRef = useRef<THREE.Group>(null);
  const [dragging, setDragging] = useState(false);
  const [knobX, setKnobX] = useState(isOn ? 0.15 : -0.15);

  useEffect(() => {
    setKnobX(isOn ? 0.15 : -0.15);
  }, [isOn]);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    setDragging(true);
    if (controls) {
      controls.enabled = false;
    }
    document.body.style.cursor = 'grabbing';
    setActiveHotspot('light_switch');
  };

  const handlePointerMove = (e: any) => {
    if (!dragging) return;
    e.stopPropagation();
    if (groupRef.current) {
      const localPoint = groupRef.current.worldToLocal(e.point.clone());
      const clampedX = Math.max(-0.2, Math.min(0.2, localPoint.x));
      setKnobX(clampedX);
      const currentOn = clampedX > 0;
      if (currentOn !== isOn) {
        onToggle(currentOn);
        if (soundOn) {
          playSlideSound();
        }
      }
    }
  };

  const handlePointerUp = (e: any) => {
    if (!dragging) return;
    e.stopPropagation();
    setDragging(false);
    if (controls) {
      controls.enabled = true;
    }
    document.body.style.cursor = 'auto';
    const finalOn = knobX > 0;
    setKnobX(finalOn ? 0.15 : -0.15);
    onToggle(finalOn);
  };

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = dragging ? 'grabbing' : 'grab';
        setActiveHotspot('light_switch');
      }}
      onPointerOut={(e) => {
        if (!dragging) {
          document.body.style.cursor = 'auto';
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.55, 0.18, 0.08]} />
        <meshPhysicalMaterial color="#0f1112" roughness={0.8} metalness={0.5} />
      </mesh>
      <group position={[knobX, 0, 0.05]}>
        <mesh castShadow>
          <boxGeometry args={[0.16, 0.14, 0.1]} />
          <meshPhysicalMaterial
            color={isOn ? '#4ade80' : '#cfd1d4'}
            emissive={isOn ? '#4ade80' : '#000000'}
            emissiveIntensity={isOn ? 0.7 : 0}
            roughness={0.2}
            metalness={0.6}
          />
        </mesh>
        <mesh position={[0, 0, 0.06]}>
          <boxGeometry args={[0.03, 0.12, 0.02]} />
          <meshBasicMaterial color="#111" />
        </mesh>
      </group>
    </group>
  );
};


export const JoystickModel: React.FC = () => {
  const {
    deviceState,
    setDeviceState,
    lightOn,
    setLightOn,
    activeHotspot,
    setActiveHotspot,
    addLog,
    language
  } = useAppContext();

  const faceplateRef = useRef<THREE.Group>(null);
  
  const stickLRef = useRef<THREE.Group>(null);
  const stickRRef = useRef<THREE.Group>(null);
  
  const [lTilt, setLTilt] = useState({ x: 0, y: 0 });
  const [rTilt, setRTilt] = useState({ x: 0, y: 0 });
  const [lDragging, setLDragging] = useState(false);
  const [rDragging, setRDragging] = useState(false);
  
  const { controls } = useThree() as any;

  useFrame(({ clock }) => {
    if (faceplateRef.current && deviceState !== 'off') {
      const t = clock.getElapsedTime();
      faceplateRef.current.position.y = Math.sin(t * 1.5) * 0.04;
      faceplateRef.current.rotation.y = Math.sin(t * 0.8) * 0.03;
      faceplateRef.current.rotation.x = Math.cos(t * 0.6) * 0.02;

      if (deviceState === 'vibrating') {
        faceplateRef.current.position.x = (Math.random() - 0.5) * 0.05;
        faceplateRef.current.position.y += (Math.random() - 0.5) * 0.05;
        faceplateRef.current.position.z = (Math.random() - 0.5) * 0.05;
      } else {
        faceplateRef.current.position.x = 0;
      }
    }
  });

  const handleLStickDown = (e: any) => {
    e.stopPropagation();
    setLDragging(true);
    if (controls) controls.enabled = false;
    setActiveHotspot('left_stick');
  };

  const handleLStickMove = (e: any) => {
    if (!lDragging) return;
    e.stopPropagation();
    if (stickLRef.current) {
      const local = stickLRef.current.worldToLocal(e.point.clone());
      const x = Math.max(-1, Math.min(1, local.x * 5.0));
      const y = Math.max(-1, Math.min(1, -local.y * 5.0));
      setLTilt({ x, y });
      addLog(
        `LX: ${x.toFixed(2)} | LY: ${y.toFixed(2)}`,
        `ציר סטיק שמאלי - LX: ${x.toFixed(2)} | LY: ${y.toFixed(2)}`
      );
    }
  };

  const handleLStickUp = (e: any) => {
    setLDragging(false);
    if (controls) controls.enabled = true;
    setLTilt({ x: 0, y: 0 });
  };

  const handleRStickDown = (e: any) => {
    e.stopPropagation();
    setRDragging(true);
    if (controls) controls.enabled = false;
    setActiveHotspot('right_stick');
  };

  const handleRStickMove = (e: any) => {
    if (!rDragging) return;
    e.stopPropagation();
    if (stickRRef.current) {
      const local = stickRRef.current.worldToLocal(e.point.clone());
      const x = Math.max(-1, Math.min(1, local.x * 5.0));
      const y = Math.max(-1, Math.min(1, -local.y * 5.0));
      setRTilt({ x, y });
      addLog(
        `RX: ${x.toFixed(2)} | RY: ${y.toFixed(2)}`,
        `ציר סטיק ימני - RX: ${x.toFixed(2)} | RY: ${y.toFixed(2)}`
      );
    }
  };

  const handleRStickUp = (e: any) => {
    setRDragging(false);
    if (controls) controls.enabled = true;
    setRTilt({ x: 0, y: 0 });
  };

  const togglePower = () => {
    if (deviceState === 'off') {
      setDeviceState('idle');
      addLog('Controller turned ON (Home selector active)', 'הבקר הופעל (לחצן בית דלוק)');
      playPowerBeep(true);
    } else {
      setDeviceState('off');
      addLog('Controller turned OFF', 'הבקר כובה');
      playPowerBeep(false);
    }
  };

  // True black aesthetics inspired by the reference image
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: '#0a0a0a', // Deep matte black faceplate
    roughness: 0.65,
    metalness: 0.25,
    clearcoat: 0.05,
    clearcoatRoughness: 0.4
  });

  const gripRubberMaterial = new THREE.MeshPhysicalMaterial({
    color: '#020202', // Darker stippled grips
    roughness: 0.95,
    metalness: 0.05,
    clearcoat: 0.0,
    bumpScale: 0.1,
  });

  const neonLEDMaterial = new THREE.MeshBasicMaterial({
    color: lightOn && deviceState !== 'off' ? '#4ade80' : '#14311c'
  });

  return (
    <group ref={faceplateRef} position={[0, 0, 0]}>
      {/* 1. LEFT GRIP HANDLE (TEXTURIZED EMBEDDED DUAL-SPHERE BASE FOR THICKNESS) */}
      <group position={[-1.25, -0.6, 0.0]} rotation={[0.1, 0.1, Math.PI / 6.5]}>
        <mesh castShadow receiveShadow material={deviceState !== 'off' ? gripRubberMaterial : bodyMaterial}>
          <capsuleGeometry args={[0.42, 1.1, 16, 16]} />
        </mesh>
      </group>

      {/* 2. RIGHT GRIP HANDLE */}
      <group position={[1.25, -0.6, 0.0]} rotation={[0.1, -0.1, -Math.PI / 6.5]}>
        <mesh castShadow receiveShadow material={deviceState !== 'off' ? gripRubberMaterial : bodyMaterial}>
          <capsuleGeometry args={[0.42, 1.1, 16, 16]} />
        </mesh>
      </group>

      {/* 3. CORE FRONT BODY (ERGONOMIC FLAT ROUNDED BRIDGE) */}
      <RoundedBox args={[2.5, 1.5, 0.65]} radius={0.3} smoothness={4} castShadow receiveShadow>
        <primitive object={bodyMaterial} attach="material" />
      </RoundedBox>

      {/* 4. UPPER BRIDGE BACKING */}
      <group position={[0, 0.5, -0.15]}>
        <mesh castShadow receiveShadow material={bodyMaterial}>
          <boxGeometry args={[1.8, 0.4, 0.4]} />
        </mesh>
      </group>

      {/* 5. CAPACITIVE TOUCHPAD PLATED HOUSING (Top Center, Deep Black, Red Text) */}
      <group position={[0, 0.58, 0.28]} rotation={[-0.05, 0, 0]}>
        {/* Under-plate recessed rim outline */}
        <mesh receiveShadow position={[0, 0, -0.01]}>
           <boxGeometry args={[1.48, 0.62, 0.04]} />
           <meshPhysicalMaterial color="#050505" roughness={0.8} />
        </mesh>

        <mesh
          castShadow
          receiveShadow
          onPointerOver={() => setActiveHotspot('touchpad')}
        >
          {/* Main touchpad plastic */}
          <boxGeometry args={[1.44, 0.6, 0.04]} />
          <meshPhysicalMaterial
            color="#090909"
            roughness={0.4}
            metalness={0.1}
            clearcoat={0.15}
          />
        </mesh>
        
        {/* Silk-screen Xtrike red branding */}
        <Html transform scale={0.1} position={[0, 0.12, 0.025]} className="pointer-events-none select-none">
          <div 
            className="font-display font-black text-center tracking-widest pointer-events-none"
            style={{ 
              color: '#d62d2d', 
              fontSize: '18px',
              fontFamily: "'Trebuchet MS', sans-serif",
              letterSpacing: '1px'
            }}
          >
            XTRIKE ME
          </div>
        </Html>
      </group>

      {/* 6. SELECT AND START OPTION PILLS (Left and Right of Touchpad) */}
      <group position={[-1.0, 0.6, 0.3]} rotation={[0, 0, 0.2]}>
        <PressableDeviceButton
          position={[0, 0, 0]}
          args={[0.08, 0.18, 0.15]}
          radius={0.02}
          color="#151515"
          onClick={() => addLog('Share/Select button pressed', 'נלחץ מקש Share/Select')}
        />
        <Html transform position={[0, 0.15, 0.07]} scale={0.05} className="pointer-events-none">
          <div className="text-white text-[10px] font-bold">|||</div>
        </Html>
      </group>

      <group position={[1.0, 0.6, 0.3]} rotation={[0, 0, -0.2]}>
        <PressableDeviceButton
          position={[0, 0, 0]}
          args={[0.08, 0.18, 0.15]}
          radius={0.02}
          color="#151515"
          onClick={() => addLog('Options/Start button pressed', 'נלחץ מקש Options/Start')}
        />
        <Html transform position={[0, 0.15, 0.07]} scale={0.05} className="pointer-events-none">
          <div className="text-white text-[10px] font-bold">≡</div>
        </Html>
      </group>

      {/* 7. MIDDLE SECTION: SPEAKER V-CUTS, HOME, TURBO */}
      <group position={[0, 0.05, 0.325]}>
        {/* V-shaped Speaker/LED Slits */}
        <group position={[0, 0.08, 0.01]}>
           <mesh position={[-0.15, 0, 0]} rotation={[0, 0, -0.5]}>
             <boxGeometry args={[0.1, 0.02, 0.02]} />
             <meshBasicMaterial color="#000" />
           </mesh>
           <mesh position={[0, 0, 0]}>
             <boxGeometry args={[0.08, 0.02, 0.02]} />
             <meshBasicMaterial color="#000" />
           </mesh>
           <mesh position={[0.15, 0, 0]} rotation={[0, 0, 0.5]}>
             <boxGeometry args={[0.1, 0.02, 0.02]} />
             <meshBasicMaterial color="#000" />
           </mesh>
        </group>

        {/* Glossy Home Button Area */}
        <group position={[0, -0.12, 0]}>
           {/* Recessed Glossy Ring */}
           <mesh position={[0, 0, 0.01]}>
             <cylinderGeometry args={[0.18, 0.18, 0.02, 32]} />
             <meshPhysicalMaterial color="#080808" roughness={0.1} metalness={0.9} clearcoat={1.0} />
             <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
               {/* Just to angle the cylinder correctly if needed, but wait: cylinder is oriented along Y by default */}
             </mesh>
           </mesh>

           <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.015]}>
             <PressableDeviceButton
               position={[0, 0.02, 0]}
               args={[0.26, 0.1, 0.26]}
               radius={0.13}
               color="#151515"
               id="home_button"
               onClick={togglePower}
             >
               <Html transform position={[0, -0.06, 0]} rotation={[-Math.PI/2, 0, 0]} scale={0.06} className="pointer-events-none select-none">
                 <div className="flex items-center justify-center w-[20px] h-[20px] bg-white rounded-[4px] shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                   {/* Home House Icon inside white rounded rect */}
                   <span className="text-[#000] text-[12px] leading-none mb-[2px]">⌂</span>
                 </div>
               </Html>
             </PressableDeviceButton>
           </group>
        </group>

        {/* Turbo Button */}
        <group position={[0, -0.38, 0.01]}>
           <PressableDeviceButton
             position={[0, 0, 0]}
             args={[0.25, 0.08, 0.08]}
             radius={0.04}
             color="#1c1f22"
             id="turbo_button"
             onClick={() => {
               if (deviceState === 'off') return;
               if (deviceState === 'turbo') {
                 setDeviceState('idle');
                 addLog('Turbo mode DEACTIVATED', 'מצב טורבו בוטל');
               } else {
                 setDeviceState('turbo');
                 addLog('Turbo mode ENABLED', 'מצב טורבו הופעל - מוכן לירי מהיר');
               }
             }}
           />
           <Html transform position={[0, -0.08, 0.03]} scale={0.045} className="pointer-events-none">
             <span className="font-sans text-gray-400 opacity-90 uppercase tracking-widest font-bold">
               TURBO
             </span>
           </Html>
        </group>
      </group>

      {/* 8. DETAILED JOYSTICKS (Left and Right) */}
      <group
        ref={stickLRef}
        position={[-0.55, -0.25, 0.33]}
        onPointerDown={handleLStickDown}
        onPointerMove={handleLStickMove}
        onPointerUp={handleLStickUp}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'grab';
          setActiveHotspot('left_stick');
        }}
        onPointerOut={(e) => {
          if (!lDragging) document.body.style.cursor = 'auto';
        }}
      >
        {/* Recessed joystick collar housing */}
        <mesh receiveShadow rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.08, 32]} />
          <meshPhysicalMaterial color="#080808" roughness={0.9} />
        </mesh>

        {/* Joystick stem shaft tilting visual */}
        <group rotation={[lTilt.y * 0.3, 0, lTilt.x * 0.3]}>
          {/* Stem handle rod */}
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.1]}>
            <cylinderGeometry args={[0.1, 0.1, 0.2, 16]} />
            <meshPhysicalMaterial color="#222" metalness={0.6} roughness={0.3} />
          </mesh>

          {/* Texturized thumbpad top */}
          <mesh position={[0, 0, 0.2]} castShadow rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.26, 0.22, 0.1, 32]} />
            <meshPhysicalMaterial color="#111" roughness={0.8} bumpScale={0.05} />
          </mesh>
          <mesh position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
            {/* Outer grip ridge ring */}
            <torusGeometry args={[0.22, 0.03, 16, 32]} />
            <meshPhysicalMaterial color="#0a0a0a" roughness={0.9} />
          </mesh>
        </group>
      </group>

      {/* RIGHT JOYSTICK ASSEMBLY */}
      <group
        ref={stickRRef}
        position={[0.55, -0.25, 0.33]}
        onPointerDown={handleRStickDown}
        onPointerMove={handleRStickMove}
        onPointerUp={handleRStickUp}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'grab';
          setActiveHotspot('right_stick');
        }}
        onPointerOut={(e) => {
          if (!rDragging) document.body.style.cursor = 'auto';
        }}
      >
        <mesh receiveShadow rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.08, 32]} />
          <meshPhysicalMaterial color="#080808" roughness={0.9} />
        </mesh>

        <group rotation={[rTilt.y * 0.3, 0, rTilt.x * 0.3]}>
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.1]}>
            <cylinderGeometry args={[0.1, 0.1, 0.2, 16]} />
            <meshPhysicalMaterial color="#222" metalness={0.6} roughness={0.3} />
          </mesh>

          <mesh position={[0, 0, 0.2]} castShadow rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.26, 0.22, 0.1, 32]} />
            <meshPhysicalMaterial color="#111" roughness={0.8} bumpScale={0.05} />
          </mesh>
          <mesh position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.22, 0.03, 16, 32]} />
            <meshPhysicalMaterial color="#0a0a0a" roughness={0.9} />
          </mesh>
        </group>
      </group>

      {/* 9. TACTILE DIRECTIONAL PAD (Left Side Cross) */}
      <group position={[-0.9, 0.18, 0.32]}>
        {/* D-Pad Circular Base plate */}
        <mesh receiveShadow rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.35, 0.38, 0.04, 32]} />
          <meshPhysicalMaterial color="#050505" />
        </mesh>
        
        {/* Actual cross piece */}
        <group position={[0, 0, 0.02]}>
          <PressableDeviceButton
            position={[0, 0, 0]}
            args={[0.54, 0.15, 0.06]}
            radius={0.02}
            id="dpad"
            color="#111"
            onClick={() => addLog('D-Pad horizontal pressed', 'לחיצה על צלב הכיוונים האופקי')}
          />
          <PressableDeviceButton
            position={[0, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
            args={[0.54, 0.15, 0.06]}
            radius={0.02}
            id="dpad"
            color="#111"
            onClick={() => addLog('D-Pad vertical pressed', 'לחיצה על צלב הכיוונים האנכי')}
          />
          {/* Center indent of Dpad */}
          <mesh position={[0, 0, 0.03]}>
            <circleGeometry args={[0.08, 16]} />
            <meshBasicMaterial color="#090909" />
          </mesh>
        </group>
      </group>

      {/* 10. ACTION KEY PADS (Right Side) */}
      <group position={[0.9, 0.18, 0.32]}>
        {/* Plate housing collar */}
        <mesh receiveShadow rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.35, 0.38, 0.04, 32]} />
          <meshPhysicalMaterial color="#050505" />
        </mesh>

        <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.02]}>
          {/* Triangle Top */}
          <PressableDeviceButton
            position={[0, 0, -0.18]}
            args={[0.2, 0.1, 0.2]}
            radius={0.1}
            onClick={() => addLog('Action BUTTON: △ pressed', 'נלחץ מקש פעולה: △')}
            id="action_buttons"
          >
            <Html transform position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.08} className="pointer-events-none">
              <span className="font-display font-black text-[#eaeaea] select-none text-[13px] leading-none">△</span>
            </Html>
          </PressableDeviceButton>

          {/* Circle Right */}
          <PressableDeviceButton
            position={[0.18, 0, 0]}
            args={[0.2, 0.1, 0.2]}
            radius={0.1}
            onClick={() => addLog('Action BUTTON: ◯ pressed', 'נלחץ מקש פעולה: ◯')}
            id="action_buttons"
          >
            <Html transform position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.08} className="pointer-events-none">
              <span className="font-display font-black text-[#eaeaea] select-none text-[13px] leading-none">◯</span>
            </Html>
          </PressableDeviceButton>

          {/* Cross Bottom */}
          <PressableDeviceButton
            position={[0, 0, 0.18]}
            args={[0.2, 0.1, 0.2]}
            radius={0.1}
            onClick={() => addLog('Action BUTTON: ╳ pressed', 'נלחץ מקש פעולה: ╳')}
            id="action_buttons"
          >
            <Html transform position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.08} className="pointer-events-none">
              <span className="font-display font-black text-[#eaeaea] select-none text-[13px] leading-none">╳</span>
            </Html>
          </PressableDeviceButton>

          {/* Square Left */}
          <PressableDeviceButton
            position={[-0.18, 0, 0]}
            args={[0.2, 0.1, 0.2]}
            radius={0.1}
            onClick={() => addLog('Action BUTTON: ▢ pressed', 'נלחץ מקש פעולה: ▢')}
            id="action_buttons"
          >
            <Html transform position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.08} className="pointer-events-none">
              <span className="font-display font-black text-[#eaeaea] select-none text-[13px] leading-none">▢</span>
            </Html>
          </PressableDeviceButton>
        </group>
      </group>

      {/* 11. UNDERSIDE UTILITIES & TRIGGERS */}
      <group position={[0, -0.16, -0.32]} rotation={[0, Math.PI, 0]}>
        <Html transform position={[0, 0.16, 0.07]} scale={0.05} className="pointer-events-none select-none">
          <div className="text-gray-500 font-mono text-[8px] flex items-center gap-7">
            <span>OFF</span>
            <span>LED LIGHT</span>
            <span>ON</span>
          </div>
        </Html>
        <PhysicalSlideSwitch
          position={[0, 0, 0.05]}
          isOn={lightOn}
          onToggle={(on) => {
            setLightOn(on);
            addLog(`LED light system toggled: ${on ? 'ON' : 'OFF'}`, `תאורת לד אחורית שונתה: ${on ? 'מופעל' : 'כבוי'}`);
          }}
        />
      </group>

      {/* BACK M1 & M2 PADDLES */}
      <group position={[-0.7, -0.15, -0.25]} rotation={[0.1, -0.2, 0]}>
        <PressableDeviceButton
          position={[0, 0, 0]}
          args={[0.3, 0.14, 0.08]}
          radius={0.03}
          id="paddles"
          onClick={() => addLog('Rear M1 trigger clicked', 'לחצן מאקרו אחורי M1 הופעל')}
          color="#1b1c20"
        >
          <Html transform position={[0, 0, 0.05]} scale={0.07} className="pointer-events-none">
            <span className="font-mono text-[8px] text-gray-400 font-bold">M1</span>
          </Html>
        </PressableDeviceButton>
      </group>

      <group position={[0.7, -0.15, -0.25]} rotation={[0.1, 0.2, 0]}>
        <PressableDeviceButton
          position={[0, 0, 0]}
          args={[0.3, 0.14, 0.08]}
          radius={0.03}
          id="paddles"
          onClick={() => addLog('Rear M2 trigger clicked', 'לחצן מאקרו אחורי M2 הופעל')}
          color="#1b1c20"
        >
          <Html transform position={[0, 0, 0.05]} scale={0.07} className="pointer-events-none">
            <span className="font-mono text-[8px] text-gray-400 font-bold">M2</span>
          </Html>
        </PressableDeviceButton>
      </group>

      {/* 12. TOP BUMPERS AND USB-C */}
      <group position={[0, 0.69, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.34, 0.12, 0.05]} />
          <meshPhysicalMaterial color="#0c0e0f" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.015]}>
          <boxGeometry args={[0.26, 0.07, 0.015]} />
          <meshPhysicalMaterial color="#cfd1d4" roughness={0.2} metalness={0.9} />
        </mesh>
        <mesh
          position={[0, 0, 0.04]}
          onPointerOver={() => setActiveHotspot('usb_port')}
        >
          <boxGeometry args={[0.4, 0.15, 0.05]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      </group>

      <group position={[-0.95, 0.64, -0.15]} rotation={[0.4, 0.1, 0.15]}>
        <PressableDeviceButton
          position={[0, 0, 0]}
          args={[0.45, 0.18, 0.2]}
          radius={0.05}
          id="usb_port"
          onClick={() => addLog('L1 Bumper pressed', 'לחצן כתף שמאלי L1 נלחץ')}
          color="#0d0e10"
        >
          <Html transform position={[0, 0, 0.11]} scale={0.07} className="pointer-events-none">
            <span className="font-mono text-[10px] text-gray-500 font-bold">L1</span>
          </Html>
        </PressableDeviceButton>
      </group>

      <group position={[0.95, 0.64, -0.15]} rotation={[0.4, -0.1, -0.15]}>
        <PressableDeviceButton
          position={[0, 0, 0]}
          args={[0.45, 0.18, 0.2]}
          radius={0.05}
          id="usb_port"
          onClick={() => addLog('R1 Bumper pressed', 'לחצן כתף ימני R1 נלחץ')}
          color="#0d0e10"
        >
          <Html transform position={[0, 0, 0.11]} scale={0.07} className="pointer-events-none">
            <span className="font-mono text-[10px] text-gray-500 font-bold">R1</span>
          </Html>
        </PressableDeviceButton>
      </group>

    </group>
  );
};
