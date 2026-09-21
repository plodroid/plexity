import React from 'react';
import {interpolate} from 'remotion';
import {V3,V3_CLAMP} from './constantsV3';

export type CursorMode='arrow'|'grab'|'text'|'dot';

export const MorphCursorV3:React.FC<{
  x:number;
  y:number;
  mode?:CursorMode;
  opacity?:number;
  pressed?:number;
  velocity?:number;
}> = ({x,y,mode='arrow',opacity=1,pressed=0,velocity=0}) => {
  const arrowOpacity=mode==='arrow'?1:0;
  const grabOpacity=mode==='grab'?1:0;
  const textOpacity=mode==='text'?1:0;
  const dotOpacity=mode==='dot'?1:0;
  const blur=Math.min(2.8,velocity*2.2);
  const squish=1-pressed*0.06;
  return (
    <div style={{position:'absolute',left:x,top:y,translate:'-6px -5px',width:48,height:48,opacity,zIndex:50,filter:`drop-shadow(0 5px 12px rgba(0,0,0,.18)) blur(${blur.toFixed(2)}px)`,transformOrigin:'8px 8px',scale:squish}}>
      <svg width="40" height="46" viewBox="0 0 40 46" style={{position:'absolute',left:0,top:0,opacity:arrowOpacity}}>
        <path d="M4 2.5L34 26.5L20.5 28.3L27.3 41.7L20.8 44.8L14.4 31.6L6.1 42L4 2.5Z" fill="#fff" stroke="#1d1d1f" strokeWidth="2.25" strokeLinejoin="round"/>
      </svg>
      <div style={{position:'absolute',left:2,top:2,width:38,height:38,borderRadius:'50%',background:V3.blue,opacity:grabOpacity,boxShadow:'inset 1px 1px rgba(255,255,255,.45),0 8px 20px rgba(0,113,227,.22)',display:'grid',placeItems:'center',color:'#fff',fontSize:20,fontWeight:800}}>↕</div>
      <div style={{position:'absolute',left:14,top:1,width:5,height:42,borderRadius:999,background:V3.text,opacity:textOpacity}}>
        <div style={{position:'absolute',left:-6,top:0,width:17,height:4,borderRadius:999,background:V3.text}}/>
        <div style={{position:'absolute',left:-6,bottom:0,width:17,height:4,borderRadius:999,background:V3.text}}/>
      </div>
      <div style={{position:'absolute',left:7,top:7,width:28,height:28,borderRadius:'50%',background:V3.blue2,opacity:dotOpacity,boxShadow:'0 0 0 7px rgba(10,132,255,.12),0 8px 22px rgba(0,113,227,.24)'}}/>
    </div>
  );
};

export const cursorProgress=(frame:number,from:number,to:number)=>interpolate(frame,[from,to],[0,1],V3_CLAMP);
