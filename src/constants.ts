import {Easing} from 'remotion';

export const WIDTH = 1080;
export const HEIGHT = 1080;
export const FPS = 60;
export const BPM = 85;
export const BEAT_SECONDS = 60 / BPM;
export const BEAT_FRAMES = FPS * BEAT_SECONDS;
export const TOTAL_BEATS = 130;
export const TOTAL_FRAMES = Math.round(TOTAL_BEATS * BEAT_FRAMES);

export const beat = (value: number) => value * BEAT_FRAMES;
export const beatFrame = (value: number) => Math.round(beat(value));

export const FONT_STACK = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", sans-serif';

export const COLORS = {
  bg: '#03050A',
  bg2: '#060A12',
  text: '#F7F8FA',
  secondary: '#A7ACB7',
  tertiary: '#717887',
  line: 'rgba(255,255,255,0.10)',
  panel: 'rgba(10,14,24,0.82)',
  panelSolid: '#0B0F18',
  blue: '#5AA8FF',
  violet: '#9B73FF',
  cyan: '#57E0FF',
  green: '#68E5A2',
  yellow: '#F3D66C',
  orange: '#FF9B5C',
  red: '#FF6E70',
};

export const EASE_OUT = Easing.bezier(0.16, 1, 0.30, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
export const SOFT_EASE = Easing.bezier(0.22, 1, 0.36, 1);

export const CLAMP = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

export const SCENES = {
  hook: {startBeat: 0, endBeat: 10},
  problem: {startBeat: 10, endBeat: 31},
  reveal: {startBeat: 31, endBeat: 43},
  drop: {startBeat: 43, endBeat: 60},
  write: {startBeat: 60, endBeat: 78},
  spread: {startBeat: 78, endBeat: 99},
  compare: {startBeat: 99, endBeat: 116},
  close: {startBeat: 116, endBeat: 130},
} as const;

export type SceneKey = keyof typeof SCENES;

export const sceneStartFrame = (key: SceneKey) => beatFrame(SCENES[key].startBeat);
export const sceneEndFrame = (key: SceneKey) => beatFrame(SCENES[key].endBeat);
export const sceneDurationFrames = (key: SceneKey) => sceneEndFrame(key) - sceneStartFrame(key);

export const ASSETS = {
  argonIcon: 'logos/AR-ICON.svg',
  instagram: 'logos/Instagram-no-bg.png',
  facebook: 'logos/facebook-rounded-no-bg.png',
  tiktok: 'logos/tiktok-no-bg.png',
  youtube: 'logos/youtube-no-bg.png',
  music: 'audio/Tame_Impala_-_Loser.mp3',
  keyTap: 'audio/Iphone tab sfx.MP3',
  whoosh: 'audio/Soft Whoosh 01.wav',
  granular: 'audio/Granular, Transform, Move, Splash, Warps (20)(1).wav',
  glitch: 'audio/225706_Glitch Impact 03.mp3',
  uiOpen: 'audio/ES_Sci Fi Games, UI Menu, Very Short, Open 10 - Epidemic Sound.mp3',
} as const;
