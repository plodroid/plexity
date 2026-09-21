import {Easing} from 'remotion';

export const V3_WIDTH = 1080;
export const V3_HEIGHT = 1080;
export const V3_FPS = 60;
export const V3_BPM = 85;
export const V3_BEAT_SECONDS = 60 / V3_BPM;
export const V3_BEAT_FRAMES = V3_BEAT_SECONDS * V3_FPS;

// Measured from the supplied MP3: detected beat phase sits ~176.5ms after t=0.
export const V3_BEAT_OFFSET_SECONDS = 0.176476;
export const V3_BEAT_OFFSET_FRAMES = V3_BEAT_OFFSET_SECONDS * V3_FPS;

export const v3Beat = (beat:number) => V3_BEAT_OFFSET_FRAMES + beat * V3_BEAT_FRAMES;
export const v3BeatFrame = (beat:number) => Math.round(v3Beat(beat));

export const V3_TOTAL_BEATS = 128;
export const V3_TOTAL_FRAMES = v3BeatFrame(V3_TOTAL_BEATS);

export const V3 = {
  bg:'#f5f5f7',
  pure:'#ffffff',
  surface:'#ffffff',
  surfaceSoft:'#ececf0',
  text:'#1d1d1f',
  muted:'#6e6e73',
  soft:'#86868b',
  line:'rgba(60,60,67,0.15)',
  lineSoft:'rgba(60,60,67,0.08)',
  blue:'#0071e3',
  blue2:'#0a84ff',
  green:'#34c759',
  red:'#ff3b30',
  orange:'#ff9500',
  glass:'rgba(240,240,243,0.58)',
  glassStrong:'rgba(255,255,255,0.82)',
  glassBorder:'rgba(255,255,255,0.82)',
  shadow:'0 18px 55px rgba(0,0,0,0.10), 0 2px 9px rgba(0,0,0,0.04)',
};

export const V3_FONT='-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif';
export const V3_EASE=Easing.bezier(0.22,1,0.36,1);
export const V3_IOS=Easing.bezier(0.32,0.72,0,1);
export const V3_CLAMP={extrapolateLeft:'clamp' as const,extrapolateRight:'clamp' as const};

export const V3_SCENES = {
  hook:[0,8],
  problem:[8,28],
  reveal:[28,36],
  drop:[36,52],
  write:[52,70],
  spread:[70,94],
  compare:[94,112],
  close:[112,128],
} as const;

export type V3Scene=keyof typeof V3_SCENES;
export const v3SceneStart=(s:V3Scene)=>v3BeatFrame(V3_SCENES[s][0]);
export const v3SceneEnd=(s:V3Scene)=>v3BeatFrame(V3_SCENES[s][1]);
export const v3SceneDuration=(s:V3Scene)=>v3SceneEnd(s)-v3SceneStart(s);

export const V3_ASSETS={
  argonIcon:'logos/AR-ICON.svg',
  instagram:'logos/Instagram-no-bg.png',
  facebook:'logos/facebook-rounded-no-bg.png',
  tiktok:'logos/tiktok-no-bg.png',
  youtube:'logos/youtube-no-bg.png',
  music:'audio/Tame_Impala_-_Loser.mp3',
  tap:'audio/Iphone tab sfx.MP3',
  whoosh:'audio/Soft Whoosh 01.wav',
  transform:'audio/Granular, Transform, Move, Splash, Warps (20)(1).wav',
  impact:'audio/225706_Glitch Impact 03.mp3',
  ui:'audio/ES_Sci Fi Games, UI Menu, Very Short, Open 10 - Epidemic Sound.mp3',
} as const;
