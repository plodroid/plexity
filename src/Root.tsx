import React from 'react';
import {Composition, Folder} from 'remotion';
import {ArgonVideo} from './ArgonVideo';
import {ArgonVideoV2} from './v2/ArgonVideoV2';
import {ArgonVideoV3} from './v3/ArgonVideoV3';
import {FPS, HEIGHT, TOTAL_FRAMES, WIDTH, sceneDurationFrames} from './constants';
import {V3_FPS,V3_HEIGHT,V3_TOTAL_FRAMES,V3_WIDTH} from './v3/constantsV3';
import {Scene1Hook} from './scenes/Scene1Hook';
import {Scene2Problem} from './scenes/Scene2Problem';
import {Scene3Reveal} from './scenes/Scene3Reveal';
import {Scene4Drop} from './scenes/Scene4Drop';
import {Scene5Write} from './scenes/Scene5Write';
import {Scene6Spread} from './scenes/Scene6Spread';
import {Scene7Compare} from './scenes/Scene7Compare';
import {Scene8Close} from './scenes/Scene8Close';

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Argon-Scenes">
      <Composition id="Argon-01-Hook" component={Scene1Hook} durationInFrames={sceneDurationFrames('hook')} fps={FPS} width={WIDTH} height={HEIGHT}/>
      <Composition id="Argon-02-Problem" component={Scene2Problem} durationInFrames={sceneDurationFrames('problem')} fps={FPS} width={WIDTH} height={HEIGHT}/>
      <Composition id="Argon-03-Reveal" component={Scene3Reveal} durationInFrames={sceneDurationFrames('reveal')} fps={FPS} width={WIDTH} height={HEIGHT}/>
      <Composition id="Argon-04-Drop" component={Scene4Drop} durationInFrames={sceneDurationFrames('drop')} fps={FPS} width={WIDTH} height={HEIGHT}/>
      <Composition id="Argon-05-Write" component={Scene5Write} durationInFrames={sceneDurationFrames('write')} fps={FPS} width={WIDTH} height={HEIGHT}/>
      <Composition id="Argon-06-Spread" component={Scene6Spread} durationInFrames={sceneDurationFrames('spread')} fps={FPS} width={WIDTH} height={HEIGHT}/>
      <Composition id="Argon-07-Compare" component={Scene7Compare} durationInFrames={sceneDurationFrames('compare')} fps={FPS} width={WIDTH} height={HEIGHT}/>
      <Composition id="Argon-08-Close" component={Scene8Close} durationInFrames={sceneDurationFrames('close')} fps={FPS} width={WIDTH} height={HEIGHT}/>
    </Folder>

    <Composition id="ArgonPromo" component={ArgonVideo} durationInFrames={TOTAL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT}/>
    <Composition id="ArgonPromoV2" component={ArgonVideoV2} durationInFrames={TOTAL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT}/>
    <Composition id="ArgonPromoV3" component={ArgonVideoV3} durationInFrames={V3_TOTAL_FRAMES} fps={V3_FPS} width={V3_WIDTH} height={V3_HEIGHT}/>
  </>
);
