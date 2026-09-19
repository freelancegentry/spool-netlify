// ── Modular insert FX engine ────────────────────────────────────────────────
// Each effect: buildEffect(ctx, type) -> {input, output, setParam(id,v), dispose()}
// All effects are wet/dry capable and safe to rebuild live.

export const FX_DEFS = {
  chorus: {
    name: 'Chorus',
    params: [
      {id:'rate', label:'Rate', min:0.1, max:8, step:0.1, def:1.5, unit:'Hz'},
      {id:'depth', label:'Depth', min:0, max:1, step:0.01, def:0.35},
      {id:'mix', label:'Mix', min:0, max:1, step:0.01, def:0.5},
    ],
  },
  flanger: {
    name: 'Flanger',
    params: [
      {id:'rate', label:'Rate', min:0.1, max:8, step:0.1, def:0.8, unit:'Hz'},
      {id:'depth', label:'Depth', min:0, max:1, step:0.01, def:0.6},
      {id:'feedback', label:'Fdbk', min:0, max:0.9, step:0.01, def:0.55},
      {id:'mix', label:'Mix', min:0, max:1, step:0.01, def:0.5},
    ],
  },
  phaser: {
    name: 'Phaser',
    params: [
      {id:'rate', label:'Rate', min:0.1, max:8, step:0.1, def:1.0, unit:'Hz'},
      {id:'depth', label:'Depth', min:0, max:1, step:0.01, def:0.7},
      {id:'mix', label:'Mix', min:0, max:1, step:0.01, def:0.5},
    ],
  },
  distortion: {
    name: 'Distortion',
    params: [
      {id:'drive', label:'Drive', min:1, max:100, step:1, def:25},
      {id:'tone', label:'Tone', min:800, max:18000, step:100, def:6500, unit:'Hz'},
      {id:'mix', label:'Mix', min:0, max:1, step:0.01, def:0.8},
    ],
  },
  tremolo: {
    name: 'Tremolo',
    params: [
      {id:'rate', label:'Rate', min:0.1, max:15, step:0.1, def:5, unit:'Hz'},
      {id:'depth', label:'Depth', min:0, max:1, step:0.01, def:0.7},
    ],
  },
  bitcrusher: {
    name: 'Bitcrush',
    params: [
      {id:'bits', label:'Bits', min:3, max:16, step:1, def:8},
      {id:'mix', label:'Mix', min:0, max:1, step:0.01, def:0.7},
    ],
  },
  wah: {
    name: 'Auto-Wah',
    params: [
      {id:'rate', label:'Rate', min:0.1, max:8, step:0.1, def:2, unit:'Hz'},
      {id:'depth', label:'Depth', min:0, max:1, step:0.01, def:0.6},
      {id:'q', label:'Reso', min:0.5, max:12, step:0.1, def:4},
    ],
  },
};

export const FX_TYPE_LIST = Object.keys(FX_DEFS);

export function emptySlot() {
  return {type:'', enabled:true, rate:1.5, depth:0.5, mix:0.5, feedback:0.55, drive:25, tone:6500, bits:8, q:4};
}

function makeLFO(ctx, rate, depthScale) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = rate;
  const g = ctx.createGain();
  g.gain.value = depthScale;
  osc.connect(g);
  osc.start();
  return {osc, out: g};
}

function distortionCurve(k) {
  const n = 512, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return curve;
}

function crushCurve(bits) {
  const n = 1024, curve = new Float32Array(n);
  const steps = Math.pow(2, bits);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.round(x * steps) / steps;
  }
  return curve;
}

const builders = {
  chorus(ctx) {
    const input = ctx.createGain(), output = ctx.createGain();
    const dry = ctx.createGain(), wet = ctx.createGain();
    const dly = ctx.createDelay(0.1); dly.delayTime.value = 0.02;
    const lfo = makeLFO(ctx, 1.5, 0.008);
    lfo.out.connect(dly.delayTime);
    input.connect(dry); dry.connect(output);
    input.connect(dly); dly.connect(wet); wet.connect(output);
    const S = {
      rate: v => lfo.osc.frequency.setTargetAtTime(v, ctx.currentTime, 0.02),
      depth: v => lfo.out.gain.setTargetAtTime(v * 0.008, ctx.currentTime, 0.02),
      mix: v => { dry.gain.setTargetAtTime(1 - v * 0.5, ctx.currentTime, 0.02); wet.gain.setTargetAtTime(v, ctx.currentTime, 0.02); },
    };
    return {input, output, setParam:(id,v)=>S[id]?.(v),
      dispose(){ try{lfo.osc.stop();}catch{} lfo.osc.disconnect(); }};
  },

  flanger(ctx) {
    const input = ctx.createGain(), output = ctx.createGain();
    const dry = ctx.createGain(), wet = ctx.createGain();
    const dly = ctx.createDelay(0.05); dly.delayTime.value = 0.004;
    const fb = ctx.createGain(); fb.gain.value = 0.55;
    dly.connect(fb); fb.connect(dly);
    const lfo = makeLFO(ctx, 0.8, 0.0025);
    lfo.out.connect(dly.delayTime);
    input.connect(dry); dry.connect(output);
    input.connect(dly); dly.connect(wet); wet.connect(output);
    const S = {
      rate: v => lfo.osc.frequency.setTargetAtTime(v, ctx.currentTime, 0.02),
      depth: v => lfo.out.gain.setTargetAtTime(v * 0.0025, ctx.currentTime, 0.02),
      feedback: v => fb.gain.setTargetAtTime(v, ctx.currentTime, 0.02),
      mix: v => { dry.gain.setTargetAtTime(1 - v * 0.5, ctx.currentTime, 0.02); wet.gain.setTargetAtTime(v, ctx.currentTime, 0.02); },
    };
    return {input, output, setParam:(id,v)=>S[id]?.(v),
      dispose(){ try{lfo.osc.stop();}catch{} lfo.osc.disconnect(); }};
  },

  phaser(ctx) {
    const input = ctx.createGain(), output = ctx.createGain();
    const dry = ctx.createGain(), wet = ctx.createGain();
    const stages = [];
    let head = input;
    for (let i = 0; i < 4; i++) {
      const ap = ctx.createBiquadFilter();
      ap.type = 'allpass'; ap.frequency.value = 800; ap.Q.value = 1;
      head.connect(ap); head = ap; stages.push(ap);
    }
    head.connect(wet); wet.connect(output);
    input.connect(dry); dry.connect(output);
    const lfo = makeLFO(ctx, 1.0, 1400);
    stages.forEach(ap => lfo.out.connect(ap.frequency));
    const S = {
      rate: v => lfo.osc.frequency.setTargetAtTime(v, ctx.currentTime, 0.02),
      depth: v => lfo.out.gain.setTargetAtTime(300 + v * 2200, ctx.currentTime, 0.02),
      mix: v => { dry.gain.setTargetAtTime(1 - v * 0.5, ctx.currentTime, 0.02); wet.gain.setTargetAtTime(v, ctx.currentTime, 0.02); },
    };
    // set base frequency offset so LFO sweeps around center
    stages.forEach(ap => ap.frequency.value = 900);
    return {input, output, setParam:(id,v)=>S[id]?.(v),
      dispose(){ try{lfo.osc.stop();}catch{} lfo.osc.disconnect(); }};
  },

  distortion(ctx) {
    const input = ctx.createGain(), output = ctx.createGain();
    const dry = ctx.createGain(), wet = ctx.createGain();
    const shaper = ctx.createWaveShaper();
    shaper.curve = distortionCurve(25); shaper.oversample = '4x';
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass'; tone.frequency.value = 6500;
    input.connect(dry); dry.connect(output);
    input.connect(shaper); shaper.connect(tone); tone.connect(wet); wet.connect(output);
    const S = {
      drive: v => { shaper.curve = distortionCurve(Math.max(1, v)); },
      tone: v => tone.frequency.setTargetAtTime(v, ctx.currentTime, 0.02),
      mix: v => { dry.gain.setTargetAtTime(1 - v, ctx.currentTime, 0.02); wet.gain.setTargetAtTime(v, ctx.currentTime, 0.02); },
    };
    return {input, output, setParam:(id,v)=>S[id]?.(v), dispose(){}};
  },

  tremolo(ctx) {
    const input = ctx.createGain(), output = ctx.createGain();
    const trem = ctx.createGain(); trem.gain.value = 1;
    input.connect(trem); trem.connect(output);
    const lfo = makeLFO(ctx, 5, 0.35);
    lfo.out.connect(trem.gain);
    const S = {
      rate: v => lfo.osc.frequency.setTargetAtTime(v, ctx.currentTime, 0.02),
      depth: v => {
        trem.gain.setTargetAtTime(1 - v / 2, ctx.currentTime, 0.02);
        lfo.out.gain.setTargetAtTime(v / 2, ctx.currentTime, 0.02);
      },
    };
    return {input, output, setParam:(id,v)=>S[id]?.(v),
      dispose(){ try{lfo.osc.stop();}catch{} lfo.osc.disconnect(); }};
  },

  bitcrusher(ctx) {
    const input = ctx.createGain(), output = ctx.createGain();
    const dry = ctx.createGain(), wet = ctx.createGain();
    const shaper = ctx.createWaveShaper();
    shaper.curve = crushCurve(8);
    input.connect(dry); dry.connect(output);
    input.connect(shaper); shaper.connect(wet); wet.connect(output);
    const S = {
      bits: v => { shaper.curve = crushCurve(Math.round(v)); },
      mix: v => { dry.gain.setTargetAtTime(1 - v, ctx.currentTime, 0.02); wet.gain.setTargetAtTime(v, ctx.currentTime, 0.02); },
    };
    return {input, output, setParam:(id,v)=>S[id]?.(v), dispose(){}};
  },

  wah(ctx) {
    const input = ctx.createGain(), output = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 4;
    input.connect(bp); bp.connect(output);
    const lfo = makeLFO(ctx, 2, 900);
    lfo.out.connect(bp.frequency);
    const S = {
      rate: v => lfo.osc.frequency.setTargetAtTime(v, ctx.currentTime, 0.02),
      depth: v => lfo.out.gain.setTargetAtTime(v * 1600, ctx.currentTime, 0.02),
      q: v => bp.Q.setTargetAtTime(v, ctx.currentTime, 0.02),
    };
    return {input, output, setParam:(id,v)=>S[id]?.(v),
      dispose(){ try{lfo.osc.stop();}catch{} lfo.osc.disconnect(); }};
  },
};

export function buildEffect(ctx, type) {
  const b = builders[type];
  return b ? b(ctx) : null;
}

// Apply a full slot state {type, enabled, ...params} to a built effect
export function applySlotParams(effect, type, slot) {
  if (!effect || !FX_DEFS[type]) return;
  FX_DEFS[type].params.forEach(p => {
    if (slot[p.id] !== undefined) effect.setParam(p.id, slot[p.id]);
  });
}
