import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useAppContext } from '../context/AppContext';
import { playClickSound, playSlideSound, playPowerBeep } from '../utils/audio';

export const JoystickModel: React.FC = () => {
  const {
    deviceState,
    setDeviceState,
    lightOn,
    setLightOn,
    activeHotspot,
    setActiveHotspot,
    addLog,
    soundOn,
    displayMode
  } = useAppContext();

  const { controls } = useThree() as any;

  // 1. LOAD BOTH THE PHOTOREAL SCAN AND DYNAMIC BLENDER MODELS
  const { scene: rawScanScene } = useGLTF('/models/gp53.glb');
  const { scene: rawBlenderScene } = useGLTF('/models/gp53_blender.glb');

  // Refs for scene groups to perform global hovering and vibration noise on
  const mainGroupRef = useRef<THREE.Group>(null);

  const scanScene = useMemo(() => {
    const cloned = rawScanScene.clone();
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Standardize to 1.85 units wide
    const scaleFactor = 1.85 / maxDim;
    cloned.scale.setScalar(scaleFactor);
    
    const center = new THREE.Vector3();
    box.getCenter(center);
    // Center perfectly at local scene origin
    cloned.position.sub(center.multiplyScalar(scaleFactor));
    
    // Shadow support & raw materials
    cloned.traverse((node: any) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    return cloned;
  }, [rawScanScene]);

  const blenderScene = useMemo(() => {
    const cloned = rawBlenderScene.clone();
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Match photoreal scan sizing exactly
    const scaleFactor = 1.85 / maxDim;
    cloned.scale.setScalar(scaleFactor);
    
    const center = new THREE.Vector3();
    box.getCenter(center);
    cloned.position.sub(center.multiplyScalar(scaleFactor));
    
    // --- FAITHFUL PHYSICAL BUTTON DETAILS PIXEL-PERFECT FIXES ---
    // Fix triangle icon local pivot translation (loaded at global origin in raw asset)
    const iconTri = cloned.getObjectByName('button_triangle_icon');
    if (iconTri) {
      iconTri.position.set(0, 0, 0.11);
    }
    // Disable or hide redundant crescent-style circle icon cutout to secure a solid clean circle Symbol
    const iconCircCutout = cloned.getObjectByName('button_circle_icon_cutout');
    if (iconCircCutout) {
      iconCircCutout.visible = false;
    }
    
    // Shadow support & Material tuning to secure a state-of-the-art cinematic look
    cloned.traverse((node: any) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        
        if (node.material) {
          const mat = node.material.clone() as THREE.MeshPhysicalMaterial;
          node.material = mat;

          // Apply gorgeous high-end plastic stippling/materials directly
          const name = node.name.toLowerCase();
          if (name.includes('body_front_shell') || name.includes('handle_bulge') || name.includes('body_side_wall')) {
            mat.color.set('#0b0d0e');
            mat.roughness = 0.5;
            mat.metalness = 0.15;
            mat.clearcoat = 0.04;
            mat.clearcoatRoughness = 0.5;
          } else if (name.includes('rubber') || name.includes('grip') || name.includes('grain')) {
            mat.color.set('#030304');
            mat.roughness = 0.95;
            mat.metalness = 0.02;
          } else if (name === 'dpad_up' || name === 'dpad_down' || name === 'dpad_left' || name === 'dpad_right') {
            // Elegant satin metallic keys contrasting with the dark circular dish base
            mat.color.set('#3a3f44');
            mat.roughness = 0.25;
            mat.metalness = 0.45;
            mat.clearcoat = 0.3;
          } else if (name.includes('dpad')) {
            // High visibility dark anthracite styling for the navigation dish
            mat.color.set('#111315');
            mat.roughness = 0.65;
            mat.metalness = 0.1;
          } else if (name === 'button_triangle' || name === 'button_square' || name === 'button_circle' || name === 'button_cross') {
            // Ultra premium mirror glossy action key bases
            mat.color.set('#121315');
            mat.roughness = 0.12;
            mat.metalness = 0.35;
            mat.clearcoat = 0.9;
            mat.clearcoatRoughness = 0.05;
          } else if (name.includes('button') || name.includes('well')) {
            mat.color.set('#0f1113');
            mat.roughness = 0.25;
            mat.metalness = 0.2;
            mat.clearcoat = 0.5;
            mat.clearcoatRoughness = 0.1;
          } else if (name.includes('touchpad') || name.includes('recess')) {
            mat.color.set('#070809');
            mat.roughness = 0.4;
            mat.metalness = 0.05;
            mat.clearcoat = 0.1;
          } else if (name.includes('logo') || name.includes('spur')) {
            mat.color.set('#e11d48');
            mat.roughness = 0.2;
            mat.emissive.set('#e11d48');
            mat.emissiveIntensity = 2.0;
          }
        }
      }
    });

    return cloned;
  }, [rawBlenderScene]);

  // Index sub-meshes for O(1) animation access
  const blenderParts = useMemo(() => {
    const parts: Record<string, THREE.Object3D> = {};
    blenderScene.traverse((node) => {
      if (node.isObject3D) {
        parts[node.name] = node;
      }
    });
    return parts;
  }, [blenderScene]);

  // 3. MOTION INPUT & PRESS STATE VARIABLES
  const [lTilt, setLTilt] = useState({ x: 0, y: 0 });
  const [rTilt, setRTilt] = useState({ x: 0, y: 0 });
  const [lDragging, setLDragging] = useState(false);
  const [rDragging, setRDragging] = useState(false);

  // Tracks active depressed button offsets
  const [pressedButtons, setPressedButtons] = useState<Record<string, boolean>>({});

  // 4. NODE DETECTOR TO SYNC CODES TO HOVER WIDGETS
  const getHotspotIdFromNodeName = (name: string): string | null => {
    const n = name.toLowerCase();
    if (n.includes('stick_left')) return 'left_stick';
    if (n.includes('stick_right')) return 'right_stick';
    if (n.includes('dpad')) return 'dpad';
    if (n.includes('button_triangle') || n.includes('button_circle') || n.includes('button_cross') || n.includes('button_square')) return 'action_buttons';
    if (n.includes('home')) return 'home_button';
    if (n.includes('turbo')) return 'turbo_button';
    if (n.includes('light_button') || n.includes('light_icon')) return 'light_switch';
    if (n.includes('m1_') || n.includes('m2_') || n.includes('paddle')) return 'paddles';
    if (n.includes('usb') || n.includes('u_cutout')) return 'usb_port';
    if (n.includes('logo') || n.includes('touchpad')) return 'touchpad';
    return null;
  };

  // 5. ANIMATE EVERY FRAME
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Constant cinematic idle breath & vibration engine
    if (mainGroupRef.current) {
      if (deviceState !== 'off') {
        const floatSpeed = deviceState === 'calibrating' ? 3.0 : 1.5;
        const floatHeave = deviceState === 'calibrating' ? 0.08 : 0.03;
        mainGroupRef.current.position.y = Math.sin(t * floatSpeed) * floatHeave;
        mainGroupRef.current.rotation.y = Math.sin(t * 0.7) * 0.025;
        mainGroupRef.current.rotation.x = Math.cos(t * 0.5) * 0.015;

        if (deviceState === 'vibrating') {
          // Double intensity tactile shake
          mainGroupRef.current.position.x = (Math.random() - 0.5) * 0.045;
          mainGroupRef.current.position.y += (Math.random() - 0.5) * 0.045;
          mainGroupRef.current.position.z = (Math.random() - 0.5) * 0.045;
        } else {
          mainGroupRef.current.position.x = 0;
        }
      } else {
        // Slowly rest to absolute dead floor center when turned off
        mainGroupRef.current.position.set(0, THREE.MathUtils.lerp(mainGroupRef.current.position.y, -0.05, 0.1), 0);
        mainGroupRef.current.rotation.set(0, 0, 0);
      }
    }

    // Interactive Model Mesh animations (sticks tilt, buttons push, LEDs flare)
    if (displayMode === 'interactive') {
      // Smoothly tilt analogues with rubber elastic dampening
      const stickLeft = blenderParts['stick_left_cap'];
      if (stickLeft) {
        stickLeft.rotation.x = THREE.MathUtils.lerp(stickLeft.rotation.x, lTilt.y * 0.35, 0.2);
        // Tilt Z matches horizontal steer
        stickLeft.rotation.z = THREE.MathUtils.lerp(stickLeft.rotation.z, -lTilt.x * 0.35, 0.2);
      }

      const stickRight = blenderParts['stick_right_cap'];
      if (stickRight) {
        stickRight.rotation.x = THREE.MathUtils.lerp(stickRight.rotation.x, rTilt.y * 0.35, 0.2);
        stickRight.rotation.z = THREE.MathUtils.lerp(stickRight.rotation.z, -rTilt.x * 0.35, 0.2);
      }

      // Smooth mechanical key travel for clicked elements (push along button normal -Y)
      const pressableKeys = [
        'button_triangle', 'button_circle', 'button_cross', 'button_square',
        'dpad_up', 'dpad_down', 'dpad_left', 'dpad_right',
        'home_button', 'turbo_button', 'm1_button', 'm2_button'
      ];

      pressableKeys.forEach((key) => {
        const node = blenderParts[key];
        if (node) {
          const isPressed = pressedButtons[key];
          // Depress slightly on Y axis (towards the printed board inside)
          const targetY = isPressed ? -0.05 : 0;
          node.position.y = THREE.MathUtils.lerp(node.position.y, targetY, 0.25);
        }
      });

      // LED BACKPLATE INDICATORS & STEER WELL GLOW RINGS
      const activeLEDs = deviceState !== 'off' && lightOn;
      const glowRingColor = deviceState === 'turbo' 
        ? new THREE.Color('#fbbf24') // Turbo rapid amber
        : deviceState === 'calibrating'
          ? new THREE.Color('#3b82f6') // Calibrating deep neon-blue
          : new THREE.Color('#22c55e'); // Green default gaming state

      // Left & Right LED circles plus bottom panel trim bars glow
      const meshLEDNodes = [
        'stick_left_led_ring',
        'stick_right_led_ring',
        'led_frame_left',
        'led_frame_bottom',
        'led_frame_right'
      ];

      meshLEDNodes.forEach((name) => {
        const mesh = blenderParts[name] as THREE.Mesh;
        if (mesh && mesh.material) {
          const mat = mesh.material as THREE.MeshPhysicalMaterial;
          mat.emissive = activeLEDs ? glowRingColor : new THREE.Color('#142a1a');
          mat.emissiveIntensity = activeLEDs ? 2.5 : 0.05;
        }
      });

      // Dynamic PlayStation PlayStation button brand glows
      const iconTri = blenderParts['button_triangle_icon'] as THREE.Mesh;
      if (iconTri && iconTri.material) {
        const mat = iconTri.material as THREE.MeshPhysicalMaterial;
        mat.emissive = activeLEDs ? new THREE.Color('#4ade80') : new THREE.Color('#1e1e1e');
        mat.emissiveIntensity = activeLEDs ? 3.0 : 0.01;
        mat.color = activeLEDs ? new THREE.Color('#4ade80') : new THREE.Color('#888888');
      }

      ['button_square_icon_0', 'button_square_icon_1', 'button_square_icon_2', 'button_square_icon_3'].forEach(name => {
        const iconSqr = blenderParts[name] as THREE.Mesh;
        if (iconSqr && iconSqr.material) {
          const mat = iconSqr.material as THREE.MeshPhysicalMaterial;
          mat.emissive = activeLEDs ? new THREE.Color('#f472b6') : new THREE.Color('#1e1e1e');
          mat.emissiveIntensity = activeLEDs ? 3.0 : 0.01;
          mat.color = activeLEDs ? new THREE.Color('#f472b6') : new THREE.Color('#888888');
        }
      });

      const iconCirc = blenderParts['button_circle_icon'] as THREE.Mesh;
      if (iconCirc && iconCirc.material) {
        const mat = iconCirc.material as THREE.MeshPhysicalMaterial;
        mat.emissive = activeLEDs ? new THREE.Color('#f87171') : new THREE.Color('#1e1e1e');
        mat.emissiveIntensity = activeLEDs ? 3.0 : 0.01;
        mat.color = activeLEDs ? new THREE.Color('#f87171') : new THREE.Color('#888888');
      }

      ['button_cross_icon_a', 'button_cross_icon_b'].forEach(name => {
        const iconCrs = blenderParts[name] as THREE.Mesh;
        if (iconCrs && iconCrs.material) {
          const mat = iconCrs.material as THREE.MeshPhysicalMaterial;
          mat.emissive = activeLEDs ? new THREE.Color('#60a5fa') : new THREE.Color('#1e1e1e');
          mat.emissiveIntensity = activeLEDs ? 3.0 : 0.01;
          mat.color = activeLEDs ? new THREE.Color('#60a5fa') : new THREE.Color('#888888');
        }
      });

      // Red central Touchpad glow logo (pulsing effect when idle / vibrating)
      const logoNodes = ['xtrike_red_logo', 'xtrike_logo_x_upper', 'xtrike_logo_x_lower', 'xtrike_logo_x_left_spur'];
      const logoColor = deviceState !== 'off' ? new THREE.Color('#ef4444') : new THREE.Color('#310b0b');
      const pulseMultiplier = deviceState === 'vibrating' 
        ? 1.0 + Math.sin(t * 24.0) * 0.4 // high frequency pulse
        : deviceState === 'turbo'
          ? 1.0 + Math.sin(t * 12.0) * 0.25
          : 0.8 + Math.sin(t * 2.5) * 0.15; // smooth breath pulse

      logoNodes.forEach((name) => {
        const mesh = blenderParts[name] as THREE.Mesh;
        if (mesh && mesh.material) {
          const mat = mesh.material as THREE.MeshPhysicalMaterial;
          mat.emissive = logoColor;
          mat.emissiveIntensity = deviceState !== 'off' ? 2.2 * pulseMultiplier : 0.02;
        }
      });

      // Rear slides button slider translation
      const slideBtn = blenderParts['light_button'];
      if (slideBtn) {
        const targetX = lightOn ? 0.06 : -0.06;
        slideBtn.position.x = THREE.MathUtils.lerp(slideBtn.position.x, targetX, 0.2);
      }
    }
  });

  // 6. RAYCAST HANDLERS FOR MOUSE INGESTION (Analog dragging & tactile hits)
  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    const name = e.object.name || '';
    const hsId = getHotspotIdFromNodeName(name);
    
    if (hsId) {
      setActiveHotspot(hsId);
    }

    if (deviceState === 'off' && !name.includes('home_button')) {
      addLog('Wake the controller up with the Home button first', 'יש להעיר את הבקר בעזרת לחצן הבית תחילה');
      return;
    }

    // Left analog steer mode engagement
    if (name.includes('stick_left')) {
      setLDragging(true);
      if (controls) controls.enabled = false;
      return;
    }

    // Right analog steer mode engagement
    if (name.includes('stick_right')) {
      setRDragging(true);
      if (controls) controls.enabled = false;
      return;
    }

    // Detect clicked parts of interest
    let pressedKey: string | null = null;
    let logEn = '';
    let logHe = '';

    if (name.includes('button_triangle')) {
      pressedKey = 'button_triangle';
      logEn = 'Action BUTTON: △ pressed';
      logHe = 'נלחץ מקש פעולה: △';
    } else if (name.includes('button_circle')) {
      pressedKey = 'button_circle';
      logEn = 'Action BUTTON: ◯ pressed';
      logHe = 'נלחץ מקש פעולה: ◯';
    } else if (name.includes('button_cross')) {
      pressedKey = 'button_cross';
      logEn = 'Action BUTTON: ╳ pressed';
      logHe = 'נלחץ מקש פעולה: ╳';
    } else if (name.includes('button_square')) {
      pressedKey = 'button_square';
      logEn = 'Action BUTTON: ▢ pressed';
      logHe = 'נלחץ מקש פעולה: ▢';
    } else if (name.includes('dpad_up')) {
      pressedKey = 'dpad_up';
      logEn = 'D-Pad: UP arrow pressed';
      logHe = 'לחיצה על צלב הכיוונים: למעלה';
    } else if (name.includes('dpad_down')) {
      pressedKey = 'dpad_down';
      logEn = 'D-Pad: DOWN arrow pressed';
      logHe = 'לחיצה על צלב הכיוונים: למטה';
    } else if (name.includes('dpad_left')) {
      pressedKey = 'dpad_left';
      logEn = 'D-Pad: LEFT arrow pressed';
      logHe = 'לחיצה על צלב הכיוונים: שמאלה';
    } else if (name.includes('dpad_right')) {
      pressedKey = 'dpad_right';
      logEn = 'D-Pad: RIGHT arrow pressed';
      logHe = 'לחיצה על צלב הכיוונים: ימינה';
    } else if (name.includes('home_button')) {
      pressedKey = 'home_button';
      if (deviceState === 'off') {
        setDeviceState('idle');
        logEn = 'Controller powered UP (Mode LED activated)';
        logHe = 'הבקר הופעל בהצלחה (נורת בקרה דולקת)';
        playPowerBeep(true);
      } else {
        setDeviceState('off');
        logEn = 'Controller entered SLEEP MODE';
        logHe = 'הבקר הועבר למצב שינה';
        playPowerBeep(false);
      }
    } else if (name.includes('turbo_button')) {
      pressedKey = 'turbo_button';
      const targetState = deviceState === 'turbo' ? 'idle' : 'turbo';
      setDeviceState(targetState);
      logEn = targetState === 'turbo' ? 'Turbo fire mode ENABLED' : 'Turbo fire mode DEACTIVATED';
      logHe = targetState === 'turbo' ? 'מצב טורבו ירי מהיר פעיל' : 'מצב טורבו הופסק';
    } else if (name.includes('light_button')) {
      pressedKey = 'light_button';
      const nextLight = !lightOn;
      setLightOn(nextLight);
      logEn = `LED lighting system toggled: ${nextLight ? 'ON' : 'OFF'}`;
      logHe = `בורר תאורה שונה בגב: ${nextLight ? 'פעיל' : 'כבוי'}`;
      if (soundOn) playSlideSound();
    } else if (name.includes('m1_button')) {
      pressedKey = 'm1_button';
      logEn = 'Rear paddle M1 triggered';
      logHe = 'לחצן מאקרו אחורי M1 הופעל';
    } else if (name.includes('m2_button')) {
      pressedKey = 'm2_button';
      logEn = 'Rear paddle M2 triggered';
      logHe = 'לחצן מאקרו אחורי M2 הופעל';
    }

    if (pressedKey) {
      setPressedButtons((prev) => ({ ...prev, [pressedKey!]: true }));
      if (soundOn) playClickSound(false);
      if (logEn) addLog(logEn, logHe);
    }
  };

  const handlePointerMove = (e: any) => {
    const name = e.object.name || '';
    const hsId = getHotspotIdFromNodeName(name);

    if (hsId && !lDragging && !rDragging) {
      // Synchronize 3D hovering to sidebar highlights instantly
      setActiveHotspot(hsId);
    }

    if (lDragging && blenderGroupRef.current) {
      // Steer Left Analog
      const local = blenderGroupRef.current.worldToLocal(e.point.clone());
      const dx = Math.max(-1, Math.min(1, (local.x + 0.35) * 5.0));
      const dy = Math.max(-1, Math.min(1, (local.y + 0.2) * 5.0));
      setLTilt({ x: dx, y: dy });
      addLog(`Analog Left - LX: ${dx.toFixed(2)} | LY: ${dy.toFixed(2)}`, `סטיק שמאלי - LX: ${dx.toFixed(2)} | LY: ${dy.toFixed(2)}`);
    }

    if (rDragging && blenderGroupRef.current) {
      // Steer Right Analog
      const local = blenderGroupRef.current.worldToLocal(e.point.clone());
      const dx = Math.max(-1, Math.min(1, (local.x - 0.35) * 5.0));
      const dy = Math.max(-1, Math.min(1, (local.y + 0.2) * 5.0));
      setRTilt({ x: dx, y: dy });
      addLog(`Analog Right - RX: ${dx.toFixed(2)} | RY: ${dy.toFixed(2)}`, `סטיק ימני - RX: ${dx.toFixed(2)} | LY: ${dy.toFixed(2)}`);
    }
  };

  const handlePointerUp = () => {
    setLDragging(false);
    setRDragging(false);
    if (controls) controls.enabled = true;
    setLTilt({ x: 0, y: 0 });
    setRTilt({ x: 0, y: 0 });

    // Release all depressed keys with organic clack audio feedback
    setPressedButtons((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k]) {
          next[k] = false;
          if (soundOn) playClickSound(true);
        }
      });
      return next;
    });
  };

  const blenderGroupRef = useRef<THREE.Group>(null);
  const scanGroupRef = useRef<THREE.Group>(null);

  return (
    <group
      ref={mainGroupRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerOver={(e) => {
        e.stopPropagation();
        const hoveredName = e.object.name || '';
        const hs = getHotspotIdFromNodeName(hoveredName);
        if (hs) {
          setActiveHotspot(hs);
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        if (!lDragging && !rDragging) {
          document.body.style.cursor = 'auto';
        }
      }}
    >
      {/* RENDER THE USER'S CHOSEN FIDELITY MODEL NATIVELY AS EXCLUSIVE ONLY ONE COHESIVE OBJECT */}
      {displayMode === 'interactive' ? (
        <group ref={blenderGroupRef}>
          <primitive object={blenderScene} />
        </group>
      ) : (
        <group ref={scanGroupRef}>
          <primitive object={scanScene} />
        </group>
      )}
    </group>
  );
};
