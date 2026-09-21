import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {beat, CLAMP, EASE_OUT} from '../constants';
import {VideoThumbnail} from '../components/VideoThumbnail';
import {Headline} from '../components/Typography';

const targets = [
  {x:-220.00,y:-140.00},
  {x:220.00,y:-140.00},
  {x:-220.00,y:140.00},
  {x:220.00,y:140.00},
];

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const introOpacity = interpolate(frame,[beat(0.45),beat(1.35)],[0,1],{...CLAMP,easing:EASE_OUT});
  const text1Opacity = interpolate(frame,[beat(1.2),beat(2.1),beat(4.0),beat(4.7)],[0,1,1,0],{...CLAMP,easing:[EASE_OUT,EASE_OUT,EASE_OUT]});
  const text2Opacity = interpolate(frame,[beat(6.6),beat(7.5)],[0,1],{...CLAMP,easing:EASE_OUT});

  return (
    <AbsoluteFill>
      <div style={{position:'absolute',left:0,top:0,width:'100%',height:'100%',display:'grid',placeItems:'center'}}>
        {targets.map((target,index)=>{
          const start=beat(4.0+index*0.70);
          const end=beat(5.25+index*0.70);
          const x=interpolate(frame,[start,end],[0,target.x],{...CLAMP,easing:EASE_OUT});
          const y=interpolate(frame,[start,end],[0,target.y],{...CLAMP,easing:EASE_OUT});
          const scale=interpolate(frame,[start,end],[1,0.73],{...CLAMP,easing:EASE_OUT,output:'perceptual-scale'});
          const opacity=index===0?introOpacity:interpolate(frame,[start-8.0,start+beat(0.28)],[0,1],{...CLAMP,easing:EASE_OUT});
          return <div key={index} style={{position:'absolute',left:'50%',top:'50%',translate:`calc(-50% + ${x.toFixed(2)}px) calc(-50% + ${y.toFixed(2)}px)`,scale,opacity}}><VideoThumbnail width={330.0} height={228.0} glow={1.15}/></div>;
        })}
      </div>
      <div style={{position:'absolute',left:84.0,right:84.0,top:112.0,opacity:text1Opacity}}><Headline size={78.0}>You made one video.</Headline></div>
      <div style={{position:'absolute',left:84.0,right:84.0,bottom:110.0,opacity:text2Opacity}}><Headline size={78.0}>Now post it four times.</Headline></div>
    </AbsoluteFill>
  );
};
