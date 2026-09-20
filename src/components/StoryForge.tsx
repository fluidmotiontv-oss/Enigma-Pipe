import React, { useState, useEffect, useRef } from 'react';
import { DIRECTORS, SAMPLE_PITCH_SCRIPTS } from '../data/directorsData';
import { DirectorPersona, MediaAsset, StorySegment, BroadcastStreamState } from '../types';
import { Sparkles, Volume2, VolumeX, Play, Pause, Wand2, Flame, Layers, Plus, Trash2, ArrowRight, Mic, Clapperboard, CheckCircle2, Music, Radio, Sliders, Activity, Zap, RefreshCw, Video, ChevronUp, ChevronDown, Clock } from 'lucide-react';

interface StoryForgeProps {
  timeline: StorySegment[];
  availableAssets: MediaAsset[];
  onUpdateTimeline: (newTimeline: StorySegment[]) => void;
  onOpenKdenliveExport: () => void;
  activeDirector: DirectorPersona;
  onChangeDirector: (dir: DirectorPersona) => void;
}

export const StoryForge: React.FC<StoryForgeProps> = ({
  timeline,
  availableAssets,
  onUpdateTimeline,
  onOpenKdenliveExport,
  activeDirector,
  onChangeDirector
}) => {
  const [scriptTitle, setScriptTitle] = useState(SAMPLE_PITCH_SCRIPTS[0].title);
  const [scriptHook, setScriptHook] = useState(SAMPLE_PITCH_SCRIPTS[0].hook);
  const [scriptBody, setScriptBody] = useState(SAMPLE_PITCH_SCRIPTS[0].body);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingText, setSpeakingText] = useState('');
  const [volume, setVolume] = useState(1);

  // 🌊 Tide Synth State
  const [tideBpm, setTideBpm] = useState(128);
  const [beatsPerCut, setBeatsPerCut] = useState(8);
  const [isTideSynced, setIsTideSynced] = useState(false);

  // 📡 Broadcast Stream State
  const [broadcast, setBroadcast] = useState<BroadcastStreamState>({
    isLive: false,
    streamTitle: "FLUID MOTION TV: Sovereign 4K Broadcast",
    channelName: "dragon9_live",
    obsWebSocketStatus: "connected",
    streamKey: "live_dragon9_4k_sovereign_key",
    viewerCount: 1420,
    bitrateKbps: 15400,
    fps: 60,
    resolution: "3840x2160",
    lowerThirdsText: "LIVE: DRAGON NINE 4K SOVEREIGN STORY FORGE",
    audioPeakLeft: 82,
    audioPeakRight: 86
  });

  // Avatar customization
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);

  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      synthRef.current?.cancel();
    };
  }, []);

  // Poll broadcast stream stats when live
  useEffect(() => {
    let interval: any;
    if (broadcast.isLive) {
      interval = setInterval(async () => {
        try {
          const res = await fetch('/api/broadcast/status');
          if (res.ok) {
            const data = await res.json();
            setBroadcast(prev => ({
              ...prev,
              viewerCount: data.viewerCount,
              audioPeakLeft: data.audioPeakLeft,
              audioPeakRight: data.audioPeakRight
            }));
          }
        } catch (e) {
          // ignore offline
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [broadcast.isLive]);

  const speakText = (text: string) => {
    if (!synthRef.current) return;

    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = activeDirector.voicePitch;
    utterance.rate = activeDirector.voiceRate;
    utterance.volume = volume;

    const voices = synthRef.current.getVoices();
    const matchedVoice = voices.find(v => v.lang.includes(activeDirector.voiceLang.split('-')[0])) || voices[0];
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeakingText(text);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingText('');
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingText('');
    };

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // 🌊 Tide Synth Cut Alignment
  const handleSyncToTide = async () => {
    try {
      const res = await fetch('/api/tide-synth/beat-grid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bpm: tideBpm, beatsPerCut, totalDurationSec: 120 })
      });

      if (res.ok) {
        const data = await res.json();
        const cutInterval = data.cutIntervalSec || (60 / tideBpm) * beatsPerCut;

        // Recalculate timeline segment durations to snap precisely onto Tide Synth beat cuts
        let currentStart = 0;
        const syncedTimeline = timeline.map((seg, idx) => {
          const syncedSeg: StorySegment = {
            ...seg,
            startTimeSec: currentStart,
            durationSec: cutInterval,
            notes: `Beat Synced to Tide (${tideBpm} BPM / ${beatsPerCut} beats)`
          };
          currentStart += cutInterval;
          return syncedSeg;
        });

        onUpdateTimeline(syncedTimeline);
        setIsTideSynced(true);
        speakText(`Story Forge cuts synced to Tide Synth at ${tideBpm} BPM! Every cut lands on beat ${beatsPerCut}.`);
      }
    } catch (err) {
      // Fallback local calc
      const cutInterval = Number(((60 / tideBpm) * beatsPerCut).toFixed(2));
      let currentStart = 0;
      const syncedTimeline = timeline.map((seg) => {
        const syncedSeg: StorySegment = {
          ...seg,
          startTimeSec: currentStart,
          durationSec: cutInterval,
          notes: `Beat Synced to Tide (${tideBpm} BPM)`
        };
        currentStart += cutInterval;
        return syncedSeg;
      });
      onUpdateTimeline(syncedTimeline);
      setIsTideSynced(true);
    }
  };

  const handleToggleGoLive = async () => {
    try {
      const res = await fetch('/api/broadcast/toggle', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setBroadcast(prev => ({ ...prev, isLive: data.isLive }));
        if (data.isLive) {
          speakText("Going Live on Fluid Motion TV! Broadcasting 4K sovereign feed.");
        } else {
          speakText("Broadcast stream stopped.");
        }
      }
    } catch (e) {
      setBroadcast(prev => ({ ...prev, isLive: !prev.isLive }));
    }
  };

  const handleAutoAssemble = () => {
    const matched = availableAssets.filter(a => a.directorVibe === activeDirector.name || a.aiTag !== '404-TRASH');
    const selected = matched.length > 0 ? matched : availableAssets;

    let timeSec = 0;
    const newSegs: StorySegment[] = selected.slice(0, 4).map((asset, idx) => {
      const durationSec = 10 + idx * 5;
      const seg: StorySegment = {
        id: `seg_${Date.now()}_${idx}`,
        asset,
        track: idx === 0 ? 'A-Roll (Main)' : idx === 1 ? 'B-Roll (Overlay)' : 'Voice/Avatar',
        startTimeSec: timeSec,
        durationSec,
        transition: activeDirector.id === 'chaos' ? 'glitch' : activeDirector.id === 'zen' ? 'dissolve' : 'sovereign_wipe',
        notes: `Auto-cut by ${activeDirector.name}`
      };
      timeSec += durationSec;
      return seg;
    });

    onUpdateTimeline(newSegs);

    const hypePhrase = activeDirector.hypeCatchphrases[Math.floor(Math.random() * activeDirector.hypeCatchphrases.length)];
    speakText(`Timeline assembled! ${hypePhrase}`);
  };

  const handleRoastTimeline = () => {
    const roast = activeDirector.roastCatchphrases[Math.floor(Math.random() * activeDirector.roastCatchphrases.length)];
    speakText(roast);
  };

  const handleGenerateScript = () => {
    const randomScript = SAMPLE_PITCH_SCRIPTS[Math.floor(Math.random() * SAMPLE_PITCH_SCRIPTS.length)];
    setScriptTitle(randomScript.title);
    setScriptHook(randomScript.hook);
    setScriptBody(randomScript.body);

    speakText(`Script ready: ${randomScript.hook}`);
  };

  const removeSegment = (id: string) => {
    onUpdateTimeline(timeline.filter(s => s.id !== id));
  };

  const moveSegment = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === timeline.length - 1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const next = [...timeline];
    const item = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = item;
    onUpdateTimeline(next);
  };

  const totalDurationSec = timeline.reduce((acc, curr) => acc + (curr.durationSec || 0), 0);
  const formattedDuration = `${Math.floor(totalDurationSec / 60).toString().padStart(2, '0')}:${Math.floor(totalDurationSec % 60).toString().padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      {/* 📡 Broadcast Live Stream Banner & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white space-y-4 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${broadcast.isLive ? 'bg-rose-500 animate-ping' : 'bg-slate-600'}`}></span>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 font-mono">
                {broadcast.isLive ? 'BROADCASTING LIVE ON FLUID MOTION TV' : 'BROADCAST OFFLINE'}
              </span>
            </div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Radio className="w-6 h-6 text-rose-500" />
              <span>Broadcast Stream Output (WebRTC / OBS)</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleGoLive}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
                broadcast.isLive
                  ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>{broadcast.isLive ? 'STOP BROADCAST' : 'GO LIVE (4K BROADCAST)'}</span>
            </button>
          </div>
        </div>

        {/* Live Broadcast Monitor Box */}
        {broadcast.isLive && (
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 relative overflow-hidden space-y-3">
            <div className="aspect-video bg-black rounded-lg border border-slate-800 relative overflow-hidden flex items-center justify-center">
              {timeline[0]?.asset?.thumbnailUrl ? (
                <img
                  src={timeline[0].asset.thumbnailUrl}
                  alt="Live Preview"
                  className="w-full h-full object-cover opacity-80"
                />
              ) : (
                <div className="text-slate-500 font-mono text-xs">NO ACTIVE TIMELINE FEED</div>
              )}

              {/* Lower Thirds Overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 border border-slate-700 backdrop-blur-md p-3 rounded-lg flex items-center justify-between text-white">
                <div>
                  <div className="text-[10px] font-bold text-rose-400 font-mono tracking-wider">FLUID MOTION TV 4K</div>
                  <div className="text-xs font-bold font-mono">{broadcast.lowerThirdsText}</div>
                </div>
                <div className="text-[10px] font-mono text-slate-400 text-right">
                  <div>FPS: {broadcast.fps}</div>
                  <div>BITRATE: {(broadcast.bitrateKbps / 1000).toFixed(1)} Mbps</div>
                </div>
              </div>

              {/* Top Live Badge */}
              <div className="absolute top-3 left-3 bg-rose-600 text-white px-2.5 py-1 rounded text-[10px] font-bold font-mono tracking-wider uppercase shadow-md flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                <span>LIVE 4K</span>
              </div>
            </div>

            {/* Broadcast Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Viewers Online</span>
                <span className="text-emerald-400 font-bold text-sm">{broadcast.viewerCount.toLocaleString()}</span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">OBS WebSocket</span>
                <span className="text-indigo-400 font-bold text-sm">CONNECTED (ws://localhost:4455)</span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Stream Resolution</span>
                <span className="text-amber-400 font-bold text-sm">3840x2160 @ 60fps</span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Audio VU Meters</span>
                <div className="flex items-center gap-1 mt-1">
                  <div className="flex-1 bg-slate-800 h-2 rounded overflow-hidden">
                    <div className="bg-emerald-400 h-full" style={{ width: `${broadcast.audioPeakLeft}%` }}></div>
                  </div>
                  <div className="flex-1 bg-slate-800 h-2 rounded overflow-hidden">
                    <div className="bg-emerald-400 h-full" style={{ width: `${broadcast.audioPeakRight}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🌊 Tide Synth × Story Forge Sync Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Audio Tempo Alignment</span>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Music className="w-5 h-5 text-indigo-600" />
              <span>Tide Synth × Beat Sync Engine</span>
            </h3>
          </div>

          <button
            onClick={handleSyncToTide}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all ${
              isTideSynced
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>{isTideSynced ? 'Synced to Tide Beat ✓' : 'Sync Cuts to Tide Synth'}</span>
          </button>
        </div>

        {/* BPM Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-700">Tide Synth Live BPM</span>
              <span className="font-mono text-indigo-600 font-bold text-sm">{tideBpm} BPM</span>
            </div>
            <input
              type="range"
              min={60}
              max={180}
              value={tideBpm}
              onChange={(e) => {
                setTideBpm(Number(e.target.value));
                setIsTideSynced(false);
              }}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-700">Cut Interval (Beats)</span>
              <span className="font-mono text-indigo-600 font-bold text-sm">{beatsPerCut} Beats</span>
            </div>
            <select
              value={beatsPerCut}
              onChange={(e) => {
                setBeatsPerCut(Number(e.target.value));
                setIsTideSynced(false);
              }}
              className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-bold text-slate-800"
            >
              <option value={2}>Every 2 Beats (Fast/Hype Cut)</option>
              <option value={4}>Every 4 Beats (1 Bar Cut)</option>
              <option value={8}>Every 8 Beats (2 Bars Cut)</option>
              <option value={16}>Every 16 Beats (Cinematic Block)</option>
            </select>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
            <span className="font-bold text-slate-700 text-[11px]">Calculated Cut Duration</span>
            <div className="font-mono text-slate-900 font-bold text-sm">
              {((60 / tideBpm) * beatsPerCut).toFixed(2)} seconds / cut
            </div>
          </div>
        </div>
      </div>

      {/* AI Director Persona Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Co-Director AI Engine</span>
            <h2 className="text-xl font-bold flex items-center gap-2 mt-0.5">
              <span>🎭 Select Co-Director & Hype Persona</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => isSpeaking ? stopSpeaking() : speakText(`Greetings! I am ${activeDirector.name}. ${activeDirector.tagline}`)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isSpeaking ? 'Mute Director Voice' : 'Test Voice Output'}</span>
            </button>
          </div>
        </div>

        {/* Director Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(DIRECTORS).map((dir) => {
            const isSelected = activeDirector.id === dir.id;
            return (
              <button
                key={dir.id}
                onClick={() => {
                  onChangeDirector(dir);
                  speakText(`Switched to ${dir.name}. ${dir.tagline}`);
                }}
                className={`p-4 rounded-xl text-left border transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800 border-indigo-500 shadow-lg ring-1 ring-indigo-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{dir.avatarEmoji}</span>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-600 text-white uppercase font-mono">
                        Active Co-Director
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-white">{dir.name}</h3>
                  <p className="text-[11px] text-indigo-400 font-medium">{dir.title}</p>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 italic">"{dir.tagline}"</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
                  Style: <span className="text-slate-300 font-semibold">{dir.editStyle}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Avatar Speech Studio & Pitch Script Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pitch & Script Creator */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Script & Pitch Engine</span>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clapperboard className="w-4 h-4 text-indigo-600" />
                <span>Story Teller Pitch Ideas & Script Writer</span>
              </h3>
            </div>

            <button
              onClick={handleGenerateScript}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>AI Pitch Generator</span>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Story Title / Hook Concept</label>
              <input
                type="text"
                value={scriptTitle}
                onChange={(e) => setScriptTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg p-2.5 font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Viral YouTube Hook Line</label>
              <input
                type="text"
                value={scriptHook}
                onChange={(e) => setScriptHook(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg p-2.5 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Broadcast Story Script</label>
              <textarea
                rows={3}
                value={scriptBody}
                onChange={(e) => setScriptBody(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg p-2.5 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => speakText(`${scriptHook}. ${scriptBody}`)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Perform Voice Pitch</span>
              </button>

              <button
                onClick={handleRoastTimeline}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Flame className="w-3.5 h-3.5 text-rose-600" />
                <span>Roast My Footage</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-500 font-mono">
              Active Voice: <strong className="text-slate-900">{activeDirector.name}</strong> ({activeDirector.voiceLang})
            </div>
          </div>
        </div>

        {/* 🎙️ Real Lip Sync Wav2Lip Avatar Studio Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-white flex flex-col justify-between space-y-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Avatar Neural Lip Sync (Wav2Lip)</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isSpeaking ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
              {isSpeaking ? 'SPEAKING LIVE' : 'VOICE IDLE'}
            </span>
          </div>

          {/* Avatar Face Visualizer */}
          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            <div className={`relative w-28 h-28 rounded-full flex items-center justify-center text-5xl bg-gradient-to-br ${activeDirector.color} border-4 ${isSpeaking ? 'border-emerald-400 scale-105' : 'border-slate-800'} transition-all duration-300 shadow-2xl overflow-hidden`}>
              {customAvatarUrl ? (
                <img src={customAvatarUrl} alt="Avatar Portrait" className="w-full h-full object-cover" />
              ) : (
                <span>{activeDirector.avatarEmoji}</span>
              )}

              {/* Wav2Lip Morphing Mouth Simulation */}
              {isSpeaking && (
                <div className="absolute bottom-4 w-8 h-4 bg-slate-950/90 rounded-full border-2 border-emerald-400 animate-bounce flex items-center justify-center overflow-hidden">
                  <div className="w-4 h-1 bg-rose-500 rounded-full animate-ping"></div>
                </div>
              )}
            </div>

            <div className="text-center">
              <h4 className="font-bold text-sm text-white">{activeDirector.name}</h4>
              <p className="text-xs text-indigo-400 font-mono">{activeDirector.title}</p>
            </div>

            {/* Audio Waveform animation */}
            <div className="flex items-center gap-1 h-8 px-4 w-full justify-center">
              {[0.4, 0.8, 0.3, 0.9, 0.6, 0.2, 0.85, 0.5, 0.95, 0.4].map((h, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full bg-indigo-500 transition-all duration-150 ${
                    isSpeaking ? 'animate-bounce' : 'opacity-30'
                  }`}
                  style={{
                    height: isSpeaking ? `${Math.max(15, h * 32)}px` : '6px',
                    animationDelay: `${i * 0.08}s`
                  }}
                ></div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 min-h-[50px] flex items-center justify-center text-center">
            {isSpeaking ? (
              <span className="text-emerald-300 animate-pulse">"{speakingText}"</span>
            ) : (
              <span className="text-slate-500 italic">"Click 'Perform Voice Pitch' to activate speech synthesis."</span>
            )}
          </div>
        </div>
      </div>

      {/* Story Timeline & Kdenlive Auto-Assembler */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Multitrack Timeline Assembly</span>
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Sovereign Story Timeline ({timeline.length} Cuts)</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-600" />
                <span>{formattedDuration} ({totalDurationSec}s)</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoAssemble}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Assemble by Vibe</span>
            </button>

            <button
              onClick={onOpenKdenliveExport}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Export Kdenlive MLT & 4K</span>
            </button>
          </div>
        </div>

        {/* Timeline Tracks */}
        <div className="space-y-3">
          {timeline.map((seg, idx) => (
            <div
              key={seg.id}
              className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-300 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>

                <div className="w-16 h-10 rounded overflow-hidden bg-slate-950 shrink-0">
                  <img src={seg.asset.thumbnailUrl} alt={seg.asset.fileName} className="w-full h-full object-cover" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 font-mono">{seg.asset.fileName}</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-100 text-indigo-800">
                      {seg.track}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-3">
                    <span>Duration: {seg.durationSec}s</span>
                    <span>Transition: <strong className="text-slate-700 uppercase">{seg.transition}</strong></span>
                    <span>Resolution: {seg.asset.resolution}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <span className="text-[11px] text-slate-400 font-mono bg-white px-2.5 py-1 rounded border border-slate-200">
                  {seg.notes}
                </span>

                <div className="flex items-center border border-slate-200 rounded bg-white overflow-hidden">
                  <button
                    onClick={() => moveSegment(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 hover:bg-slate-100 transition-colors"
                    title="Move Clip Up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveSegment(idx, 'down')}
                    disabled={idx === timeline.length - 1}
                    className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 hover:bg-slate-100 transition-colors border-l border-slate-200"
                    title="Move Clip Down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => removeSegment(seg.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                  title="Remove segment from timeline"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {timeline.length === 0 && (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-2">
              <Layers className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-600">The Story Forge timeline is currently empty.</p>
              <p className="text-xs text-slate-400">Click "Auto-Assemble by Vibe" or add clips from the Drive Auditor.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
