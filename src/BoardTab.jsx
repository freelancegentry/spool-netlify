// ── Board tab: draggable widget grid ─────────────────────────────────────────
// Layout (ordered widget IDs) persists to localStorage. Edit mode: drag on
// desktop, ◀ ▶ buttons on touch, ✕ removes, ＋ picker adds back.
import React,{useState,useEffect,useRef} from 'react';
import {WIDGET_DEFS,WIDGET_GROUPS} from './widgets.jsx';

const CURATED_DEFAULT=()=>{
  const ids=new Set(WIDGET_DEFS.map(w=>w.id));
  const curated=['loopcell0','loopcell1','loopcell2','loopcell3','loopcell4','loopcell5','loopcell6','loopcell7',
    'bigrec','playall','stopall','taptempo','mastervol','xypad0','clearall'];
  return curated.filter(id=>ids.has(id)).map(id=>({id,w:id.startsWith('xypad')?2:1,h:id.startsWith('xypad')?2:1}));
};
const LS_LAYOUT='spool-board-layout';
const LS_COMPACT='spool-board-compact';

export default function BoardTab({ctx}){
  const T=ctx.T;
  const[layout,setLayout]=useState(()=>{
    try{
      const s=JSON.parse(localStorage.getItem(LS_LAYOUT));
      const ids=new Set(WIDGET_DEFS.map(w=>w.id));
      if(Array.isArray(s)&&s.length){
        // Migrate legacy [id] -> [{id,w,h}]
        const norm=s.map(e=>{
          if(typeof e==='string')return ids.has(e)?{id:e,w:1,h:1}:null;
          return e&&ids.has(e.id)?{id:e.id,w:Math.min(4,Math.max(1,e.w||1)),h:Math.max(1,e.h||1)}:null;
        }).filter(Boolean);
        if(norm.length)return norm;
      }
    }catch{}
    // Curated Loopy Pro style default: loop cells first, then essentials
    return CURATED_DEFAULT();
  });
  const[editMode,setEditMode]=useState(false);
  const[compact,setCompact]=useState(()=>{try{return localStorage.getItem(LS_COMPACT)==='true'}catch{return false}});
  const[pickerOpen,setPickerOpen]=useState(false);
  const dragId=useRef(null);

  useEffect(()=>{try{localStorage.setItem(LS_LAYOUT,JSON.stringify(layout))}catch{}},[layout]);
  useEffect(()=>{try{localStorage.setItem(LS_COMPACT,String(compact))}catch{}},[compact]);

  const byId=Object.fromEntries(WIDGET_DEFS.map(w=>[w.id,w]));
  const unused=WIDGET_DEFS.filter(w=>!layout.some(e=>e.id===w.id));
  const move=(id,dir)=>setLayout(p=>{
    const i=p.findIndex(e=>e.id===id),j=i+dir;
    if(i<0||j<0||j>=p.length)return p;
    const n=[...p];[n[i],n[j]]=[n[j],n[i]];return n;
  });
  const dropOn=(targetId)=>{
    const from=dragId.current;dragId.current=null;
    if(!from||from===targetId)return;
    setLayout(p=>{const n=p.filter(e=>e.id!==from);const t=n.findIndex(e=>e.id===targetId);n.splice(t<0?n.length:t,0,p.find(e=>e.id===from));return n;});
  };
  const setSize=(id,dw,dh)=>setLayout(p=>p.map(e=>e.id===id?{...e,w:Math.min(4,Math.max(1,e.w+dw)),h:Math.max(1,e.h+dh)}:e));

  const cardPad=compact?'8px 10px':'12px 14px';

  return(
    <div style={{animation:'fadeUp 0.2s ease'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:15,color:T.offwhite,letterSpacing:3}}>⊞ BOARD</div>
        <div style={{fontSize:10,color:T.faint}}>{layout.length} widgets</div>
        <div style={{flex:1}}/>
        <button onClick={()=>setCompact(v=>!v)}
          style={{padding:'7px 12px',borderRadius:6,fontSize:10,fontWeight:700,letterSpacing:1,cursor:'pointer',
            background:compact?`${T.teal}18`:'transparent',border:`1px solid ${compact?T.teal:T.border}`,color:compact?T.teal:T.muted}}>
          {compact?'COMPACT ✓':'COMPACT'}
        </button>
        <button onClick={()=>{if(editMode)setPickerOpen(false);setEditMode(v=>!v);}}
          style={{padding:'7px 12px',borderRadius:6,fontSize:10,fontWeight:700,letterSpacing:1,cursor:'pointer',
            background:editMode?`${T.amber}18`:'transparent',border:`1px solid ${editMode?T.amber:T.border}`,color:editMode?T.amber:T.muted}}>
          {editMode?'DONE':'✎ EDIT'}
        </button>
        {editMode&&(
          <button onClick={()=>setLayout(CURATED_DEFAULT())}
            style={{padding:'7px 12px',borderRadius:6,fontSize:10,fontWeight:700,letterSpacing:1,cursor:'pointer',background:'transparent',border:`1px solid ${T.border}`,color:T.muted}}>
            RESET
          </button>
        )}
      </div>

      {editMode&&(
        <div style={{fontSize:10,color:T.amber,background:`${T.amber}0d`,border:`1px solid ${T.amber}33`,borderRadius:8,padding:'8px 12px',marginBottom:12,letterSpacing:1}}>
          EDIT MODE — drag cards to rearrange (or use ◀ ▶) · ✕ removes · ＋ below adds widgets back
        </div>
      )}

      {/* Widget grid — Loopy Pro style: widgets span variable w×h cells */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gridAutoRows:compact?'minmax(110px,auto)':'minmax(140px,auto)',gap:10}}>
        {layout.map(e=>{
          const def=byId[e.id];if(!def)return null;
          const id=e.id;
          return(
            <div key={id}
              draggable={editMode}
              onDragStart={()=>{dragId.current=id;}}
              onDragOver={e2=>{if(editMode)e2.preventDefault();}}
              onDrop={()=>dropOn(id)}
              style={{background:'var(--card)',border:`1px solid ${editMode?T.amber+'55':'var(--border2)'}`,
                borderRadius:12,padding:cardPad,position:'relative',cursor:editMode?'grab':'default',
                gridColumn:`span ${e.w||1}`,gridRow:`span ${e.h||1}`,minWidth:0,overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:compact?6:10}}>
                <div style={{fontSize:9,color:T.muted,letterSpacing:2,fontWeight:800,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{def.title}</div>
                {editMode&&(
                  <div style={{display:'flex',gap:2,alignItems:'center',flexWrap:'wrap'}}>
                    <button onClick={()=>setSize(id,-1,0)} title="Narrower"
                      style={{width:22,height:22,borderRadius:4,background:'transparent',border:`1px solid ${T.border}`,color:T.muted,cursor:'pointer',fontSize:10}}>⇤</button>
                    <button onClick={()=>setSize(id,1,0)} title="Wider"
                      style={{width:22,height:22,borderRadius:4,background:'transparent',border:`1px solid ${T.border}`,color:T.muted,cursor:'pointer',fontSize:10}}>⇥</button>
                    <button onClick={()=>setSize(id,0,1)} title="Taller"
                      style={{width:22,height:22,borderRadius:4,background:'transparent',border:`1px solid ${T.border}`,color:T.muted,cursor:'pointer',fontSize:10}}>⇩</button>
                    <button onClick={()=>setSize(id,0,-1)} title="Shorter"
                      style={{width:22,height:22,borderRadius:4,background:'transparent',border:`1px solid ${T.border}`,color:T.muted,cursor:'pointer',fontSize:10}}>⇧</button>
                    <button onClick={()=>move(id,-1)} title="Move left"
                      style={{width:22,height:22,borderRadius:4,background:'transparent',border:`1px solid ${T.border}`,color:T.muted,cursor:'pointer',fontSize:10}}>◀</button>
                    <button onClick={()=>move(id,1)} title="Move right"
                      style={{width:22,height:22,borderRadius:4,background:'transparent',border:`1px solid ${T.border}`,color:T.muted,cursor:'pointer',fontSize:10}}>▶</button>
                    <button onClick={()=>setLayout(p=>p.filter(x=>x.id!==id))} title="Remove widget"
                      style={{width:22,height:22,borderRadius:4,background:'rgba(255,77,77,0.1)',border:'1px solid rgba(255,77,77,0.4)',color:'#ff5252',cursor:'pointer',fontSize:10}}>✕</button>
                  </div>
                )}
              </div>
              {def.comp?<def.comp ctx={ctx}/>:def.render(ctx)}
            </div>
          );
        })}
        {editMode&&(
          <button onClick={()=>setPickerOpen(true)}
            style={{border:`2px dashed ${T.border}`,borderRadius:12,background:'transparent',color:T.muted,
              fontSize:28,cursor:'pointer',minHeight:120,padding:cardPad}}>＋<div style={{fontSize:9,letterSpacing:2}}>ADD WIDGET</div></button>
        )}
      </div>

      {/* Widget picker */}
      {pickerOpen&&(
        <div onClick={()=>setPickerOpen(false)} style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:560,maxHeight:'80vh',overflowY:'auto',background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:20}}>
            <div style={{display:'flex',alignItems:'center',marginBottom:14}}>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:13,color:T.offwhite,letterSpacing:2,flex:1}}>ADD WIDGET</div>
              <button onClick={()=>setPickerOpen(false)} style={{background:'transparent',border:`1px solid ${T.border}`,color:T.muted,borderRadius:6,padding:'6px 12px',cursor:'pointer'}}>CLOSE</button>
            </div>
            {unused.length===0&&<div style={{fontSize:11,color:T.faint,textAlign:'center',padding:20}}>All widgets are already on the board.</div>}
            {WIDGET_GROUPS.map(g=>{
              const items=unused.filter(w=>w.group===g);
              if(!items.length)return null;
              return(
                <div key={g} style={{marginBottom:14}}>
                  <div style={{fontSize:9,color:T.muted,letterSpacing:2,fontWeight:800,marginBottom:6}}>{g.toUpperCase()}</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {items.map(w=>(
                      <button key={w.id} onClick={()=>{setLayout(p=>[...p,{id:w.id,w:1,h:1}]);}}
                        style={{padding:'8px 12px',borderRadius:6,background:`${T.green}0d`,border:`1px solid ${T.green}44`,color:T.green,fontSize:10,fontWeight:700,cursor:'pointer'}}>
                        ＋ {w.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
