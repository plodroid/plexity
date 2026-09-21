import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {beat, CLAMP, COLORS, EASE_OUT, FONT_STACK} from '../constants';
import {ArgonApp} from '../components/ArgonApp';
import {Cursor} from '../components/Cursor';
import {Platform, PlatformIcon} from '../components/PlatformIcon';
import {Headline, Subline} from '../components/Typography';

const nodes: Array<{p:Platform;x:number;y:number;delay:number}> = [
  {p:'tiktok',x:168,y:330,delay:0.0},
  {p:'instagram',x:912,y:330,delay:0.55},
  {p:'youtube',x:168,y:804,delay:1.10},
  {p:'facebook',x:912,y:804,delay:1.65},
];

export const Scene6SpreadV2: React.FC = () => {
  const frame=useCurrentFrame();
  const click=beat(4.0);
  const pulse=interpolate(frame,[beat(3.7),beat(4.15),beat(4.15),beat(4.8)],[0,1,1,0],CLAMP);
  const appScale=interpolate(frame,[beat(4.0),beat(5.0),beat(10.5),beat(11.4)],[1,0.95,0.95,0.87],{...CLAMP,easing:[EASE_OUT,EASE_OUT,EASE_OUT],output:'perceptual-scale'});
  const heroCopy=interpolate(frame,[beat(0.5),beat(1.35),beat(4.0),beat(4.7)],[0,1,1,0],CLAMP);
  const doneCopy=interpolate(frame,[beat(10.2),beat(11.0)],[0,1],{...CLAMP,easing:EASE_OUT});
  const cursorX=interpolate(frame,[beat(1.0),beat(3.5),beat(4.15),beat(5.0)],[824,750,750,790],{...CLAMP,easing:[EASE_OUT,EASE_OUT,EASE_OUT]});
  const cursorY=interpolate(frame,[beat(1.0),beat(3.5),beat(4.15),beat(5.0)],[804,844,844,808],{...CLAMP,easing:[EASE_OUT,EASE_OUT,EASE_OUT]});

  return (
    <AbsoluteFill>
      <div style={{position:'absolute',left:82,right:82,top:72,opacity:heroCopy}}>
        <Headline size={78}>One click.</Headline>
        <div style={{marginTop:10}}><Subline size={24}>Argon handles the rest.</Subline></div>
      </div>

      <div style={{
        position:'absolute',
        left:'50%',
        top:'58%',
        translate:'-50% -50%',
        scale:appScale,
        filter:`drop-shadow(0 0 ${(22+pulse*34).toFixed(2)}px rgba(122,108,255,${(0.12+pulse*0.22).toFixed(3)}))`
      }}>
        <ArgonApp state={frame>=beat(10.0)?'success':frame>=click?'spreading':'ready'} spreadGlow={pulse} width={760} height={570}/>
      </div>

      {nodes.map((node)=>{
        const start=beat(5.55+node.delay);
        const end=beat(7.0+node.delay);
        const p=interpolate(frame,[start,end],[0,1],{...CLAMP,easing:EASE_OUT});
        const ok=interpolate(frame,[end-beat(0.15),end+beat(0.55)],[0,1],{...CLAMP,easing:EASE_OUT});
        const sx=540, sy=618;
        const dx=node.x-sx, dy=node.y-sy;
        const len=Math.hypot(dx,dy);
        const ang=Math.atan2(dy,dx)*180/Math.PI;
        return <React.Fragment key={node.p}>
          <div style={{
            position:'absolute',left:sx,top:sy,width:len,height:3,
            transformOrigin:'0 50%',rotate:`${ang.toFixed(4)}deg`,
            scale:`${p.toFixed(5)} 1`,
            borderRadius:999,
            opacity:p,
            background:'linear-gradient(90deg, rgba(155,115,255,0.96), rgba(87,224,255,0.74), rgba(255,255,255,0.10))',
            boxShadow:'0 0 20px rgba(116,126,255,0.52)'
          }}/>
          <div style={{
            position:'absolute',left:node.x,top:node.y,translate:'-50% -50%',
            width:96,height:96,borderRadius:30,display:'grid',placeItems:'center',
            background:'rgba(7,10,18,0.96)',border:'1px solid rgba(255,255,255,0.14)',
            boxShadow:'0 26px 76px rgba(0,0,0,0.40),0 0 44px rgba(115,114,255,0.18)',
            opacity:0.22+p*0.78,
            scale:0.86+p*0.14
          }}>
            <PlatformIcon platform={node.p} size={52}/>
            <div style={{
              position:'absolute',right:-7,top:-7,width:31,height:31,borderRadius:'50%',
              display:'grid',placeItems:'center',background:COLORS.green,color:'#05130C',
              fontFamily:FONT_STACK,fontWeight:900,fontSize:16,opacity:ok,scale:ok
            }}>✓</div>
          </div>
        </React.Fragment>;
      })}

      <Cursor x={cursorX} y={cursorY} opacity={interpolate(frame,[beat(0.8),beat(1.2),beat(4.3),beat(5.1)],[0,1,1,0],CLAMP)} pressed={frame>beat(3.85)&&frame<beat(4.18)}/>

      <div style={{position:'absolute',left:80,right:80,bottom:70,opacity:doneCopy}}>
        <Headline size={76}>Live everywhere.</Headline>
        <div style={{marginTop:10}}><Subline size={24}>Drop it once. Write it once. Spread everywhere.</Subline></div>
      </div>
    </AbsoluteFill>
  );
};
