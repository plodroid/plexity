import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {BEAT_FRAMES, CLAMP, COLORS} from '../constants';

export const GradientFog: React.FC<{intensity?: number}> = ({intensity = 1}) => {
  const frame = useCurrentFrame();
  const phase = (frame / BEAT_FRAMES) * Math.PI * 2;
  const breathe = 0.94 + Math.sin(phase) * 0.035;
  const drift = Math.sin(phase / 8) * 22.0;
  const fade = interpolate(frame, [0, BEAT_FRAMES * 2], [0.72, 1], {...CLAMP});

  return (
    <AbsoluteFill style={{background: `linear-gradient(180deg, ${COLORS.bg2} 0%, ${COLORS.bg} 58%, #020307 100%)`, overflow: 'hidden'}}>
      <div style={{position:'absolute', inset:'auto -160px -260px -160px', height:560.0, opacity: 0.78 * intensity * fade, translate: `${drift.toFixed(2)}px 0px`, scale: breathe}}>
        <div style={{position:'absolute', left:0.0, bottom:0.0, width:360.0, height:390.0, borderRadius:'50%', background:'radial-gradient(circle, rgba(91,135,255,0.56) 0%, rgba(91,135,255,0.20) 42%, rgba(91,135,255,0.00) 72%)', filter:'blur(46px)'}} />
        <div style={{position:'absolute', left:210.0, bottom:18.0, width:360.0, height:390.0, borderRadius:'50%', background:'radial-gradient(circle, rgba(87,224,255,0.48) 0%, rgba(87,224,255,0.16) 42%, rgba(87,224,255,0.00) 72%)', filter:'blur(52px)'}} />
        <div style={{position:'absolute', left:440.0, bottom:-10.0, width:390.0, height:410.0, borderRadius:'50%', background:'radial-gradient(circle, rgba(104,229,162,0.40) 0%, rgba(104,229,162,0.14) 42%, rgba(104,229,162,0.00) 72%)', filter:'blur(58px)'}} />
        <div style={{position:'absolute', left:650.0, bottom:10.0, width:370.0, height:400.0, borderRadius:'50%', background:'radial-gradient(circle, rgba(243,214,108,0.34) 0%, rgba(243,214,108,0.12) 42%, rgba(243,214,108,0.00) 72%)', filter:'blur(58px)'}} />
        <div style={{position:'absolute', left:840.0, bottom:-8.0, width:390.0, height:420.0, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,155,92,0.34) 0%, rgba(255,155,92,0.12) 42%, rgba(255,155,92,0.00) 72%)', filter:'blur(62px)'}} />
        <div style={{position:'absolute', left:1040.0, bottom:0.0, width:390.0, height:420.0, borderRadius:'50%', background:'radial-gradient(circle, rgba(155,115,255,0.50) 0%, rgba(155,115,255,0.17) 42%, rgba(155,115,255,0.00) 72%)', filter:'blur(60px)'}} />
      </div>
      <div style={{position:'absolute', inset:0, background:'radial-gradient(circle at 50% 38%, rgba(35,53,88,0.11), transparent 48%)'}} />
      <div style={{position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(0,0,0,0.00) 0%, rgba(0,0,0,0.12) 72%, rgba(0,0,0,0.28) 100%)'}} />
    </AbsoluteFill>
  );
};
