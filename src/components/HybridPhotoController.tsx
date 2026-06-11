import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useAppContext } from '../context/AppContext';
import { playClickSound, playPowerBeep, playSlideSound } from '../utils/audio';
import frontDepth from '../../public/photo-controller/front-depth.json';

type ButtonSpec = {
  id: string;
  image?: string;
  kind?: 'dpad' | 'stick' | 'action' | 'pill' | 'flat';
  x: number;
  y: number;
  w: number;
  h: number;
  logEn: string;
  logHe: string;
  hotspot: string;
};

const IMAGE_W = 1086;
const IMAGE_H = 1448;
const PLANE_W = 2.78;
const PLANE_H = PLANE_W * (IMAGE_H / IMAGE_W);
const FRONT_Z = 0.118;
const BUTTON_Z = 0.188;
const BACK_Z = -0.118;

const FRONT_BUTTONS: ButtonSpec[] = [
  { id: 'dpad', image: 'dpad.png', x: 176, y: 468, w: 178, h: 172, logEn: 'D-Pad cross key pressed', logHe: 'נלחץ מקש צלב הכיוונים', hotspot: 'dpad' },
  { id: 'left_stick', image: 'left-stick.png', x: 320, y: 622, w: 166, h: 166, logEn: 'Left analog stick engaged', logHe: 'הסטיק האנלוגי השמאלי הופעל', hotspot: 'left_stick' },
  { id: 'right_stick', image: 'right-stick.png', x: 610, y: 622, w: 166, h: 166, logEn: 'Right analog stick engaged', logHe: 'הסטיק האנלוגי הימני הופעל', hotspot: 'right_stick' },
  { id: 'triangle', image: 'triangle.png', x: 768, y: 468, w: 92, h: 92, logEn: 'Action button: triangle', logHe: 'נלחץ מקש פעולה: משולש', hotspot: 'action_buttons' },
  { id: 'square', image: 'square.png', x: 704, y: 536, w: 92, h: 92, logEn: 'Action button: square', logHe: 'נלחץ מקש פעולה: ריבוע', hotspot: 'action_buttons' },
  { id: 'circle', image: 'circle.png', x: 840, y: 536, w: 102, h: 92, logEn: 'Action button: circle', logHe: 'נלחץ מקש פעולה: עיגול', hotspot: 'action_buttons' },
  { id: 'cross', image: 'cross.png', x: 772, y: 604, w: 100, h: 100, logEn: 'Action button: cross', logHe: 'נלחץ מקש פעולה: איקס', hotspot: 'action_buttons' },
  { id: 'home_button', x: 510, y: 678, w: 56, h: 56, logEn: 'Home button toggled', logHe: 'נלחץ כפתור הבית', hotspot: 'home_button' },
  { id: 'turbo_button', x: 500, y: 735, w: 88, h: 34, logEn: 'Turbo rapid mode toggled', logHe: 'מצב טורבו הופעל או כובה', hotspot: 'turbo_button' },
];

const BACK_HITS: ButtonSpec[] = [
  { id: 'm1_button', x: 252, y: 690, w: 126, h: 90, logEn: 'Rear macro M1 triggered', logHe: 'כפתור מאקרו אחורי M1 הופעל', hotspot: 'paddles' },
  { id: 'm2_button', x: 708, y: 690, w: 126, h: 90, logEn: 'Rear macro M2 triggered', logHe: 'כפתור מאקרו אחורי M2 הופעל', hotspot: 'paddles' },
  { id: 'light_button', x: 516, y: 650, w: 70, h: 42, logEn: 'Rear LIGHT slider toggled', logHe: 'מתג התאורה האחורי הוזז', hotspot: 'light_switch' },
];

function imageToPlane(x: number, y: number, w: number, h: number) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return {
    x: (cx / IMAGE_W - 0.5) * PLANE_W,
    y: (0.5 - cy / IMAGE_H) * PLANE_H,
    w: (w / IMAGE_W) * PLANE_W,
    h: (h / IMAGE_H) * PLANE_H,
  };
}

function tuneTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
}

function createConvexPhotoGeometry(width: number, height: number, direction: 1 | -1) {
  const geometry = new THREE.PlaneGeometry(width, height, 72, 72);
  const position = geometry.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i) / (width / 2);
    const y = position.getY(i) / (height / 2);
    const r = Math.min(1, Math.sqrt(x * x * 0.7 + y * y * 0.35));
    const shoulderDrop = Math.max(0, Math.abs(x) - 0.55) * 0.025;
    const convex = 0.035 * (1 - r * r) - shoulderDrop;
    position.setZ(i, convex * direction);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function sampleDepth(u: number, v: number) {
  const map = frontDepth as { w: number; h: number; data: number[][] };
  const x = Math.max(0, Math.min(map.w - 1, Math.round(u * (map.w - 1))));
  const y = Math.max(0, Math.min(map.h - 1, Math.round(v * (map.h - 1))));
  return map.data[y]?.[x] ?? 0;
}

function createReliefPhotoGeometry(width: number, height: number) {
  const geometry = new THREE.PlaneGeometry(width, height, 118, 156);
  const position = geometry.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < position.count; i += 1) {
    const localX = position.getX(i);
    const localY = position.getY(i);
    const u = localX / width + 0.5;
    const v = 0.5 - localY / height;
    const depth = sampleDepth(u, v);
    const x = localX / (width / 2);
    const y = localY / (height / 2);
    const broadCurve = 0.018 * (1 - Math.min(1, x * x * 0.55 + y * y * 0.28));
    position.setZ(i, FRONT_Z + broadCurve + depth * 0.12);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function buttonKind(spec: ButtonSpec) {
  if (spec.kind) return spec.kind;
  if (spec.id.includes('stick')) return 'stick';
  if (spec.id === 'dpad') return 'dpad';
  if (spec.id.includes('button') || spec.id === 'turbo_button') return 'pill';
  return 'action';
}

const PhotoSkin: React.FC<{
  texture: THREE.Texture;
  side: 'front' | 'back';
  shade?: THREE.Texture;
  highlight?: THREE.Texture;
}> = ({ texture, side, shade, highlight }) => {
  const direction = side === 'front' ? 1 : -1;
  const geometry = useMemo(
    () => (side === 'front' ? createReliefPhotoGeometry(PLANE_W, PLANE_H) : createConvexPhotoGeometry(PLANE_W, PLANE_H, direction)),
    [direction, side]
  );

  return (
    <group>
    <mesh
      geometry={geometry}
      position={[0, 0, side === 'front' ? 0 : BACK_Z]}
      rotation={side === 'front' ? [0, 0, 0] : [0, Math.PI, 0]}
      renderOrder={1}
    >
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.02}
        side={THREE.FrontSide}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
      {side === 'front' && shade && (
        <mesh geometry={geometry} position={[0, 0, 0.006]} renderOrder={3}>
          <meshBasicMaterial
            map={shade}
            transparent
            opacity={0.42}
            alphaTest={0.01}
            side={THREE.FrontSide}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
      )}
      {side === 'front' && highlight && (
        <mesh geometry={geometry} position={[0, 0, 0.009]} renderOrder={4}>
          <meshBasicMaterial
            map={highlight}
            transparent
            opacity={0.22}
            alphaTest={0.01}
            side={THREE.FrontSide}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
};

const SilhouetteVolume: React.FC<{ silhouette: THREE.Texture; rim: THREE.Texture }> = ({ silhouette, rim }) => {
  const geometry = useMemo(() => createConvexPhotoGeometry(PLANE_W, PLANE_H, 1), []);
  const layers = useMemo(() => Array.from({ length: 16 }, (_, i) => i), []);

  return (
    <group renderOrder={0}>
      {layers.map((index) => {
        const t = index / Math.max(1, layers.length - 1);
        const z = BACK_Z + t * (FRONT_Z - BACK_Z);
        const edgeScale = 1 + Math.sin(t * Math.PI) * 0.018;
        const opacity = 0.16 + Math.sin(t * Math.PI) * 0.08;
        return (
          <mesh
            key={index}
            geometry={geometry}
            position={[0, 0, z]}
            scale={[edgeScale, edgeScale, 1]}
            renderOrder={0}
          >
            <meshBasicMaterial
              map={silhouette}
              transparent
              opacity={opacity}
              alphaTest={0.03}
              depthWrite={false}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        );
      })}
      <mesh geometry={geometry} position={[0, 0, FRONT_Z + 0.006]} scale={[1.006, 1.006, 1]} renderOrder={2}>
        <meshBasicMaterial
          map={rim}
          transparent
          opacity={0.38}
          alphaTest={0.02}
          depthWrite={false}
          depthTest={false}
          side={THREE.FrontSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

const ShellModel: React.FC = () => {
  const { scene: rawScene } = useGLTF('/photo-controller/gp53-shell.glb');

  const shell = useMemo(() => {
    const cloned = rawScene.clone();
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const targetWidth = 2.22;
    const scale = targetWidth / Math.max(size.x, 0.001);
    cloned.scale.setScalar(scale);
    cloned.position.sub(center.multiplyScalar(scale));
    cloned.position.y -= 0.02;

    const shellMat = new THREE.MeshStandardMaterial({
      color: '#010101',
      roughness: 0.92,
      metalness: 0.02,
      envMapIntensity: 0.04,
    });

    cloned.traverse((node: any) => {
      if (node.isMesh) {
        node.material = shellMat;
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    return cloned;
  }, [rawScene]);

  return <primitive object={shell} />;
};

const ButtonHardware: React.FC<{ spec: ButtonSpec; mapped: ReturnType<typeof imageToPlane>; pressed: boolean }> = ({ spec, mapped, pressed }) => {
  const kind = buttonKind(spec);
  const radius = Math.max(mapped.w, mapped.h) * 0.54;
  const pressOffset = pressed ? -0.028 : 0;

  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#030303',
    roughness: 0.48,
    metalness: 0.04,
    envMapIntensity: 0.7,
  }), []);

  const rubberMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#070707',
    roughness: 0.88,
    metalness: 0.01,
    envMapIntensity: 0.25,
  }), []);

  const edgeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#151515',
    roughness: 0.36,
    metalness: 0.08,
    envMapIntensity: 0.9,
  }), []);

  if (kind === 'pill') {
    return (
      <group position={[0, 0, pressOffset - 0.012]}>
        <RoundedBox args={[mapped.w * 0.88, mapped.h * 0.66, 0.045]} radius={Math.min(mapped.w, mapped.h) * 0.18} smoothness={8}>
          <primitive object={bodyMat} attach="material" />
        </RoundedBox>
      </group>
    );
  }

  if (kind === 'stick') {
    return (
      <group position={[0, 0, pressOffset - 0.032]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={edgeMat} castShadow receiveShadow>
          <cylinderGeometry args={[radius * 0.98, radius * 1.08, 0.052, 64, 1, false]} />
        </mesh>
        <mesh position={[0, 0, 0.028]} material={rubberMat} castShadow receiveShadow>
          <torusGeometry args={[radius * 0.56, radius * 0.105, 24, 72]} />
        </mesh>
        <mesh position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]} material={rubberMat} castShadow receiveShadow>
          <cylinderGeometry args={[radius * 0.54, radius * 0.62, 0.07, 64, 1, false]} />
        </mesh>
      </group>
    );
  }

  if (kind === 'dpad') {
    return (
      <group position={[0, 0, pressOffset - 0.026]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={edgeMat} castShadow receiveShadow>
          <cylinderGeometry args={[radius * 0.96, radius * 1.02, 0.05, 72, 1, false]} />
        </mesh>
        <mesh position={[0, 0, 0.026]} material={bodyMat} castShadow receiveShadow>
          <torusGeometry args={[radius * 0.63, radius * 0.055, 18, 72]} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[0, 0, pressOffset - 0.02]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={edgeMat} castShadow receiveShadow>
        <cylinderGeometry args={[radius * 0.9, radius * 0.98, 0.05, 56, 1, false]} />
      </mesh>
      <mesh position={[0, 0, 0.03]} material={bodyMat} castShadow receiveShadow>
        <torusGeometry args={[radius * 0.65, radius * 0.045, 16, 56]} />
      </mesh>
    </group>
  );
};

const PhotoButton: React.FC<{
  spec: ButtonSpec;
  texture?: THREE.Texture;
  pressed: boolean;
  onPress: (spec: ButtonSpec) => void;
  onRelease: () => void;
}> = ({ spec, texture, pressed, onPress, onRelease }) => {
  const mapped = imageToPlane(spec.x, spec.y, spec.w, spec.h);
  const z = pressed ? BUTTON_Z - 0.035 : BUTTON_Z;
  const scale = pressed ? 0.965 : 1;

  return (
    <group position={[mapped.x, mapped.y, z]} scale={[scale, scale, 1]}>
      <ButtonHardware spec={spec} mapped={mapped} pressed={pressed} />
      {texture && (
        <mesh position={[0, 0, 0.028]} renderOrder={5}>
          <planeGeometry args={[mapped.w, mapped.h]} />
          <meshBasicMaterial
            map={texture}
            transparent
            alphaTest={0.04}
            side={THREE.FrontSide}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
      )}
      <mesh
        position={[0, 0, 0.018]}
        onPointerDown={(e) => {
          e.stopPropagation();
          onPress(spec);
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          onRelease();
        }}
        onPointerOut={onRelease}
      >
        <planeGeometry args={[mapped.w * 1.35, mapped.h * 1.35]} />
        <meshBasicMaterial transparent opacity={0.002} depthWrite={false} depthTest={false} />
      </mesh>
    </group>
  );
};

const BackHit: React.FC<{
  spec: ButtonSpec;
  pressed: boolean;
  onPress: (spec: ButtonSpec) => void;
  onRelease: () => void;
}> = ({ spec, pressed, onPress, onRelease }) => {
  const mapped = imageToPlane(spec.x, spec.y, spec.w, spec.h);
  return (
    <mesh
      position={[-mapped.x, mapped.y, BACK_Z - 0.035]}
      rotation={[0, Math.PI, 0]}
      scale={[pressed ? 0.97 : 1, pressed ? 0.97 : 1, 1]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPress(spec);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        onRelease();
      }}
      onPointerOut={onRelease}
    >
      <planeGeometry args={[mapped.w * 1.25, mapped.h * 1.25]} />
      <meshBasicMaterial transparent opacity={0.002} depthWrite={false} depthTest={false} side={THREE.FrontSide} />
    </mesh>
  );
};

export const HybridPhotoController: React.FC = () => {
  const {
    deviceState,
    setDeviceState,
    lightOn,
    setLightOn,
    setActiveHotspot,
    addLog,
    soundOn,
  } = useAppContext();

  const frontOff = useTexture('/photo-controller/front-off.png');
  const frontOn = useTexture('/photo-controller/front-on.png');
  const back = useTexture('/photo-controller/back.png');
  const silhouette = useTexture('/photo-controller/front-silhouette.png');
  const rim = useTexture('/photo-controller/front-rim.png');
  const depthShade = useTexture('/photo-controller/front-depth-shade.png');
  const depthHighlight = useTexture('/photo-controller/front-depth-highlight.png');
  const dpad = useTexture('/photo-controller/dpad.png');
  const leftStick = useTexture('/photo-controller/left-stick.png');
  const rightStick = useTexture('/photo-controller/right-stick.png');
  const triangle = useTexture('/photo-controller/triangle.png');
  const square = useTexture('/photo-controller/square.png');
  const circle = useTexture('/photo-controller/circle.png');
  const cross = useTexture('/photo-controller/cross.png');

  const textures = useMemo<Record<string, THREE.Texture>>(() => ({
    'dpad.png': dpad,
    'left-stick.png': leftStick,
    'right-stick.png': rightStick,
    'triangle.png': triangle,
    'square.png': square,
    'circle.png': circle,
    'cross.png': cross,
  }), [dpad, leftStick, rightStick, triangle, square, circle, cross]);

  useMemo(() => {
    [frontOff, frontOn, back, silhouette, rim, depthShade, depthHighlight, dpad, leftStick, rightStick, triangle, square, circle, cross].forEach(tuneTexture);
  }, [frontOff, frontOn, back, silhouette, rim, depthShade, depthHighlight, dpad, leftStick, rightStick, triangle, square, circle, cross]);

  const [pressed, setPressed] = useState<string | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const frontTexture = deviceState === 'off' || !lightOn ? frontOff : frontOn;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const vibration = deviceState === 'vibrating' ? Math.sin(t * 70) * 0.012 : 0;
    groupRef.current.position.x = vibration;
    groupRef.current.rotation.z = deviceState === 'vibrating' ? Math.sin(t * 55) * 0.004 : 0;
  });

  const press = (spec: ButtonSpec) => {
    setPressed(spec.id);
    setActiveHotspot(spec.hotspot);

    if (spec.id === 'home_button') {
      const next = deviceState === 'off' ? 'idle' : 'off';
      setDeviceState(next);
      addLog(next === 'off' ? 'Controller powered down' : 'Controller powered up', next === 'off' ? 'הבקר כובה' : 'הבקר הופעל');
      if (soundOn) playPowerBeep(next !== 'off');
      return;
    }

    if (deviceState === 'off') {
      addLog('Wake the controller with the Home button first', 'יש להדליק את הבקר בעזרת כפתור הבית תחילה');
      if (soundOn) playClickSound(false);
      return;
    }

    if (spec.id === 'turbo_button') {
      const next = deviceState === 'turbo' ? 'idle' : 'turbo';
      setDeviceState(next);
      addLog(next === 'turbo' ? 'Turbo rapid mode enabled' : 'Turbo rapid mode disabled', next === 'turbo' ? 'מצב טורבו הופעל' : 'מצב טורבו כובה');
    } else if (spec.id === 'light_button') {
      setLightOn(!lightOn);
      addLog(`Backlight slider: ${!lightOn ? 'ON' : 'OFF'}`, `מתג התאורה: ${!lightOn ? 'פועל' : 'כבוי'}`);
      if (soundOn) playSlideSound();
      return;
    } else {
      addLog(spec.logEn, spec.logHe);
    }

    if (soundOn) playClickSound(false);
  };

  const release = () => {
    if (pressed && soundOn) playClickSound(true);
    setPressed(null);
  };

  return (
    <group ref={groupRef} scale={[0.86, 0.86, 0.86]} position={[0, 0.05, 0]}>
      <ShellModel />
      <SilhouetteVolume silhouette={silhouette} rim={rim} />

      <PhotoSkin texture={frontTexture} side="front" shade={depthShade} highlight={depthHighlight} />
      <PhotoSkin texture={back} side="back" />

      {FRONT_BUTTONS.map((spec) => (
        <PhotoButton
          key={spec.id}
          spec={spec}
          texture={spec.image ? textures[spec.image] : undefined}
          pressed={pressed === spec.id}
          onPress={press}
          onRelease={release}
        />
      ))}

      {BACK_HITS.map((spec) => (
        <BackHit
          key={spec.id}
          spec={spec}
          pressed={pressed === spec.id}
          onPress={press}
          onRelease={release}
        />
      ))}
    </group>
  );
};
