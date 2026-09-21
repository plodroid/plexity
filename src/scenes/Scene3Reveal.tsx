import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ASSETS, beat, CLAMP, COLORS, EASE_OUT, FONT_STACK} from '../constants';

export const Scene3Reveal: React.FC = () => {
  const frame=useCurrentFrame();
  const bloom=interpolate(frame,[beat(0.0),beat(3.0)],[0,1],{...CLAMP,easing:EASE_OUT});
  const iconOpacity=interpolate(frame,[beat(2.25),beat(3.5)],[0,1],{...CLAMP,easing:EASE_OUT});
  const iconScale=interpolate(frame,[beat(2.25),beat(4.2)],[0.68,1],{...CLAMP,easing:EASE_OUT,output:'perceptual-scale'});
  const textOpacity=interpolate(frame,[beat(4.0),beat(5.4)],[0,1],{...CLAMP,easing:EASE_OUT});
  return (
    <AbsoluteFill style={{display:'grid',placeItems:'center'}}>
      <div style={{position:'absolute',left:'50%',top:'50%',translate:'-50% -50%',width:interpolate(bloom,[0,1],[8.00,840.00]),height:interpolate(bloom,[0,1],[8.00,840.00]),borderRadius:'50%',background:'radial-gradient(circle,rgba(155,115,255,0.31) 0%,rgba(91,168,255,0.16) 34%,rgba(87,224,255,0.05) 52%,transparent 70%)',filter:`blur(${interpolate(bloom,[0,1],[0.00,22.00]).toFixed(2)}px)`,opacity:bloom}}/>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',translate:'0 -22.00px'}}>
        <Img src={staticFile(ASSETS.argonIcon)} style={{width:170.0,height:170.0,borderRadius:38.0,opacity:iconOpacity,scale:iconScale,boxShadow:'0 28px 110px rgba(0,0,0,0.46),0 0 86px rgba(125,108,255,0.20)'}}/>
        <div style={{marginTop:30.0,fontFamily:FONT_STACK,color:COLORS.text,fontWeight:780,fontSize:78.0,letterSpacing:-3.4,opacity:textOpacity}}>Argon</div>
        <div style={{marginTop:12.0,fontFamily:FONT_STACK,color:COLORS.secondary,fontWeight:560,fontSize:30.0,letterSpacing:-0.75,opacity:textOpacity}}>Post once. Everywhere.</div>
      </div>
    </AbsoluteFill>
  );
};
