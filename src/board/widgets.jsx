// ── Board: 30 widget definitions ────────────────────────────────────────────
// Each def: { id, title, group, render(ctx) } or { ..., comp } for stateful ones.
// ctx is built in App.jsx and carries all state, setters, theme and actions.
import React,{useState,useEffect,useRef} from 'react';
import {WBtn,WToggle,WSlider,WRow,WVal,WSub} from './ui.jsx';

// ── Stateful widget components (hooks are safe here) ──

function ClearAllW({ctx}){
  const[armed,setArmed]=useState(false);
  useEffect(()=>{if(!armed)return;const t=setTimeout(()=>setArmed(false),3000);return()=>clearTimeout(t);},[armed]);
  return(
    <div>
      <WBtn color="#ff5252" active={armed}
        onClick={()=>{if(armed){ctx.A.clearAll();setArmed(false);}else setArmed(true);}}>
        {armed?'TAP AGAIN TO CLEAR':'CLEAR ALL'}
      </WBtn>
      <WSub>{armed?'erases every loop':'two-tap safety'}</WSub>
    </div>
  );
}

function ClockW(){
  const[now,setNow]=useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t);},[]);
  const p=n=>String(n).padStart(2,'0');
  return(
    <div>
      <WVal>{p(now.getHours())}:{p(now.getMinutes())}:{p(now.getSeconds())}</WVal>
      <WSub>{now.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}</WSub>
    </div>
  );
}

function CpuW(){
  const[load,setLoad]=useState(0);
  const acc=useRef({n:0,total:0,last:0});
  useEffect(()=>{
    let raf;const a=acc.current;a.last=performance.now();
    const tick=(t)=>{
      const d=t-a.last;a.last=t;a.n++;a.total+=d;
      if(a.n>=30){setLoad(Math.min(99,Math.round(a.total/a.n/16.7*100)));a.n=0;a.total=0;}
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(raf);
  },[]);
  const col=load>85?'#ff5252':load>60?'#ffb020':'#d7ff3f';
  return(
    <div>
      <WVal color={col}>{load}%</WVal>
      <div style={{height:6,background:'#222',borderRadius:3,overflow:'hidden',marginTop:6}}>
        <div style={{width:`${load}%`,height:'100%',background:col,transition:'width .3s'}}/>
      </div>
      <WSub>ui thread load</WSub>
    </div>
  );
}

function NotesW(){
  const[text,setText]=useState(()=>{try{return localStorage.getItem('spool-board-notes')||''}catch{return''}});
  useEffect(()=>{try{localStorage.setItem('spool-board-notes',text)}catch{}},[text]);
  return(
    <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Setlist, reminders…"
      style={{width:'100%',minHeight:64,background:'#0d0d15',color:'#ddd',border:'1px solid #333',borderRadius:6,padding:8,fontSize:11,fontFamily:"'JetBrains Mono',monospace",resize:'vertical',outline:'none'}}/>
  );
}

// ── Widget definitions ──
// -- Loopy Pro style loop cell: donut progress, tap = smart record pedal --
// -- 4-button loop box: REC / PLAY / STOP / UNDO-REDO (tap=undo, double-tap=redo) --
function LoopCell({ctx,trackId}){
  const t=(ctx.btracks||[]).find(t=>t.id===trackId);
  const tapTimer=React.useRef(null);
  if(!t)return null;
  const prog=(ctx.progresses&&ctx.progresses[trackId])||0;
  const isRec=t.state==='recording',isPlay=t.state==='playing',isEmpty=t.state==='empty';
  const stateLabel=isRec?'● RECORDING':isPlay?(t.overdub?'◉ OVERDUBBING':'▶ PLAYING'):isEmpty?'○ EMPTY':'■ STOPPED';
  const stateCol=isRec?'#ff5252':isPlay?t.color:'#888';
  const B=(label,bg,fg,onClick,active)=>(
    <button onClick={onClick}
      style={{padding:'15px 4px',borderRadius:13,fontSize:11,fontWeight:700,letterSpacing:1.5,cursor:'pointer',
        fontFamily:"'Space Grotesk',sans-serif",
        touchAction:'manipulation',userSelect:'none',WebkitUserSelect:'none',
        background:active?bg:'rgba(255,255,255,0.035)',border:`1px solid ${active?bg:'rgba(255,255,255,0.09)'}`,
        color:active?fg:'#8a8578',boxShadow:active?`0 0 16px ${bg}55,inset 0 1px 0 rgba(255,255,255,0.15)`:'inset 0 1px 0 rgba(255,255,255,0.04)',
        transition:'all 0.15s'}}>
      {label}
    </button>
  );
  const doUndoRedo=()=>{
    if(tapTimer.current){clearTimeout(tapTimer.current);tapTimer.current=null;ctx.A.overdubRedo(trackId);return;}
    tapTimer.current=setTimeout(()=>{tapTimer.current=null;ctx.A.overdubUndo(trackId);},280);
  };
  return(
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:10,height:10,borderRadius:'50%',background:stateCol,boxShadow:`0 0 8px ${stateCol}`}}/>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:2,color:stateCol}}>{stateLabel}</div>
        <div style={{flex:1}}/>
        <div style={{fontSize:9,color:'#666',fontFamily:"'JetBrains Mono',monospace"}}>
          {t.duration?t.duration.toFixed(1)+'s':isRec?'rec…':'—'}
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        {B('● REC','#ff5252','#fff',()=>ctx.A.smartRecord(trackId),isRec)}
        {B('▶ PLAY','#d7ff3f','#1a2005',()=>{if(t.state==='recorded')ctx.A.playStop(trackId);},isPlay&&!t.overdub)}
        {B('■ STOP','#ffb020','#1a1000',()=>{if(isPlay||isRec)ctx.A.playStop(trackId);},!isPlay&&!isRec&&!isEmpty)}
        {B('↺ UNDO / REDO','#8f9bff','#101528',doUndoRedo,false)}
      </div>
      <div style={{fontSize:8,color:'#6b6558',letterSpacing:1.5,textAlign:'center',fontFamily:"'JetBrains Mono',monospace"}}>UNDO: tap · REDO: double-tap</div>
      <div style={{height:4,background:'#1a1a2a',borderRadius:2,overflow:'hidden'}}>
        <div style={{width:`${Math.min(100,Math.max(0,prog*100))}%`,height:'100%',background:stateCol,transition:'width 0.1s linear'}}/>
      </div>
    </div>
  );
}

const LOOP_CELL_DEFS=[0,1,2,3,4,5,6,7].map(i=>({
  id:'loopcell'+i,
  title:'LOOP '+(i+1),
  group:'Loop Controls',
  comp:({ctx})=><LoopCell ctx={ctx} trackId={i}/>,
}));

// ── XY filter pad: X = cutoff, Y = resonance (GarageBand-style) ──
const XY_MIN_CUT=60,XY_MAX_CUT=18000,XY_MIN_Q=0.5,XY_MAX_Q=18;
const xyCutToX=c=>Math.log(c/XY_MIN_CUT)/Math.log(XY_MAX_CUT/XY_MIN_CUT);
const xyXToCut=x=>XY_MIN_CUT*Math.pow(XY_MAX_CUT/XY_MIN_CUT,Math.min(1,Math.max(0,x)));
const xyQToY=q=>(q-XY_MIN_Q)/(XY_MAX_Q-XY_MIN_Q);
const xyYToQ=y=>XY_MIN_Q+Math.min(1,Math.max(0,y))*(XY_MAX_Q-XY_MIN_Q);
const fmtCut=c=>c>=1000?(c/1000).toFixed(1)+'k':Math.round(c)+'Hz';

function XYPad({ctx,padId}){
  const[trackId,setTrackId]=useState(()=>{
    try{const v=parseInt(localStorage.getItem('spool-xypad-'+padId));return isNaN(v)?padId%8:Math.min(7,Math.max(0,v));}catch{return padId%8;}
  });
  useEffect(()=>{try{localStorage.setItem('spool-xypad-'+padId,String(trackId))}catch{}},[trackId,padId]);
  const padRef=useRef(null),dragging=useRef(false);
  const t=(ctx.btracks||[]).find(t=>t.id===trackId);
  const fx=(ctx.trackFX||[]).find(f=>f.id===trackId)||{};
  const cutoff=fx.filterCutoff??18000,reso=fx.filterReso??0.7;
  const col=t?.color||'#d7ff3f';
  const setFromEvent=(e)=>{
    const el=padRef.current;if(!el||!ctx.A.setTrackFilter)return;
    const r=el.getBoundingClientRect();
    const x=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width));
    const y=1-Math.min(1,Math.max(0,(e.clientY-r.top)/r.height));
    ctx.A.setTrackFilter(trackId,xyXToCut(x),xyYToQ(y));
  };
  const px=xyCutToX(cutoff)*100,py=(1-xyQToY(reso))*100;
  return(
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      <div style={{display:'flex',alignItems:'center',gap:6}}>
        <select value={trackId} onChange={e=>setTrackId(parseInt(e.target.value))}
          style={{background:'#14161c',border:'1px solid rgba(255,255,255,0.12)',borderRadius:6,padding:'4px 6px',color:col,fontSize:10,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",cursor:'pointer'}}>
          {(ctx.btracks||[]).map(bt=><option key={bt.id} value={bt.id}>{bt.name}</option>)}
        </select>
        <div style={{flex:1}}/>
        <button onClick={()=>ctx.A.resetTrackFilter&&ctx.A.resetTrackFilter(trackId)} title="Reset filter (double-tap pad works too)"
          style={{background:'transparent',border:'1px solid rgba(255,255,255,0.12)',borderRadius:6,padding:'4px 8px',color:'#8a8578',fontSize:9,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace"}}>RESET</button>
      </div>
      <div ref={padRef}
        onPointerDown={e=>{dragging.current=true;try{e.currentTarget.setPointerCapture(e.pointerId);}catch{}setFromEvent(e);}}
        onPointerMove={e=>{if(dragging.current)setFromEvent(e);}}
        onPointerUp={()=>{dragging.current=false;}}
        onPointerCancel={()=>{dragging.current=false;}}
        onDoubleClick={()=>ctx.A.resetTrackFilter&&ctx.A.resetTrackFilter(trackId)}
        style={{position:'relative',height:170,borderRadius:12,cursor:'crosshair',touchAction:'none',userSelect:'none',WebkitUserSelect:'none',
          background:'radial-gradient(120% 120% at 50% 0%,rgba(255,255,255,0.05),transparent 60%),linear-gradient(180deg,#101319,#0b0d10)',
          border:`1px solid ${col}44`,boxShadow:`inset 0 0 24px rgba(0,0,0,0.6)`,overflow:'hidden'}}>
        {/* grid */}
        {[0.25,0.5,0.75].map(f=><div key={'v'+f} style={{position:'absolute',left:`${f*100}%`,top:0,bottom:0,width:1,background:'rgba(255,255,255,0.06)'}}/>)}
        {[0.25,0.5,0.75].map(f=><div key={'h'+f} style={{position:'absolute',top:`${f*100}%`,left:0,right:0,height:1,background:'rgba(255,255,255,0.06)'}}/>)}
        {/* axis labels */}
        <div style={{position:'absolute',left:8,bottom:6,fontSize:8,color:'#6b6558',letterSpacing:2,fontFamily:"'JetBrains Mono',monospace"}}>CUTOFF →</div>
        <div style={{position:'absolute',right:8,top:6,fontSize:8,color:'#6b6558',letterSpacing:2,fontFamily:"'JetBrains Mono',monospace"}}>RESO ↑</div>
        {/* puck */}
        <div style={{position:'absolute',left:`${px}%`,top:`${py}%`,width:26,height:26,borderRadius:'50%',
          transform:'translate(-50%,-50%)',pointerEvents:'none',
          background:`radial-gradient(circle at 35% 35%, #ffffffcc, ${col} 60%, ${col}88)`,
          boxShadow:`0 0 18px ${col},0 0 4px #fff8`,border:'2px solid #ffffff55'}}/>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'#8a8578',fontFamily:"'JetBrains Mono',monospace"}}>
        <span>CUT <b style={{color:col}}>{fmtCut(cutoff)}</b></span>
        <span>RES <b style={{color:col}}>{reso.toFixed(1)}</b></span>
      </div>
      <div style={{fontSize:8,color:'#5a544a',letterSpacing:1,textAlign:'center',fontFamily:"'JetBrains Mono',monospace"}}>drag to sweep · double-tap to reset</div>
    </div>
  );
}

const XY_PAD_DEFS=[0,1,2,3].map(i=>({
  id:'xypad'+i,
  title:'XY PAD '+(i+1),
  group:'Filter',
  comp:({ctx})=><XYPad ctx={ctx} padId={i}/>,
}));

export const WIDGET_DEFS=[
  ...LOOP_CELL_DEFS,
  ...XY_PAD_DEFS,
  // ── Loops ──
  {id:'bigrec',title:'BIG RECORD',group:'Loops',render:(c)=>{
    const rec=c.btracks.find(t=>t.state==='recording');
    const empty=c.btracks.find(t=>t.state==='empty');
    return(<div>
      <WBtn big color="#ff5252" active={!!rec} onClick={()=>{
        if(rec)c.A.smartRecord(rec.id);
        else if(empty)c.A.smartRecord(empty.id);
        else c.A.smartRecord(c.btracks[0].id);
      }}>{rec?'■ STOP':'● REC'}</WBtn>
      <WSub>{rec?`${rec.name} recording…`:empty?`next: ${empty.name}`:'all loops full — overdubs 1'}</WSub>
    </div>);
  }},
  {id:'loopgrid',title:'LOOP GRID',group:'Loops',render:(c)=>(
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
      {c.btracks.slice(0,4).map(t=>{
        const st=t.state;const col=st==='recording'?'#ff5252':st==='playing'?t.color:st==='empty'?'#444':'#888';
        const has=st!=='empty';
        return(<button key={t.id} disabled={!has} onClick={()=>c.A.playStop(t.id)}
          style={{padding:'12px 4px',borderRadius:8,border:`2px solid ${col}`,background:has?`${col}14`:'transparent',
            color:has?col:'#555',fontSize:10,fontWeight:800,cursor:has?'pointer':'default',fontFamily:"'JetBrains Mono',monospace"}}>
          {t.name}<br/><span style={{fontSize:8,opacity:0.8}}>{st==='recording'?'●REC':st==='playing'?'▶ PLAY':st==='empty'?'EMPTY':'READY'}</span>
        </button>);
      })}
    </div>
  )},
  {id:'trackvol',title:'TRACK VOLUMES',group:'Loops',render:(c)=>(
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      {c.btracks.map(t=>{const fx=c.trackFX.find(f=>f.id===t.id);return(
        <div key={t.id} style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:8,color:t.color,fontWeight:800,width:44,fontFamily:"'JetBrains Mono',monospace"}}>{t.name}</span>
          <WSlider value={fx?.volume??0.8} min={0} max={1.5} step={0.02} color={t.color}
            onChange={v=>c.updFX(t.id,'volume',v)} display={`${Math.round((fx?.volume??0.8)/1.5*100)}%`}/>
        </div>);})}
    </div>
  )},

  // ── Tempo & Transport ──
  {id:'tempopm',title:'TEMPO',group:'Tempo & Transport',render:(c)=>(
    <div>
      <WRow>
        <WBtn small color="#ffb020" onClick={()=>c.setBpm(b=>Math.max(20,b-5))}>−5</WBtn>
        <WBtn small color="#ffb020" onClick={()=>c.setBpm(b=>Math.max(20,b-1))}>−1</WBtn>
        <div style={{flex:2}}><WVal color="#ffb020">{Math.round(c.bpm)}</WVal><WSub>bpm</WSub></div>
        <WBtn small color="#ffb020" onClick={()=>c.setBpm(b=>Math.min(300,b+1))}>+1</WBtn>
        <WBtn small color="#ffb020" onClick={()=>c.setBpm(b=>Math.min(300,b+5))}>+5</WBtn>
      </WRow>
    </div>
  )},
  {id:'playstop',title:'TRANSPORT',group:'Tempo & Transport',render:(c)=>(
    <WRow>
      <WBtn color="#d7ff3f" onClick={()=>c.A.playAll()}>▶ PLAY ALL</WBtn>
      <WBtn color="#ff5252" onClick={()=>c.A.stopAll()}>■ STOP ALL</WBtn>
    </WRow>
  )},
  {id:'taptempo',title:'TAP TEMPO',group:'Tempo & Transport',render:(c)=>(
    <WBtn big color="#ffb020" onClick={()=>c.A.tapTempo()}>TAP</WBtn>
  )},
  {id:'metro',title:'METRONOME',group:'Tempo & Transport',render:(c)=>{
    const modes=[['off','OFF'],['countinOnly','COUNT-IN'],['recording','REC ONLY']];
    const i=modes.findIndex(m=>m[0]===c.metronomeMode);
    const next=modes[(i+1)%modes.length];
    return(<div>
      <WToggle on={c.metronomeMode!=='off'} color="#ffb020" onClick={()=>c.setMetronomeMode(next[0])}>
        {modes[i]?modes[i][1]:'OFF'}
      </WToggle>
      <WSub>tap to cycle mode</WSub>
    </div>);
  }},

  // ── Volume ──
  {id:'mastervol',title:'MASTER VOLUME',group:'Volume',render:(c)=>(
    <WSlider label="MASTER" value={c.masterVol} min={0} max={1.5} step={0.02} color="#ffb020"
      onChange={v=>c.setMasterVol(v)} display={`${Math.round(c.masterVol/1.5*100)}%`}/>
  )},
  {id:'invol',title:'INPUT VOLUME',group:'Volume',render:(c)=>(
    <WSlider label="INPUT" value={c.masterInputVol} min={0} max={2} step={0.05} color="#38c6f4"
      onChange={v=>c.setMasterInputVol(v)} display={`${Math.round(c.masterInputVol*100)}%`}/>
  )},
  {id:'outvol',title:'OUTPUT VOLUME',group:'Volume',render:(c)=>(
    <WSlider label="OUTPUT" value={c.masterPlaybackVol} min={0} max={1.5} step={0.05} color="#d7ff3f"
      onChange={v=>c.setMasterPlaybackVol(v)} display={`${Math.round(c.masterPlaybackVol/1.5*100)}%`}/>
  )},

  // ── FX (input chain) ──
  {id:'inverb',title:'INPUT REVERB',group:'FX',render:(c)=>(
    <WSlider label="REVERB SEND" value={c.inputFX.reverbSend||0} min={0} max={1} step={0.05} color="#8f9bff"
      onChange={v=>c.setIFX({reverbSend:v})} display={`${Math.round((c.inputFX.reverbSend||0)*100)}%`}/>
  )},
  {id:'indelay',title:'INPUT DELAY',group:'FX',render:(c)=>(
    <WSlider label="DELAY SEND" value={c.inputFX.delaySend||0} min={0} max={1} step={0.05} color="#3fd8c7"
      onChange={v=>c.setIFX({delaySend:v})} display={`${Math.round((c.inputFX.delaySend||0)*100)}%`}/>
  )},
  {id:'indelaytime',title:'DELAY TIME',group:'FX',render:(c)=>(
    <WSlider label="TIME" value={c.inputFX.delayTime??0.375} min={0.05} max={1} step={0.025} color="#3fd8c7"
      onChange={v=>c.setIFX({delayTime:v})} display={`${Math.round((c.inputFX.delayTime??0.375)*1000)}ms`}/>
  )},
  {id:'ineq3',title:'INPUT EQ',group:'FX',render:(c)=>{
    const f=c.inputFX;
    return(<div>
      <WToggle on={f.eqEnabled} color="#8f9bff" onClick={()=>c.setIFX({eqEnabled:!f.eqEnabled})}>EQ</WToggle>
      <div style={{display:'flex',gap:6,marginTop:6}}>
        {[['eqLow','LO'],['eqMid','MID'],['eqHigh','HI']].map(([p,l])=>(
          <WSlider key={p} label={l} value={f[p]||0} min={-15} max={15} step={1} color="#8f9bff"
            onChange={v=>c.setIFX({[p]:v})} display={`${f[p]>0?'+':''}${Math.round(f[p]||0)}`}/>
        ))}
      </div>
    </div>);
  }},
  {id:'incomp',title:'INPUT COMP',group:'FX',render:(c)=>{
    const f=c.inputFX;
    return(<div>
      <WToggle on={f.compEnabled} color="#ffb020" onClick={()=>c.setIFX({compEnabled:!f.compEnabled})}>COMPRESSOR</WToggle>
      <div style={{marginTop:6}}>
        <WSlider label="THRESHOLD" value={f.compThreshold??-24} min={-60} max={0} step={2} color="#ffb020"
          onChange={v=>c.setIFX({compThreshold:v})} display={`${Math.round(f.compThreshold??-24)}dB`}/>
      </div>
    </div>);
  }},

  // ── Performance ──
  {id:'undoredo',title:'UNDO / REDO',group:'Performance',render:(c)=>{
    const t=c.btracks.find(x=>x.state==='recording')||c.btracks.find(x=>x.state==='playing')||c.btracks[0];
    return(<div>
      <WRow>
        <WBtn color="#ffb020" onClick={()=>t&&c.A.overdubUndo(t.id)}>↩ UNDO</WBtn>
        <WBtn color="#ffb020" onClick={()=>t&&c.A.overdubRedo(t.id)}>↪ REDO</WBtn>
      </WRow>
      <WSub>{t?`target: ${t.name}`:'no loops'} · full history in phase 7</WSub>
    </div>);
  }},
  {id:'clearall',title:'CLEAR ALL',group:'Performance',comp:ClearAllW},
  {id:'mutegroups',title:'MUTE GROUPS',group:'Performance',render:(c)=>(
    <div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6}}>
        {['A','B','C','D'].map(g=>{
          const members=c.tracks.filter(t=>t.muteGroup===g);
          const anyOn=members.some(t=>!t.isMuted);
          return(<button key={g} onClick={()=>c.A.toggleMuteGroup(g)} title={members.length?members.map(t=>t.name).join(', '):'no tracks assigned'}
            style={{padding:'10px 4px',borderRadius:8,border:`2px solid ${members.length?(anyOn?'#ffb020':'#555'):'#333'}`,
              background:members.length&&anyOn?'#ffb02022':'transparent',color:members.length?(anyOn?'#ffb020':'#888'):'#444',
              fontWeight:800,fontSize:12,cursor:members.length?'pointer':'default',fontFamily:"'JetBrains Mono',monospace"}}>
            {g}<br/><span style={{fontSize:8}}>{members.length||'—'}</span>
          </button>);
        })}
      </div>
      <WSub>assign groups in track settings</WSub>
    </div>
  )},
  {id:'scenes',title:'SECTIONS',group:'Performance',render:(c)=>(
    <WRow>
      {[['verse','V','#88c661'],['chorus','C','#deb1f4'],['bridge','B','#f7ce72']].map(([id,l,col])=>(
        <WBtn key={id} color={col} active={c.activeSection===id}
          onClick={()=>c.setActiveSection(s=>s===id?null:id)}>{l}</WBtn>
      ))}
    </WRow>
  )},
  {id:'fade',title:'MASTER FADE',group:'Performance',render:(c)=>(
    <WRow>
      <WBtn color="#8f9bff" onClick={()=>c.A.masterFadeOut()}>FADE OUT</WBtn>
      <WBtn color="#8f9bff" onClick={()=>c.A.masterFadeIn()}>FADE IN</WBtn>
    </WRow>
  )},
  {id:'bpmmult',title:'BPM ×2 ÷2',group:'Performance',render:(c)=>(
    <WRow>
      <WBtn color="#ffb020" onClick={()=>c.setBpm(b=>Math.max(20,Math.round(b/2)))}>÷2</WBtn>
      <WBtn color="#ffb020" onClick={()=>c.setBpm(b=>Math.min(300,b*2))}>×2</WBtn>
    </WRow>
  )},
  {id:'quantize',title:'QUANTIZE',group:'Performance',render:(c)=>(
    <WToggle on={c.quantize} color="#ffb020" onClick={()=>c.setQuantize(q=>!q)}>QUANTIZE</WToggle>
  )},

  // ── Voice ──
  {id:'vocalfx',title:'VOCAL FX',group:'Voice',render:(c)=>{
    const f=c.inputFX;const presets=['thickener','slap','chorus'];
    const i=presets.indexOf(f.vocalPreset);
    return(<div>
      <WToggle on={f.vocalEnabled} color="#ff6b81" onClick={()=>c.setIFX({vocalEnabled:!f.vocalEnabled})}>VOCAL FX</WToggle>
      <button onClick={()=>c.setIFX({vocalPreset:presets[(i+1)%presets.length]})}
        style={{marginTop:6,width:'100%',padding:'8px',borderRadius:6,background:'#ff6b8122',border:'1px solid #ff6b81',color:'#ff6b81',fontSize:10,fontWeight:800,letterSpacing:1,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace"}}>
        {(f.vocalPreset||'thickener').toUpperCase()} ▸
      </button>
      <WSub>doubler engine · tap preset to cycle</WSub>
    </div>);
  }},
  {id:'harmony',title:'HARMONY',group:'Voice',render:(c)=>{
    const f=c.inputFX;const ivs=['3rd','5th','oct'];const i=ivs.indexOf(f.harmonyInterval);
    return(<div>
      <WToggle on={f.harmonyEnabled} color="#ff6b81" onClick={()=>c.setIFX({harmonyEnabled:!f.harmonyEnabled})}>HARMONY</WToggle>
      <button onClick={()=>c.setIFX({harmonyInterval:ivs[(i+1)%ivs.length]})}
        style={{marginTop:6,width:'100%',padding:'8px',borderRadius:6,background:'transparent',border:'1px solid #555',color:'#aaa',fontSize:10,fontWeight:800,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace"}}>
        {(f.harmonyInterval||'3rd').toUpperCase()} ▸
      </button>
      <WSub>pitch engine · phase 5</WSub>
    </div>);
  }},

  // ── MIDI ──
  {id:'midistatus',title:'MIDI STATUS',group:'MIDI',render:(c)=>{
    const on=c.midiInputEnabled;const n=c.midiInputs.length;
    return(<div>
      <WToggle on={on} color="#d7ff3f" onClick={()=>c.setMidiInputEnabled(v=>!v)}>MIDI IN</WToggle>
      <WSub>{on?(n?`${n} device${n>1?'s':''}`:'no devices'): 'tap to enable'}</WSub>
    </div>);
  }},
  {id:'midilearn',title:'MIDI LEARN',group:'MIDI',render:(c)=>(
    <div>
      <WBtn color="#8f9bff" onClick={()=>c.setActiveTab('keys')}>OPEN KEY MAP</WBtn>
      <WSub>midi learn lives in key map</WSub>
    </div>
  )},

  // ── Utility ──
  {id:'cpumeter',title:'CPU',group:'Utility',comp:CpuW},
  {id:'clock',title:'CLOCK',group:'Utility',comp:ClockW},
  {id:'notes',title:'NOTES',group:'Utility',comp:NotesW},
  {id:'export',title:'EXPORT',group:'Utility',render:(c)=>(
    <div>
      <WBtn color="#d7ff3f" disabled={c.exporting||!c.hasAudio}
        onClick={()=>c.A.exportMix()}>{c.exporting?'RENDERING…':'⬇ EXPORT WAV'}</WBtn>
      <WSub>full mix · longest loop ×4</WSub>
    </div>
  )},
];

export const WIDGET_GROUPS=[...new Set(WIDGET_DEFS.map(w=>w.group))];
