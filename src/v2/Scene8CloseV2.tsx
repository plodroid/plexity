import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ASSETS, beat, CLAMP, COLORS, EASE_OUT, FONT_STACK} from '../constants';

export const Scene8CloseV2: React.FC = () => {
  const frame=useCurrentFrame();
  const logo=interpolate(frame,[beat(0.9),beat(2.2)],[0,1],{...CLAMP,easing:EASE_OUT});
  const copy=interpolate(frame,[beat(2.8),beat(4.0)],[0,1],{...CLAMP,easing:EASE_OUT});
  const credit=interpolate(frame,[beat(7.0),beat(8.2)],[0,0.72],{...CLAMP,easing:EASE_OUT});
  const fog=interpolate(frame,[beat(0.0),beat(5.0)],[0.46,1],{...CLAMP,easing:EASE_OUT});

  return (
    <AbsoluteFill style={{display:'grid',placeItems:'center'}}>
      <div style={{
        position:'absolute',left:'50%',bottom:-300,translate:'-50% 0',
        width:1320,height:720,borderRadius:'50%',
        background:'conic-gradient(from 195deg,rgba(91,168,255,0.52),rgba(87,224,255,0.30),rgba(104,229,162,0.25),rgba(243,214,108,0.21),rgba(255,155,92,0.25),rgba(155,115,255,0.54),rgba(91,168,255,0.52))',
        filter:'blur(118px)',opacity:0.46*fog
      }}/>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',translate:'0 -14px'}}>
        <Img src={staticFile(ASSETS.argonIcon)} style={{
          width:184,height:184,borderRadius:42,
          opacity:logo,scale:0.80+logo*0.20,
          boxShadow:'0 34px 110px rgba(0,0,0,0.50),0 0 96px rgba(126,108,255,0.20)'
        }}/>
        <div style={{marginTop:32,fontFamily:FONT_STACK,color:COLORS.text,fontWeight:800,fontSize:84,letterSpacing:-3.7,opacity:logo}}>Argon</div>
        <div style={{marginTop:14,fontFamily:FONT_STACK,color:COLORS.secondary,fontWeight:560,fontSize:31,letterSpacing:-0.8,opacity:copy}}>Post once. Everywhere.</div>
      </div>
      <div style={{position:'absolute',bottom:72,fontFamily:FONT_STACK,color:COLORS.tertiary,fontSize:16,fontWeight:560,opacity:credit}}>A concept by plodroid.</div>
    </AbsoluteFill>
  );
};
