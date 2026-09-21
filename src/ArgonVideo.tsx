import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {GradientFog} from './components/GradientFog';
import {Soundtrack} from './audio/Soundtrack';
import {sceneDurationFrames, sceneStartFrame} from './constants';
import {Scene1Hook} from './scenes/Scene1Hook';
import {Scene2Problem} from './scenes/Scene2Problem';
import {Scene3Reveal} from './scenes/Scene3Reveal';
import {Scene4Drop} from './scenes/Scene4Drop';
import {Scene5Write} from './scenes/Scene5Write';
import {Scene6Spread} from './scenes/Scene6Spread';
import {Scene7Compare} from './scenes/Scene7Compare';
import {Scene8Close} from './scenes/Scene8Close';

export const ArgonVideo: React.FC = () => (
  <AbsoluteFill style={{backgroundColor:'#03050A'}}>
    <GradientFog intensity={1}/>
    <Soundtrack/>
    <Sequence from={sceneStartFrame('hook')} durationInFrames={sceneDurationFrames('hook')} name="01 Hook"><Scene1Hook/></Sequence>
    <Sequence from={sceneStartFrame('problem')} durationInFrames={sceneDurationFrames('problem')} name="02 Problem"><Scene2Problem/></Sequence>
    <Sequence from={sceneStartFrame('reveal')} durationInFrames={sceneDurationFrames('reveal')} name="03 Reveal"><Scene3Reveal/></Sequence>
    <Sequence from={sceneStartFrame('drop')} durationInFrames={sceneDurationFrames('drop')} name="04 Drop it once"><Scene4Drop/></Sequence>
    <Sequence from={sceneStartFrame('write')} durationInFrames={sceneDurationFrames('write')} name="05 Write it once"><Scene5Write/></Sequence>
    <Sequence from={sceneStartFrame('spread')} durationInFrames={sceneDurationFrames('spread')} name="06 One click"><Scene6Spread/></Sequence>
    <Sequence from={sceneStartFrame('compare')} durationInFrames={sceneDurationFrames('compare')} name="07 4 to 1"><Scene7Compare/></Sequence>
    <Sequence from={sceneStartFrame('close')} durationInFrames={sceneDurationFrames('close')} name="08 Close"><Scene8Close/></Sequence>
  </AbsoluteFill>
);
