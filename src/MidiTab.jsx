// ── MIDI tab: devices, MIDI Learn, bindings, output ─────────────────────────
import React,{useRef} from 'react';

const parseMidiKey=(k)=>{
  if(!k)return'';
  const m=k.match(/^ch(\d+)-(note|cc)(\d+)$/);
  if(!m)return k;
  const[,ch,type,num]=m;
  if(type==='note'){
    const names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const n=parseInt(num);
    return`${names[n%12]}${Math.floor(n/12)-1}·ch${ch}`;
  }
  return`CC${num}·ch${ch}`;
};

const describeBinding=(b)=>{
  if(b.type==='fxParam')return`FX ${b.target}${b.trackId!=null?' '+(b.trackId+1):''} · ${b.param}`;
  if(b.type==='macro')return'MACRO';
  const act=b.tap||b.action||'?';
  if(b.type==='global')return`GLOBAL · ${act}`;
  return`LOOP ${b.trackId!=null?b.trackId+1:''} · ${act}`;
};

function Section({T,title,children}){
  return(
    <div style={{background:'var(--card)',border:'1px solid var(--border2)',borderRadius:12,padding:'14px 16px',marginBottom:14}}>
      <div style={{fontSize:10,color:T.muted,letterSpacing:2,fontWeight:800,marginBottom:12}}>{title}</div>
      {children}
    </div>
  );
}

function LearnBtn({ctx,T,binding,match,label,hint}){
  const idRef=useRef(`lr_${Math.random().toString(36).slice(2)}`);
  const existing=Object.entries(ctx.midiBindings).find(([,v])=>match(v));
  const key=existing?.[0];
  const learning=ctx.midiLearn?.learnId===idRef.current;
  const start=()=>{
    if(key){
      ctx.setConflictModal({
        msg:`Clear MIDI binding "${parseMidiKey(key)}" from ${label}?`,
        onConfirm:()=>ctx.setMidiBindings(p=>{const n={...p};delete n[key];return n;})
      });
      return;
    }
    if(learning){ctx.setMidiLearn(null);return;}
    ctx.setMidiLearn({learnId:idRef.current,binding:{...binding,__learnId:idRef.current}});
    setTimeout(()=>{if(ctx.midiLearnR?.current?.learnId===idRef.current)ctx.setMidiLearn(null);},10000);
  };
  return(
    <button onClick={start} title={hint||'Learn — press a keyboard key or send a MIDI message'}
      style={{
        display:'inline-flex',alignItems:'center',gap:5,padding:'7px 10px',borderRadius:6,cursor:'pointer',
        background:learning?'rgba(255,159,67,0.15)':key?'rgba(0,206,201,0.1)':'transparent',
        border:`1px solid ${learning?T.amber:key?'rgba(0,206,201,0.4)':T.border}`,
        color:learning?T.amber:key?T.teal:T.muted,
        fontSize:9,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,
        animation:learning?'pulse .8s infinite':'none',
      }}>
      <span>🎹</span><span>{label}</span>
      <span style={{opacity:0.9}}>{learning?'…press key / MIDI':key?parseMidiKey(key):'+ LEARN'}</span>
    </button>
  );
}

export default function MidiTab({ctx}){
  const T=ctx.T;
  const scan=async()=>{
    try{
      const access=await navigator.requestMIDIAccess?.();
      if(!access){ctx.setConflictModal({msg:'Web MIDI is not available in this browser.',onConfirm:()=>{}});return;}
      ctx.setMidiAccess(access);
      ctx.setMidiOutputs([...access.outputs.values()]);
      const ins=[...access.inputs.values()];
      ctx.setMidiInputs(ins);
      // Wire message handlers if input enabled
      if(ctx.midiInputEnabled&&ctx.handleMIDI.current)ins.forEach(inp=>{inp.onmidimessage=ctx.handleMIDI.current;});
    }catch{
      ctx.setConflictModal({msg:'MIDI access was denied.',onConfirm:()=>{}});
    }
  };
  const outPort=ctx.midiOutputs.find(o=>o.id===ctx.midiOutputId);
  const sendTest=()=>{
    const out=ctx.midiOutputs.find(o=>o.id===ctx.midiOutputId);
    if(!out)return;
    const ch=(ctx.midiChannel||1)-1;
    try{out.send([0x90|ch,60,100]);setTimeout(()=>{try{out.send([0x80|ch,60,0])}catch{}},400);}catch{}
  };
  const panic=()=>{
    const out=ctx.midiOutputs.find(o=>o.id===ctx.midiOutputId);
    if(!out)return;
    try{for(let c=0;c<16;c++)out.send([0xB0|c,123,0]);}catch{}
  };

  return(
    <div style={{animation:'fadeUp 0.2s ease',maxWidth:760}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14,flexWrap:'wrap'}}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:15,color:T.offwhite,letterSpacing:3}}>🎹 MIDI</div>
        <div title="MIDI activity"
          style={{width:12,height:12,borderRadius:'50%',
            background:ctx.midiActivity?T.green:'#333',
            boxShadow:ctx.midiActivity?`0 0 10px ${T.green}`:'none',transition:'background .1s'}}/>
        <div style={{flex:1}}/>
        <button onClick={scan}
          style={{padding:'7px 14px',borderRadius:6,fontSize:10,fontWeight:700,letterSpacing:1,cursor:'pointer',
            background:'transparent',border:`1px solid ${T.border}`,color:T.muted}}>⟳ SCAN</button>
        <button onClick={()=>ctx.setMidiInputEnabled(v=>!v)}
          style={{padding:'7px 14px',borderRadius:6,fontSize:10,fontWeight:700,letterSpacing:1,cursor:'pointer',
            background:ctx.midiInputEnabled?`${T.green}18`:'transparent',
            border:`1px solid ${ctx.midiInputEnabled?T.green:T.border}`,
            color:ctx.midiInputEnabled?T.green:T.muted}}>
          {ctx.midiInputEnabled?'MIDI IN ● ON':'MIDI IN ○ OFF'}
        </button>
      </div>

      {ctx.midiLearn&&(
        <div style={{fontSize:11,color:T.amber,background:'rgba(255,159,67,0.1)',border:'1px solid rgba(255,159,67,0.4)',
          borderRadius:8,padding:'10px 14px',marginBottom:14,letterSpacing:1,animation:'pulse 1s infinite',fontWeight:700}}>
          🎹 LISTENING… press a key or turn a knob on your controller
          <button onClick={()=>ctx.setMidiLearn(null)} style={{marginLeft:12,background:'transparent',border:`1px solid ${T.amber}`,color:T.amber,borderRadius:4,padding:'3px 10px',cursor:'pointer',fontSize:10}}>CANCEL</button>
        </div>
      )}

      {/* Input devices */}
      <Section T={T} title="INPUT DEVICES">
        {!('requestMIDIAccess'in navigator)&&(
          <div style={{fontSize:10,color:'#ff5252',marginBottom:8}}>Web MIDI not supported in this browser — use Chrome or Edge.</div>
        )}
        {ctx.midiInputs.length===0&&(
          <div style={{fontSize:11,color:T.faint}}>No input devices found. Turn on MIDI IN and press SCAN.</div>
        )}
        {ctx.midiInputs.map(inp=>(
          <div key={inp.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
            <div style={{flex:1}}>
              <div style={{fontSize:12,color:T.offwhite,fontWeight:700}}>{inp.name||'Unknown device'}</div>
              <div style={{fontSize:9,color:T.faint,fontFamily:"'JetBrains Mono',monospace"}}>{inp.manufacturer||''}</div>
            </div>
            <button onClick={()=>ctx.setMidiInputDevicesOn(p=>({...p,[inp.id]:!(p[inp.id]!==false)}))}
              style={{padding:'6px 12px',borderRadius:5,fontSize:9,fontWeight:700,letterSpacing:1,cursor:'pointer',
                background:ctx.midiInputDevicesOn[inp.id]!==false?`${T.green}15`:'transparent',
                border:`1px solid ${ctx.midiInputDevicesOn[inp.id]!==false?T.green:'#444'}`,
                color:ctx.midiInputDevicesOn[inp.id]!==false?T.green:'#666'}}>
              {ctx.midiInputDevicesOn[inp.id]!==false?'ENABLED':'MUTED'}
            </button>
          </div>
        ))}
      </Section>

      {/* MIDI Learn */}
      <Section T={T} title="MIDI LEARN — LOOPS">
        {!ctx.midiInputEnabled&&<div style={{fontSize:10,color:T.amber,marginBottom:8}}>Enable MIDI IN above first.</div>}
        {ctx.btracks.map(t=>(
          <div key={t.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid var(--border)',flexWrap:'wrap'}}>
            <span style={{fontSize:11,color:t.color,fontWeight:800,width:70,fontFamily:"'JetBrains Mono',monospace"}}>{t.name}</span>
            <div style={{flex:1}}/>
            <LearnBtn ctx={ctx} T={T} label="REC"
              binding={{type:'track',trackId:t.id,tap:'smartRecord',doubleTap:'none',hold:'none'}}
              match={v=>v.type==='track'&&v.trackId===t.id&&v.tap==='smartRecord'}/>
            <LearnBtn ctx={ctx} T={T} label="PLAY"
              binding={{type:'track',trackId:t.id,tap:'playStop',doubleTap:'none',hold:'none'}}
              match={v=>v.type==='track'&&v.trackId===t.id&&v.tap==='playStop'}/>
            <LearnBtn ctx={ctx} T={T} label="MUTE"
              binding={{type:'track',trackId:t.id,tap:'mute',doubleTap:'none',hold:'none'}}
              match={v=>v.type==='track'&&v.trackId===t.id&&v.tap==='mute'}/>
          </div>
        ))}
      </Section>

      <Section T={T} title="MIDI LEARN — GLOBAL">
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <LearnBtn ctx={ctx} T={T} label="PLAY ALL"
            binding={{type:'global',tap:'playAll',doubleTap:'none',hold:'none'}}
            match={v=>v.type==='global'&&v.tap==='playAll'}/>
          <LearnBtn ctx={ctx} T={T} label="STOP ALL"
            binding={{type:'global',tap:'stopAll',doubleTap:'none',hold:'none'}}
            match={v=>v.type==='global'&&v.tap==='stopAll'}/>
          <LearnBtn ctx={ctx} T={T} label="TAP TEMPO"
            binding={{type:'global',tap:'tapTempo',doubleTap:'none',hold:'none'}}
            match={v=>v.type==='global'&&v.tap==='tapTempo'}/>
          <LearnBtn ctx={ctx} T={T} label="FADE OUT"
            binding={{type:'global',tap:'masterFadeOut',doubleTap:'none',hold:'none'}}
            match={v=>v.type==='global'&&v.tap==='masterFadeOut'}/>
        </div>
      </Section>

      <Section T={T} title="MIDI LEARN — FX KNOBS (CC)">
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <LearnBtn ctx={ctx} T={T} label="MASTER VOL"
            binding={{type:'fxParam',target:'master',param:'volume',min:0,max:1.5}}
            match={v=>v.type==='fxParam'&&v.target==='master'&&v.param==='volume'}/>
          <LearnBtn ctx={ctx} T={T} label="INPUT REVERB"
            binding={{type:'fxParam',target:'input',param:'reverbSend',min:0,max:1}}
            match={v=>v.type==='fxParam'&&v.target==='input'&&v.param==='reverbSend'}/>
          <LearnBtn ctx={ctx} T={T} label="INPUT DELAY"
            binding={{type:'fxParam',target:'input',param:'delaySend',min:0,max:1}}
            match={v=>v.type==='fxParam'&&v.target==='input'&&v.param==='delaySend'}/>
          <LearnBtn ctx={ctx} T={T} label="INPUT GAIN"
            binding={{type:'fxParam',target:'input',param:'gain',min:0,max:2}}
            match={v=>v.type==='fxParam'&&v.target==='input'&&v.param==='gain'}/>
        </div>
        <div style={{fontSize:9,color:T.faint,marginTop:8}}>Turn a knob or fader on your controller while listening — CC values map to the full range.</div>
      </Section>

      {/* Current bindings */}
      <Section T={T} title={`ALL BINDINGS (${Object.keys(ctx.midiBindings).length})`}>
        {Object.keys(ctx.midiBindings).length===0&&(
          <div style={{fontSize:11,color:T.faint}}>None yet — use the learn buttons above, or the 🎹 chips in Key Map.</div>
        )}
        {Object.entries(ctx.midiBindings).map(([key,b])=>(
          <div key={key} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
            <span style={{fontSize:10,color:T.teal,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",minWidth:80}}>{parseMidiKey(key)}</span>
            <span style={{fontSize:10,color:T.muted,flex:1,fontFamily:"'JetBrains Mono',monospace"}}>{describeBinding(b)}</span>
            <button onClick={()=>ctx.setConflictModal({
                msg:`Delete MIDI binding "${parseMidiKey(key)}"?`,
                onConfirm:()=>ctx.setMidiBindings(p=>{const n={...p};delete n[key];return n;})
              })}
              style={{background:'transparent',border:'1px solid rgba(255,77,77,0.4)',color:'#ff5252',borderRadius:4,padding:'4px 8px',fontSize:9,cursor:'pointer'}}>✕</button>
          </div>
        ))}
      </Section>

      {/* Output */}
      <Section T={T} title="MIDI OUTPUT">
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,flexWrap:'wrap'}}>
          <select value={ctx.midiOutputId||''} onChange={e=>ctx.setMidiOutputId(e.target.value||null)}
            style={{flex:1,minWidth:180,background:'#0d0d15',color:T.offwhite,border:`1px solid ${T.border}`,borderRadius:6,padding:'8px',fontSize:11}}>
            <option value="">— select output device —</option>
            {ctx.midiOutputs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <button onClick={()=>ctx.setMidiEnabled(v=>!v)}
            style={{padding:'8px 14px',borderRadius:6,fontSize:10,fontWeight:700,letterSpacing:1,cursor:'pointer',
              background:ctx.midiEnabled?`${T.green}15`:'transparent',
              border:`1px solid ${ctx.midiEnabled?T.green:T.border}`,color:ctx.midiEnabled?T.green:T.muted}}>
            {ctx.midiEnabled?'OUT ON':'OUT OFF'}
          </button>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,flexWrap:'wrap'}}>
          <span style={{fontSize:10,color:T.muted,letterSpacing:1}}>CHANNEL</span>
          <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
            {Array.from({length:16},(_,i)=>i+1).map(ch=>(
              <button key={ch} onClick={()=>ctx.setMidiChannel(ch)}
                style={{width:26,height:26,borderRadius:4,fontSize:9,fontWeight:700,cursor:'pointer',
                  background:ctx.midiChannel===ch?`${T.teal}22`:'transparent',
                  border:`1px solid ${ctx.midiChannel===ch?T.teal:'#333'}`,color:ctx.midiChannel===ch?T.teal:'#777',
                  fontFamily:"'JetBrains Mono',monospace"}}>{ch}</button>
            ))}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <button onClick={()=>ctx.setMidiOutTrig(v=>!v)}
            style={{padding:'8px 14px',borderRadius:6,fontSize:10,fontWeight:700,letterSpacing:1,cursor:'pointer',
              background:ctx.midiOutTrig?`${T.amber}18`:'transparent',
              border:`1px solid ${ctx.midiOutTrig?T.amber:T.border}`,color:ctx.midiOutTrig?T.amber:T.muted}}>
            {ctx.midiOutTrig?'◉ LOOP TRIGGER NOTES':'◯ LOOP TRIGGER NOTES'}
          </button>
          <button onClick={sendTest} disabled={!outPort}
            style={{padding:'8px 14px',borderRadius:6,fontSize:10,fontWeight:700,cursor:outPort?'pointer':'default',
              background:'transparent',border:`1px solid ${T.border}`,color:outPort?T.muted:'#444'}}>TEST NOTE</button>
          <button onClick={panic} disabled={!outPort}
            style={{padding:'8px 14px',borderRadius:6,fontSize:10,fontWeight:700,cursor:outPort?'pointer':'default',
              background:'transparent',border:'1px solid rgba(255,77,77,0.4)',color:outPort?'#ff5252':'#444'}}>PANIC</button>
        </div>
        <div style={{fontSize:9,color:T.faint,marginTop:8}}>Trigger notes send C2+loop# on play/stop — drive lights, visuals, or other gear.</div>
      </Section>
    </div>
  );
}
