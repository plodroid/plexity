import React from 'react';
import {Audio} from '@remotion/media';
import {Sequence, interpolate, staticFile} from 'remotion';
import {ASSETS, beat, beatFrame, CLAMP, TOTAL_FRAMES} from '../constants';

const Sfx: React.FC<{atBeat:number; src:string; volume:number; beats?:number}> = ({atBeat,src,volume,beats=0.72}) => (
  <Sequence from={beatFrame(atBeat)} durationInFrames={Math.max(1,beatFrame(beats))}>
    <Audio src={staticFile(src)} volume={volume}/>
  </Sequence>
);

export const Soundtrack: React.FC = () => {
  const typingBeats = [62.4,63.1,63.8,64.5,65.2,66.2,67.0,67.8,68.6,69.4,70.2,71.0];
  return (
    <>
      <Audio
        src={staticFile(ASSETS.music)}
        volume={(f)=>interpolate(f,[0,beat(3.0),beat(121.0),TOTAL_FRAMES],[0.00,0.68,0.68,0.00],CLAMP)}
      />

      {[4.7,5.6,6.5].map((b)=><Sfx key={`dup-${b}`} atBeat={b} src={ASSETS.keyTap} volume={0.055} beats={0.26}/>)}
      {[10.6,11.5,12.4,13.3].map((b)=><Sfx key={`tab-${b}`} atBeat={b} src={ASSETS.keyTap} volume={0.050} beats={0.24}/>)}
      {[17.1,18.0,19.0,20.0].map((b)=><Sfx key={`cp-${b}`} atBeat={b} src={ASSETS.keyTap} volume={0.060} beats={0.24}/>)}
      <Sfx atBeat={27.2} src={ASSETS.glitch} volume={0.075} beats={0.72}/>

      <Sfx atBeat={31.2} src={ASSETS.granular} volume={0.085} beats={2.4}/>
      <Sfx atBeat={35.0} src={ASSETS.uiOpen} volume={0.095} beats={1.0}/>

      <Sfx atBeat={46.0} src={ASSETS.whoosh} volume={0.085} beats={1.7}/>
      <Sfx atBeat={49.2} src={ASSETS.keyTap} volume={0.065} beats={0.28}/>

      {typingBeats.map((b)=><Sfx key={`type-${b}`} atBeat={b} src={ASSETS.keyTap} volume={0.038} beats={0.20}/>)}
      {[71.8,72.7,73.6,74.5].map((b)=><Sfx key={`chip-${b}`} atBeat={b} src={ASSETS.uiOpen} volume={0.038} beats={0.32}/>)}

      <Sfx atBeat={81.6} src={ASSETS.keyTap} volume={0.070} beats={0.24}/>
      {[84.0,84.65,85.30,85.95].map((b)=><Sfx key={`beam-${b}`} atBeat={b} src={ASSETS.whoosh} volume={0.055} beats={1.0}/>)}
      {[85.7,86.35,87.0,87.65].map((b)=><Sfx key={`ok-${b}`} atBeat={b} src={ASSETS.uiOpen} volume={0.060} beats={0.46}/>)}

      {[104.2,106.2,108.2].map((b)=><Sfx key={`compare-${b}`} atBeat={b} src={ASSETS.glitch} volume={0.040} beats={0.38}/>)}
      <Sfx atBeat={122.3} src={ASSETS.uiOpen} volume={0.070} beats={0.8}/>
    </>
  );
};
