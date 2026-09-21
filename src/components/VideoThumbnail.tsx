import React from 'react';
import {COLORS, FONT_STACK} from '../constants';

export const VideoThumbnail: React.FC<{width?:number; height?:number; label?:string; glow?:number}> = ({width=320,height=220,label='video.mp4',glow=1}) => (
  <div style={{width, height, position:'relative', overflow:'hidden', borderRadius:24.0, background:'linear-gradient(145deg, #10182B 0%, #0A0D14 44%, #111522 100%)', border:'1px solid rgba(255,255,255,0.13)', boxShadow:`0 28px 90px rgba(0,0,0,0.48), 0 0 ${44*glow}px rgba(116,100,255,${0.18*glow})`}}>
    <div style={{position:'absolute', inset:0, background:'radial-gradient(circle at 34% 35%, rgba(91,135,255,0.52), transparent 35%), radial-gradient(circle at 72% 66%, rgba(155,115,255,0.48), transparent 37%), linear-gradient(160deg, rgba(87,224,255,0.12), transparent 58%)'}} />
    <div style={{position:'absolute', left:22.0, top:20.0, width:86.0, height:18.0, borderRadius:9.0, background:'rgba(255,255,255,0.10)'}} />
    <div style={{position:'absolute', left:'50%', top:'50%', translate:'-50% -50%', width:64.0, height:64.0, borderRadius:'50%', display:'grid', placeItems:'center', background:'rgba(255,255,255,0.13)', border:'1px solid rgba(255,255,255,0.18)', backdropFilter:'blur(8px)'}}>
      <div style={{width:0,height:0,borderTop:'10px solid transparent',borderBottom:'10px solid transparent',borderLeft:'16px solid white',marginLeft:4.0}} />
    </div>
    <div style={{position:'absolute', left:20.0, bottom:18.0, color:COLORS.text, fontFamily:FONT_STACK, fontSize:17.0, fontWeight:650, letterSpacing:-0.2}}>{label}</div>
  </div>
);
