export type Language = 'en' | 'he';

export type DeviceState = 'off' | 'idle' | 'calibrating' | 'turbo' | 'vibrating' | 'recording' | 'playing';

export interface HotspotInfo {
  id: string;
  nameEn: string;
  nameHe: string;
  descEn: string;
  descHe: string;
  position: [number, number, number]; // [x, y, z] to place in 3D scene
}

export interface TutorialStep {
  id: string;
  titleEn: string;
  titleHe: string;
  descEn: string;
  descHe: string;
  hotspotId?: string;
  cameraLoc?: [number, number, number]; // custom camera position to highlight
}
