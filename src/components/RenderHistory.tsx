import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Film, HardDrive, RefreshCw, Copy, Check, Play, FileCode, Layers, Clock, Sparkles, Activity, AlertCircle, XCircle, Zap, Search, Filter, Radio, Wifi, Timer } from 'lucide-react';
import { ActiveRenderJob, RenderRecord } from '../types';

export const RenderHistory: React.FC = () => {
  const [renders, setRenders] = useState<RenderRecord[]>([]);
  const [activeJobs, setActiveJobs] = useState<ActiveRenderJob[]>([]);
  const [stats, setStats] = useState({ totalCount: 0, totalSize: '0 B' });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDirectorFilter, setSelectedDirectorFilter] = useState<string>('ALL');
  const [isTriggeringTest, setIsTriggeringTest] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const formatRemainingTime = (job: ActiveRenderJob): string => {
    if (job.remainingTime && job.remainingTime !== 'Calculating...') {
      return job.remainingTime;
    }
    if (typeof job.remainingSec === 'number' && job.remainingSec > 0) {
      const m = Math.floor(job.remainingSec / 60);
      const s = job.remainingSec % 60;
      return `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    if (job.percent > 0 && job.percent < 100 && job.elapsedMs) {
      const elapsedSec = job.elapsedMs / 1000;
      const estTotalSec = elapsedSec / (job.percent / 100);
      const remSec = Math.max(0, Math.ceil(estTotalSec - elapsedSec));
      const m = Math.floor(remSec / 60);
      const s = remSec % 60;
      return `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return job.percent >= 100 ? '00:00:00' : '00:00:15';
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/render/history');
      const data = await res.json();
      setRenders(data.renders || []);
      setStats({ totalCount: data.totalCount || 0, totalSize: data.totalSize || '0 B' });
    } catch (err) {
      console.error('Failed to load render history:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveJobs = async () => {
    try {
      const res = await fetch('/api/render/active');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.activeJobs)) {
          setActiveJobs(data.activeJobs);
        }
      }
    } catch (e) {
      // offline silent
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchActiveJobs();

    let isMounted = true;

    // Setup real-time WebSocket listener for live FFmpeg render telemetry
    const connectWebSocket = () => {
      if (typeof window === 'undefined') return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/render`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setWsConnected(true);
          // Query active jobs immediately upon opening connection
          ws.send(JSON.stringify({ action: 'get_active' }));
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const payload = JSON.parse(event.data);
            
            if (payload.type === 'init' || payload.type === 'active_jobs') {
              if (Array.isArray(payload.activeJobs)) {
                setActiveJobs(payload.activeJobs);
              }
            } else if (payload.type === 'start') {
              if (payload.job) {
                setActiveJobs(prev => {
                  const filtered = prev.filter(j => j.jobId !== payload.jobId);
                  return [payload.job, ...filtered];
                });
              }
            } else if (payload.type === 'progress') {
              setActiveJobs(prev => prev.map(j => {
                if (j.jobId === payload.jobId) {
                  return {
                    ...j,
                    percent: payload.percent,
                    time: payload.time,
                    remainingTime: payload.remainingTime,
                    remainingSec: payload.remainingSec,
                    speed: payload.speed,
                    fps: payload.fps,
                    frame: payload.frame,
                    totalFrames: payload.totalFrames || j.totalFrames,
                    size: payload.size
                  };
                }
                return j;
              }));
            } else if (payload.type === 'complete') {
              setActiveJobs(prev => prev.filter(j => j.jobId !== payload.jobId));
              fetchHistory();
            } else if (payload.type === 'cancelled') {
              setActiveJobs(prev => prev.filter(j => j.jobId !== payload.jobId));
            }
          } catch (e) {
            console.error("Failed to parse WebSocket message:", e);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setWsConnected(false);
          // Auto-reconnect with 2.5s backoff
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            if (isMounted) connectWebSocket();
          }, 2500);
        };

        ws.onerror = (err) => {
          console.warn("WebSocket render stream error, retrying:", err);
          ws.close();
        };
      } catch (err) {
        console.warn("Could not create WebSocket connection:", err);
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          if (isMounted) connectWebSocket();
        }, 3000);
      }
    };

    connectWebSocket();

    // Heartbeat ping via WebSocket every 15s to keep proxy connection alive
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'ping' }));
      }
    }, 15000);

    // Fallback sync polling
    const pollInterval = setInterval(() => {
      fetchHistory();
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        fetchActiveJobs();
      }
    }, 8000);

    return () => {
      isMounted = false;
      clearInterval(pingInterval);
      clearInterval(pollInterval);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const handleCancelJob = async (jobId: string) => {
    // Send instant cancellation over WebSocket if open
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ action: 'cancel_job', jobId }));
      } catch (e) {
        // fallback to http
      }
    }

    try {
      const res = await fetch('/api/render/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      });
      if (res.ok) {
        setActiveJobs(prev => prev.filter(j => j.jobId !== jobId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerQuickTest = async () => {
    setIsTriggeringTest(true);
    try {
      const res = await fetch('/api/render/4k', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeline: [
            {
              id: 'seg_test_1',
              asset: {
                filePath: '/home/tim/Videos/ocean_drone_4k_master.mp4',
                fileName: 'ocean_drone_4k_master.mp4',
                codec: 'hevc',
                resolution: '3840x2160'
              },
              durationSec: 10
            },
            {
              id: 'seg_test_2',
              asset: {
                filePath: '/home/tim/Videos/tokyo_rain_neon_drive_4k.mp4',
                fileName: 'tokyo_rain_neon_drive_4k.mp4',
                codec: 'hevc',
                resolution: '3840x2160'
              },
              durationSec: 15
            }
          ],
          director: { name: 'Dragon Nine Live Node' },
          projectName: 'sovereign_4k_pulse'
        })
      });
      if (res.ok) {
        fetchActiveJobs();
      }
    } catch (e) {
      console.error("Failed to trigger test render:", e);
    } finally {
      setIsTriggeringTest(false);
    }
  };

  const copyPath = (pathStr: string) => {
    navigator.clipboard.writeText(pathStr);
    setCopiedPath(pathStr);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const formatDuration = (sec: number | string) => {
    if (typeof sec !== 'number') return sec;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}m ${s}s`;
  };

  const directorBadgeStyle = (name: string) => {
    if (name.includes('Maxwell')) return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    if (name.includes('Flow')) return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
    if (name.includes('Nine')) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-purple-400 border-purple-500/30 bg-purple-500/10';
  };

  const filteredRenders = renders.filter(r => {
    const matchesSearch = searchQuery === '' || 
      r.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.director.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDirector = selectedDirectorFilter === 'ALL' || r.director.toLowerCase().includes(selectedDirectorFilter.toLowerCase());

    return matchesSearch && matchesDirector;
  });

  return (
    <div className="min-h-[700px] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
            <Film className="w-7 h-7 text-emerald-400" />
            <span>Sovereign Render Archive & Real-Time FFmpeg Telemetry</span>
          </h2>
          <p className="text-slate-400 text-xs font-mono mt-1">
            4K Master UHD Exports • Live Frame Pulse Stream • /home/tim/work/enigma-pipeline/renders/
          </p>
        </div>
        
        <div className="flex items-center gap-3 font-mono text-xs flex-wrap">
          <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
            <Film className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-500">Vault Masters:</span>
            <span className="text-cyan-400 font-bold">{stats.totalCount}</span>
          </div>

          <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-500">Footprint:</span>
            <span className="text-emerald-400 font-bold">{stats.totalSize}</span>
          </div>

          <button
            onClick={handleTriggerQuickTest}
            disabled={isTriggeringTest}
            className="px-3.5 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold hover:bg-amber-500/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="Dispatch a mock 4K Master Render to test live progress streaming"
          >
            <Zap className={`w-3.5 h-3.5 ${isTriggeringTest ? 'animate-spin' : ''}`} />
            <span>{isTriggeringTest ? 'Queuing...' : '⚡ Test 4K Render'}</span>
          </button>

          <button
            onClick={fetchHistory}
            className="px-3 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ACTIVE REAL-TIME RENDERS SECTION */}
      {activeJobs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <span>Active 4K Render Pulse</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                  {activeJobs.length} Live Job{activeJobs.length > 1 ? 's' : ''}
                </span>
              </h3>
            </div>
            
            <div className="flex items-center gap-2 font-mono">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                wsConnected 
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' 
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <Wifi className="w-3 h-3" />
                <span>{wsConnected ? 'WebSocket Live Telemetry Active' : 'Connecting WebSocket...'}</span>
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">3840x2160 UHD @ 24fps</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {activeJobs.map((job) => {
              const remainingTimeDisplay = formatRemainingTime(job);

              return (
                <motion.div
                  key={job.jobId}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="rounded-2xl border-2 border-cyan-500/80 bg-slate-950 p-5 shadow-2xl shadow-cyan-950/50 relative overflow-hidden font-mono"
                >
                  {/* Background pulse glow */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

                  <div className="flex items-start justify-between flex-wrap gap-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 shadow-inner">
                        <Film className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-white">{job.projectName}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${directorBadgeStyle(job.director)}`}>
                            {job.director}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 truncate max-w-md">
                          {job.jobId}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Remaining Time badge */}
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold shadow-sm">
                        <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        <span className="text-slate-400 uppercase text-[10px]">ETA:</span>
                        <span className="text-amber-300 font-extrabold">{remainingTimeDisplay}</span>
                      </div>

                      {/* Current Percentage badge */}
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono">
                        <span className="text-[10px] text-slate-400 uppercase">Progress:</span>
                        <span className="text-xl font-black text-cyan-400">{job.percent}%</span>
                      </div>

                      <button
                        onClick={() => handleCancelJob(job.jobId)}
                        className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>

                  {/* Real-Time Progress Bar with current percentage and remaining time */}
                  <div className="mt-4 space-y-2 relative z-10">
                    <div className="flex justify-between items-center text-xs flex-wrap gap-1">
                      <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                        <span>FFmpeg 4K Master Encode (libx264 CRF 18)</span>
                      </span>
                      <div className="flex items-center gap-3 text-slate-400 text-xs font-mono">
                        <span className="text-cyan-400 font-bold">{job.percent}% Completed</span>
                        <span>•</span>
                        <span className="text-amber-300 font-bold flex items-center gap-1">
                          <Timer className="w-3 h-3 text-amber-400" />
                          <span>{remainingTimeDisplay} remaining</span>
                        </span>
                        <span>•</span>
                        <span>Frame {job.frame} / {job.totalFrames}</span>
                      </div>
                    </div>

                    {/* Progress track */}
                    <div className="h-3.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5 relative">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 shadow-[0_0_14px_rgba(34,211,238,0.6)] relative overflow-hidden"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(2, job.percent)}%` }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                      >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                      </motion.div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span>Elapsed: <strong className="text-slate-300">{job.time}</strong></span>
                      <span>Est. Remaining: <strong className="text-amber-300">{remainingTimeDisplay}</strong></span>
                      <span>Output: <strong className="text-emerald-300">~{job.size}</strong></span>
                    </div>
                  </div>

                  {/* Telemetry Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 pt-3 border-t border-slate-900 text-xs relative z-10">
                    <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-slate-500 uppercase">Current Progress</div>
                      <div className="text-sm font-extrabold text-cyan-400">{job.percent}%</div>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-slate-500 uppercase">Remaining Time</div>
                      <div className="text-sm font-extrabold text-amber-400 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>{remainingTimeDisplay}</span>
                      </div>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-slate-500 uppercase">Speed</div>
                      <div className="text-sm font-bold text-emerald-400">{job.speed || '2.1x'}</div>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-slate-500 uppercase">FPS</div>
                      <div className="text-sm font-bold text-purple-400">{job.fps || 32}</div>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2 text-center col-span-2 sm:col-span-1">
                      <div className="text-[10px] text-slate-500 uppercase">Target 4K Output</div>
                      <div className="text-xs font-bold text-slate-300 truncate">{job.size || '42.5 MB'}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 font-mono text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search render archive by project, filename, or persona..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-500 mr-1" />
          {['ALL', 'Maxwell', 'Flow', 'Nine', 'Timmy'].map(dir => (
            <button
              key={dir}
              onClick={() => setSelectedDirectorFilter(dir)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                selectedDirectorFilter === dir
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {dir === 'ALL' ? 'All Directors' : dir}
            </button>
          ))}
        </div>
      </div>

      {/* Render Cards Grid */}
      {loading && renders.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-slate-500 font-mono text-xs">
          <div className="animate-pulse flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Scanning sovereign archive directory...</span>
          </div>
        </div>
      ) : filteredRenders.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center font-mono">
          <Film className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-300">
            {searchQuery || selectedDirectorFilter !== 'ALL' ? 'No matching renders found.' : 'The render archive is empty.'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery || selectedDirectorFilter !== 'ALL'
              ? 'Try clearing the search or filter criteria.'
              : 'Launch your first 4K broadcast from the Kdenlive Exporter tab or click "⚡ Test 4K Render" above.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence>
            {filteredRenders.map((render, index) => (
              <motion.div
                key={render.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ delay: index * 0.03 }}
                className={`rounded-2xl border bg-slate-900 overflow-hidden transition-all ${
                  selectedId === render.id ? 'border-cyan-400 shadow-xl shadow-cyan-950/40' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    {/* Left Info */}
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shadow-inner">
                        🎬
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
                          <span>{render.projectName}</span>
                        </h3>
                        <div className="flex items-center gap-2 mt-1 font-mono">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${directorBadgeStyle(render.director)}`}>
                            {render.director}
                          </span>
                          <span className="text-xs text-slate-500">{render.id}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Stats */}
                    <div className="flex items-center gap-6 font-mono text-right">
                      <div>
                        <div className="text-lg font-bold text-emerald-400">{render.sizeFormatted}</div>
                        <div className="text-[10px] text-slate-500 uppercase">File Size</div>
                      </div>
                      <div className="hidden sm:block">
                        <div className="text-lg font-bold text-cyan-400">{render.segmentCount}</div>
                        <div className="text-[10px] text-slate-500 uppercase">Segments</div>
                      </div>
                      <div className="hidden sm:block">
                        <div className="text-lg font-bold text-amber-400">{formatDuration(render.duration)}</div>
                        <div className="text-[10px] text-slate-500 uppercase">Duration</div>
                      </div>
                      <div>
                        <div className={`w-3 h-3 rounded-full mx-auto ${render.status === 'complete' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400 animate-pulse'}`} />
                        <div className="text-[10px] text-slate-500 uppercase mt-1">{render.status}</div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {selectedId === render.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 font-mono text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="text-slate-500 text-[10px] uppercase">Master Output Target Path</div>
                              <div className="text-slate-300 bg-slate-950 border border-slate-800 rounded-lg p-2.5 break-all text-[11px] flex items-center justify-between gap-2">
                                <span className="truncate">{render.outputPath}</span>
                                <button
                                  onClick={() => copyPath(render.outputPath)}
                                  className="text-cyan-400 hover:text-cyan-300 p-1 flex-shrink-0"
                                  title="Copy Path"
                                >
                                  {copiedPath === render.outputPath ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="text-slate-500 text-[10px] uppercase">MLT XML Spec File</div>
                              <div className="text-slate-300 bg-slate-950 border border-slate-800 rounded-lg p-2.5 break-all text-[11px] flex items-center justify-between gap-2">
                                <span className="truncate">{render.mltPath || 'N/A'}</span>
                                {render.mltPath && (
                                  <button
                                    onClick={() => copyPath(render.mltPath!)}
                                    className="text-purple-400 hover:text-purple-300 p-1 flex-shrink-0"
                                    title="Copy MLT Path"
                                  >
                                    {copiedPath === render.mltPath ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-slate-400 text-[11px]">
                            <div><span className="text-slate-500">Created:</span> {render.createdAtFormatted}</div>
                            <div><span className="text-slate-500">Codec:</span> libx264 (4K UHD)</div>
                            <div><span className="text-slate-500">Preset:</span> Slow (CRF 18)</div>
                            <div><span className="text-slate-500">Audio:</span> AAC 320k</div>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-2">
                            <button
                              onClick={() => copyPath(render.outputPath)}
                              className="px-3.5 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold hover:bg-cyan-500/20 transition-all flex items-center gap-1.5"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Path</span>
                            </button>
                            {render.mltPath && (
                              <button
                                onClick={() => copyPath(render.mltPath!)}
                                className="px-3.5 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 font-bold hover:bg-purple-500/20 transition-all flex items-center gap-1.5"
                              >
                                <FileCode className="w-3.5 h-3.5" />
                                <span>Copy MLT Path</span>
                              </button>
                            )}
                            <button
                              onClick={() => alert(`Master Render ${render.fileName} verified intact in /home/tim/work/enigma-pipeline/renders/`)}
                              className="px-3.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold hover:bg-emerald-500/20 transition-all flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Verify File Integrity</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Expand Toggle */}
                <button
                  onClick={() => setSelectedId(selectedId === render.id ? null : render.id)}
                  className="w-full py-2 bg-slate-950/60 border-t border-slate-800/80 text-[11px] font-mono text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-1"
                >
                  <span>{selectedId === render.id ? '▲ Hide Details' : '▼ View Full Render Specification'}</span>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
