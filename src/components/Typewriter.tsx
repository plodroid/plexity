import {interpolate} from 'remotion';
import {CLAMP} from '../constants';

export const getTypedText = (text:string, frame:number, from:number, to:number) => {
  const count = Math.floor(interpolate(frame,[from,to],[0,text.length],CLAMP));
  return text.slice(0, Math.max(0, Math.min(text.length, count)));
};
