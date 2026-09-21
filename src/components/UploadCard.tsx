import React from 'react';
import {useCurrentFrame} from 'remotion';
import {BEAT_FRAMES, COLORS, FONT_STACK} from '../constants';
import {PlatformIcon, Platform, PLATFORM_LABELS} from './PlatformIcon';

export const UploadCard: React.FC<{platform:Platform; status?:'idle'|'loading'|'error'|'done'; compact?:boolean}> = ({platform,status='idle',compact=false}) => {
  const frame = useCurrentFrame();
  const spin = (frame / BEAT_FRAMES) * 360;
  const width = compact ? 294.0 : 360.0;
  const height = compact ? 176.0 : 214.0;
  return (
    <div style={{width,height,borderRadius:20.0,padding:compact?16.0:20.0,background:'rgba(11,15,24,0.96)',border:'1px solid rgba(255,255,255,0.11)',boxShadow:'0 24px 70px rgba(0,0,0,0.34)',fontFamily:FONT_STACK,color:COLORS.text}}>
      <div style={{display:'flex',alignItems:'center',gap:12.0}}>
        <PlatformIcon platform={platform} size={compact?28:34}/>
        <div style={{fontSize:compact?16.0:18.0,fontWeight:700,letterSpacing:-0.35}}>{PLATFORM_LABELS[platform]}</div>
        <div style={{marginLeft:'auto',fontSize:11.0,color:COLORS.tertiary,textTransform:'uppercase',letterSpacing:1.1}}>Upload</div>
      </div>
      <div style={{marginTop:compact?14.0:18.0,height:compact?44.0:54.0,borderRadius:12.0,border:'1px dashed rgba(255,255,255,0.14)',display:'flex',alignItems:'center',padding:'0 13px',color:COLORS.secondary,fontSize:compact?12.0:13.0}}>video.mp4</div>
      <div style={{marginTop:compact?10.0:12.0,height:compact?10.0:12.0,borderRadius:999.0,background:'rgba(255,255,255,0.07)',overflow:'hidden'}}>
        <div style={{height:'100%',width:status==='idle'?'28%':status==='loading'?'66%':status==='done'?'100%':'74%',borderRadius:999.0,background:status==='error'?COLORS.red:'linear-gradient(90deg,#5AA8FF,#9B73FF)'}}/>
      </div>
      <div style={{marginTop:compact?9.0:12.0,display:'flex',alignItems:'center',gap:8.0,color:status==='error'?COLORS.red:COLORS.tertiary,fontSize:compact?11.0:12.0}}>
        {status==='loading' && <div style={{width:12.0,height:12.0,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.16)',borderTopColor:'rgba(255,255,255,0.72)',rotate:`${spin.toFixed(2)}deg`}}/>}
        {status==='error' ? 'Upload failed' : status==='done' ? 'Ready' : status==='loading' ? 'Uploading…' : 'Waiting'}
      </div>
    </div>
  );
};
