import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {beat, CLAMP, COLORS, EASE_OUT, FONT_STACK} from '../constants';
import {ArgonApp} from '../components/ArgonApp';
import {Cursor} from '../components/Cursor';
import {Headline, Subline} from '../components/Typography';

export const Scene4Drop: React.FC = () => {
  const frame=useCurrentFrame();
  const appOpacity=interpolate(frame,[beat(0.0),beat(1.0)],[0,1],{...CLAMP,easing:EASE_OUT});
  const appScale=interpolate(frame,[beat(0.0),beat(1.4)],[0.91,1],{...CLAMP,easing:EASE_OUT,output:'perceptual-scale'});
  const appRotate=interpolate(frame,[beat(0.0),beat(1.4)],[-3.20,-0.55],{...CLAMP,easing:EASE_OUT});
  const fileX=interpolate(frame,[beat(3.0),beat(6.2)],[168.00,540.00],{...CLAMP,easing:EASE_OUT});
  const fileY=interpolate(frame,[beat(3.0),beat(6.2)],[196.00,516.00],{...CLAMP,easing:EASE_OUT});
  const cursorX=interpolate(frame,[beat(2.8),beat(6.25)],[222.00,596.00],{...CLAMP,easing:EASE_OUT});
  const cursorY=interpolate(frame,[beat(2.8),beat(6.25)],[230.00,548.00],{...CLAMP,easing:EASE_OUT});
  const dropped=frame>=beat(6.15);
  const fileOpacity=interpolate(frame,[beat(2.4),beat(3.1),beat(6.1),beat(6.6)],[0,1,1,0],{...CLAMP,easing:[EASE_OUT,EASE_OUT,EASE_OUT]});
  const ripple=interpolate(frame,[beat(6.0),beat(7.25)],[0,1],CLAMP);
  return (
    <AbsoluteFill>
      <div style={{position:'absolute',left:84.0,right:84.0,top:78.0}}>
        <Headline align="left" size={74.0}>Drop it once.</Headline>
        <div style={{marginTop:12.0}}><Subline align="left" size={26.0}>One video. That's it.</Subline></div>
      </div>
      <div style={{position:'absolute',left:'50%',top:'57%',translate:'-50% -50%',opacity:appOpacity,scale:appScale,rotate:`${appRotate.toFixed(2)}deg`}}>
        <ArgonApp state={dropped?'loaded':'drop'} width={820.0} height={620.0}/>
      </div>
      <div style={{position:'absolute',left:fileX,top:fileY,translate:'-50% -50%',width:176.0,height:82.0,borderRadius:18.0,background:'rgba(10,14,24,0.96)',border:'1px solid rgba(255,255,255,0.14)',boxShadow:'0 26px 64px rgba(0,0,0,0.40)',display:'flex',alignItems:'center',gap:12.0,padding:'0 16px',fontFamily:FONT_STACK,color:COLORS.text,opacity:fileOpacity}}>
        <div style={{width:40.0,height:40.0,borderRadius:12.0,display:'grid',placeItems:'center',background:'linear-gradient(145deg,rgba(91,168,255,0.26),rgba(155,115,255,0.22))'}}>▶</div>
        <div><div style={{fontSize:13.0,fontWeight:720}}>video.mp4</div><div style={{marginTop:3.0,fontSize:10.0,color:COLORS.tertiary}}>18.4 MB</div></div>
      </div>
      {ripple>0 && <div style={{position:'absolute',left:540.0,top:548.0,translate:'-50% -50%',width:interpolate(ripple,[0,1],[20.0,330.0]),height:interpolate(ripple,[0,1],[20.0,330.0]),borderRadius:'50%',border:`${interpolate(ripple,[0,1],[2.0,0.5]).toFixed(2)}px solid rgba(104,229,162,${(0.44*(1-ripple)).toFixed(3)})`,opacity:1-ripple}}/>}
      <Cursor x={cursorX} y={cursorY} opacity={interpolate(frame,[beat(2.4),beat(3.0),beat(7.1),beat(8.0)],[0,1,1,0],CLAMP)} pressed={frame>beat(5.9)&&frame<beat(6.25)}/>
    </AbsoluteFill>
  );
};
