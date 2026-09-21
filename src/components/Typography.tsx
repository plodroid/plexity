import React from 'react';
import {COLORS, FONT_STACK} from '../constants';

export const Headline: React.FC<{children:React.ReactNode; align?:'left'|'center'; size?:number; opacity?:number}> = ({children,align='center',size=86,opacity=1}) => (
  <div style={{fontFamily:FONT_STACK,fontSize:size,fontWeight:760,lineHeight:0.98,letterSpacing:-3.2,color:COLORS.text,textAlign:align,opacity}}>{children}</div>
);

export const Subline: React.FC<{children:React.ReactNode; align?:'left'|'center'; size?:number; opacity?:number}> = ({children,align='center',size=28,opacity=1}) => (
  <div style={{fontFamily:FONT_STACK,fontSize:size,fontWeight:560,lineHeight:1.2,letterSpacing:-0.55,color:COLORS.secondary,textAlign:align,opacity}}>{children}</div>
);
