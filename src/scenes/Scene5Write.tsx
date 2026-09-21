import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {beat, CLAMP, EASE_OUT} from '../constants';
import {ArgonApp} from '../components/ArgonApp';
import {getTypedText} from '../components/Typewriter';
import {Headline, Subline} from '../components/Typography';

const TITLE='One video. Everywhere.';
const DESC='Publish once and keep every platform in sync.';
const HASH='#creator #product #launch';

export const Scene5Write: React.FC = () => {
  const frame=useCurrentFrame();
  const title=getTypedText(TITLE,frame,beat(2.1),beat(5.1));
  const desc=getTypedText(DESC,frame,beat(5.5),beat(9.2));
  const hash=getTypedText(HASH,frame,beat(9.5),beat(12.1));
  const activePlatforms=Math.max(0,Math.min(4,Math.floor(interpolate(frame,[beat(11.0),beat(14.5)],[0,4.99],CLAMP))));
  const uiScale=interpolate(frame,[beat(0),beat(1.0)],[0.985,1],{...CLAMP,easing:EASE_OUT,output:'perceptual-scale'});
  const copyOpacity=interpolate(frame,[beat(0.4),beat(1.3)],[0,1],{...CLAMP,easing:EASE_OUT});
  return (
    <AbsoluteFill>
      <div style={{position:'absolute',left:84.0,right:84.0,top:78.0,opacity:copyOpacity}}>
        <Headline align="left" size={74.0}>Write it once.</Headline>
        <div style={{marginTop:12.0}}><Subline align="left" size={26.0}>One title. One description.</Subline></div>
      </div>
      <div style={{position:'absolute',left:'50%',top:'58%',translate:'-50% -50%',scale:uiScale}}>
        <ArgonApp state="edit" title={title} description={desc} hashtags={hash} activePlatforms={activePlatforms} width={820.0} height={620.0}/>
      </div>
    </AbsoluteFill>
  );
};
