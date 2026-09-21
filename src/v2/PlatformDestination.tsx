import React from 'react';
import {COLORS, FONT_STACK} from '../constants';
import {Platform, PlatformIcon, PLATFORM_LABELS} from '../components/PlatformIcon';

export const PlatformDestination: React.FC<{
  platform: Platform;
  width?: number;
  active?: boolean;
  success?: boolean;
}> = ({platform,width=180,active=true,success=false}) => (
  <div style={{
    width,
    height: 64,
    borderRadius: 18,
    display:'flex',
    alignItems:'center',
    gap:12,
    padding:'0 16px',
    background: active ? 'rgba(9,13,22,0.94)' : 'rgba(9,13,22,0.50)',
    border: active ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.05)',
    boxShadow: active ? '0 22px 60px rgba(0,0,0,0.34)' : 'none',
    fontFamily:FONT_STACK,
    color:COLORS.text,
    opacity: active ? 1 : 0.45,
  }}>
    <PlatformIcon platform={platform} size={32}/>
    <div style={{fontSize:14,fontWeight:700,letterSpacing:-0.25}}>{PLATFORM_LABELS[platform]}</div>
    <div style={{
      marginLeft:'auto',
      width:22,
      height:22,
      borderRadius:'50%',
      display:'grid',
      placeItems:'center',
      background: success ? COLORS.green : 'rgba(255,255,255,0.07)',
      color: success ? '#05130C' : COLORS.tertiary,
      fontWeight:900,
      fontSize:12
    }}>{success?'✓':'•'}</div>
  </div>
);
