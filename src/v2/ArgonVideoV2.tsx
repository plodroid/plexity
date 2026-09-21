import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {GradientFog} from '../components/GradientFog';
import {Soundtrack} from '../audio/Soundtrack';
import {sceneDurationFrames, sceneStartFrame} from '../constants';
import {Scene2Problem} from '../scenes/Scene2Problem';
import {Scene4Drop} from '../scenes/Scene4Drop';
import {Scene5Write} from '../scenes/Scene5Write';
import {Scene7Compare} from '../scenes/Scene7Compare';
import {Scene1HookV2} from './Scene1HookV2';
import {Scene3RevealV2} from './Scene3RevealV2';
import {Scene6SpreadV2} from './Scene6SpreadV2';
import {Scene8CloseV2} from './Scene8CloseV2';

export const ArgonVideoV2: React.FC = () => (
  <AbsoluteFill style={{background:'#03050A'}}>
    <GradientFog intensity={1.05}/>
    <Soundtrack/>
    <Sequence from={sceneStartFrame('hook')} durationInFrames={sceneDurationFrames('hook')}><Scene1HookV2/></Sequence>
    <Sequence from={sceneStartFrame('problem')} durationInFrames={sceneDurationFrames('problem')}><Scene2Problem/></Sequence>
    <Sequence from={sceneStartFrame('reveal')} durationInFrames={sceneDurationFrames('reveal')}><Scene3RevealV2/></Sequence>
    <Sequence from={sceneStartFrame('drop')} durationInFrames={sceneDurationFrames('drop')}><Scene4Drop/></Sequence>
    <Sequence from={sceneStartFrame('write')} durationInFrames={sceneDurationFrames('write')}><Scene5Write/></Sequence>
    <Sequence from={sceneStartFrame('spread')} durationInFrames={sceneDurationFrames('spread')}><Scene6SpreadV2/></Sequence>
    <Sequence from={sceneStartFrame('compare')} durationInFrames={sceneDurationFrames('compare')}><Scene7Compare/></Sequence>
    <Sequence from={sceneStartFrame('close')} durationInFrames={sceneDurationFrames('close')}><Scene8CloseV2/></Sequence>
  </AbsoluteFill>
);
