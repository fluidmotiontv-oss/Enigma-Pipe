import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Radio, Zap, Flame, Lock, Play, Square, RotateCcw, Sliders, Eye, Layers, Volume2, VolumeX, Music, Activity } from 'lucide-react';
import type { MediaAsset, DirectorPersona } from '../types';

interface JumbleForgeProps {
  assets: MediaAsset[];
  activeDirector: DirectorPersona;
  tideBpm: number;
  isBroadcasting: boolean;
  onGoLiveWithJumble: (canvas: HTMLCanvasElement) => void;
}

/* ─── Visual Effect Presets ─── */
const SMART_OBJECTS = [
  { id: 'scanlines', name: 'Scan Lines', weight: 1.0 },
  { id: 'filmgrain', name: 'Film Grain', weight: 0.8 },
  { id: 'vignette', name: 'Sovereign Vignette', weight: 0.6 },
  { id: 'glitchbars', name: 'Glitch Bars', weight: 1.2 },
  { id: 'lowertthird', name: 'Lower Third', weight: 0.7 },
  { id: 'cornerbug', name: 'Dragon Nine Bug', weight: 0.5 },
  { id: 'rgbshift', name: 'RGB Split', weight: 1.0 },
  { id: 'pixelate', name: 'Pixel Chaos', weight: 0.6 },
  { id: 'wavewarp', name: 'Wave Warp', weight: 0.7 },
  { id: 'strobe', name: 'Strobe Cut', weight: 0.9 },
];

const COLOR_LUTS = [
  { id: 'normal', name: 'Natural', filter: 'none' },
  { id: 'cyber', name: 'Cyberpunk', filter: 'contrast(1.3) saturate(1.6) hue-rotate(180deg)' },
  { id: 'wes', name: 'Wes Anderson', filter: 'sepia(0.3) saturate(1.4) contrast(1.1)' },
  { id: 'noir', name: 'Sovereign Noir', filter: 'grayscale(1) contrast(1.4)' },
  { id: 'gold', name: 'Amber Void', filter: 'sepia(0.6) saturate(1.8) contrast(1.2)' },
  { id: 'invert', name: 'Negative Space', filter: 'invert(1) hue-rotate(90deg)' },
];

const DIRECTOR_BIAS: Record<string, string[]> = {
  chaos: ['glitchbars', 'rgbshift', 'strobe', 'pixelate'],
  zen: ['wavewarp', 'vignette', 'filmgrain', 'scanlines'],
  sovereign: ['lowertthird', 'cornerbug', 'scanlines', 'vignette'],
  hype: ['strobe', 'wavewarp', 'rgbshift', 'glitchbars'],
};

/* ─── Helpers ─── */
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const JumbleForge: React.FC<JumbleForgeProps> = ({
  assets,
  activeDirector,
  tideBpm,
  isBroadcasting,
  onGoLiveWithJumble,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const chaosIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Audio Context Ref
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const [isJumbling, setIsJumbling] = useState(false);
  const [activeEffects, setActiveEffects] = useState<string[]>([]);
  const [activeLut, setActiveLut] = useState(COLOR_LUTS[0]);
  const [jumbleIntensity, setJumbleIntensity] = useState(0.5);
  const [syncToTide, setSyncToTide] = useState(true);
  const [injectBroll, setInjectBroll] = useState(true);
  const [audioReactive, setAudioReactive] = useState(true);
  const [audioPlaying, setAudioPlaying] = useState(false);
  
  // Realtime Audio Frequency Levels (0-1)
  const [audioLevels, setAudioLevels] = useState({ bass: 0.4, mid: 0.3, treble: 0.2 });

  const [currentAsset, setCurrentAsset] = useState<MediaAsset | null>(null);
  const [cutCount, setCutCount] = useState(0);
  const [chaosLog, setChaosLog] = useState<string[]>([]);

  /* ─── Web Audio Engine Initialization ─── */
  const toggleAudioPulse = () => {
    if (audioPlaying) {
      if (oscRef.current) {
        oscRef.current.stop();
        oscRef.current.disconnect();
      }
      setAudioPlaying(false);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, ctx.currentTime); // Low A

      // Rhythm pulse
      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      osc.connect(gain);
      gain.connect(analyser);
      analyser.connect(ctx.destination);

      osc.start();
      oscRef.current = osc;
      setAudioPlaying(true);
    } catch (e) {
      console.warn("Web Audio initialization skipped:", e);
    }
  };

  /* ─── Load a random B-roll asset as overlay ─── */
  const rollAsset = useCallback(() => {
    const broll = assets.filter(a => a.aiTag?.includes('B-ROLL') || a.aiTag?.includes('DRONE') || a.aiTag?.includes('CYBERPUNK'));
    if (broll.length && injectBroll) {
      setCurrentAsset(pick(broll));
    }
  }, [assets, injectBroll]);

  /* ─── Apply director-biased random effects ─── */
  const rollEffects = useCallback(() => {
    const bias = DIRECTOR_BIAS[activeDirector.id] || [];
    const count = randInt(2, Math.floor(4 + jumbleIntensity * 4));
    const picked: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const pool = Math.random() < 0.6 && bias.length > 0 
        ? SMART_OBJECTS.filter(s => bias.includes(s.id))
        : SMART_OBJECTS;
      const choice = pick(pool);
      if (!picked.includes(choice.id)) picked.push(choice.id);
    }
    const chosenLut = pick(COLOR_LUTS);
    setActiveEffects(picked);
    setActiveLut(chosenLut);
    rollAsset();
    setCutCount(c => c + 1);
    setChaosLog(prev => {
      const msg = `Cut #${cutCount + 1}: ${picked.join(' + ')} | LUT: ${chosenLut.name}`;
      return [msg, ...prev].slice(0, 20);
    });
  }, [activeDirector.id, jumbleIntensity, rollAsset, cutCount]);

  /* ─── Canvas Render Loop ─── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    const draw = () => {
      const time = Date.now() / 1000;

      // Extract Audio Frequency data if active
      let bass = 0.3 + Math.sin(time * 8) * 0.25;
      let mid = 0.25 + Math.cos(time * 12) * 0.2;
      let treble = 0.2 + Math.sin(time * 18) * 0.15;

      if (analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        bass = (dataArray[1] || 100) / 255;
        mid = (dataArray[8] || 80) / 255;
        treble = (dataArray[16] || 60) / 255;
      }

      setAudioLevels({ bass, mid, treble });

      const audioMult = audioReactive ? (1 + bass * 1.5) : 1;

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, `hsl(${180 + bass * 60}, 60%, 10%)`);
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < 8; i++) {
        const y = (h / 8) * i + Math.sin(time * (1 + bass) + i) * 20;
        ctx.fillStyle = `hsla(${180 + i * 20 + bass * 40}, 70%, 50%, 0.15)`;
        ctx.fillRect(0, y, w, h / 8);
      }
      ctx.restore();

      if (activeLut.id !== 'normal') {
        ctx.filter = activeLut.filter;
      }

      ctx.fillStyle = 'rgba(34, 211, 238, 0.08)';
      ctx.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.6);

      if (currentAsset && injectBroll) {
        const bounce = Math.sin(time * 3 * audioMult) * (10 + bass * 25);
        ctx.save();
        ctx.globalAlpha = 0.5 + Math.sin(time * 2) * 0.2;
        ctx.translate(w * 0.6, h * 0.2 + bounce);
        ctx.rotate(Math.sin(time) * 0.05);
        ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
        ctx.fillRect(0, 0, w * 0.25, h * 0.2);
        ctx.fillStyle = '#c084fc';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(currentAsset.aiTag || 'B-ROLL', 10, 20);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText(currentAsset.fileName.slice(0, 20), 10, 38);
        ctx.restore();
      }

      ctx.filter = 'none';

      /* ─── AUDIO-REACTIVE SMART OBJECT ANIMATIONS ─── */
      if (activeEffects.includes('scanlines')) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        const lineSpacing = Math.max(2, Math.floor(4 - mid * 2));
        for (let y = 0; y < h; y += lineSpacing) {
          ctx.fillRect(0, y + (time * 60 * audioMult) % lineSpacing, w, 1);
        }
      }

      if (activeEffects.includes('filmgrain')) {
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        const noiseScale = 20 + treble * 40;
        for (let i = 0; i < data.length; i += 16) {
          const noise = (Math.random() - 0.5) * noiseScale;
          data[i] = Math.min(255, Math.max(0, data[i] + noise));
          data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise));
          data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise));
        }
        ctx.putImageData(imageData, 0, 0);
      }

      if (activeEffects.includes('glitchbars')) {
        const barCount = randInt(3, Math.floor(6 + bass * 8));
        for (let i = 0; i < barCount; i++) {
          const y = rand(0, h);
          const barH = rand(2, 20 + bass * 20);
          const offset = rand(-50 * audioMult, 50 * audioMult);
          ctx.drawImage(canvas, 0, y, w, barH, offset, y, w, barH);
          ctx.fillStyle = `rgba(${randInt(0,255)},${randInt(0,255)},${randInt(0,255)},${0.3 + bass * 0.4})`;
          ctx.fillRect(rand(0, w), y, rand(20, 100), barH);
        }
      }

      if (activeEffects.includes('rgbshift')) {
        const shift = randInt(3, Math.floor(8 + treble * 20));
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(canvas, shift, 0);
        ctx.globalCompositeOperation = 'source-over';
      }

      if (activeEffects.includes('pixelate')) {
        const size = randInt(8, Math.floor(16 + mid * 24));
        ctx.drawImage(canvas, 0, 0, w / size, h / size);
        ctx.drawImage(canvas, 0, 0, w / size, h / size, 0, 0, w, h);
      }

      if (activeEffects.includes('wavewarp')) {
        ctx.save();
        const amp = (10 + bass * 30) * jumbleIntensity;
        for (let x = 0; x < w; x += 10) {
          const yOff = Math.sin(x * 0.02 + time * 5 * audioMult) * amp;
          ctx.drawImage(canvas, x, 0, 10, h, x, yOff, 10, h);
        }
        ctx.restore();
      }

      if (activeEffects.includes('strobe')) {
        const strobeTrigger = audioReactive ? (bass > 0.65) : (Math.floor(time * 10) % 2 === 0);
        if (strobeTrigger) {
          ctx.fillStyle = `rgba(255,255,255,${0.15 + bass * 0.2})`;
          ctx.fillRect(0, 0, w, h);
        }
      }

      if (activeEffects.includes('vignette')) {
        const rad = Math.max(w, h) * (0.7 - bass * 0.2);
        const vig = ctx.createRadialGradient(w/2, h/2, rad * 0.3, w/2, h/2, rad);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.7)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);
      }

      if (activeEffects.includes('lowertthird')) {
        const thirdH = h * 0.12;
        ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
        ctx.fillRect(0, h - thirdH, w, thirdH);
        ctx.fillStyle = `rgba(34, 211, 238, ${0.8 + bass * 0.2})`;
        ctx.fillRect(w * 0.05, h - thirdH + 10, 4 + bass * 8, thirdH - 20);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(`LIVE • ${activeDirector.name.toUpperCase()} DIRECTING`, w * 0.08, h - thirdH + 32);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px monospace';
        ctx.fillText(`TIDE BPM: ${tideBpm} | AUDIO REACTIVE | BASS: ${Math.round(bass * 100)}%`, w * 0.08, h - thirdH + 52);
      }

      if (activeEffects.includes('cornerbug')) {
        ctx.save();
        ctx.translate(w - 80, 20);
        ctx.rotate(time * 0.5 * audioMult);
        ctx.fillStyle = `rgba(251, 191, 36, ${0.8 + mid * 0.2})`;
        ctx.beginPath();
        ctx.arc(0, 0, 20 + bass * 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('D9', 0, 4);
        ctx.restore();
      }

      if (isJumbling) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fillRect(0, 0, w, 3);
        ctx.fillStyle = '#ef4444';
        const pulse = (Math.sin(time * 8 * audioMult) + 1) / 2;
        ctx.fillRect(0, 0, w * pulse, 3);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [activeEffects, activeLut, currentAsset, injectBroll, isJumbling, jumbleIntensity, tideBpm, cutCount, activeDirector.name, audioReactive]);

  /* ─── Chaos Cut Timer ─── */
  useEffect(() => {
    if (!isJumbling) {
      if (chaosIntervalRef.current) clearInterval(chaosIntervalRef.current);
      return;
    }

    const beatMs = syncToTide && tideBpm > 0
      ? (60000 / tideBpm) * rand(1, 4)
      : rand(500, 3000);

    chaosIntervalRef.current = setInterval(() => {
      rollEffects();
    }, beatMs);

    return () => {
      if (chaosIntervalRef.current) clearInterval(chaosIntervalRef.current);
    };
  }, [isJumbling, syncToTide, tideBpm, rollEffects]);

  const toggleJumble = () => {
    if (isJumbling) {
      setIsJumbling(false);
      setActiveEffects([]);
      setCurrentAsset(null);
    } else {
      setIsJumbling(true);
      rollEffects();
    }
  };

  const manualRoll = () => {
    rollEffects();
  };

  const lockState = () => {
    setIsJumbling(false);
    if (chaosIntervalRef.current) clearInterval(chaosIntervalRef.current);
    setChaosLog(prev => [`🔒 LOCKED: ${activeEffects.join(' + ')} | ${activeLut.name}`, ...prev].slice(0, 20));
  };

  return (
    <div className="min-h-[700px] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-rose-400 via-amber-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-amber-400" />
            <span>Jumble Forge</span>
          </h2>
          <p className="text-slate-400 text-xs font-mono mt-1">
            Audio-Reactive Chaos Engine • Tide Synth Spectral Modulator • Smart Object Overlays
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleAudioPulse}
            className={`px-4 py-3 rounded-xl font-bold text-xs font-mono flex items-center gap-2 border transition-all ${
              audioPlaying
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 animate-pulse'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {audioPlaying ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            <span>{audioPlaying ? 'SYNTH PULSE LIVE' : 'PLAY AUDIO PULSE'}</span>
          </button>
          <button
            onClick={toggleJumble}
            className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 ${
              isJumbling
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 animate-pulse'
                : 'bg-slate-800 border border-slate-700 text-slate-200 hover:border-amber-400 hover:text-amber-300'
            }`}
          >
            {isJumbling ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isJumbling ? 'STOP CHAOS' : '🎲 JUMBLE FEED'}</span>
          </button>
          <button
            onClick={manualRoll}
            disabled={!isJumbling}
            className="px-4 py-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-sm hover:bg-amber-500/30 transition-all disabled:opacity-30 flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Re-Roll</span>
          </button>
          <button
            onClick={lockState}
            className="px-4 py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-sm hover:bg-cyan-500/30 transition-all flex items-center gap-1.5"
          >
            <Lock className="w-4 h-4" />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* Audio Reactive Spectrum Meters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3">
          <Activity className="w-4 h-4 text-rose-400" />
          <div className="flex-1">
            <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>BASS GLITCH (20-250Hz)</span>
              <span className="text-rose-400 font-bold">{Math.round(audioLevels.bass * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div className="h-full bg-rose-500 transition-all duration-75" style={{ width: `${Math.round(audioLevels.bass * 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Music className="w-4 h-4 text-amber-400" />
          <div className="flex-1">
            <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>MID PIXEL (250-2000Hz)</span>
              <span className="text-amber-400 font-bold">{Math.round(audioLevels.mid * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div className="h-full bg-amber-500 transition-all duration-75" style={{ width: `${Math.round(audioLevels.mid * 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Zap className="w-4 h-4 text-cyan-400" />
          <div className="flex-1">
            <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>TREBLE RGB (2-8kHz)</span>
              <span className="text-cyan-400 font-bold">{Math.round(audioLevels.treble * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div className="h-full bg-cyan-500 transition-all duration-75" style={{ width: `${Math.round(audioLevels.treble * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Canvas */}
        <div className="xl:col-span-2 space-y-4">
          <div className="relative rounded-2xl border border-slate-800 bg-black overflow-hidden shadow-2xl">
            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              className="w-full aspect-video"
            />
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-950/80 px-3 py-1 rounded-lg border border-slate-800 backdrop-blur-md">
              <div className={`w-2 h-2 rounded-full ${isJumbling ? 'bg-rose-500 animate-ping' : 'bg-slate-600'}`} />
              <span className="text-xs font-mono text-slate-300">{isJumbling ? 'AUDIO CHAOS LIVE' : 'STANDBY'}</span>
            </div>
            <div className="absolute top-4 right-4 text-xs font-mono text-slate-300 bg-slate-950/80 px-3 py-1 rounded-lg border border-slate-800 backdrop-blur-md">
              {activeLut.name} • {activeEffects.length} FX
            </div>
          </div>

          {/* Active Effects Strip */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 font-mono flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Active Audio-Reactive Smart Objects & FX</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {activeEffects.map(fx => {
                  const obj = SMART_OBJECTS.find(s => s.id === fx);
                  return (
                    <motion.span
                      key={fx}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold"
                    >
                      {obj?.name || fx}
                    </motion.span>
                  );
                })}
              </AnimatePresence>
              {activeEffects.length === 0 && (
                <span className="text-slate-500 text-xs italic font-mono">No effects active. Click "JUMBLE FEED" to start.</span>
              )}
            </div>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="space-y-4">
          {/* Intensity */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Chaos Intensity</h3>
              <span className="text-rose-400 font-mono text-xs font-bold">{Math.round(jumbleIntensity * 100)}%</span>
            </div>
            <input
              type="range" min="0.1" max="1" step="0.05" value={jumbleIntensity}
              onChange={e => setJumbleIntensity(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          {/* Sync Options */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Sync & Modulation</h3>
            <label className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer font-mono">
              <input
                type="checkbox" checked={audioReactive}
                onChange={e => setAudioReactive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500"
              />
              Modulate FX with Live Audio (Bass/Mid/Treble)
            </label>
            <label className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer font-mono">
              <input
                type="checkbox" checked={syncToTide}
                onChange={e => setSyncToTide(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-500"
              />
              Sync cuts to Tide BPM ({tideBpm} BPM)
            </label>
            <label className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer font-mono">
              <input
                type="checkbox" checked={injectBroll}
                onChange={e => setInjectBroll(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-purple-500"
              />
              Inject random B-roll overlays
            </label>
          </div>

          {/* Director Bias */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-2">Active Director Bias</h3>
            <div className="text-sm font-bold text-amber-400 font-mono">
              {activeDirector.name}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Favors: {DIRECTOR_BIAS[activeDirector.id]?.join(', ') || 'Pure chaos'}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-center">
              <div className="text-xl font-bold text-amber-400 font-mono">{cutCount}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Chaos Cuts</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-center">
              <div className="text-xl font-bold text-cyan-400 font-mono">{assets.length}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Vault Assets</div>
            </div>
          </div>

          {/* Chaos Log */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-2">Chaos Log</h3>
            <div className="space-y-1 max-h-36 overflow-y-auto font-mono text-[10px] bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              {chaosLog.map((log, i) => (
                <div key={i} className="text-slate-400 truncate">{log}</div>
              ))}
              {chaosLog.length === 0 && <div className="text-slate-600 italic">Awaiting chaos...</div>}
            </div>
          </div>

          {/* Broadcast Button */}
          {isJumbling && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => canvasRef.current && onGoLiveWithJumble(canvasRef.current)}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs font-mono shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Radio className="w-4 h-4" />
              <span>📡 Go Live with Jumble Stream</span>
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};
