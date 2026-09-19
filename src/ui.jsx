// ── Board widget UI primitives ──────────────────────────────────────────────
import React from 'react';

export function WBtn({onClick,children,color='#d7ff3f',active=false,disabled=false,big=false,style}){
  return(
    <button onClick={onClick} disabled={disabled}
      style={{
        padding:big?'18px 10px':'10px 8px',borderRadius:big?14:8,
        fontSize:big?18:11,fontWeight:800,letterSpacing:big?2:1,cursor:disabled?'default':'pointer',
        background:active?`${color}26`:`${color}0d`,
        border:`2px solid ${active?color:disabled?'#333':color+'55'}`,
        color:active?color:disabled?'#555':color,
        boxShadow:active?`0 0 14px ${color}44`:'none',
        fontFamily:"'Space Grotesk',sans-serif",touchAction:'manipulation',width:'100%',
        ...style,
      }}>
      {children}
    </button>
  );
}

export function WToggle({on,onClick,children,color='#d7ff3f'}){
  return(
    <button onClick={onClick}
      style={{
        padding:'10px 8px',borderRadius:8,fontSize:11,fontWeight:800,letterSpacing:1,cursor:'pointer',
        background:on?`${color}22`:'transparent',border:`2px solid ${on?color:'#444'}`,
        color:on?color:'#888',fontFamily:"'JetBrains Mono',monospace",width:'100%',
        boxShadow:on?`0 0 10px ${color}33`:'none',
      }}>
      {on?'◉ ':'◯ '}{children}
    </button>
  );
}

export function WSlider({value,min,max,step,onChange,color='#d7ff3f',label,display}){
  return(
    <div style={{display:'flex',flexDirection:'column',gap:2,flex:1,minWidth:64}}>
      {label&&<div style={{fontSize:7,color:'#8a8578',letterSpacing:1.5,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{label}</div>}
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>onChange(parseFloat(e.target.value))}
        style={{width:'100%',accentColor:color,height:20,cursor:'pointer'}}/>
      {display!==undefined&&<div style={{fontSize:9,color, fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{display}</div>}
    </div>
  );
}

export function WRow({children,gap=6}){
  return <div style={{display:'flex',gap,alignItems:'stretch'}}>{children}</div>;
}

export function WVal({children,color='#fff'}){
  return <div style={{fontSize:16,color,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,textAlign:'center'}}>{children}</div>;
}

export function WSub({children}){
  return <div style={{fontSize:8,color:'#8a8578',textAlign:'center',marginTop:4,fontFamily:"'JetBrains Mono',monospace",letterSpacing:0.5}}>{children}</div>;
}
