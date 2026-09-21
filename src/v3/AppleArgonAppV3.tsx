import React from 'react';
import {Img,interpolate,staticFile,useCurrentFrame} from 'remotion';
import {Platform,PlatformIcon,PLATFORM_LABELS} from '../components/PlatformIcon';
import {V3,V3_ASSETS,V3_CLAMP,V3_FONT} from './constantsV3';

export type V3AppState='drop'|'loaded'|'editing'|'ready'|'sending'|'success';

const platforms:Platform[]=['tiktok','instagram','youtube','facebook'];

const GlassSegment:React.FC<{selected:number}> = ({selected}) => {
  const frame=useCurrentFrame();
  const x=interpolate(selected,[0,3],[0,225],V3_CLAMP);
  const pulse=0.5+0.5*Math.sin(frame*0.15);
  return (
    <div style={{position:'relative',height:56,borderRadius:20,padding:4,display:'flex',alignItems:'center',background:'rgba(240,240,243,.68)',border:'1px solid rgba(255,255,255,.86)',boxShadow:'inset 1px 1px 0 rgba(255,255,255,.92), inset -1px -1px 0 rgba(255,255,255,.35), 0 8px 24px rgba(0,0,0,.07)',overflow:'hidden'}}>
      <div style={{position:'absolute',left:4+x,top:4,width:75,height:48,borderRadius:16,background:'rgba(255,255,255,.90)',border:'1px solid rgba(255,255,255,.95)',boxShadow:'inset 1px 1px rgba(255,255,255,.95), inset 0 -6px 14px rgba(60,60,67,.035), 0 5px 14px rgba(0,0,0,.08)',scale:String(1+pulse*0.008)+' '+String(1-pulse*0.004)}}/>
      {platforms.map((p,i)=><div key={p} style={{position:'relative',zIndex:2,width:75,height:48,display:'grid',placeItems:'center',opacity:i===selected?1:.64,scale:i===selected?1.04:1}}><PlatformIcon platform={p} size={26}/></div>)}
    </div>
  );
};

const Field:React.FC<{label:string;value:string;active?:boolean;height?:number}> = ({label,value,active=false,height=48}) => (
  <div>
    <div style={{fontSize:10.5,fontWeight:700,letterSpacing:.9,textTransform:'uppercase',color:active?V3.blue:V3.soft,marginBottom:7}}>{label}</div>
    <div style={{height,borderRadius:15,border:'1px solid '+(active?'rgba(0,113,227,.36)':V3.lineSoft),background:V3.surface,padding:height>50?'12px 14px':'0 14px',display:'flex',alignItems:height>50?'flex-start':'center',fontSize:13,color:value?V3.text:V3.soft,lineHeight:1.4,boxShadow:active?'0 0 0 3px rgba(0,113,227,.08)':'none',overflow:'hidden'}}>
      {value || ' '}
      {active && <span style={{display:'inline-block',width:1.5,height:17,background:V3.blue,marginLeft:2}}/>}
    </div>
  </div>
);

export const AppleArgonAppV3:React.FC<{
  state:V3AppState;
  title?:string;
  description?:string;
  hashtags?:string;
  selectedPlatform?:number;
  width?:number;
  height?:number;
  buttonPress?:number;
}> = ({
  state,
  title='One video. Everywhere.',
  description='A cleaner way to publish without repeating yourself.',
  hashtags='#launch #creator #product',
  selectedPlatform=0,
  width=850,
  height=610,
  buttonPress=0,
}) => {
  const frame=useCurrentFrame();
  const edit=['editing','ready','sending','success'].includes(state);
  const loaded=state!=='drop';
  const sending=state==='sending';
  const success=state==='success';
  const progress=sending?interpolate(frame%120,[0,119],[12,94],V3_CLAMP):success?100:0;

  return (
    <div style={{width,height,borderRadius:34,overflow:'hidden',background:V3.surface,border:'1px solid '+V3.lineSoft,boxShadow:V3.shadow,fontFamily:V3_FONT,color:V3.text,position:'relative'}}>
      <div style={{height:68,display:'flex',alignItems:'center',padding:'0 22px',borderBottom:'1px solid '+V3.lineSoft,background:'rgba(255,255,255,.96)'}}>
        <Img src={staticFile(V3_ASSETS.argonIcon)} style={{width:34,height:34,borderRadius:9}}/>
        <div style={{marginLeft:11,fontSize:19,fontWeight:760,letterSpacing:-.45}}>Argon</div>
        <div style={{marginLeft:20,height:28,width:1,background:V3.lineSoft}}/>
        <div style={{marginLeft:16,fontSize:12.5,color:V3.muted,fontWeight:560}}>New post</div>
        <div style={{marginLeft:'auto',fontSize:11,color:V3.soft}}>Connected · 4 platforms</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'168px 1fr',height:height-68}}>
        <aside style={{background:V3.surfaceSoft,borderRight:'1px solid '+V3.lineSoft,padding:'18px 12px'}}>
          {['Compose','Library','Connections'].map((item,i)=><div key={item} style={{height:42,borderRadius:13,padding:'0 12px',display:'flex',alignItems:'center',fontSize:12.5,fontWeight:i===0?690:560,color:i===0?V3.text:V3.muted,background:i===0?'rgba(255,255,255,.88)':'transparent',boxShadow:i===0?'0 1px 4px rgba(0,0,0,.05)':'none',marginBottom:5}}>{item}</div>)}
          <div style={{margin:'23px 10px 10px',fontSize:10,color:V3.soft,textTransform:'uppercase',letterSpacing:1,fontWeight:700}}>Destinations</div>
          {platforms.map((p,i)=><div key={p} style={{height:37,display:'flex',alignItems:'center',gap:9,padding:'0 10px',borderRadius:11,color:V3.muted,fontSize:11.5,marginBottom:3}}>
            <PlatformIcon platform={p} size={20}/><span>{PLATFORM_LABELS[p]}</span><span style={{marginLeft:'auto',width:7,height:7,borderRadius:'50%',background:success?V3.green:i<=selectedPlatform?V3.blue:'#c7c7cc'}}/>
          </div>)}
        </aside>

        <main style={{padding:'22px 24px 20px',display:'flex',flexDirection:'column',minWidth:0}}>
          {!edit ? (
            <>
              <div style={{display:'flex',alignItems:'flex-start'}}>
                <div><div style={{fontSize:26,fontWeight:790,letterSpacing:-1}}>Drop it once.</div><div style={{fontSize:13,color:V3.muted,marginTop:4}}>Argon keeps the rest of the workflow together.</div></div>
                <div style={{marginLeft:'auto',width:308}}><GlassSegment selected={Math.min(3,selectedPlatform)}/></div>
              </div>
              <div style={{marginTop:20,flex:1,borderRadius:26,border:loaded?'1.5px solid rgba(52,199,89,.30)':'1.5px dashed rgba(60,60,67,.22)',background:loaded?'linear-gradient(180deg,#fbfffc 0%,#f7fbf8 100%)':'#fafafa',display:'grid',placeItems:'center',position:'relative',overflow:'hidden'}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                  <div style={{width:68,height:68,borderRadius:20,display:'grid',placeItems:'center',background:loaded?'#eaf8ee':'#f0f0f2',color:loaded?V3.green:V3.blue,fontSize:28,fontWeight:800,boxShadow:'inset 0 0 0 1px rgba(60,60,67,.05)'}}>{loaded?'✓':'↑'}</div>
                  <div style={{marginTop:16,fontSize:18,fontWeight:740,letterSpacing:-.35}}>{loaded?'video.mp4 ready':'Drop video here'}</div>
                  <div style={{marginTop:7,fontSize:12,color:V3.soft}}>{loaded?'18.4 MB · 00:31':'MP4, MOV or WebM'}</div>
                </div>
              </div>
              <div style={{marginTop:16,height:52,borderRadius:16,display:'grid',placeItems:'center',fontSize:13.5,fontWeight:700,color:loaded?'#fff':V3.soft,background:loaded?V3.blue:'#ececf0',boxShadow:loaded?'0 10px 26px rgba(0,113,227,.18)':'none'}}>Continue</div>
            </>
          ) : (
            <>
              <div style={{display:'flex',alignItems:'center'}}>
                <div><div style={{fontSize:26,fontWeight:790,letterSpacing:-1}}>Write it once.</div><div style={{fontSize:13,color:V3.muted,marginTop:4}}>One title, one caption, every destination.</div></div>
                <div style={{marginLeft:'auto',width:308}}><GlassSegment selected={Math.min(3,selectedPlatform)}/></div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 190px',gap:14,marginTop:18,flex:1}}>
                <div style={{display:'grid',gap:11}}>
                  <Field label="Title" value={title} active={state==='editing' && title.length<20}/>
                  <Field label="Description" value={description} active={state==='editing' && title.length>=20 && description.length<45} height={72}/>
                  <Field label="Hashtags" value={hashtags} active={state==='editing' && description.length>=45}/>
                </div>
                <div style={{borderRadius:22,background:'#fafafa',border:'1px solid '+V3.lineSoft,padding:12}}>
                  <div style={{fontSize:10,color:V3.soft,textTransform:'uppercase',letterSpacing:.95,fontWeight:700,margin:'2px 4px 9px'}}>Publish to</div>
                  {platforms.map((p,i)=>{
                    const on=i<=selectedPlatform;
                    return <div key={p} style={{height:50,borderRadius:14,display:'flex',alignItems:'center',gap:9,padding:'0 10px',marginBottom:6,background:on?'#fff':'transparent',border:on?'1px solid '+V3.lineSoft:'1px solid transparent',boxShadow:on?'0 4px 12px rgba(0,0,0,.04)':'none',opacity:on?1:.48}}>
                      <PlatformIcon platform={p} size={24}/><span style={{fontSize:11.2,fontWeight:650}}>{PLATFORM_LABELS[p]}</span><span style={{marginLeft:'auto',width:18,height:18,borderRadius:'50%',display:'grid',placeItems:'center',background:success?V3.green:on?V3.blue:'#d1d1d6',color:'#fff',fontSize:10,fontWeight:800}}>{success?'✓':on?'✓':''}</span>
                    </div>
                  })}
                </div>
              </div>

              <div style={{height:56,borderRadius:17,display:'grid',placeItems:'center',position:'relative',overflow:'hidden',fontSize:14,fontWeight:760,color:'#fff',background:success?V3.green:V3.blue,boxShadow:success?'0 12px 28px rgba(52,199,89,.18)':'0 12px 30px rgba(0,113,227,.22)',scale:1-buttonPress*.035,translate:'0 '+String(-2*(1-buttonPress))+'px'}}>
                {(sending||success) && <div style={{position:'absolute',left:0,bottom:0,height:4,width:String(progress)+'%',background:'rgba(255,255,255,.92)'}}/>}
                {success?'Published everywhere ✓':sending?'Spreading…':'Spread'}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
