import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {beat, CLAMP, COLORS, EASE_OUT, FONT_STACK} from '../constants';
import {ArgonApp} from '../components/ArgonApp';
import {UploadCard} from '../components/UploadCard';

const lines = ['4 apps → 1','4 uploads → 1','4 captions → 1'];

export const Scene7Compare: React.FC = () => {
  const frame=useCurrentFrame();
  const split=interpolate(frame,[beat(0.0),beat(1.0)],[0,1],{...CLAMP,easing:EASE_OUT});
  return (
    <AbsoluteFill>
      <div style={{position:'absolute',left:0,top:0,width:'50%',height:'100%',overflow:'hidden',filter:'saturate(0.15) brightness(0.72)',opacity:split}}>
        <div style={{position:'absolute',left:74.0,top:145.0,rotate:'-3.50deg'}}><UploadCard platform="tiktok" status="loading" compact/></div>
        <div style={{position:'absolute',left:132.0,top:295.0,rotate:'1.20deg'}}><UploadCard platform="instagram" status="loading" compact/></div>
        <div style={{position:'absolute',left:72.0,top:455.0,rotate:'-1.60deg'}}><UploadCard platform="youtube" status="error" compact/></div>
        <div style={{position:'absolute',left:130.0,top:620.0,rotate:'2.80deg'}}><UploadCard platform="facebook" status="loading" compact/></div>
      </div>
      <div style={{position:'absolute',right:0,top:0,width:'50%',height:'100%',overflow:'hidden',opacity:split}}>
        <div style={{position:'absolute',left:270.0,top:540.0,translate:'-50% -50%',scale:0.66}}><ArgonApp state="success" width={760.0} height={570.0}/></div>
      </div>
      <div style={{position:'absolute',left:539.0,top:92.0,bottom:92.0,width:2.0,background:'linear-gradient(180deg,transparent,rgba(255,255,255,0.16),transparent)',opacity:split}}/>
      <div style={{position:'absolute',left:84.0,right:84.0,top:162.0,display:'grid',gap:28.0}}>
        {lines.map((line,index)=>{
          const start=beat(5.2+index*2.0);
          const opacity=interpolate(frame,[start,start+beat(0.65)],[0,1],{...CLAMP,easing:EASE_OUT});
          const y=interpolate(frame,[start,start+beat(0.85)],[34.0,0.0],{...CLAMP,easing:EASE_OUT});
          return <div key={line} style={{height:126.0,borderRadius:28.0,display:'grid',placeItems:'center',background:'rgba(4,7,13,0.83)',border:'1px solid rgba(255,255,255,0.11)',boxShadow:'0 28px 70px rgba(0,0,0,0.28)',backdropFilter:'blur(20px)',fontFamily:FONT_STACK,color:COLORS.text,fontWeight:800,fontSize:62.0,letterSpacing:-2.2,opacity,translate:`0 ${y.toFixed(2)}px`}}>{line}</div>;
        })}
      </div>
    </AbsoluteFill>
  );
};
