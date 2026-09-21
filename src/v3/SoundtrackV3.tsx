import React from 'react';
import {Audio} from '@remotion/media';
import {Sequence,interpolate,staticFile} from 'remotion';
import {V3_ASSETS,V3_BEAT_FRAMES,V3_CLAMP,V3_TOTAL_FRAMES,v3BeatFrame} from './constantsV3';

const Sfx:React.FC<{beat:number;src:string;volume:number;len?:number}> = ({beat,src,volume,len=.75}) => (
  <Sequence from={v3BeatFrame(beat)} durationInFrames={Math.max(1,Math.round(V3_BEAT_FRAMES*len))}>
    <Audio src={staticFile(src)} volume={volume}/>
  </Sequence>
);

export const SoundtrackV3:React.FC = () => {
  const typing=[55.0,55.5,56.0,56.5,57.0,58.0,58.5,59.0,59.5,60.0,61.0,61.5,62.0,63.0,63.5,64.0];
  return <>
    <Audio
      src={staticFile(V3_ASSETS.music)}
      volume={(f)=>interpolate(f,[0,90,v3BeatFrame(122),V3_TOTAL_FRAMES],[0.20,0.27,0.27,0.00],V3_CLAMP)}
    />

    {[2,3,4,5].map(b=><Sfx key={'hook'+b} beat={b} src={V3_ASSETS.ui} volume={0.13} len={0.32}/>)}
    {[9,10,11,12].map(b=><Sfx key={'tab'+b} beat={b} src={V3_ASSETS.tap} volume={0.12} len={0.22}/>)}
    {[14,15.5,17,18.5,20,21.5].map(b=><Sfx key={'copy'+b} beat={b} src={V3_ASSETS.tap} volume={0.115} len={0.22}/>)}
    <Sfx beat={24.0} src={V3_ASSETS.impact} volume={0.12} len={0.70}/>

    <Sfx beat={28.0} src={V3_ASSETS.transform} volume={0.17} len={2.0}/>
    <Sfx beat={32.0} src={V3_ASSETS.ui} volume={0.16} len={0.80}/>

    <Sfx beat={38.0} src={V3_ASSETS.whoosh} volume={0.17} len={1.4}/>
    <Sfx beat={42.0} src={V3_ASSETS.tap} volume={0.14} len={0.25}/>
    <Sfx beat={44.0} src={V3_ASSETS.ui} volume={0.13} len={0.45}/>

    {typing.map(b=><Sfx key={'type'+b} beat={b} src={V3_ASSETS.tap} volume={0.095} len={0.16}/>)}
    {[64.5,65.5,66.5,67.5].map(b=><Sfx key={'chip'+b} beat={b} src={V3_ASSETS.ui} volume={0.10} len={0.28}/>)}

    <Sfx beat={74.0} src={V3_ASSETS.tap} volume={0.16} len={0.25}/>
    <Sfx beat={74.5} src={V3_ASSETS.transform} volume={0.15} len={1.2}/>
    {[77,79,81,83].map(b=><Sfx key={'beam'+b} beat={b} src={V3_ASSETS.whoosh} volume={0.15} len={0.85}/>)}
    {[78,80,82,84].map(b=><Sfx key={'ok'+b} beat={b} src={V3_ASSETS.ui} volume={0.13} len={0.35}/>)}

    {[98,102,106].map(b=><Sfx key={'compare'+b} beat={b} src={V3_ASSETS.impact} volume={0.09} len={0.34}/>)}
    <Sfx beat={112} src={V3_ASSETS.transform} volume={0.12} len={1.4}/>
    <Sfx beat={121} src={V3_ASSETS.ui} volume={0.13} len={0.60}/>
  </>;
};
