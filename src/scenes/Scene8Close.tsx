import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ASSETS, beat, CLAMP, COLORS, EASE_OUT, FONT_STACK} from '../constants';

export const Scene8Close: React.FC = () => {
  const frame=useCurrentFrame();
  const glow=interpolate(frame,[beat(0.0),beat(4.0)],[0.32,1],{...CLAMP,easing:EASE_OUT});
  const logoOpacity=interpolate(frame,[beat(1.0),beat(2.4)],[0,1],{...CLAMP,easing:EASE_OUT});
  const logoScale=interpolate(frame,[beat(1.0),beat(3.0)],[0.82,1],{...CLAMP,easing:EASE_OUT,output:'perceptual-scale'});
  const taglineOpacity=interpolate(frame,[beat(3.0),beat(4.2)],[0,1],{...CLAMP,easing:EASE_OUT});
  const creditOpacity=interpolate(frame,[beat(7.0),beat(8.0)],[0,0.72],{...CLAMP,easing:EASE_OUT});
  return (
    <AbsoluteFill style={{display:'grid',placeItems:'center'}}>
      <div style={{position:'absolute',left:'50%',bottom:-270.0,translate:'-50% 0',width:1250.0,height:680.0,borderRadius:'50%',background:'conic-gradient(from 190deg,rgba(91,168,255,0.52),rgba(87,224,255,0.34),rgba(104,229,162,0.26),rgba(243,214,108,0.22),rgba(255,155,92,0.28),rgba(155,115,255,0.54),rgba(91,168,255,0.52))',filter:'blur(110px)',opacity:0.44*glow}}/>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',translate:'0 -18.00px'}}>
        <Img src={staticFile(ASSETS.argonIcon)} style={{width:180.0,height:180.0,borderRadius:40.0,opacity:logoOpacity,scale:logoScale,boxShadow:'0 32px 100px rgba(0,0,0,0.50),0 0 90px rgba(126,108,255,0.18)'}}/>
        <div style={{marginTop:32.0,fontFamily:FONT_STACK,color:COLORS.text,fontWeight:790,fontSize:82.0,letterSpacing:-3.6,opacity:logoOpacity}}>Argon</div>
        <div style={{marginTop:13.0,fontFamily:FONT_STACK,color:COLORS.secondary,fontWeight:560,fontSize:31.0,letterSpacing:-0.8,opacity:taglineOpacity}}>Post once. Everywhere.</div>
      </div>
      <div style={{position:'absolute',bottom:74.0,fontFamily:FONT_STACK,color:COLORS.tertiary,fontSize:16.0,fontWeight:560,letterSpacing:-0.1,opacity:creditOpacity}}>A concept by plodroid.</div>
    </AbsoluteFill>
  );
};
