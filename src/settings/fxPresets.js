// ── FX presets: factory + user ─────────────────────────────────────────────
// Presets are partial FX objects; applying = shallow merge over current state.
export const INPUT_FX_PRESETS=[
  {name:'Clean',desc:'Flat, untouched input',fx:{gain:1,compEnabled:false,eqEnabled:false,eqLow:0,eqMid:0,eqHigh:0,reverbSend:0,delaySend:0,delayTime:0.375,delayFeedback:0.3,vocalEnabled:false}},
  {name:'Vocal Warm',desc:'Gentle comp + warmth + room',fx:{gain:1,compEnabled:true,compThreshold:-18,compRatio:3,eqEnabled:true,eqLow:2,eqMid:1,eqHigh:1,reverbSend:0.25,delaySend:0,vocalEnabled:true,vocalPreset:'thickener'}},
  {name:'Radio Voice',desc:'Tight, present broadcast sound',fx:{gain:1.1,compEnabled:true,compThreshold:-12,compRatio:6,eqEnabled:true,eqLow:-3,eqMid:3,eqHigh:2,reverbSend:0.08,delaySend:0,vocalEnabled:false}},
  {name:'Lo-Fi',desc:'Squashed + dark + slapback',fx:{gain:1,compEnabled:true,compThreshold:-20,compRatio:8,eqEnabled:true,eqLow:4,eqMid:0,eqHigh:-6,reverbSend:0.1,delaySend:0.2,delayTime:0.11,delayFeedback:0.25,vocalEnabled:true,vocalPreset:'slap'}},
  {name:'Big Room',desc:'Large space for instruments',fx:{gain:1,compEnabled:true,compThreshold:-16,compRatio:2,eqEnabled:false,reverbSend:0.5,delaySend:0.3,delayTime:0.45,delayFeedback:0.35,vocalEnabled:false}},
  {name:'Chorus Dream',desc:'Wide modulated vocal doubling',fx:{gain:1,compEnabled:false,eqEnabled:true,eqLow:0,eqMid:1,eqHigh:2,reverbSend:0.3,delaySend:0,vocalEnabled:true,vocalPreset:'chorus'}},
];

export const TRACK_FX_PRESETS=[
  {name:'Neutral',desc:'Flat track',fx:{volume:0.8,eqEnabled:false,eqLow:0,eqMid:0,eqHigh:0,compEnabled:false,compThreshold:-18,reverbSend:0,delaySend:0,delayTime:0.375,delayFeedback:0.3}},
  {name:'Warm',desc:'Low-end body',fx:{volume:0.85,eqEnabled:true,eqLow:3,eqMid:1,eqHigh:-1,compEnabled:false,reverbSend:0.1,delaySend:0}},
  {name:'Punchy',desc:'Compressed and forward',fx:{volume:0.9,eqEnabled:true,eqLow:1,eqMid:2,eqHigh:1,compEnabled:true,compThreshold:-12,reverbSend:0.05,delaySend:0}},
  {name:'Spacious',desc:'Verb + echo wash',fx:{volume:0.8,eqEnabled:false,compEnabled:false,reverbSend:0.4,delaySend:0.25,delayTime:0.45,delayFeedback:0.35}},
  {name:'Dub',desc:'Heavy feedback echo',fx:{volume:0.85,eqEnabled:true,eqLow:2,eqMid:0,eqHigh:-2,compEnabled:false,reverbSend:0.2,delaySend:0.5,delayTime:0.375,delayFeedback:0.55}},
];

export const VOCAL_PRESETS=[
  {id:'thickener',name:'Thickener',desc:'Short 25ms doubling — fatter vocal, subtle'},
  {id:'slap',name:'Slapback',desc:'110ms rockabilly slap — instant character'},
  {id:'chorus',name:'Chorus',desc:'18ms wide doubling — shimmering width'},
];

const LS_KEY='spool-fx-presets';
export function loadUserPresets(){
  try{
    const s=JSON.parse(localStorage.getItem(LS_KEY));
    if(s&&Array.isArray(s.input)&&Array.isArray(s.track))return s;
  }catch{}
  return{input:[],track:[]};
}
export function saveUserPreset(kind,name,fx){
  const all=loadUserPresets();
  all[kind]=[...all[kind].filter(p=>p.name!==name),{name,desc:'User preset',fx,custom:true}];
  try{localStorage.setItem(LS_KEY,JSON.stringify(all))}catch{}
  return all;
}
export function deleteUserPreset(kind,name){
  const all=loadUserPresets();
  all[kind]=all[kind].filter(p=>p.name!==name);
  try{localStorage.setItem(LS_KEY,JSON.stringify(all))}catch{}
  return all;
}
