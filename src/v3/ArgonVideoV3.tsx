import React from 'react';
import {AbsoluteFill,Img,Sequence,interpolate,staticFile,useCurrentFrame} from 'remotion';
import {Platform,PlatformIcon,PLATFORM_LABELS} from '../components/PlatformIcon';
import {VideoThumbnail} from '../components/VideoThumbnail';
import {AppleBackgroundV3,WhiteFlashV3} from './AppleBackgroundV3';
import {AppleArgonAppV3} from './AppleArgonAppV3';
import {MorphCursorV3} from './MorphCursorV3';
import {SoundtrackV3} from './SoundtrackV3';
import {V3,V3_ASSETS,V3_BEAT_FRAMES,V3_CLAMP,V3_EASE,V3_FONT,V3_IOS,v3SceneDuration,v3SceneStart} from './constantsV3';

const lb=(n:number)=>n*V3_BEAT_FRAMES;
const platforms:Platform[]=['tiktok','instagram','youtube','facebook'];

const Title:React.FC<{children:React.ReactNode;size?:number;align?:'left'|'center';color?:string}> = ({children,size=76,align='center',color=V3.text}) => (
  <div style={{fontFamily:V3_FONT,fontSize:size,fontWeight:800,lineHeight:.94,letterSpacing:-3.2,textAlign:align,color}}>{children}</div>
);
const Sub:React.FC<{children:React.ReactNode;size?:number;align?:'left'|'center'}> = ({children,size=25,align='center'}) => (
  <div style={{fontFamily:V3_FONT,fontSize:size,fontWeight:560,lineHeight:1.28,letterSpacing:-.55,textAlign:align,color:V3.muted}}>{children}</div>
);

const OldUpload:React.FC<{platform:Platform;progress:number;error?:boolean;caption?:string}> = ({platform,progress,error=false,caption='One video. Everywhere.'}) => (
  <div style={{width:330,height:205,borderRadius:26,background:'#fff',border:'1px solid '+V3.lineSoft,boxShadow:'0 18px 48px rgba(0,0,0,.09)',padding:18,fontFamily:V3_FONT,color:V3.text}}>
    <div style={{display:'flex',alignItems:'center',gap:10}}>
      <PlatformIcon platform={platform} size={30}/>
      <div style={{fontSize:15,fontWeight:720}}>{PLATFORM_LABELS[platform]}</div>
      <div style={{marginLeft:'auto',fontSize:10,color:V3.soft,textTransform:'uppercase',letterSpacing:.8}}>Upload</div>
    </div>
    <div style={{marginTop:15,height:44,borderRadius:13,background:'#f5f5f7',border:'1px solid '+V3.lineSoft,padding:'0 12px',display:'flex',alignItems:'center',fontSize:11.5,color:V3.muted}}>{caption}</div>
    <div style={{marginTop:13,height:8,borderRadius:999,background:'#e9e9ed',overflow:'hidden'}}>
      <div style={{height:'100%',width:String(progress)+'%',background:error?V3.red:V3.blue,borderRadius:999}}/>
    </div>
    <div style={{marginTop:11,fontSize:11,color:error?V3.red:V3.soft}}>{error?'Upload failed':'Uploading…'}</div>
  </div>
);

const SceneHook:React.FC=()=>{
  const f=useCurrentFrame();
  const tileScale=interpolate(f,[lb(.3),lb(1.1),lb(3.8),lb(5.8)],[.72,1,1,.70],{...V3_CLAMP,easing:V3_EASE,output:'perceptual-scale'});
  const title1=interpolate(f,[lb(.4),lb(1.1),lb(2.7),lb(3.4)],[0,1,1,0],V3_CLAMP);
  const title2=interpolate(f,[lb(5.4),lb(6.1)],[0,1],{...V3_CLAMP,easing:V3_EASE});
  const split=interpolate(f,[lb(3.5),lb(5.8)],[0,1],{...V3_CLAMP,easing:V3_IOS});
  const pos=[[-225,-132],[225,-132],[-225,132],[225,132]];
  return <AbsoluteFill>
    <div style={{position:'absolute',left:70,right:70,top:90,opacity:title1}}><Title>You made one video.</Title></div>
    {platforms.map((p,i)=>{
      const x=pos[i][0]*split;
      const y=pos[i][1]*split;
      const badge=interpolate(f,[lb(4.5+i*.35),lb(5.15+i*.35)],[0,1],{...V3_CLAMP,easing:V3_EASE});
      const tinySwing=Math.sin((f+i*8)/18)*1.6*split;
      return <div key={p} style={{position:'absolute',left:'50%',top:'50%',translate:'calc(-50% + '+String(x)+'px) calc(-50% + '+String(y)+'px)',scale:tileScale,rotate:String(tinySwing)+'deg'}}>
        <div style={{position:'relative'}}>
          <VideoThumbnail width={330} height={228} glow={0}/>
          <div style={{position:'absolute',right:-18,top:-18,width:62,height:62,borderRadius:20,display:'grid',placeItems:'center',background:'#fff',border:'1px solid '+V3.lineSoft,boxShadow:'0 14px 34px rgba(0,0,0,.12)',opacity:badge,scale:.76+badge*.24}}>
            <PlatformIcon platform={p} size={35}/>
          </div>
        </div>
      </div>;
    })}
    <div style={{position:'absolute',left:70,right:70,bottom:76,opacity:title2}}>
      <Title>Now do it four times.</Title><div style={{marginTop:12}}><Sub>Same file. Four separate uploads.</Sub></div>
    </div>
  </AbsoluteFill>;
};

const SceneProblem:React.FC=()=>{
  const f=useCurrentFrame();
  const stage=interpolate(f,[lb(0),lb(20)],[0,1],V3_CLAMP);
  const cards=[
    {p:'tiktok' as Platform,x:88,y:286,r:-4.0},
    {p:'instagram' as Platform,x:258,y:330,r:-1.2},
    {p:'youtube' as Platform,x:426,y:370,r:1.4},
    {p:'facebook' as Platform,x:596,y:410,r:4.2},
  ];
  const cursorX=interpolate(f,[lb(4),lb(6),lb(7.5),lb(9),lb(10.5),lb(12),lb(14)],[745,520,760,575,820,645,770],{...V3_CLAMP,easing:[V3_EASE,V3_EASE,V3_EASE,V3_EASE,V3_EASE,V3_EASE]});
  const cursorY=interpolate(f,[lb(4),lb(6),lb(7.5),lb(9),lb(10.5),lb(12),lb(14)],[755,610,655,625,680,690,625],{...V3_CLAMP,easing:[V3_EASE,V3_EASE,V3_EASE,V3_EASE,V3_EASE,V3_EASE]});
  const phase=f<lb(6)?0:f<lb(13)?1:2;
  const label=phase===0?'Open every app.':phase===1?'Copy. Paste. Repeat.':'Slow. Inconsistent.';
  const labelOpacity=interpolate(f,[lb(.3),lb(1),lb(18.8),lb(19.6)],[0,1,1,0],V3_CLAMP);
  const desat=interpolate(f,[lb(14),lb(18)],[0,.42],V3_CLAMP);
  return <AbsoluteFill style={{filter:'saturate('+String(1-desat)+')'}}>
    <div style={{position:'absolute',left:66,right:66,top:72,opacity:labelOpacity}}><Title size={70}>{label}</Title></div>
    {cards.map((c,i)=>{
      const enter=interpolate(f,[lb(i*.75),lb(.8+i*.75)],[0,1],{...V3_CLAMP,easing:V3_IOS});
      const progress=phase===0?22+i*7:phase===1?48+i*9:74-i*5;
      const jitter=phase===2?Math.sin((f+i*11)/5)*2:0;
      return <div key={c.p} style={{position:'absolute',left:c.x+jitter,top:c.y+jitter*.3,rotate:String(c.r+jitter*.2)+'deg',opacity:enter,translate:'0 '+String((1-enter)*90)+'px'}}>
        <OldUpload platform={c.p} progress={progress} error={phase===2&&i===2} caption={phase===1&&i%2===1?'#launch #creator #product':'One video. Everywhere.'}/>
      </div>;
    })}
    <div style={{position:'absolute',left:284,top:728,width:512,height:58,borderRadius:16,background:'#fff',border:'1px solid '+V3.lineSoft,boxShadow:'0 12px 30px rgba(0,0,0,.08)',display:'flex',alignItems:'center',padding:'0 16px',fontFamily:V3_FONT,fontSize:13,color:V3.muted,opacity:phase>0?1:0}}>
      {phase===2?'#launch #creator #product':'One video. Everywhere.'}
      <div style={{marginLeft:'auto',padding:'5px 8px',borderRadius:9,background:'#f5f5f7',fontSize:10,color:V3.soft}}>⌘ C / ⌘ V</div>
    </div>
    <MorphCursorV3 x={cursorX} y={cursorY} mode={phase===1?'text':'arrow'} opacity={interpolate(f,[lb(3.5),lb(4.2),lb(16),lb(17)],[0,1,1,0],V3_CLAMP)} velocity={Math.abs(Math.sin(f*.11))}/>
    {phase===2 && <div style={{position:'absolute',right:76,bottom:86,fontFamily:V3_FONT,fontSize:19,fontWeight:760,color:V3.red,translate:'0 '+String(Math.sin(f*.22)*2)+'px'}}>Upload failed</div>}
  </AbsoluteFill>;
};

const SceneReveal:React.FC=()=>{
  const f=useCurrentFrame();
  const collapse=interpolate(f,[lb(.2),lb(2.6)],[0,1],{...V3_CLAMP,easing:V3_IOS});
  const logo=interpolate(f,[lb(2.2),lb(3.6)],[0,1],{...V3_CLAMP,easing:V3_EASE});
  const copy=interpolate(f,[lb(3.5),lb(4.7)],[0,1],{...V3_CLAMP,easing:V3_EASE});
  const orbit=[[-260,-130],[260,-130],[-260,130],[260,130]];
  return <AbsoluteFill style={{display:'grid',placeItems:'center'}}>
    {platforms.map((p,i)=><div key={p} style={{position:'absolute',left:'50%',top:'50%',translate:'calc(-50% + '+String(orbit[i][0]*(1-collapse))+'px) calc(-50% + '+String(orbit[i][1]*(1-collapse))+'px)',scale:1-collapse*.72,opacity:1-collapse}}>
      <div style={{width:84,height:84,borderRadius:26,display:'grid',placeItems:'center',background:'#fff',border:'1px solid '+V3.lineSoft,boxShadow:'0 18px 48px rgba(0,0,0,.10)'}}><PlatformIcon platform={p} size={45}/></div>
    </div>)}
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',translate:'0 -16px'}}>
      <Img src={staticFile(V3_ASSETS.argonIcon)} style={{width:178,height:178,borderRadius:41,opacity:logo,scale:.74+logo*.26,boxShadow:'0 22px 60px rgba(0,0,0,.14)'}}/>
      <div style={{marginTop:26,opacity:copy}}><Title size={82}>Argon</Title></div>
      <div style={{marginTop:10,opacity:copy}}><Sub size={29}>Post once. Everywhere.</Sub></div>
    </div>
    <WhiteFlashV3 frame={f} at={lb(2.65)}/>
  </AbsoluteFill>;
};

const SceneDrop:React.FC=()=>{
  const f=useCurrentFrame();
  const appIn=interpolate(f,[lb(.1),lb(1.4)],[0,1],{...V3_CLAMP,easing:V3_IOS});
  const drag=interpolate(f,[lb(3),lb(7)],[0,1],{...V3_CLAMP,easing:V3_EASE});
  const dropped=f>=lb(7);
  const fileX=180+(540-180)*drag;
  const fileY=255+(555-255)*drag;
  const ripple=interpolate(f,[lb(7),lb(8.2)],[0,1],V3_CLAMP);
  const selected=Math.min(3,Math.floor(interpolate(f,[lb(9),lb(13)],[0,3.99],V3_CLAMP)));
  return <AbsoluteFill>
    <div style={{position:'absolute',left:68,top:72,opacity:appIn}}><Title align="left" size={66}>Drop it once.</Title><div style={{marginTop:9}}><Sub align="left" size={23}>One file enters the workflow.</Sub></div></div>
    <div style={{position:'absolute',left:'50%',top:'59%',translate:'-50% -50%',scale:.88+appIn*.12,rotate:String((1-appIn)*-2.5)+'deg',opacity:appIn}}>
      <AppleArgonAppV3 state={dropped?'loaded':'drop'} selectedPlatform={selected} width={835} height={600}/>
    </div>
    <div style={{position:'absolute',left:fileX,top:fileY,translate:'-50% -50%',width:182,height:84,borderRadius:22,background:'#fff',border:'1px solid '+V3.lineSoft,boxShadow:'0 18px 45px rgba(0,0,0,.12)',display:'flex',alignItems:'center',padding:'0 14px',gap:12,fontFamily:V3_FONT,opacity:interpolate(f,[lb(2.4),lb(3),lb(6.8),lb(7.5)],[0,1,1,0],V3_CLAMP)}}>
      <div style={{width:44,height:44,borderRadius:14,display:'grid',placeItems:'center',background:'#eaf3ff',color:V3.blue,fontWeight:800}}>▶</div>
      <div><div style={{fontSize:13,fontWeight:720}}>video.mp4</div><div style={{fontSize:10,color:V3.soft,marginTop:3}}>18.4 MB</div></div>
    </div>
    {ripple>0&&ripple<1&&<div style={{position:'absolute',left:540,top:555,translate:'-50% -50%',width:40+ripple*360,height:40+ripple*360,borderRadius:'50%',border:'2px solid rgba(0,113,227,'+String((1-ripple)*.28)+')',opacity:1-ripple}}/>}
    <MorphCursorV3 x={fileX+34} y={fileY+18} mode={drag>.12&&drag<.92?'grab':'arrow'} opacity={interpolate(f,[lb(2.4),lb(3),lb(8.2),lb(9)],[0,1,1,0],V3_CLAMP)} pressed={drag>.18&&drag<.86?1:0} velocity={Math.abs(Math.sin(f*.09))}/>
  </AbsoluteFill>;
};

const typed=(text:string,f:number,from:number,to:number)=>{
  const n=Math.floor(interpolate(f,[from,to],[0,text.length],V3_CLAMP));
  return text.slice(0,Math.max(0,Math.min(text.length,n)));
};

const SceneWrite:React.FC=()=>{
  const f=useCurrentFrame();
  const title=typed('One video. Everywhere.',f,lb(1.4),lb(5.2));
  const desc=typed('Publish once and keep every destination in sync.',f,lb(5.2),lb(10.8));
  const tags=typed('#launch #creator #product',f,lb(10.8),lb(13.8));
  const selected=Math.min(3,Math.floor(interpolate(f,[lb(12.8),lb(16.5)],[0,3.99],V3_CLAMP)));
  const cx=interpolate(f,[lb(1),lb(3),lb(5.1),lb(7),lb(10.6),lb(12.5),lb(16)],[500,486,485,500,490,720,890],{...V3_CLAMP,easing:[V3_EASE,V3_EASE,V3_EASE,V3_EASE,V3_EASE,V3_EASE]});
  const cy=interpolate(f,[lb(1),lb(3),lb(5.1),lb(7),lb(10.6),lb(12.5),lb(16)],[470,430,510,520,590,280,280],{...V3_CLAMP,easing:[V3_EASE,V3_EASE,V3_EASE,V3_EASE,V3_EASE,V3_EASE]});
  const mode=f<lb(12.2)?'text':'arrow';
  return <AbsoluteFill>
    <div style={{position:'absolute',left:68,top:70}}><Title align="left" size={64}>Write it once.</Title><div style={{marginTop:9}}><Sub align="left" size={23}>Then let the interface do the repetition.</Sub></div></div>
    <div style={{position:'absolute',left:'50%',top:'59%',translate:'-50% -50%',scale:interpolate(f,[lb(0),lb(1)],[.96,1],{...V3_CLAMP,easing:V3_EASE,output:'perceptual-scale'})}}>
      <AppleArgonAppV3 state="editing" title={title} description={desc} hashtags={tags} selectedPlatform={selected} width={835} height={600}/>
    </div>
    <MorphCursorV3 x={cx} y={cy} mode={mode} opacity={interpolate(f,[lb(.7),lb(1.2),lb(16.7),lb(17.4)],[0,1,1,0],V3_CLAMP)} velocity={Math.abs(Math.sin(f*.12))}/>
  </AbsoluteFill>;
};

const SceneSpread:React.FC=()=>{
  const f=useCurrentFrame();
  const clickBeat=4;
  const press=f<=lb(4) ? interpolate(f,[lb(3.6),lb(4)],[0,1],V3_CLAMP) : interpolate(f,[lb(4),lb(4.5)],[1,0],V3_CLAMP);
  const sending=f>=lb(clickBeat)&&f<lb(14);
  const success=f>=lb(14);
  const appScale=interpolate(f,[lb(4),lb(5),lb(13),lb(14.5)],[1,.94,.94,.84],{...V3_CLAMP,easing:[V3_IOS,V3_IOS,V3_EASE],output:'perceptual-scale'});
  const nodes=[
    {p:'tiktok' as Platform,x:160,y:310,b:7},
    {p:'instagram' as Platform,x:920,y:310,b:9},
    {p:'youtube' as Platform,x:160,y:810,b:11},
    {p:'facebook' as Platform,x:920,y:810,b:13},
  ];
  const cursorX=interpolate(f,[lb(1),lb(3.5),lb(4.2),lb(5.2),lb(16),lb(18)],[818,760,760,540,820,840],{...V3_CLAMP,easing:[V3_EASE,V3_EASE,V3_EASE,V3_EASE,V3_EASE]});
  const cursorY=interpolate(f,[lb(1),lb(3.5),lb(4.2),lb(5.2),lb(16),lb(18)],[830,838,838,620,780,760],{...V3_CLAMP,easing:[V3_EASE,V3_EASE,V3_EASE,V3_EASE,V3_EASE]});
  const cursorMode=f<lb(4.25)?'arrow':f<lb(15)?'dot':'arrow';
  return <AbsoluteFill>
    <div style={{position:'absolute',left:70,right:70,top:64,opacity:interpolate(f,[lb(.4),lb(1.1),lb(4.1),lb(4.8)],[0,1,1,0],V3_CLAMP)}}><Title size={72}>One click.</Title><div style={{marginTop:9}}><Sub>Everything else becomes motion.</Sub></div></div>
    <div style={{position:'absolute',left:'50%',top:'59%',translate:'-50% -50%',scale:appScale}}>
      <AppleArgonAppV3 state={success?'success':sending?'sending':'ready'} title="One video. Everywhere." description="Publish once and keep every destination in sync." hashtags="#launch #creator #product" selectedPlatform={3} width={790} height={575} buttonPress={press}/>
    </div>

    {nodes.map((n)=>{
      const p=interpolate(f,[lb(n.b),lb(n.b+1.5)],[0,1],{...V3_CLAMP,easing:V3_IOS});
      const ok=interpolate(f,[lb(n.b+1.35),lb(n.b+1.9)],[0,1],{...V3_CLAMP,easing:V3_EASE});
      const sx=540,sy=620,dx=n.x-sx,dy=n.y-sy,len=Math.hypot(dx,dy),ang=Math.atan2(dy,dx)*180/Math.PI;
      return <React.Fragment key={n.p}>
        <div style={{position:'absolute',left:sx,top:sy,width:len,height:4,borderRadius:999,transformOrigin:'0 50%',rotate:String(ang)+'deg',scale:String(p)+' 1',opacity:p,background:'linear-gradient(90deg,#0a84ff 0%,#0071e3 62%,rgba(0,113,227,.08) 100%)',boxShadow:'0 5px 18px rgba(0,113,227,.18)'}}/>
        <div style={{position:'absolute',left:n.x,top:n.y,translate:'-50% -50%',width:92,height:92,borderRadius:29,display:'grid',placeItems:'center',background:'#fff',border:'1px solid '+V3.lineSoft,boxShadow:'0 18px 48px rgba(0,0,0,.10)',opacity:.18+p*.82,scale:.82+p*.18}}>
          <PlatformIcon platform={n.p} size={49}/>
          <div style={{position:'absolute',right:-6,top:-6,width:29,height:29,borderRadius:'50%',background:V3.green,color:'#fff',display:'grid',placeItems:'center',fontFamily:V3_FONT,fontWeight:900,fontSize:14,opacity:ok,scale:ok}}>✓</div>
        </div>
      </React.Fragment>;
    })}

    <MorphCursorV3 x={cursorX} y={cursorY} mode={cursorMode} opacity={interpolate(f,[lb(.8),lb(1.2),lb(19),lb(20)],[0,1,1,0],V3_CLAMP)} pressed={press} velocity={Math.abs(Math.sin(f*.14))}/>
    <div style={{position:'absolute',left:70,right:70,bottom:64,opacity:interpolate(f,[lb(15),lb(16.2)],[0,1],{...V3_CLAMP,easing:V3_EASE})}}><Title size={70}>Live everywhere.</Title><div style={{marginTop:8}}><Sub size={23}>Drop once. Write once. Spread everywhere.</Sub></div></div>
  </AbsoluteFill>;
};

const SceneCompare:React.FC=()=>{
  const f=useCurrentFrame();
  const split=interpolate(f,[lb(.2),lb(1.1)],[0,1],{...V3_CLAMP,easing:V3_EASE});
  const stats=['4 apps → 1','4 uploads → 1','4 captions → 1'];
  return <AbsoluteFill>
    <div style={{position:'absolute',left:0,top:0,width:'50%',height:'100%',background:'#f0f0f2',overflow:'hidden',opacity:split}}>
      <div style={{position:'absolute',left:54,top:150,rotate:'-3deg'}}><OldUpload platform="tiktok" progress={72}/></div>
      <div style={{position:'absolute',left:112,top:318,rotate:'1deg'}}><OldUpload platform="instagram" progress={83}/></div>
      <div style={{position:'absolute',left:48,top:500,rotate:'-1.5deg'}}><OldUpload platform="youtube" progress={76} error/></div>
      <div style={{position:'absolute',left:118,top:680,rotate:'2.5deg'}}><OldUpload platform="facebook" progress={64}/></div>
    </div>
    <div style={{position:'absolute',right:0,top:0,width:'50%',height:'100%',background:'#fff',overflow:'hidden',opacity:split}}>
      <div style={{position:'absolute',left:270,top:540,translate:'-50% -50%',scale:.62}}><AppleArgonAppV3 state="success" selectedPlatform={3} width={790} height={575}/></div>
    </div>
    <div style={{position:'absolute',left:539,top:75,bottom:75,width:2,background:'linear-gradient(180deg,rgba(60,60,67,0),rgba(60,60,67,.15),rgba(60,60,67,0))'}}/>
    <div style={{position:'absolute',left:84,right:84,top:172,display:'grid',gap:22}}>
      {stats.map((s,i)=>{
        const enter=interpolate(f,[lb(4+i*3),lb(4.85+i*3)],[0,1],{...V3_CLAMP,easing:V3_IOS});
        const shift=(1-enter)*42;
        return <div key={s} style={{height:128,borderRadius:30,background:'#fff',border:'1px solid '+V3.lineSoft,boxShadow:'0 16px 46px rgba(0,0,0,.08)',display:'grid',placeItems:'center',fontFamily:V3_FONT,fontSize:61,fontWeight:820,letterSpacing:-2.5,color:V3.text,opacity:enter,translate:'0 '+String(shift)+'px',scale:.96+enter*.04}}>{s}</div>;
      })}
    </div>
  </AbsoluteFill>;
};

const SceneClose:React.FC=()=>{
  const f=useCurrentFrame();
  const orbit=interpolate(f,[lb(.4),lb(5.8)],[1,0],{...V3_CLAMP,easing:V3_IOS});
  const logo=interpolate(f,[lb(3.4),lb(5.2)],[0,1],{...V3_CLAMP,easing:V3_EASE});
  const copy=interpolate(f,[lb(6),lb(7.3)],[0,1],{...V3_CLAMP,easing:V3_EASE});
  const ring=[[-270,0],[0,-205],[270,0],[0,205]];
  return <AbsoluteFill style={{display:'grid',placeItems:'center'}}>
    {platforms.map((p,i)=>{
      const wobble=Math.sin((f+i*13)/14)*8*orbit;
      return <div key={p} style={{position:'absolute',left:'50%',top:'50%',translate:'calc(-50% + '+String(ring[i][0]*orbit+wobble)+'px) calc(-50% + '+String(ring[i][1]*orbit-wobble*.3)+'px)',scale:.86+(.14*(1-orbit)),opacity:interpolate(f,[lb(.2),lb(1),lb(4.8),lb(6)],[0,1,1,0],V3_CLAMP)}}>
        <div style={{width:78,height:78,borderRadius:24,display:'grid',placeItems:'center',background:'#fff',border:'1px solid '+V3.lineSoft,boxShadow:'0 14px 38px rgba(0,0,0,.09)'}}><PlatformIcon platform={p} size={42}/></div>
      </div>;
    })}
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',translate:'0 -10px'}}>
      <Img src={staticFile(V3_ASSETS.argonIcon)} style={{width:184,height:184,borderRadius:42,opacity:logo,scale:.76+logo*.24,boxShadow:'0 24px 66px rgba(0,0,0,.13)'}}/>
      <div style={{marginTop:28,opacity:logo}}><Title size={84}>Argon</Title></div>
      <div style={{marginTop:12,opacity:copy}}><Sub size={30}>Post once. Everywhere.</Sub></div>
    </div>
    <div style={{position:'absolute',bottom:68,fontFamily:V3_FONT,fontSize:15,color:V3.soft,fontWeight:560,opacity:interpolate(f,[lb(9.5),lb(10.5)],[0,.8],V3_CLAMP)}}>A concept by plodroid.</div>
  </AbsoluteFill>;
};

export const ArgonVideoV3:React.FC=()=>(
  <AbsoluteFill style={{background:V3.bg}}>
    <AppleBackgroundV3/>
    <SoundtrackV3/>
    <Sequence from={v3SceneStart('hook')} durationInFrames={v3SceneDuration('hook')} name="V3 01 Hook"><SceneHook/></Sequence>
    <Sequence from={v3SceneStart('problem')} durationInFrames={v3SceneDuration('problem')} name="V3 02 Problem"><SceneProblem/></Sequence>
    <Sequence from={v3SceneStart('reveal')} durationInFrames={v3SceneDuration('reveal')} name="V3 03 Reveal"><SceneReveal/></Sequence>
    <Sequence from={v3SceneStart('drop')} durationInFrames={v3SceneDuration('drop')} name="V3 04 Drop"><SceneDrop/></Sequence>
    <Sequence from={v3SceneStart('write')} durationInFrames={v3SceneDuration('write')} name="V3 05 Write"><SceneWrite/></Sequence>
    <Sequence from={v3SceneStart('spread')} durationInFrames={v3SceneDuration('spread')} name="V3 06 Spread"><SceneSpread/></Sequence>
    <Sequence from={v3SceneStart('compare')} durationInFrames={v3SceneDuration('compare')} name="V3 07 Compare"><SceneCompare/></Sequence>
    <Sequence from={v3SceneStart('close')} durationInFrames={v3SceneDuration('close')} name="V3 08 Close"><SceneClose/></Sequence>
  </AbsoluteFill>
);
