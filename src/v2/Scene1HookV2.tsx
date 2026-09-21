import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {beat, CLAMP, EASE_OUT} from '../constants';
import {VideoThumbnail} from '../components/VideoThumbnail';
import {Headline, Subline} from '../components/Typography';
import {Platform, PlatformIcon} from '../components/PlatformIcon';

const items: Array<{platform:Platform;x:number;y:number}> = [
  {platform:'tiktok',x:-230,y:-138},
  {platform:'instagram',x:230,y:-138},
  {platform:'youtube',x:-230,y:138},
  {platform:'facebook',x:230,y:138},
];

export const Scene1HookV2: React.FC = () => {
  const frame=useCurrentFrame();
  const intro=interpolate(frame,[beat(0.45),beat(1.35)],[0,1],{...CLAMP,easing:EASE_OUT});
  const split=interpolate(frame,[beat(4.1),beat(6.4)],[0,1],{...CLAMP,easing:EASE_OUT});
  const copy1=interpolate(frame,[beat(1.2),beat(2.1),beat(4.2),beat(4.8)],[0,1,1,0],CLAMP);
  const copy2=interpolate(frame,[beat(6.6),beat(7.4)],[0,1],{...CLAMP,easing:EASE_OUT});

  return (
    <AbsoluteFill>
      <div style={{position:'absolute',left:74,right:74,top:86,opacity:copy1}}>
        <Headline size={76}>You made one video.</Headline>
      </div>

      <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center'}}>
        {items.map((item,index)=>{
          const x=item.x*split;
          const y=item.y*split;
          const scale=1-(0.29*split);
          const badge=interpolate(frame,[beat(5.7+index*0.22),beat(6.35+index*0.22)],[0,1],{...CLAMP,easing:EASE_OUT});
          return (
            <div key={item.platform} style={{
              position:'absolute',
              left:'50%',
              top:'50%',
              translate:`calc(-50% + ${x.toFixed(2)}px) calc(-50% + ${y.toFixed(2)}px)`,
              scale,
              opacity:intro,
            }}>
              <div style={{position:'relative'}}>
                <VideoThumbnail width={330} height={228} glow={1.1}/>
                <div style={{
                  position:'absolute',
                  right:-18,
                  top:-18,
                  width:64,
                  height:64,
                  borderRadius:20,
                  display:'grid',
                  placeItems:'center',
                  background:'rgba(5,8,14,0.96)',
                  border:'1px solid rgba(255,255,255,0.14)',
                  boxShadow:'0 18px 48px rgba(0,0,0,0.44)',
                  opacity:badge,
                  scale:0.72+badge*0.28
                }}>
                  <PlatformIcon platform={item.platform} size={36}/>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{position:'absolute',left:76,right:76,bottom:78,opacity:copy2}}>
        <Headline size={76}>Now do it four times.</Headline>
        <div style={{marginTop:12}}><Subline size={24}>Same file. Four separate uploads.</Subline></div>
      </div>
    </AbsoluteFill>
  );
};
