import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {beat, CLAMP, COLORS, EASE_OUT, FONT_STACK} from '../constants';
import {UploadCard} from '../components/UploadCard';
import {Cursor} from '../components/Cursor';
import {Headline} from '../components/Typography';
import {Platform} from '../components/PlatformIcon';

const cards: Array<{platform:Platform;x:number;y:number;r:number}> = [
  {platform:'tiktok',x:132.00,y:278.00,r:-5.00},
  {platform:'instagram',x:246.00,y:328.00,r:-1.75},
  {platform:'youtube',x:360.00,y:378.00,r:2.00},
  {platform:'facebook',x:474.00,y:428.00,r:4.75},
];

export const Scene2Problem: React.FC = () => {
  const frame=useCurrentFrame();
  const phase2=interpolate(frame,[beat(6.0),beat(7.0)],[0,1],CLAMP);
  const phase3=interpolate(frame,[beat(14.0),beat(15.0)],[0,1],CLAMP);
  const cursorX=interpolate(frame,[beat(6.0),beat(8.2),beat(9.0),beat(10.6),beat(11.4),beat(13.0)],[660.00,502.00,731.00,548.00,802.00,620.00],{...CLAMP,easing:[EASE_OUT,EASE_OUT,EASE_OUT,EASE_OUT,EASE_OUT]});
  const cursorY=interpolate(frame,[beat(6.0),beat(8.2),beat(9.0),beat(10.6),beat(11.4),beat(13.0)],[708.00,586.00,648.00,626.00,678.00,694.00],{...CLAMP,easing:[EASE_OUT,EASE_OUT,EASE_OUT,EASE_OUT,EASE_OUT]});
  const desaturate=interpolate(frame,[beat(14.0),beat(18.0)],[0,0.78],CLAMP);

  const headline = phase3>0.5 ? 'Slow. Inconsistent.' : phase2>0.45 ? 'Copy. Paste. Repeat.' : 'Open every app.';

  return (
    <AbsoluteFill style={{filter:`saturate(${(1-desaturate).toFixed(3)})`}}>
      <div style={{position:'absolute',left:84.0,right:84.0,top:92.0}}><Headline size={72.0}>{headline}</Headline></div>
      <div style={{position:'absolute',inset:0}}>
        {cards.map((card,index)=>{
          const start=beat(index*0.85);
          const opacity=interpolate(frame,[start,start+beat(0.55)],[0,1],{...CLAMP,easing:EASE_OUT});
          const y=interpolate(frame,[start,start+beat(0.85)],[card.y+110.00,card.y],{...CLAMP,easing:EASE_OUT});
          const status=phase3>0.5 ? (index===2?'error':'loading') : phase2>0.2 ? 'loading' : 'idle';
          return <div key={card.platform} style={{position:'absolute',left:card.x,top:y,rotate:`${card.r.toFixed(2)}deg`,opacity,filter:'drop-shadow(0 34px 52px rgba(0,0,0,0.30))'}}><UploadCard platform={card.platform} status={status}/></div>;
        })}
      </div>

      <div style={{position:'absolute',left:312.0,top:744.0,width:456.0,height:58.0,borderRadius:15.0,background:'rgba(7,10,16,0.92)',border:'1px solid rgba(255,255,255,0.10)',display:'flex',alignItems:'center',padding:'0 18px',fontFamily:FONT_STACK,color:COLORS.secondary,fontSize:14.0,opacity:phase2}}>
        {phase3>0.15 ? '#launch #creator #product' : 'One video. Everywhere.'}
      </div>
      {phase2>0.05 && <Cursor x={cursorX} y={cursorY} scale={0.92}/>}
      {phase3>0.65 && <div style={{position:'absolute',right:108.0,bottom:114.0,fontFamily:FONT_STACK,color:COLORS.red,fontSize:16.0,fontWeight:720,letterSpacing:-0.2}}>Upload failed</div>}
    </AbsoluteFill>
  );
};
