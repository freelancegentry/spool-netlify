// -- Insert FX rack UI: slot pickers with per-effect param sliders --
import React from 'react';
import {FX_DEFS,FX_TYPE_LIST} from '../fx/fxEngine.js';

export default function InsertRack({T,slots,onChange,accent,learnTarget,trackId,setFxKbModal,getFxKey,getFxMidi}){
  const LearnBtn=({param,label,min,max,def,isKnob})=>{
    if(!setFxKbModal)return null;
    const fullParam=`inserts.${param.slotIdx}.${param.id}`;
    const k=getFxKey?getFxKey(learnTarget,trackId,fullParam):null;
    const m=getFxMidi?getFxMidi(learnTarget,trackId,fullParam):null;
    const any=k||m;
    return(
      <button onClick={e=>{e.stopPropagation();setFxKbModal({target:learnTarget,trackId,param:fullParam,label:label,isKnob:isKnob??true,min,max,step:param.step,defaultValue:def,awaitingKey:true,step2:false,assignedKey:k||null,assignedMidi:m||null});}}
        title="Assign — press a keyboard key or send MIDI"
        style={{padding:'1px 5px',background:any?'rgba(30,144,255,0.1)':'transparent',border:`1px solid ${any?'rgba(30,144,255,0.4)':T.border}`,borderRadius:3,cursor:'pointer',fontSize:7,color:any?T.blue:T.faint,fontFamily:'JetBrains Mono,monospace'}}>
        {k?`⌨${k.toUpperCase()}`:''}{m?`🎹`:''}{!any?'+':''}
      </button>
    );
  };
  return(
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:10}}>
      {(slots||[]).map((slot,idx)=>{
        const def=slot.type?FX_DEFS[slot.type]:null;
        const active=slot.enabled&&slot.type;
        return(
          <div key={idx} style={{background:'var(--bg)',border:`1px solid ${active?accent+'66':'var(--border)'}`,borderRadius:8,padding:'10px 12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <span style={{fontSize:9,fontWeight:800,letterSpacing:2,color:active?accent:T.faint}}>SLOT {idx+1}</span>
              <select value={slot.type||''} onChange={e=>onChange(idx,{type:e.target.value})}
                style={{flex:1,background:'var(--card)',border:`1px solid ${T.border}`,borderRadius:5,padding:'6px',color:T.offwhite,fontSize:11}}>
                <option value="">— Empty —</option>
                {FX_TYPE_LIST.map(t=>(<option key={t} value={t}>{FX_DEFS[t].name}</option>))}
              </select>
              <button onClick={()=>onChange(idx,{enabled:!slot.enabled})}
                title={slot.enabled?'Bypass slot':'Enable slot'}
                style={{padding:'6px 10px',borderRadius:5,fontSize:10,fontWeight:700,cursor:'pointer',
                  background:slot.enabled?`${accent}18`:'transparent',
                  border:`1px solid ${slot.enabled?accent+'66':'var(--border)'}`,
                  color:slot.enabled?accent:T.muted}}>
                {slot.enabled?'ON':'OFF'}
              </button>
            </div>
            {def?(
              <div style={{display:'flex',flexDirection:'column',gap:8,opacity:slot.enabled?1:0.45}}>
                {def.params.map(p=>(
                  <div key={p.id}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:T.muted,marginBottom:3}}>
                      <span style={{letterSpacing:1}}>{p.label.toUpperCase()} <LearnBtn param={{...p,slotIdx:idx}} label={`${slot.type} ${p.label}`} min={p.min} max={p.max} def={p.def}/></span>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",color:T.soft}}>{Number(slot[p.id]??p.def).toFixed(p.step<0.1?2:p.step<1?1:0)}{p.unit?' '+p.unit:''}</span>
                    </div>
                    <input type="range" min={p.min} max={p.max} step={p.step} value={slot[p.id]??p.def}
                      onChange={e=>onChange(idx,{[p.id]:parseFloat(e.target.value)})}
                      style={{width:'100%',accentColor:accent,height:20}}/>
                  </div>
                ))}
              </div>
            ):(
              <div style={{fontSize:9,color:T.faint,letterSpacing:1,textAlign:'center',padding:'8px 0'}}>Pick an effect for this slot</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
