// -- Settings tab: 8 accordions (per design spec) --
import React,{useState,useEffect,useRef} from 'react';
import {INPUT_FX_PRESETS,TRACK_FX_PRESETS,VOCAL_PRESETS,loadUserPresets,saveUserPreset,deleteUserPreset} from './fxPresets.js';
import InsertRack from './InsertRack.jsx';

// -- Per-channel input meters for multi-input interfaces --
function ChMeters({T,chAnR,chCount}){
  const[levelArr,setLevelArr]=React.useState([]);
  React.useEffect(()=>{
    const data=new Float32Array(256);
    const iv=setInterval(()=>{
      const ans=(chAnR&&chAnR.current)||[];
      setLevelArr(ans.map(an=>{
        if(!an)return 0;
        try{
          an.getFloatTimeDomainData(data);
          let sum=0;for(let i=0;i<data.length;i++)sum+=data[i]*data[i];
          return Math.min(1,Math.sqrt(sum/data.length)*3.5);
        }catch(e){return 0;}
      }));
    },120);
    return()=>clearInterval(iv);
  },[chAnR,chCount]);
  if(!chCount||chCount<1)return null;
  return(
    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
      {Array.from({length:chCount},(_,c)=>{
        const lv=levelArr[c]||0;
        return(
          <div key={c} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,minWidth:44}}>
            <div style={{width:22,height:64,background:'var(--bg)',border:'1px solid '+T.border,borderRadius:4,position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',bottom:0,left:0,right:0,height:Math.round(lv*100)+'%',
                background:lv>0.85?'#ff5252':lv>0.6?'#ffb020':'#d7ff3f',transition:'height 0.1s'}}/>
            </div>
            <div style={{fontSize:9,fontWeight:700,color:lv>0.02?T.green:T.faint,letterSpacing:1}}>CH {c+1}</div>
          </div>
        );
      })}
    </div>
  );
}

function Acc({T,id,title,icon,open,setOpen,children}){
  const isOpen=open===id;
  return(
    <div style={{background:'var(--card)',border:`1px solid ${isOpen?T.green+'55':'var(--border2)'}`,borderRadius:12,marginBottom:10,overflow:'hidden'}}> 
      <button onClick={()=>setOpen(isOpen?null:id)}
        style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'14px 16px',background:isOpen?'rgba(57,255,20,0.06)':'transparent',border:'none',cursor:'pointer',color:T.offwhite}}> 
        <span style={{fontSize:16}}>{icon}</span>
        <span style={{fontSize:12,fontWeight:800,letterSpacing:2,flex:1,textAlign:'left',fontFamily:"'Space Grotesk',sans-serif"}}>{title}</span>
        <span style={{color:T.muted,fontSize:10}}>{isOpen?'▼':'▶'}</span>
      </button>
      {isOpen&&<div style={{padding:'16px',borderTop:'1px solid var(--border)',animation:'fadeUp 0.18s ease'}}>{children}</div>}
    </div>
  );
}

function PresetGrid({T,presets,onApply,onDelete,accent}){
  return(
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:8}}>
      {presets.map(p=>(
        <div key={p.name} style={{background:'var(--bg)',border:`1px solid ${p.custom?'rgba(255,176,32,0.4)':T.border}`,borderRadius:8,padding:'10px 12px'}}>
          <div style={{fontSize:11,fontWeight:800,color:p.custom?'#ffb020':T.offwhite,marginBottom:2}}>{p.name}</div>
          <div style={{fontSize:9,color:T.faint,marginBottom:8,minHeight:24}}>{p.desc}</div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={()=>onApply(p)} style={{flex:1,padding:'6px',borderRadius:5,fontSize:10,fontWeight:700,cursor:'pointer',background:`${accent}14`,border:`1px solid ${accent}55`,color:accent}}>APPLY</button>
            {p.custom&&onDelete&&<button onClick={()=>onDelete(p)} style={{padding:'6px 8px',borderRadius:5,fontSize:10,cursor:'pointer',background:'transparent',border:'1px solid rgba(255,77,77,0.4)',color:'#ff5252'}}>✕</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

// -- Quick FX: 2 assignable slots, 1D slider + 2D XY pad --
const QFX_PARAMS=[
  {id:'volume',label:'Volume',min:0,max:1.5,step:0.01,def:0.8},
  {id:'eqLow',label:'EQ Low',min:-15,max:15,step:0.5,def:0},
  {id:'eqMid',label:'EQ Mid',min:-15,max:15,step:0.5,def:0},
  {id:'eqHigh',label:'EQ High',min:-15,max:15,step:0.5,def:0},
  {id:'reverbSend',label:'Reverb',min:0,max:1,step:0.01,def:0},
  {id:'delaySend',label:'Delay',min:0,max:1,step:0.01,def:0},
  {id:'delayTime',label:'Dly Time',min:0.05,max:1,step:0.01,def:0.375},
  {id:'delayFeedback',label:'Dly Fdbk',min:0,max:0.9,step:0.01,def:0.3},
  {id:'compThreshold',label:'Comp Thr',min:-60,max:0,step:1,def:-18},
];
function qfxVal(tfx,pid){
  const p=QFX_PARAMS.find(q=>q.id===pid); if(!p)return{p:null,v:0};
  return{p,v:tfx?p[pid]??p.def:p.def};
}
function QuickFX({T,track,trackFX,updFX}){
  const[slotA,setSlotA]=useState(()=>{try{return localStorage.getItem('spool-qfx-a')||'reverbSend'}catch{return'reverbSend'}});
  const[slotB,setSlotB]=useState(()=>{try{return localStorage.getItem('spool-qfx-b')||'delaySend'}catch{return'delaySend'}});
  const padRef=useRef(null); const[drag,setDrag]=useState(false);
  useEffect(()=>{try{localStorage.setItem('spool-qfx-a',slotA)}catch{}},[slotA]);
  useEffect(()=>{try{localStorage.setItem('spool-qfx-b',slotB)}catch{}},[slotB]);
  const tfx=trackFX.find(f=>f.id===(track&&track.id));
  const setParam=(pid,v)=>{ if(!track)return; updFX(track.id,pid,v); };
  const padSet=(cx,cy)=>{
    const r=padRef.current.getBoundingClientRect();
    let x=(cx-r.left)/r.width, y=1-(cy-r.top)/r.height;
    x=Math.min(1,Math.max(0,x)); y=Math.min(1,Math.max(0,y));
    const pa=QFX_PARAMS.find(q=>q.id===slotA), pb=QFX_PARAMS.find(q=>q.id===slotB);
    if(pa)setParam(slotA,pa.min+x*(pa.max-pa.min));
    if(pb)setParam(slotB,pb.min+y*(pb.max-pb.min));
  };
  const{a:{p:pa,v:va}}= {a:qfxVal(tfx,slotA)}; const{b:{p:pb,v:vb}}={b:qfxVal(tfx,slotB)};
  const dotX=pa?((va-pa.min)/(pa.max-pa.min)*100):50, dotY=pb?(100-(vb-pb.min)/(pb.max-pb.min)*100):50;
  if(!track)return <div style={{fontSize:11,color:T.faint}}>No track selected.</div>;
  return(
    <div>
      <div style={{fontSize:10,color:T.muted,marginBottom:8}}>Target: <b style={{color:track.color}}>{track.name}</b> — assign each slot a parameter, then ride the slider or XY pad live.</div>
      <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:12}}>
        {[['A',slotA,setSlotA,pa,va,'#d7ff3f'],['B',slotB,setSlotB,pb,vb,'#8f9bff']].map(([s,slot,setSlot,p,v,c])=>(
          <div key={s} style={{flex:1,minWidth:150,background:'var(--bg)',border:`1px solid ${T.border}`,borderRadius:8,padding:10}}>
            <div style={{fontSize:10,fontWeight:800,color:c,marginBottom:6,letterSpacing:2}}>SLOT {s}</div>
            <select value={slot} onChange={e=>setSlot(e.target.value)} style={{width:'100%',background:'var(--card)',border:`1px solid ${T.border}`,borderRadius:6,padding:'8px',color:T.offwhite,fontSize:11,marginBottom:8}}>
              {QFX_PARAMS.map(q=>(<option key={q.id} value={q.id}>{q.label}</option>))}
            </select>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <input type="range" min={p?p.min:0} max={p?p.max:1} step={p?p.step:0.01} value={v} onChange={e=>setParam(slot,parseFloat(e.target.value))} style={{flex:1,accentColor:c}}/>
              <span style={{fontSize:11,color:c,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,minWidth:52,textAlign:'right'}}>{p?(Math.abs(v)>=10?v.toFixed(0):v.toFixed(2)):''}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-start'}}>
        <div>
          <div style={{fontSize:10,fontWeight:800,color:T.muted,letterSpacing:2,marginBottom:6}}>XY PAD — X: SLOT A · Y: SLOT B</div>
          <div ref={padRef} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);setDrag(true);padSet(e.clientX,e.clientY);}} onPointerMove={e=>{if(drag)padSet(e.clientX,e.clientY);}} onPointerUp={()=>setDrag(false)} onPointerCancel={()=>setDrag(false)}
            style={{width:180,height:180,borderRadius:10,border:`1px solid ${T.border}`,background:`linear-gradient(135deg,rgba(46,213,115,0.08),rgba(162,155,254,0.08))`,position:'relative',cursor:'crosshair',touchAction:'none'}}>
            <div style={{position:'absolute',left:0,right:0,top:'50%',height:1,background:T.border}}/>
            <div style={{position:'absolute',top:0,bottom:0,left:'50%',width:1,background:T.border}}/>
            <div style={{position:'absolute',left:`calc(${dotX}% - 8px)`,top:`calc(${dotY}% - 8px)`,width:16,height:16,borderRadius:'50%',background:'#ffb020',boxShadow:'0 0 10px #ffb020'}}/>
            <div style={{position:'absolute',left:6,top:4,fontSize:8,color:'#d7ff3f',fontWeight:800}}>A→</div>
            <div style={{position:'absolute',right:6,top:4,fontSize:8,color:'#8f9bff',fontWeight:800}}>←B</div>
          </div>
        </div>
        <div style={{flex:1,minWidth:160,background:'var(--bg)',border:`1px solid ${T.border}`,borderRadius:8,padding:12}}>
          <div style={{fontSize:10,fontWeight:800,color:T.muted,letterSpacing:2,marginBottom:8}}>LIVE VALUES</div>
          <div style={{fontSize:12,marginBottom:6}}><span style={{color:'#d7ff3f',fontWeight:800}}>A {pa?pa.label:''}:</span> <span style={{fontFamily:"'JetBrains Mono',monospace",color:T.offwhite}}>{pa?(Math.abs(va)>=10?va.toFixed(1):va.toFixed(2)):''}</span></div>
          <div style={{fontSize:12,marginBottom:10}}><span style={{color:'#8f9bff',fontWeight:800}}>B {pb?pb.label:''}:</span> <span style={{fontFamily:"'JetBrains Mono',monospace",color:T.offwhite}}>{pb?(Math.abs(vb)>=10?vb.toFixed(1):vb.toFixed(2)):''}</span></div>
          <div style={{fontSize:9,color:T.faint,lineHeight:1.5}}>Drag on the pad to sweep both parameters at once — made for performance. Slot assignments are remembered.</div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsTab({ctx}){
  const{T,darkMode,Knob}=ctx;
  const{bpm,setBpm,masterVol,setMasterVol,masterInputVol,setMasterInputVol,
    monitorEnabled,setMonitorEnabled,metronomeMode,setMetronomeMode,
    metronomeRoute,setMetronomeRoute,cueOutputId,changeCueOutput,ensureCueCtx,
    inputFX,setInputFX,getFxKey,getFxMidi,setFxKbModal,
    quantize,setQuantize,autoSync,setAutoSync,globalSync,setGlobalSync,setTracks,
    exporting,hasAudio,selectedInput,selectedOutput,devices,changeInput,changeOutput,
    midiEnabled,setMidiAccess,setMidiOutputs,setMidiEnabled,midiInputEnabled,setMidiInputEnabled,setConflictModal,
    tracks,settingsTrackId,setSettingsTrackId,
    trackFX,setTrackFX,upd,updFX,updInsert,updInputInsert,inputChCount,inputChAnR}=ctx;
  const A=ctx.A;
  const[open,setOpen]=useState(()=>{try{return localStorage.getItem('spool-settings-acc')||'tracks'}catch{return'tracks'}});
  const[userPresets,setUserPresets]=useState(loadUserPresets);
  const[saveName,setSaveName]=useState('');
  const[saveKind,setSaveKind]=useState('input');
  useEffect(()=>{try{localStorage.setItem('spool-settings-acc',open||'')}catch{}},[open]);
  const sec=(label)=>(
    <div style={{fontSize:10,fontWeight:700,letterSpacing:4,color:T.offwhite,textTransform:'uppercase',marginBottom:12,marginTop:4,borderBottom:`1px solid ${T.border}`,paddingBottom:6}}>{label}</div>
  );
  const setIFX=(patch)=>setInputFX(p=>({...p,...patch}));
  const doSave=()=>{
    const name=saveName.trim();if(!name)return;
    const fx=saveKind==='input'?{...inputFX}:trackFX.find(f=>f.id===settingsTrackId);
    if(!fx)return;
    const{id,...clean}=fx;
    setUserPresets(saveUserPreset(saveKind,name,clean));
    setSaveName('');
  };
  const selTrack=tracks.find(t=>t.id===settingsTrackId);
  return(
    <div style={{animation:'fadeUp 0.2s ease',maxWidth:860}}>

      <Acc T={T} id="tracks" title="TRACK FX" icon="🎵" open={open} setOpen={setOpen}>

              <div style={{display:'flex',flexDirection:'column',gap:16}}>
                <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:4}}>{tracks.map(t=>{return(<button key={t.id} onClick={()=>setSettingsTrackId(t.id)} style={{padding:'8px 14px',borderRadius:6,fontSize:11,fontWeight:700,flexShrink:0,background:settingsTrackId===t.id?`${t.color}15`:'var(--card)',border:`1px solid ${settingsTrackId===t.id?t.color:T.border}`,color:settingsTrackId===t.id?t.color:T.muted,borderLeft:`3px solid ${t.color}`}}>{t.name}</button>)})}</div>
                {(()=>{const track=tracks.find(t=>t.id===settingsTrackId); if(!track)return null; const tfx=trackFX.find(f=>f.id===track.id); return(<div style={{background:'var(--card)',border:`1px solid ${T.border}`,borderLeft:`4px solid ${track.color}`,borderRadius:10,padding:16}}><div style={{fontSize:14,fontWeight:800,color:track.color,marginBottom:12,fontFamily:"'Space Grotesk',sans-serif"}}>{track.name} — All Per-Track Settings (was gear drawer) — FULLY FUNCTIONAL</div>{sec('Recording')}<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12,marginBottom:16}}><div><div style={{fontSize:10,color:T.muted,marginBottom:6}}>Count-In</div><div style={{display:'flex',gap:4}}>{[{v:0,l:'Off'},{v:1,l:'1 Bar'},{v:2,l:'2 Bars'}].map(({v,l})=>(<button key={v} onClick={()=>upd(track.id,{countIn:v})} style={{padding:'6px 10px',borderRadius:4,fontSize:11,background:track.countIn===v?'rgba(30,144,255,0.15)':'transparent',border:`1px solid ${track.countIn===v?'rgba(30,144,255,0.5)':'var(--border)'}`,color:track.countIn===v?T.blue:T.muted}}>{l}</button>))}</div></div><div><div style={{fontSize:10,color:T.muted,marginBottom:6}}>Auto-Record Bars</div><div style={{display:'flex',gap:4}}>{[{v:0,l:'Off'},{v:1,l:'1'},{v:2,l:'2'},{v:4,l:'4'},{v:8,l:'8'}].map(({v,l})=>(<button key={v} onClick={()=>upd(track.id,{autoRecBars:v})} style={{padding:'6px 8px',borderRadius:4,fontSize:11,background:track.autoRecBars===v&&v>0?'rgba(46,213,115,0.12)':'transparent',border:`1px solid ${track.autoRecBars===v&&v>0?'rgba(46,213,115,0.45)':'var(--border)'}`,color:track.autoRecBars===v&&v>0?T.green:T.muted}}>{l}</button>))}</div></div><div><div style={{fontSize:10,color:T.muted,marginBottom:6}}>Threshold</div><button onClick={()=>upd(track.id,t=>({thresholdRec:!t.thresholdRec}))} style={{padding:'6px 12px',borderRadius:4,fontSize:11,background:track.thresholdRec?'rgba(0,206,201,0.12)':'transparent',border:`1px solid ${track.thresholdRec?'rgba(0,206,201,0.45)':'var(--border)'}`,color:track.thresholdRec?T.teal:T.muted}}>{track.thresholdRec?'ON':'OFF'}</button></div><div><div style={{fontSize:10,color:T.muted,marginBottom:6}}>Input Source</div><select value={track.inputSrc||'mix'} onChange={e=>upd(track.id,{inputSrc:e.target.value})} style={{background:'var(--card)',border:`1px solid ${T.border}`,borderRadius:4,padding:'6px 8px',color:T.offwhite,fontSize:11,maxWidth:'100%'}}><option value="mix">MIX \u2014 post input FX</option>{Array.from({length:inputChCount||2},(_,c)=>(<option key={c} value={'ch'+c}>CH {c+1} \u2014 direct</option>))}</select><div style={{fontSize:8,color:T.faint,marginTop:3}}>Direct = pre-FX, per-channel</div></div></div>{sec('Playback')}<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12,marginBottom:16}}><div><div style={{fontSize:10,color:T.muted,marginBottom:6}}>Play Mode</div><div style={{display:'flex',gap:4}}>{[{v:'loop',l:'Loop'},{v:'oneshot',l:'One-Shot'},{v:'pingpong',l:'Ping-Pong'}].map(({v,l})=>(<button key={v} onClick={()=>upd(track.id,{playMode:v})} style={{padding:'6px 10px',borderRadius:4,fontSize:10,background:track.playMode===v?'rgba(162,155,254,0.1)':'transparent',border:`1px solid ${track.playMode===v?T.purple:T.border}`,color:track.playMode===v?T.purple:T.muted}}>{l}</button>))}</div></div><div><div style={{fontSize:10,color:T.muted,marginBottom:6}}>Speed</div><div style={{display:'flex',gap:4}}>{[{v:0.5,l:'½x'},{v:1,l:'1x'},{v:2,l:'2x'}].map(({v,l})=>(<button key={v} onClick={()=>upd(track.id,{playSpeed:v})} style={{padding:'6px 10px',borderRadius:4,fontSize:11,background:(track.playSpeed??1)===v?`${track.color}15`:'transparent',border:`1px solid ${(track.playSpeed??1)===v?track.color:T.border}`,color:(track.playSpeed??1)===v?track.color:T.muted}}>{l}</button>))}</div></div></div>{sec('FX & Sends')}{tfx&&(<div style={{display:'flex',gap:12,flexWrap:'wrap'}}><div style={{background:darkMode?'var(--card2)':'#f5f5f5',border:`1px solid ${T.border}`,borderRadius:8,padding:'12px'}}><div style={{fontSize:10,color:T.muted,marginBottom:8,fontWeight:700}}>VOLUME & DECAY</div><div style={{display:'flex',gap:12}}><Knob value={tfx.volume} min={0} max={1.5} onChange={v=>updFX(track.id,'volume',v)} label="VOL" color={track.color} size={40} defaultValue={0.8}/><Knob value={track.overdubDecay??1} min={0} max={1} onChange={v=>upd(track.id,{overdubDecay:v})} label="DECAY" color={T.pink} size={40} defaultValue={1}/></div></div><div style={{background:darkMode?'var(--card2)':'#f5f5f5',border:`1px solid ${T.border}`,borderRadius:8,padding:'12px'}}><div style={{fontSize:10,color:T.muted,marginBottom:8,fontWeight:700}}>EQ</div><div style={{display:'flex',gap:8}}><Knob value={tfx.eqLow} min={-15} max={15} onChange={v=>updFX(track.id,'eqLow',v)} label="LO" color={track.color} size={36} defaultValue={0}/><Knob value={tfx.eqMid} min={-15} max={15} onChange={v=>updFX(track.id,'eqMid',v)} label="MI" color={track.color} size={36} defaultValue={0}/><Knob value={tfx.eqHigh} min={-15} max={15} onChange={v=>updFX(track.id,'eqHigh',v)} label="HI" color={track.color} size={36} defaultValue={0}/></div></div><div style={{background:darkMode?'var(--card2)':'#f5f5f5',border:`1px solid ${T.border}`,borderRadius:8,padding:'12px'}}><div style={{fontSize:10,color:T.muted,marginBottom:8,fontWeight:700}}>SENDS & COMP</div><div style={{display:'flex',gap:8}}><Knob value={tfx.reverbSend} min={0} max={1} onChange={v=>updFX(track.id,'reverbSend',v)} label="VERB" color={T.purple} size={36} defaultValue={0}/><Knob value={tfx.delaySend} min={0} max={1} onChange={v=>updFX(track.id,'delaySend',v)} label="DLY" color={T.teal} size={36} defaultValue={0}/><Knob value={tfx.compThreshold} min={-60} max={0} onChange={v=>updFX(track.id,'compThreshold',v)} label="THR" color={T.amber} size={36} defaultValue={-18}/></div></div></div>)}{sec('Insert FX \u2014 3 slots per track')}{tfx&&<InsertRack T={T} slots={tfx.inserts} onChange={(si,patch)=>updInsert(track.id,si,patch)} accent={track.color} learnTarget="track" trackId={track.id} setFxKbModal={setFxKbModal} getFxKey={getFxKey} getFxMidi={getFxMidi}/>}</div>);})()}
              </div>
      </Acc>
      <Acc T={T} id="quickfx" title="QUICK FX" icon="⚡" open={open} setOpen={setOpen}>
        <QuickFX T={T} track={selTrack} trackFX={trackFX} updFX={updFX}/>
      </Acc>
      <Acc T={T} id="vocal" title="VOCAL FX" icon="🎤" open={open} setOpen={setOpen}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14,flexWrap:'wrap'}}>
          <button onClick={()=>setIFX({vocalEnabled:!inputFX.vocalEnabled})}
            style={{padding:'10px 20px',borderRadius:8,fontSize:12,fontWeight:800,letterSpacing:1,cursor:'pointer',background:inputFX.vocalEnabled?'rgba(0,206,201,0.15)':'transparent',border:`1px solid ${inputFX.vocalEnabled?T.teal:T.border}`,color:inputFX.vocalEnabled?T.teal:T.muted}}>
            {inputFX.vocalEnabled?'◉ VOCAL FX ON':'○ VOCAL FX OFF'}
          </button>
          <span style={{fontSize:10,color:T.faint}}>Live input vocal chain</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:10}}>
          <div style={{background:'var(--bg)',border:`1px solid ${T.border}`,borderRadius:10,padding:12}}>
            <div style={{fontSize:11,fontWeight:800,color:T.teal,marginBottom:4,letterSpacing:1}}>DOUBLER — LIVE</div>
            <div style={{fontSize:9,color:T.faint,marginBottom:10}}>Real doubling engine on your input. Pick a flavor:</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {VOCAL_PRESETS.map(p=>{const active=inputFX.vocalPreset===p.id;return(
                <button key={p.id} onClick={()=>setIFX({vocalPreset:p.id,vocalEnabled:true})}
                  style={{textAlign:'left',padding:'10px 12px',borderRadius:8,cursor:'pointer',background:active?'rgba(0,206,201,0.1)':'var(--card)',border:`1px solid ${active?T.teal:T.border}`}}>
                  <div style={{fontSize:11,fontWeight:800,color:active?T.teal:T.offwhite,marginBottom:2}}>{p.name}</div>
                  <div style={{fontSize:9,color:T.faint}}>{p.desc}</div>
                </button>);})}
            </div>
          </div>
          <div style={{background:'var(--bg)',border:`1px solid ${T.border}`,borderRadius:10,padding:12,opacity:0.65}}>
            <div style={{fontSize:11,fontWeight:800,color:T.amber,marginBottom:4,letterSpacing:1}}>PITCH — AUTO-TUNE + HARMONY</div>
            <div style={{fontSize:9,color:T.faint,marginBottom:10}}>Real-time pitch correction needs DSP that is not built yet. This panel stays honest until it is.</div>
            <div style={{fontSize:10,color:T.muted,background:'var(--card)',border:`1px dashed ${T.border}`,borderRadius:8,padding:'14px',textAlign:'center'}}>COMING SOON<br/><span style={{fontSize:9,color:T.faint}}>Auto-Tune &amp; harmony chain</span></div>
          </div>
        </div>
      </Acc>
      <Acc T={T} id="presets" title="FX PRESETS" icon="✨" open={open} setOpen={setOpen}>
        {sec('Input chain presets')}
        <PresetGrid T={T} accent={T.blue} presets={[...INPUT_FX_PRESETS,...userPresets.input]} onApply={p=>setIFX({...p.fx})} onDelete={p=>setUserPresets(deleteUserPreset('input',p.name))}/>
        <div style={{height:16}}/>
        {sec('Track FX presets \u2014 applies to selected track ('+(selTrack?selTrack.name:'none')+')')}
        <PresetGrid T={T} accent={T.green} presets={[...TRACK_FX_PRESETS,...userPresets.track]} onApply={p=>setTrackFX(prev=>prev.map(f=>f.id===settingsTrackId?{...f,...p.fx}:f))} onDelete={p=>setUserPresets(deleteUserPreset('track',p.name))}/>
        <div style={{height:16}}/>
        {sec('Save current as preset')}
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <select value={saveKind} onChange={e=>setSaveKind(e.target.value)} style={{background:'var(--bg)',border:`1px solid ${T.border}`,borderRadius:6,padding:'8px',color:T.offwhite,fontSize:11}}>
            <option value="input">Input chain</option>
            <option value="track">Track FX (selected track)</option>
          </select>
          <input value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="Preset name\u2026" style={{flex:1,minWidth:140,background:'var(--bg)',border:`1px solid ${T.border}`,borderRadius:6,padding:'8px',color:T.offwhite,fontSize:11}}/>
          <button onClick={doSave} disabled={!saveName.trim()} style={{padding:'8px 16px',borderRadius:6,fontSize:11,fontWeight:700,cursor:saveName.trim()?'pointer':'default',background:saveName.trim()?'rgba(255,176,32,0.12)':'transparent',border:`1px solid ${saveName.trim()?'#ffb020':T.border}`,color:saveName.trim()?'#ffb020':T.faint}}>SAVE</button>
        </div>
      </Acc>
      <Acc T={T} id="input" title="INPUT CHAIN" icon="🎚" open={open} setOpen={setOpen}>
        <div style={{background:'var(--card)',border:`1px solid ${T.border}`,borderRadius:10,padding:16,marginBottom:16}}>
          {sec('Audio Interface \u2014 Detected Inputs')}
          <div style={{fontSize:11,color:T.muted,marginBottom:10}}><span style={{color:T.teal,fontWeight:800}}>{inputChCount}</span> input channel{inputChCount===1?'':'s'} detected. Assign channels to tracks in <b>TRACK FX &rarr; Recording &rarr; Input Source</b>.</div>
          <ChMeters T={T} chAnR={inputChAnR} chCount={inputChCount}/>
        </div>

                <div style={{background:'var(--card)',border:`1px solid ${T.border}`,borderRadius:10,padding:16}}>
                  {(()=>{const IFxKB=({param})=>{const k=getFxKey('input',null,param);const m=typeof getFxMidi==='function'?getFxMidi('input',null,param):null;const any=k||m; return(<button onClick={e=>{e.stopPropagation();setFxKbModal({target:'input',trackId:null,param,label:param,isKnob:true,min:0,max:2,step:0.05,defaultValue:1,awaitingKey:true,step2:false,assignedKey:k||null,assignedMidi:m||null});}} title="Assign — press a keyboard key or send MIDI" style={{display:'flex',alignItems:'center',gap:3,padding:'2px 5px',background:any?'rgba(30,144,255,0.1)':'transparent',border:`1px solid ${any?'rgba(30,144,255,0.4)':T.border}`,borderRadius:3,cursor:'pointer',fontSize:7,color:any?T.blue:T.faint,fontFamily:'JetBrains Mono,monospace',marginTop:2}}>{k?<span style={{fontWeight:700}}>⌨{k.toUpperCase()}</span>:null}{m?<span style={{fontWeight:700}}>🎹{m.replace('ch','')}</span>:null}{!any?<span>+ LEARN</span>:null}</button>);}; return(<div style={{display:'flex',gap:16,flexWrap:'wrap',alignItems:'flex-start'}}><div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}><div style={{fontSize:10,color:T.muted,letterSpacing:2,marginBottom:2}}>INPUT TRIM</div><Knob value={inputFX.gain} min={0} max={2} onChange={v=>setInputFX(p=>({...p,gain:v}))} label="GAIN" color={T.blue} size={52} decimals={2} defaultValue={1}/><IFxKB param="gain"/></div><div style={{background:darkMode?'var(--card2)':'#f0f0f0',border:`1px solid ${inputFX.compEnabled?'rgba(255,159,67,0.3)':T.border}`,borderRadius:8,padding:'12px 14px',flex:1,minWidth:200}}><div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}><span style={{fontSize:11,color:inputFX.compEnabled?T.amber:T.muted,fontWeight:700,letterSpacing:2}}>COMPRESSOR</span><button onClick={()=>setInputFX(p=>({...p,compEnabled:!p.compEnabled}))} style={{background:inputFX.compEnabled?'rgba(255,159,67,0.1)':'transparent',border:`1px solid ${inputFX.compEnabled?'rgba(255,159,67,0.4)':T.border}`,color:inputFX.compEnabled?T.amber:T.muted,borderRadius:4,padding:'3px 8px',fontSize:10}}>{inputFX.compEnabled?'ON':'OFF'}</button><IFxKB param="compEnabled"/></div><div style={{display:'flex',gap:10,flexWrap:'wrap'}}>{[['compThreshold','THRESH',T.amber,-60,0,2,-24,'dB',0],['compRatio','RATIO',T.amber,1,20,1,4,':1',1]].map(([param,label,col,mn,mx,step,def,unit,dec])=>(<div key={param} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}><Knob value={inputFX[param]} min={mn} max={mx} onChange={v=>setInputFX(p=>({...p,[param]:v}))} label={label} color={col} size={44} decimals={dec} unit={unit} defaultValue={def}/><IFxKB param={param}/></div>))}</div></div><div style={{background:darkMode?'var(--card2)':'#f0f0f0',border:`1px solid ${inputFX.eqEnabled?'rgba(46,213,115,0.3)':T.border}`,borderRadius:8,padding:'12px 14px',flex:1,minWidth:200}}><div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}><span style={{fontSize:11,color:inputFX.eqEnabled?T.green:T.muted,fontWeight:700,letterSpacing:2}}>3-BAND EQ</span><button onClick={()=>setInputFX(p=>({...p,eqEnabled:!p.eqEnabled}))} style={{background:inputFX.eqEnabled?'rgba(46,213,115,0.1)':'transparent',border:`1px solid ${inputFX.eqEnabled?'rgba(46,213,115,0.4)':T.border}`,color:inputFX.eqEnabled?T.green:T.muted,borderRadius:4,padding:'3px 8px',fontSize:10}}>{inputFX.eqEnabled?'ON':'OFF'}</button><IFxKB param="eqEnabled"/></div><div style={{display:'flex',gap:10,flexWrap:'wrap'}}>{[['eqLow','LOW',-15,15,1,0],['eqMid','MID',-15,15,1,0],['eqHigh','HIGH',-15,15,1,0]].map(([param,label,mn,mx,step,def])=>(<div key={param} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}><Knob value={inputFX[param]} min={mn} max={mx} onChange={v=>setInputFX(p=>({...p,[param]:v}))} label={label} color={T.green} size={44} decimals={1} unit="dB" defaultValue={def}/><IFxKB param={param}/></div>))}</div></div></div>);})()}
                </div>
        <div style={{height:16}}/>
        {sec('Input Space \u2014 Reverb & Delay sends')}
        <div style={{background:'var(--card)',border:`1px solid ${T.border}`,borderRadius:10,padding:16,display:'flex',gap:20,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:180}}><div style={{fontSize:10,color:T.muted,letterSpacing:2,marginBottom:6,fontWeight:700}}>REVERB SEND</div>
            <div style={{display:'flex',alignItems:'center',gap:8}}><input type="range" min={0} max={1} step={0.05} value={inputFX.reverbSend||0} onChange={e=>setIFX({reverbSend:parseFloat(e.target.value)})} style={{flex:1,accentColor:T.purple}}/><span style={{fontSize:12,color:T.purple,fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{Math.round((inputFX.reverbSend||0)*100)}%</span></div></div>
          <div style={{flex:1,minWidth:180}}><div style={{fontSize:10,color:T.muted,letterSpacing:2,marginBottom:6,fontWeight:700}}>DELAY SEND</div>
            <div style={{display:'flex',alignItems:'center',gap:8}}><input type="range" min={0} max={1} step={0.05} value={inputFX.delaySend||0} onChange={e=>setIFX({delaySend:parseFloat(e.target.value)})} style={{flex:1,accentColor:T.teal}}/><span style={{fontSize:12,color:T.teal,fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{Math.round((inputFX.delaySend||0)*100)}%</span></div></div>
          <div style={{flex:1,minWidth:180}}><div style={{fontSize:10,color:T.muted,letterSpacing:2,marginBottom:6,fontWeight:700}}>DELAY TIME</div>
            <div style={{display:'flex',alignItems:'center',gap:8}}><input type="range" min={0.05} max={1} step={0.025} value={inputFX.delayTime??0.375} onChange={e=>setIFX({delayTime:parseFloat(e.target.value)})} style={{flex:1,accentColor:T.teal}}/><span style={{fontSize:12,color:T.teal,fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{Math.round((inputFX.delayTime??0.375)*1000)}ms</span></div></div>
        </div>
        <div style={{height:16}}/>
        {sec('Insert FX \u2014 2 slots on the input chain')}
        <InsertRack T={T} slots={inputFX.inserts} onChange={(si,patch)=>updInputInsert(si,patch)} accent={T.teal} learnTarget="input" trackId={null} setFxKbModal={setFxKbModal} getFxKey={getFxKey} getFxMidi={getFxMidi}/>
      </Acc>
      <Acc T={T} id="transport" title="TRANSPORT" icon="⏵" open={open} setOpen={setOpen}>
        {/* ── Metronome routing: main mix vs in-ear cue device ── */}
        <div style={{background:'var(--card)',border:`1px solid ${T.border}`,borderRadius:10,padding:'12px 14px',marginBottom:12}}>
          <div style={{fontSize:10,color:T.muted,letterSpacing:2,marginBottom:8,fontWeight:700}}>METRONOME OUTPUT</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center',marginBottom:8}}>
            {[['main','MAIN MIX','Click plays through the main output (audience hears it)'],['cue','IN-EAR (CUE)','Click goes to a separate output device — only you hear it']].map(([v,l,tip])=>(
              <button key={v} title={tip} onClick={()=>{setMetronomeRoute(v);if(v==='cue'&&ensureCueCtx)ensureCueCtx();}}
                style={{background:metronomeRoute===v?'rgba(143,155,255,0.12)':'transparent',border:`1px solid ${metronomeRoute===v?'#8f9bff':T.border}`,color:metronomeRoute===v?'#8f9bff':T.muted,borderRadius:6,padding:'6px 12px',fontSize:10,fontWeight:700,letterSpacing:1,cursor:'pointer'}}>{l}</button>
            ))}
          </div>
          {metronomeRoute==='cue'&&(
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              <div style={{fontSize:10,color:T.soft,letterSpacing:2,fontWeight:700}}>CUE OUTPUT DEVICE</div>
              <select value={cueOutputId||'default'} onChange={e=>changeCueOutput(e.target.value==='default'?'':e.target.value)}
                style={{background:'var(--bg)',border:`1px solid ${T.border}`,borderRadius:6,padding:'8px',color:T.offwhite,fontSize:10,maxWidth:320}}>
                <option value="default">Same as system default</option>
                {(devices?.outputs||[]).map(d=><option key={d.deviceId} value={d.deviceId}>{d.label||'Output device'}</option>)}
              </select>
              <div style={{fontSize:9,color:T.faint}}>Tip: set MAIN output to the PA and CUE to your headphones/interface outs. Chrome/Edge only.</div>
            </div>
          )}
        </div>

                <div style={{background:'var(--card)',border:`1px solid ${T.border}`,borderRadius:10,padding:16,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16}}>
                  <div><div style={{fontSize:10,color:T.muted,letterSpacing:2,marginBottom:6,fontWeight:700}}>BPM</div><div style={{display:'flex',alignItems:'center',gap:8}}><input type="number" min={20} max={300} value={bpm} onChange={e=>setBpm(parseInt(e.target.value)||120)} style={{width:80,background:'var(--bg)',border:`1px solid ${T.border}`,borderRadius:6,padding:'8px',color:T.amber,fontSize:16,fontWeight:900,fontFamily:"'JetBrains Mono',monospace"}}/><button onClick={A.current.tapTempo} style={{padding:'8px 12px',background:'rgba(255,155,67,0.08)',border:'1px solid rgba(255,155,67,0.3)',borderRadius:6,color:T.amber,fontSize:10,fontWeight:700}}>TAP</button></div></div>
                  <div><div style={{fontSize:10,color:T.muted,letterSpacing:2,marginBottom:6,fontWeight:700}}>MASTER VOLUME</div><div style={{display:'flex',alignItems:'center',gap:8}}><Knob value={masterVol} min={0} max={1.5} onChange={setMasterVol} label="VOL" color={T.green} size={40} decimals={2} defaultValue={0.8}/><span style={{fontSize:12,color:T.green,fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{Math.round(masterVol*100)}%</span></div></div>
                  <div><div style={{fontSize:10,color:T.muted,letterSpacing:2,marginBottom:6,fontWeight:700}}>MASTER INPUT VOL</div><div style={{display:'flex',alignItems:'center',gap:8}}><input type="range" min={0} max={2} step={0.05} value={masterInputVol} onChange={e=>setMasterInputVol(parseFloat(e.target.value))} style={{flex:1,accentColor:T.blue}}/><span style={{fontSize:12,color:T.blue,fontFamily:"'JetBrains Mono',monospace"}}>{Math.round(masterInputVol*100)}%</span></div></div>
                  <div><div style={{fontSize:10,color:T.muted,letterSpacing:2,marginBottom:6,fontWeight:700}}>GRID SYNC</div><button onClick={()=>{const ns=!globalSync;setGlobalSync(ns);setTracks(p=>p.map(t=>({...t,syncStart:ns,syncStop:ns})));}} style={{padding:'8px 14px',borderRadius:6,fontSize:11,fontWeight:700,background:globalSync?'rgba(0,206,201,0.1)':'transparent',border:`1px solid ${globalSync?'rgba(0,206,201,0.4)':T.border}`,color:globalSync?T.teal:T.muted}}>{globalSync?'GRID·ON':'GRID·OFF'}</button></div>
                </div>
        <div style={{height:16}}/>

                <div style={{background:'var(--card)',border:`1px solid ${T.border}`,borderRadius:10,padding:'16px',display:'flex',flexDirection:'column',gap:14}}>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}><button onClick={()=>setQuantize(v=>!v)} style={{background:quantize?'rgba(255,176,32,0.08)':'transparent',border:`1px solid ${quantize?'rgba(255,176,32,0.4)':T.border}`,color:quantize?'#ffb020':T.muted,fontWeight:700,borderRadius:5,padding:'6px 12px',fontSize:11}}>Quantize: {quantize?'ON':'OFF'}</button><button onClick={()=>setAutoSync(v=>!v)} style={{background:autoSync?'rgba(57,255,20,0.08)':'transparent',border:`1px solid ${autoSync?'rgba(57,255,20,0.4)':T.border}`,color:autoSync?T.green:T.muted,fontWeight:700,borderRadius:5,padding:'6px 12px',fontSize:11}}>Auto-Sync: {autoSync?'ON':'OFF'}</button><button onClick={()=>{const ns=!globalSync;setGlobalSync(ns);setTracks(p=>p.map(t=>({...t,syncStart:ns,syncStop:ns})));}} style={{background:globalSync?'rgba(0,206,201,0.08)':'transparent',border:`1px solid ${globalSync?'rgba(0,206,201,0.4)':T.border}`,color:globalSync?T.teal:T.muted,fontWeight:700,borderRadius:5,padding:'6px 12px',fontSize:11}}>Grid Sync: {globalSync?'ON':'OFF'}</button></div>
                  <div><div style={{fontSize:10,color:T.soft,letterSpacing:3,marginBottom:4,fontWeight:700}}>AFTER RECORD STOPS</div><div style={{display:'flex',gap:6}}>{[{v:'play',l:'▶ Play Loop',c:T.green},{v:'overdub',l:'⊕ Immediate Overdub',c:T.pink}].map(({v,l,c})=>(<button key={v} onClick={()=>setTracks(p=>p.map(t=>({...t,stopRecMode:v})))} style={{padding:'6px 12px',borderRadius:5,fontSize:11,fontWeight:700,background:tracks.every(t=>t.stopRecMode===v)?`${c}14`:'transparent',border:`1px solid ${tracks.every(t=>t.stopRecMode===v)?c:T.border}`,color:tracks.every(t=>t.stopRecMode===v)?c:T.muted}}>{l}</button>))}</div></div>
                </div>
      </Acc>
      <Acc T={T} id="master" title="MASTER & EXPORT" icon="🎛" open={open} setOpen={setOpen}>

                <div style={{background:'var(--card)',border:`1px solid ${T.border}`,borderRadius:10,padding:'16px',display:'flex',gap:20,flexWrap:'wrap',alignItems:'center'}}>
                  <div style={{display:'flex',flexDirection:'column',gap:4,minWidth:160}}><div style={{fontSize:10,color:T.muted,letterSpacing:2,fontWeight:700}}>MASTER INPUT VOL</div><div style={{display:'flex',alignItems:'center',gap:8}}><input type="range" min={0} max={2} step={0.05} value={masterInputVol} onChange={e=>setMasterInputVol(parseFloat(e.target.value))} style={{flex:1,accentColor:T.blue}}/><span style={{fontSize:12,color:T.blue,minWidth:36,textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{Math.round(masterInputVol*100)}%</span></div></div>
                  <div style={{display:'flex',flexDirection:'column',gap:4,minWidth:160}}><div style={{fontSize:10,color:T.muted,letterSpacing:2,fontWeight:700}}>MASTER PLAYBACK VOL</div><div style={{display:'flex',alignItems:'center',gap:8}}><Knob value={masterVol} min={0} max={1.5} onChange={setMasterVol} label="VOL" color={T.green} size={40} decimals={2} defaultValue={0.8}/><span style={{fontSize:12,color:T.green,fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{Math.round(masterVol*100)}%</span></div></div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}><div style={{fontSize:10,color:T.muted,letterSpacing:2,fontWeight:700}}>MONITOR</div><button onClick={()=>setMonitorEnabled(v=>!v)} style={{padding:'8px 16px',borderRadius:6,fontSize:12,fontWeight:700,background:monitorEnabled?`${T.teal}14`:'transparent',border:`1px solid ${monitorEnabled?T.teal:T.border}`,color:monitorEnabled?T.teal:T.muted}}>{monitorEnabled?'◉ MON ON':'◯ MON OFF'}</button></div>
                </div>
        <div style={{height:16}}/>

                <div style={{background:'var(--card)',border:`1px solid ${T.border}`,borderRadius:10,padding:'16px'}}><div style={{display:'flex',gap:8,marginBottom:10}}>{[['off','OFF'],['countinOnly','COUNT-IN ONLY'],['recording','WHILE RECORDING']].map(([v,l])=>(<button key={v} onClick={()=>setMetronomeMode(v)} style={{flex:1,padding:'9px',borderRadius:6,fontSize:11,fontWeight:700,background:metronomeMode===v?`${T.amber}14`:'transparent',border:`1px solid ${metronomeMode===v?T.amber:T.border}`,color:metronomeMode===v?T.amber:T.muted}}>{l}</button>))}</div></div>
        <div style={{height:16}}/>

                <div style={{background:'var(--card)',border:`1px solid ${T.border}`,borderRadius:10,padding:16,display:'flex',gap:8,flexWrap:'wrap'}}>
                  <button onClick={()=>A.current.exportMix()} disabled={exporting||!hasAudio} style={{padding:'10px 16px',background:exporting?'rgba(46,213,115,0.08)':'rgba(46,213,115,0.08)',border:`1px solid ${exporting?'rgba(46,213,115,0.4)':'rgba(46,213,115,0.3)'}`,borderRadius:6,color:T.green,fontSize:11,fontWeight:700}}>{exporting?'⟳ RENDERING…':'⬇ EXPORT MIX (WAV)'}</button>
                  <button onClick={()=>A.current.stopAll()} style={{padding:'10px 16px',background:'rgba(255,77,77,0.12)',border:'1px solid rgba(255,77,77,0.4)',borderRadius:6,color:T.red,fontSize:11,fontWeight:800}}>■■ STOP ALL (GLOBAL)</button>
                  <button onClick={()=>A.current.playAll()} style={{padding:'10px 16px',background:'rgba(46,213,115,0.08)',border:'1px solid rgba(46,213,115,0.3)',borderRadius:6,color:T.green,fontSize:11,fontWeight:700}}>▶ PLAY ALL</button>
                  <select value={selectedInput} onChange={e=>changeInput(e.target.value)} disabled={!hasAudio} style={{background:'var(--bg)',border:`1px solid ${T.border}`,borderRadius:6,padding:'8px',color:T.offwhite,fontSize:10}}><option value="default">Default Input</option>{devices.inputs.map(d=><option key={d.deviceId} value={d.deviceId}>{d.label||`Input`}</option>)}</select>
                  <select value={selectedOutput} onChange={e=>changeOutput(e.target.value)} disabled={!hasAudio} style={{background:'var(--bg)',border:`1px solid ${T.border}`,borderRadius:6,padding:'8px',color:T.offwhite,fontSize:10}}><option value="default">Default Output</option>{devices.outputs.map(d=><option key={d.deviceId} value={d.deviceId}>{d.label||`Output`}</option>)}</select>
                </div>
      </Acc>
      <Acc T={T} id="system" title="SYSTEM" icon="⚙" open={open} setOpen={setOpen}>

                <div style={{background:'var(--card)',border:`1px solid ${T.border}`,borderRadius:10,padding:16,display:'flex',alignItems:'center',gap:16}}><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Dark / Light Mode</div><div style={{fontSize:11,color:T.muted}}>Switch theme</div></div><button onClick={()=>setDarkMode(v=>!v)} style={{padding:'8px 20px',borderRadius:6,fontSize:13,fontWeight:700,background:darkMode?'rgba(57,255,20,0.1)':'rgba(0,0,0,0.1)',border:`1px solid ${darkMode?T.green:'rgba(0,0,0,0.2)'}`,color:darkMode?T.green:'#333'}}>{darkMode?'🌙 DARK MODE':'☀ LIGHT MODE'}</button></div>
        <div style={{height:16}}/>

                <div style={{background:'var(--card)',border:`1px solid ${T.border}`,borderRadius:10,padding:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  <div><div style={{fontSize:10,color:T.muted,letterSpacing:2,marginBottom:6,fontWeight:700}}>MIDI OUT</div><button onClick={()=>{if(!midiEnabled){navigator.requestMIDIAccess?.().then(access=>{setMidiAccess(access);const outputs=[...access.outputs.values()];setMidiOutputs(outputs);setMidiEnabled(true);}).catch(()=>setConflictModal({msg:'MIDI access was denied.',onConfirm:()=>{}}));} else { setMidiEnabled(false); }}} style={{background:midiEnabled?'rgba(57,255,20,0.1)':'transparent',border:`1px solid ${midiEnabled?T.green:T.border}`,color:midiEnabled?T.green:T.muted,borderRadius:5,padding:'7px 16px',fontSize:11,fontWeight:700}}>{midiEnabled?'MIDI OUT ON':'ENABLE MIDI OUT'}</button></div>
                  <div><div style={{fontSize:10,color:T.muted,letterSpacing:2,marginBottom:6,fontWeight:700}}>MIDI IN</div><button onClick={()=>setMidiInputEnabled(v=>!v)} style={{background:midiInputEnabled?'rgba(57,255,20,0.1)':'transparent',border:`1px solid ${midiInputEnabled?T.green:T.border}`,color:midiInputEnabled?T.green:T.muted,borderRadius:5,padding:'7px 16px',fontSize:11,fontWeight:700}}>{midiInputEnabled?'🎹 MIDI IN ON':'🎹 ENABLE MIDI IN'}</button></div>
                </div>
        <div style={{height:16}}/>
        {sec('Danger zone')}
        <button onClick={()=>setConflictModal({msg:'Erase ALL Spool data (loops, settings, presets, bindings)?',onConfirm:()=>{try{localStorage.clear()}catch{};window.location.reload();}})} style={{padding:'8px 16px',borderRadius:6,fontSize:11,fontWeight:700,cursor:'pointer',background:'transparent',border:'1px solid rgba(255,77,77,0.4)',color:'#ff5252'}}>ERASE ALL DATA</button>
      </Acc>
    </div>
  );
}
