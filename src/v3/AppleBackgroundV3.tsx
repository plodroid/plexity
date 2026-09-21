import React from 'react';
import {AbsoluteFill,interpolate,useCurrentFrame} from 'remotion';
import {V3,V3_BEAT_FRAMES,V3_CLAMP} from './constantsV3';

export const AppleBackgroundV3:React.FC = () => {
  const frame=useCurrentFrame();
  const drift=Math.sin(frame/V3_BEAT_FRAMES/4*Math.PI)*8;
  const glow=0.68+Math.sin(frame/V3_BEAT_FRAMES*Math.PI)*0.06;
  return (
    <AbsoluteFill style={{background:V3.bg,overflow:'hidden'}}>
      <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,#ffffff 0%,#f7f7f9 64%,#f5f5f7 100%)'}}/>
      <div style={{position:'absolute',left:100+drift,top:70,width:880,height:520,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,113,227,.055) 0%,rgba(0,113,227,.018) 44%,rgba(0,113,227,0) 72%)',opacity:glow}}/>
      <div style={{position:'absolute',left:0,right:0,bottom:0,height:170,background:'linear-gradient(180deg,rgba(245,245,247,0) 0%,rgba(236,236,240,.75) 100%)'}}/>
    </AbsoluteFill>
  );
};

export const WhiteFlashV3:React.FC<{frame:number;at:number}> = ({frame,at}) => {
  const o=interpolate(frame,[at-4,at,at+7],[0,0.36,0],V3_CLAMP);
  return <AbsoluteFill style={{background:'#fff',opacity:o,pointerEvents:'none'}}/>;
};
