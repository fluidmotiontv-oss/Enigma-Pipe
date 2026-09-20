import React, { useState } from 'react';
import { HardDrive, Search, Film, Tag, Sparkles, RefreshCw, FolderSearch, CheckCircle2, Zap, AlertTriangle, Play, Music, Flame, Wand2, Archive, Check, Radio } from 'lucide-react';
import { MediaAsset, ClipVoteState } from '../types';

interface DriveAuditorProps {
  assets: MediaAsset[];
  onScanNewFolder: (folderPath: string) => void;
  onAddToTimeline: (asset: MediaAsset) => void;
  onRoastAsset: (asset: MediaAsset) => void;
  isScanning: boolean;
}

export const DriveAuditor: React.FC<DriveAuditorProps> = ({
  assets,
  onScanNewFolder,
  onAddToTimeline,
  onRoastAsset,
  isScanning
}) => {
  const [targetFolder, setTargetFolder] = useState('/home/tim/Videos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [selectedMood, setSelectedMood] = useState<string>('ALL');
  const [selectedResolution, setSelectedResolution] = useState<string>('ALL');

  // 3-Way Sorter Votes
  const [votes, setVotes] = useState<Record<string, 'use' | 'transform' | 'archive'>>({});
  const [transformedClips, setTransformedClips] = useState<Record<string, string>>({});

  const handleVote = (assetId: string, vote: 'use' | 'transform' | 'archive', asset: MediaAsset) => {
    setVotes(prev => ({ ...prev, [assetId]: vote }));

    if (vote === 'use') {
      onAddToTimeline(asset);
    } else if (vote === 'transform') {
      const transforms = ['Cyberpunk 4K Speed Ramp', 'Wes Anderson Color LUT', 'Strobe Glitch Remix', 'Sovereign 120fps AI Upscale'];
      const chosen = transforms[Math.floor(Math.random() * transforms.length)];
      setTransformedClips(prev => ({ ...prev, [assetId]: chosen }));
    } else if (vote === 'archive') {
      onRoastAsset(asset);
    }
  };

  const filteredAssets = assets.filter((asset) => {
    if (selectedTag !== 'ALL' && asset.aiTag !== selectedTag) return false;
    if (selectedMood !== 'ALL' && asset.audioMood !== selectedMood) return false;
    if (selectedResolution !== 'ALL' && asset.resolution !== selectedResolution) return false;

    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      asset.fileName.toLowerCase().includes(q) ||
      asset.filePath.toLowerCase().includes(q) ||
      asset.aiTag.toLowerCase().includes(q) ||
      asset.directorVibe.toLowerCase().includes(q)
    );
  });

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetFolder.trim()) {
      onScanNewFolder(targetFolder.trim());
    }
  };

  const useCount = Object.values(votes).filter(v => v === 'use').length;
  const transformCount = Object.values(votes).filter(v => v === 'transform').length;
  const archiveCount = Object.values(votes).filter(v => v === 'archive').length;

  return (
    <div className="space-y-6">
      {/* Drive Audit Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Local Storage Auditor</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-indigo-600" />
            <span>Sovereign Drive & Asset Auditor</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Recursively scanning drive mount points for raw footage, FFmpeg scene changes, audio waveforms & 4K broadcast clips.
          </p>
        </div>

        {/* Scan Directory Form */}
        <form onSubmit={handleScanSubmit} className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <FolderSearch className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={targetFolder}
              onChange={(e) => setTargetFolder(e.target.value)}
              placeholder="/home/tim/Videos"
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={isScanning}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Auditing Drive...' : 'Audit Drive'}</span>
          </button>
        </form>
      </div>

      {/* 🗳️ The 3-Way Sorter + Void Vote Scoreboard */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Clip Governance</span>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <span>🗳️ Sovereign 3-Way Sorter & Void Vote Scoreboard</span>
          </h3>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
            <span>Timeline Use: <strong className="text-emerald-400 font-bold">{useCount}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <Wand2 className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Transform: <strong className="text-purple-400 font-bold">{transformCount}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <Archive className="w-3.5 h-3.5 text-rose-400" />
            <span>Void Archive: <strong className="text-rose-400 font-bold">{archiveCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-slate-200">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search footage, codecs, tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 text-slate-200 text-xs rounded-lg pl-9 pr-3 py-2 border border-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end text-xs">
          {/* AI Tag Selector */}
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="bg-slate-950 text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
          >
            <option value="ALL">All AI Tags</option>
            <option value="DRONE-GOLD">DRONE-GOLD</option>
            <option value="A-ROLL-INTERVIEW">A-ROLL-INTERVIEW</option>
            <option value="CYBERPUNK-NIGHT">CYBERPUNK-NIGHT</option>
            <option value="B-ROLL-NATURE">B-ROLL-NATURE</option>
            <option value="CHAOS-STREET">CHAOS-STREET</option>
            <option value="404-TRASH">404-TRASH</option>
          </select>

          {/* Mood Selector */}
          <select
            value={selectedMood}
            onChange={(e) => setSelectedMood(e.target.value)}
            className="bg-slate-950 text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Audio Moods</option>
            <option value="cinematic">Cinematic</option>
            <option value="aggressive">Aggressive</option>
            <option value="chill">Chill</option>
            <option value="ambient">Ambient</option>
            <option value="hype">Hype</option>
          </select>

          {/* Resolution Selector */}
          <select
            value={selectedResolution}
            onChange={(e) => setSelectedResolution(e.target.value)}
            className="bg-slate-950 text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
          >
            <option value="ALL">All Resolutions</option>
            <option value="3840x2160">3840x2160 (4K)</option>
            <option value="1920x1080">1920x1080 (FHD)</option>
            <option value="1280x720">1280x720 (HD)</option>
          </select>
        </div>
      </div>

      {/* Asset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssets.map((asset) => {
          const vote = votes[asset.id];
          const transformLabel = transformedClips[asset.id];

          return (
            <div
              key={asset.id}
              className={`bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group ${
                vote === 'archive' ? 'opacity-60 border-rose-300 bg-rose-50/20' :
                vote === 'transform' ? 'border-purple-300 bg-purple-50/20' :
                vote === 'use' ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200'
              }`}
            >
              {/* Thumbnail Header */}
              <div className="relative aspect-video bg-slate-950 overflow-hidden">
                <img
                  src={asset.thumbnailUrl}
                  alt={asset.fileName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30"></div>

                {/* Top Badges */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white font-mono shadow ${
                    asset.resolution === '3840x2160' ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}>
                    {asset.resolution === '3840x2160' ? '4K BROADCAST' : asset.resolution}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900/80 text-slate-200 font-mono backdrop-blur-sm">
                    {asset.fps} FPS
                  </span>
                </div>

                {/* AI Tag */}
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono tracking-tight shadow ${
                    asset.aiTag === 'DRONE-GOLD' ? 'bg-amber-500 text-white' :
                    asset.aiTag === 'A-ROLL-INTERVIEW' ? 'bg-indigo-600 text-white' :
                    asset.aiTag === 'CYBERPUNK-NIGHT' ? 'bg-purple-600 text-white' :
                    asset.aiTag === '404-TRASH' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-200'
                  }`}>
                    {asset.aiTag}
                  </span>
                </div>

                {/* Bottom Thumbnail Overlay info */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[11px] font-mono">
                  <span className="bg-slate-950/80 px-2 py-0.5 rounded backdrop-blur-sm">⏱ {asset.duration}</span>
                  <span className="bg-slate-950/80 px-2 py-0.5 rounded backdrop-blur-sm">💾 {asset.fileSize}</span>
                </div>
              </div>

              {/* Asset Metadata Info */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs font-mono truncate" title={asset.filePath}>
                    {asset.fileName}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                    {asset.filePath}
                  </p>
                  {transformLabel && (
                    <div className="mt-1.5 px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 rounded text-[10px] font-bold font-mono">
                      ✨ AI Transform: {transformLabel}
                    </div>
                  )}
                </div>

                {/* Audio & Motion Stats */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px]">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Motion Energy</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full"
                          style={{ width: `${Math.round(asset.motionEnergy * 100)}%` }}
                        ></div>
                      </div>
                      <span className="font-mono text-slate-700 text-[10px] font-bold">
                        {Math.round(asset.motionEnergy * 100)}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Audio Vibe</span>
                    <div className="flex items-center gap-1 text-slate-800 font-bold capitalize mt-0.5">
                      <Music className="w-3 h-3 text-indigo-500 shrink-0" />
                      <span>{asset.audioMood}</span>
                      {asset.bpm > 0 && <span className="text-[10px] text-slate-400 font-mono">({asset.bpm} BPM)</span>}
                    </div>
                  </div>
                </div>

                {/* 3-Way Sorter Controls */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    3-Way Sorter Vote
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => handleVote(asset.id, 'use', asset)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                        vote === 'use'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                      title="Use in Story Forge timeline"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Use</span>
                    </button>

                    <button
                      onClick={() => handleVote(asset.id, 'transform', asset)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                        vote === 'transform'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                      }`}
                      title="Transform with AI Remix / LUT"
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>Remix</span>
                    </button>

                    <button
                      onClick={() => handleVote(asset.id, 'archive', asset)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                        vote === 'archive'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      }`}
                      title="Archive to Sovereign Cold Storage"
                    >
                      <Archive className="w-3 h-3" />
                      <span>Void</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredAssets.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white border border-slate-200 rounded-xl space-y-2">
            <Film className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No media assets match the active filters.</p>
            <p className="text-xs text-slate-400">Try running 'Audit Drive' on a folder like /home/tim/Videos.</p>
          </div>
        )}
      </div>
    </div>
  );
};
