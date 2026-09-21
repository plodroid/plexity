import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ASSETS, beat, CLAMP, COLORS, EASE_OUT, FONT_STACK} from '../constants';
import {Platform, PlatformIcon} from '../components/PlatformIcon';

const platforms: Array<{p:Platform;x:number;y:number}> = [
  {p:'tiktok',x:-270,y:-120},
  {p:'instagram',x:270,y:-120},
  {p:'youtube',x:-270,y:120},
  {p:'facebook',x:270,y:120},
];

export const Scene3RevealV2: React.FC = () => {
  const frame=useCurrentFrame();
  const collapse=interpolate(frame,[beat(0.0),beat(3.0)],[0,1],{...CLAMP,easing:EASE_OUT});
  const logo=interpolate(frame,[beat(2.45),beat(4.0)],[0,1],{...CLAMP,easing:EASE_OUT});
  const copy=interpolate(frame,[beat(4.0),beat(5.2)],[0,1],{...CLAMP,easing:EASE_OUT});
  const point=interpolate(frame,[beat(1.5),beat(3.25)],[0.25,1],{...CLAMP,easing:EASE_OUT});

  return (
    <AbsoluteFill style={{display:'grid',placeItems:'center'}}>
      {platforms.map(({p,x,y})=>(
        <div key={p} style={{
          position:'absolute',
          left:'50%',
          top:'50%',
          translate:`calc(-50% + ${(x*(1-collapse)).toFixed(2)}px) calc(-50% + ${(y*(1-collapse)).toFixed(2)}px)`,
          scale:1-collapse*0.66,
          opacity:1-collapse,
          filter:`blur(${(collapse*8).toFixed(2)}px)`
        }}>
          <div style={{width:92,height:92,borderRadius:28,display:'grid',placeItems:'center',background:'rgba(8,12,20,0.94)',border:'1px solid rgba(255,255,255,0.12)',boxShadow:'0 24px 72px rgba(0,0,0,0.36)'}}>
            <PlatformIcon platform={p} size={50}/>
          </div>
        </div>
      ))}

      <div style={{
        position:'absolute',
        left:'50%',
        top:'50%',
        translate:'-50% -50%',
        width:20+point*700,
        height:20+point*700,
        borderRadius:'50%',
        background:'radial-gradient(circle, rgba(155,115,255,0.36) 0%, rgba(91,168,255,0.16) 34%, rgba(87,224,255,0.05) 52%, transparent 72%)',
        filter:'blur(20px)',
        opacity:point
      }}/>

      <div style={{display:'flex',flexDirection:'column',alignItems:'center',translate:'0 -24px'}}>
        <Img src={staticFile(ASSETS.argonIcon)} style={{
          width:172,
          height:172,
          borderRadius:38,
          opacity:logo,
          scale:0.76+logo*0.24,
          boxShadow:'0 30px 110px rgba(0,0,0,0.48),0 0 84px rgba(128,112,255,0.22)'
        }}/>
        <div style={{marginTop:30,fontFamily:FONT_STACK,color:COLORS.text,fontWeight:790,fontSize:80,letterSpacing:-3.5,opacity:copy}}>Argon</div>
        <div style={{marginTop:12,fontFamily:FONT_STACK,color:COLORS.secondary,fontWeight:560,fontSize:30,letterSpacing:-0.8,opacity:copy}}>Post once. Everywhere.</div>
      </div>
    </AbsoluteFill>
  );
};
