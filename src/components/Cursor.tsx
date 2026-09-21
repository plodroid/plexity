import React from 'react';

export const Cursor: React.FC<{x:number; y:number; scale?:number; opacity?:number; pressed?:boolean}> = ({x,y,scale=1,opacity=1,pressed=false}) => (
  <div style={{position:'absolute', left:x, top:y, width:34.0, height:42.0, translate:'-4.00px -4.00px', scale: pressed ? scale * 0.92 : scale, opacity, filter:'drop-shadow(0px 6px 12px rgba(0,0,0,0.36))', transformOrigin:'4px 4px'}}>
    <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 2.5L29.2 23.4L17.6 24.9L23.5 36.6L17.8 39.4L12.2 27.8L4.9 36.8L3 2.5Z" fill="white" stroke="rgba(0,0,0,0.72)" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  </div>
);
