import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {beat, CLAMP, COLORS, EASE_OUT, FONT_STACK} from '../constants';
import {ArgonApp} from '../components/ArgonApp';
import {Cursor} from '../components/Cursor';
import {Headline, Subline} from '../components/Typography';
import {Platform, PlatformIcon} from '../components/PlatformIcon';

const targets: Array<{platform:Platform;x:number;y:number;start:number}> = [
  {platform:'tiktok',x:180.00,y:342.00,start:6.00},
  {platform:'instagram',x:900.00,y:342.00,start:6.65},
  {platform:'youtube',x:180.00,y:798.00,start:7.30},
  {platform:'facebook',x:900.00,y:798.00,start:7.95},
];

const Beam: React.FC<{x:number;y:number;progress:number;opacity:number}> = ({x,y,progress,opacity}) => {
  const sx=540.00, sy=620.00;
  const dx=x-sx, dy=y-sy;
  const length=Math.hypot(dx,dy);
  const angle=Math.atan2(dy,dx)*(180/Math.PI);
  return <div style={{position:'absolute',left:sx,top:sy,width:length,height:3.0,borderRadius:999.0,transformOrigin:'0 50%',rotate:`${angle.toFixed(4)}deg`,scale:`${progress.toFixed(5)} 1`,opacity,background:'linear-gradient(90deg,rgba(155,115,255,0.95),rgba(87,224,255,0.74),rgba(255,255,255,0.10))',boxShadow:'0 0 20px rgba(114,128,255,0.46)'}}/>;
};

export const Scene6Spread: React.FC = () => {
  const frame=useCurrentFrame();
  const clickBeat=4.0;
  const spreading=frame>=beat(clickBeat);
  const allDone=frame>=beat(10.0);
  const cursorX=interpolate(frame,[beat(0.8),beat(3.2),beat(4.0),beat(5.0)],[760.00,748.00,748.00,780.00],{...CLAMP,easing:[EASE_OUT,EASE_OUT,EASE_OUT]});
  const cursorY=interpolate(frame,[beat(0.8),beat(3.2),beat(4.0),beat(5.0)],[828.00,842.00,842.00,816.00],{...CLAMP,easing:[EASE_OUT,EASE_OUT,EASE_OUT]});
  const appScale=interpolate(frame,[beat(4.0),beat(5.0),beat(9.5),beat(10.5)],[1,0.965,0.965,0.91],{...CLAMP,easing:[EASE_OUT,EASE_OUT,EASE_OUT],output:'perceptual-scale'});
  const heroCopyOpacity=interpolate(frame,[beat(0.4),beat(1.3),beat(4.2),beat(4.9)],[0,1,1,0],{...CLAMP,easing:[EASE_OUT,EASE_OUT,EASE_OUT]});
  const doneCopyOpacity=interpolate(frame,[beat(10.0),beat(11.0)],[0,1],{...CLAMP,easing:EASE_OUT});

  return (
    <AbsoluteFill>
      <div style={{position:'absolute',left:84.0,right:84.0,top:70.0,opacity:heroCopyOpacity}}>
        <Headline size={78.0}>One click.</Headline>
      </div>
      <div style={{position:'absolute',left:'50%',top:'59%',translate:'-50% -50%',scale:appScale}}>
        <ArgonApp state={allDone?'success':spreading?'spreading':'ready'} spreadGlow={spreading&&!allDone?1:0.34} width={760.0} height={570.0}/>
      </div>

      {targets.map((target)=>{
        const progress=interpolate(frame,[beat(target.start),beat(target.start+1.55)],[0,1],{...CLAMP,easing:EASE_OUT});
        const iconOpacity=interpolate(frame,[beat(target.start-0.35),beat(target.start+0.45)],[0.18,1],{...CLAMP,easing:EASE_OUT});
        const check=interpolate(frame,[beat(target.start+1.20),beat(target.start+1.80)],[0,1],{...CLAMP,easing:EASE_OUT});
        return <React.Fragment key={target.platform}>
          <Beam x={target.x} y={target.y} progress={progress} opacity={spreading?0.92:0}/>
          <div style={{position:'absolute',left:target.x,top:target.y,translate:'-50% -50%',width:94.0,height:94.0,borderRadius:28.0,display:'grid',placeItems:'center',background:'rgba(7,10,18,0.94)',border:'1px solid rgba(255,255,255,0.13)',boxShadow:'0 24px 70px rgba(0,0,0,0.38),0 0 40px rgba(115,114,255,0.16)',opacity:iconOpacity,scale:0.92+check*0.08}}>
            <PlatformIcon platform={target.platform} size={50.0}/>
            <div style={{position:'absolute',right:-7.0,top:-7.0,width:30.0,height:30.0,borderRadius:'50%',display:'grid',placeItems:'center',background:COLORS.green,color:'#05130C',fontFamily:FONT_STACK,fontWeight:900,fontSize:16.0,opacity:check,scale:check}}>✓</div>
          </div>
        </React.Fragment>;
      })}

      <Cursor x={cursorX} y={cursorY} opacity={interpolate(frame,[beat(0.6),beat(1.0),beat(4.2),beat(5.2)],[0,1,1,0],CLAMP)} pressed={frame>beat(3.85)&&frame<beat(4.15)}/>
      <div style={{position:'absolute',left:84.0,right:84.0,bottom:72.0,opacity:doneCopyOpacity}}><Headline size={76.0}>Live everywhere.</Headline><div style={{marginTop:10.0}}><Subline size={24.0}>Drop it once. Write it once. Spread everywhere.</Subline></div></div>
    </AbsoluteFill>
  );
};
