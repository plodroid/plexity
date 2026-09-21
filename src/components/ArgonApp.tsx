import React from 'react';
import {Img, staticFile} from 'remotion';
import {ASSETS, COLORS, FONT_STACK} from '../constants';
import {PlatformIcon, Platform, PLATFORM_LABELS} from './PlatformIcon';

const PLATFORMS: Platform[] = ['tiktok','instagram','youtube','facebook'];

export type ArgonState = 'drop' | 'loaded' | 'edit' | 'ready' | 'spreading' | 'success';

export const ArgonApp: React.FC<{
  state: ArgonState;
  title?: string;
  description?: string;
  hashtags?: string;
  activePlatforms?: number;
  spreadGlow?: number;
  width?: number;
  height?: number;
}> = ({
  state,
  title='One video. Everywhere.',
  description='A cleaner way to publish across every platform.',
  hashtags='#creator #product #launch',
  activePlatforms=4,
  spreadGlow=0,
  width=820,
  height=620,
}) => {
  const showForm = ['edit','ready','spreading','success'].includes(state);
  const loaded = state !== 'drop';
  const success = state === 'success';

  return (
    <div style={{width,height,borderRadius:30.0,overflow:'hidden',background:'linear-gradient(180deg,rgba(15,20,31,0.97),rgba(8,11,18,0.98))',border:'1px solid rgba(255,255,255,0.12)',boxShadow:'0 44px 120px rgba(0,0,0,0.48), inset 0 1px rgba(255,255,255,0.04)',fontFamily:FONT_STACK,color:COLORS.text}}>
      <div style={{height:72.0,display:'flex',alignItems:'center',padding:'0 24px',borderBottom:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.015)'}}>
        <Img src={staticFile(ASSETS.argonIcon)} style={{width:36.0,height:36.0,borderRadius:9.0}}/>
        <div style={{marginLeft:12.0,fontWeight:760,fontSize:20.0,letterSpacing:-0.45}}>Argon</div>
        <div style={{marginLeft:'auto',fontSize:12.0,color:COLORS.tertiary,letterSpacing:0.2}}>Publish workspace</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'180px 1fr',height:height-72.0}}>
        <div style={{padding:'22px 16px',borderRight:'1px solid rgba(255,255,255,0.07)',background:'rgba(255,255,255,0.012)'}}>
          {['New post','Library','Connections'].map((item,index)=><div key={item} style={{height:42.0,padding:'0 12px',display:'flex',alignItems:'center',borderRadius:10.0,marginBottom:6.0,background:index===0?'rgba(255,255,255,0.07)':'transparent',color:index===0?COLORS.text:COLORS.tertiary,fontSize:13.0,fontWeight:index===0?650:540}}>{item}</div>)}
          <div style={{margin:'24px 10px 10px',fontSize:10.0,color:COLORS.tertiary,textTransform:'uppercase',letterSpacing:1.0}}>Platforms</div>
          {PLATFORMS.map((platform,index)=><div key={platform} style={{display:'flex',alignItems:'center',gap:9.0,padding:'7px 10px',opacity:index<activePlatforms?1:0.34}}><PlatformIcon platform={platform} size={22}/><span style={{fontSize:12.0,color:index<activePlatforms?COLORS.secondary:COLORS.tertiary}}>{PLATFORM_LABELS[platform]}</span></div>)}
        </div>

        <div style={{padding:'24px 26px 22px',display:'flex',flexDirection:'column',minWidth:0}}>
          {!showForm ? (
            <>
              <div style={{fontSize:25.0,fontWeight:760,letterSpacing:-0.75}}>Create a post</div>
              <div style={{marginTop:5.0,fontSize:13.0,color:COLORS.tertiary}}>Drop once. Publish everywhere.</div>
              <div style={{marginTop:22.0,flex:1,borderRadius:22.0,border:loaded?'1px solid rgba(104,229,162,0.34)':'1px dashed rgba(255,255,255,0.18)',background:loaded?'linear-gradient(180deg,rgba(104,229,162,0.08),rgba(255,255,255,0.02))':'rgba(255,255,255,0.018)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 50% 70%,rgba(91,168,255,0.08),transparent 46%)'}}/>
                <div style={{width:64.0,height:64.0,borderRadius:18.0,display:'grid',placeItems:'center',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.11)',fontSize:28.0}}>{loaded?'✓':'↑'}</div>
                <div style={{marginTop:16.0,fontSize:18.0,fontWeight:700,letterSpacing:-0.35}}>{loaded?'video.mp4 ready':'Drop video here'}</div>
                <div style={{marginTop:7.0,fontSize:12.0,color:COLORS.tertiary}}>{loaded?'18.4 MB · 00:31':'MP4, MOV or WebM'}</div>
              </div>
              <div style={{height:54.0,marginTop:18.0,borderRadius:15.0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14.0,fontWeight:700,color:loaded?COLORS.text:COLORS.tertiary,background:loaded?'linear-gradient(90deg,rgba(91,168,255,0.30),rgba(155,115,255,0.30))':'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}>Continue</div>
            </>
          ) : (
            <>
              <div style={{fontSize:25.0,fontWeight:760,letterSpacing:-0.75}}>Ready to spread</div>
              <div style={{marginTop:5.0,fontSize:13.0,color:COLORS.tertiary}}>Write it once. Argon keeps every destination in sync.</div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 170px',gap:14.0,marginTop:20.0}}>
                <div style={{display:'grid',gap:12.0}}>
                  <Field label="Title" value={title}/>
                  <Field label="Description" value={description} tall/>
                  <Field label="Hashtags" value={hashtags}/>
                </div>
                <div style={{borderRadius:18.0,border:'1px solid rgba(255,255,255,0.08)',padding:14.0,background:'rgba(255,255,255,0.02)'}}>
                  <div style={{fontSize:10.0,color:COLORS.tertiary,textTransform:'uppercase',letterSpacing:1.0,marginBottom:10.0}}>Destinations</div>
                  {PLATFORMS.map((platform,index)=>{
                    const active=index<activePlatforms;
                    return <div key={platform} style={{height:48.0,display:'flex',alignItems:'center',gap:9.0,borderRadius:12.0,padding:'0 10px',marginBottom:7.0,background:active?'rgba(255,255,255,0.055)':'rgba(255,255,255,0.015)',border:active?'1px solid rgba(255,255,255,0.09)':'1px solid rgba(255,255,255,0.04)',opacity:active?1:0.36}}>
                      <PlatformIcon platform={platform} size={23}/>
                      <div style={{fontSize:11.5,fontWeight:620,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{PLATFORM_LABELS[platform]}</div>
                      <div style={{marginLeft:'auto',width:8.0,height:8.0,borderRadius:'50%',background:success?COLORS.green:active?COLORS.blue:'rgba(255,255,255,0.12)',boxShadow:success?'0 0 14px rgba(104,229,162,0.62)':'none'}}/>
                    </div>;
                  })}
                </div>
              </div>

              <div style={{marginTop:'auto',height:58.0,borderRadius:16.0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15.0,fontWeight:760,letterSpacing:-0.2,background:success?'linear-gradient(90deg,#2C805E,#316F67)':'linear-gradient(90deg,#5AA8FF 0%,#777BFF 42%,#9B73FF 100%)',boxShadow:`0 0 ${28.0 + spreadGlow*42.0}px rgba(120,110,255,${0.14+spreadGlow*0.22})`,border:'1px solid rgba(255,255,255,0.12)'}}>{success?'Published everywhere ✓':state==='spreading'?'Spreading…':'Spread'}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{label:string;value:string;tall?:boolean}> = ({label,value,tall=false}) => (
  <div>
    <div style={{fontSize:10.0,color:COLORS.tertiary,textTransform:'uppercase',letterSpacing:1.0,marginBottom:7.0}}>{label}</div>
    <div style={{height:tall?68.0:46.0,borderRadius:12.0,border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.025)',padding:tall?'12px 13px':'0 13px',display:'flex',alignItems:tall?'flex-start':'center',color:value?COLORS.text:COLORS.tertiary,fontSize:12.5,lineHeight:1.45,overflow:'hidden'}}>{value || ' '}</div>
  </div>
);
