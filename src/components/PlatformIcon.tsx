import React from 'react';
import {Img, staticFile} from 'remotion';
import {ASSETS} from '../constants';

export type Platform = 'tiktok' | 'instagram' | 'youtube' | 'facebook';

const FILES: Record<Platform, string> = {
  tiktok: ASSETS.tiktok,
  instagram: ASSETS.instagram,
  youtube: ASSETS.youtube,
  facebook: ASSETS.facebook,
};

export const PlatformIcon: React.FC<{platform: Platform; size?: number; dimmed?: boolean}> = ({platform, size = 44, dimmed = false}) => (
  <div style={{width:size, height:size, display:'grid', placeItems:'center', opacity: dimmed ? 0.38 : 1}}>
    <Img src={staticFile(FILES[platform])} style={{width:size, height:size, objectFit:'contain'}} />
  </div>
);

export const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  facebook: 'Facebook',
};
