import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Archive, Wand2, CheckCircle2, AlertOctagon, BarChart3, PieChart, FileSpreadsheet, Sparkles, RefreshCw, Layers, Download, Check } from 'lucide-react';
import { MediaAsset, DirectorPersona } from '../types';

interface VoidGovernanceProps {
  assets: MediaAsset[];
  onAddToTimeline: (asset: MediaAsset) => void;
  onRoastAsset: (asset: MediaAsset) => void;
}

export const VoidGovernance: React.FC<VoidGovernanceProps> = ({
  assets,
  onAddToTimeline,
  onRoastAsset
}) => {
  // Sorter State
  const [sorterVotes, setSorterVotes] = useState<Record<string, 'use' | 'transform' | 'archive'>>({
    asset_1: 'use',
    asset_2: 'transform',
    asset_3: 'archive',
    asset_4: 'use',
    asset_5: 'archive'
  });

  const [activeTabFilter, setActiveTabFilter] = useState<'ALL' | 'use' | 'transform' | 'archive'>('ALL');
  const [exportNotice, setExportNotice] = useState(false);

  const handleVote = (assetId: string, vote: 'use' | 'transform' | 'archive') => {
    setSorterVotes(prev => ({ ...prev, [assetId]: vote }));
  };

  const totalAssets = assets.length;
  const useCount = Object.values(sorterVotes).filter(v => v === 'use').length;
  const transformCount = Object.values(sorterVotes).filter(v => v === 'transform').length;
  const archiveCount = Object.values(sorterVotes).filter(v => v === 'archive').length;
  const unclassifiedCount = Math.max(0, totalAssets - (useCount + transformCount + archiveCount));

  const usePct = totalAssets ? Math.round((useCount / totalAssets) * 100) : 0;
  const transformPct = totalAssets ? Math.round((transformCount / totalAssets) * 100) : 0;
  const archivePct = totalAssets ? Math.round((archiveCount / totalAssets) * 100) : 0;
  const unclassifiedPct = Math.max(0, 100 - (usePct + transformPct + archivePct));

  const filteredAssets = assets.filter(asset => {
    if (activeTabFilter === 'ALL') return true;
    return sorterVotes[asset.id] === activeTabFilter;
  });

  const handleExportGovernanceReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalAssets,
        useCount,
        transformCount,
        archiveCount,
        unclassifiedCount,
        governanceScore: `${Math.round(((useCount + transformCount) / Math.max(1, totalAssets)) * 100)}%`
      },
      ledger: assets.map(a => ({
        id: a.id,
        fileName: a.fileName,
        resolution: a.resolution,
        aiTag: a.aiTag,
        governanceDecision: sorterVotes[a.id] || 'unclassified'
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `void_governance_report_${Date.now()}.json`;
    link.click();

    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">Storage Governance Engine</span>
          </div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-cyan-400" />
            <span>Void Governance Analytics Scoreboard</span>
          </h2>
          <p className="text-slate-400 text-xs font-mono mt-1">
            Real-time classification audit, 3-Way Sorter governance ratios, and media recycling compliance.
          </p>
        </div>

        <button
          onClick={handleExportGovernanceReport}
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs font-mono transition-all flex items-center gap-2 shadow-lg shadow-cyan-900/30"
        >
          <Download className="w-4 h-4" />
          <span>Export Governance Ledger JSON</span>
        </button>
      </div>

      {exportNotice && (
        <div className="bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-mono p-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Governance Report JSON exported successfully.</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase">1. Broadcast Use</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400">{useCount}</div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">{usePct}% of total Vault</div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${usePct}%` }} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase">2. AI Transform</span>
            <Wand2 className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-amber-400">{transformCount}</div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">{transformPct}% flagged for FX</div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-amber-500" style={{ width: `${transformPct}%` }} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase">3. Void / Archive</span>
            <Archive className="w-5 h-5 text-rose-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-rose-400">{archiveCount}</div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">{archivePct}% sent to Void</div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-rose-500" style={{ width: `${archivePct}%` }} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase">Unclassified</span>
            <AlertOctagon className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-indigo-400">{unclassifiedCount}</div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">{unclassifiedPct}% awaiting audit</div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-indigo-500" style={{ width: `${unclassifiedPct}%` }} />
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Distribution Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              <span>Vault Asset Governance Breakdown</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">{totalAssets} Scanned Clips</span>
          </div>

          {/* Stacked Progress Visualizer Bar */}
          <div className="space-y-2">
            <div className="w-full h-6 bg-slate-950 rounded-lg overflow-hidden flex border border-slate-800">
              <div className="bg-emerald-500 h-full transition-all" style={{ width: `${usePct}%` }} title={`Use: ${usePct}%`} />
              <div className="bg-amber-500 h-full transition-all" style={{ width: `${transformPct}%` }} title={`Transform: ${transformPct}%`} />
              <div className="bg-rose-500 h-full transition-all" style={{ width: `${archivePct}%` }} title={`Archive: ${archivePct}%`} />
              <div className="bg-indigo-600 h-full transition-all" style={{ width: `${unclassifiedPct}%` }} title={`Unclassified: ${unclassifiedPct}%`} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-slate-300">Use ({usePct}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-500" />
                <span className="text-slate-300">Transform ({transformPct}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-rose-500" />
                <span className="text-slate-300">Void ({archivePct}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-indigo-600" />
                <span className="text-slate-300">Pending ({unclassifiedPct}%)</span>
              </div>
            </div>
          </div>

          {/* Governance Efficiency Metric */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-slate-400">Governance Yield Index</div>
              <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                {Math.round(((useCount + transformCount) / Math.max(1, totalAssets)) * 100)}% Usable Pipeline Yield
              </div>
            </div>
            <div className="text-right font-mono text-xs text-slate-500">
              <div>Recycling Standard: <span className="text-cyan-400 font-bold">SOVEREIGN-9</span></div>
              <div>Compliance: <span className="text-emerald-400 font-bold">100% PASSED</span></div>
            </div>
          </div>
        </div>

        {/* AI Directors Commentary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
          <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>AI Director Governance Review</span>
          </h3>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-slate-950 border border-amber-500/30">
              <div className="text-amber-400 font-bold mb-1">Mad Maxwell (Chaos)</div>
              <p className="text-slate-400">
                "{archiveCount} clips sent to Void is weak. We need MORE chaos! Transform those interview clips with a 120fps strobe glitch!"
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-cyan-500/30">
              <div className="text-cyan-400 font-bold mb-1">Mist Flow (Zen)</div>
              <p className="text-slate-400">
                "The {useCount} approved broadcast assets maintain flawless temporal rhythm. Let the rest dissolve softly."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Governance Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            <span>Storage Classification Ledger</span>
          </h3>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={() => setActiveTabFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg border transition-all ${activeTabFilter === 'ALL' ? 'bg-slate-800 border-cyan-400 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
            >
              All ({assets.length})
            </button>
            <button
              onClick={() => setActiveTabFilter('use')}
              className={`px-3 py-1.5 rounded-lg border transition-all ${activeTabFilter === 'use' ? 'bg-emerald-950 border-emerald-500 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
            >
              Use ({useCount})
            </button>
            <button
              onClick={() => setActiveTabFilter('transform')}
              className={`px-3 py-1.5 rounded-lg border transition-all ${activeTabFilter === 'transform' ? 'bg-amber-950 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
            >
              Transform ({transformCount})
            </button>
            <button
              onClick={() => setActiveTabFilter('archive')}
              className={`px-3 py-1.5 rounded-lg border transition-all ${activeTabFilter === 'archive' ? 'bg-rose-950 border-rose-500 text-rose-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
            >
              Void ({archiveCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">File / Asset Path</th>
                <th className="p-3">Resolution & Codec</th>
                <th className="p-3">AI Tag</th>
                <th className="p-3">Classification</th>
                <th className="p-3 text-right">Quick Governance Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 text-slate-300">
              {filteredAssets.map(asset => {
                const vote = sorterVotes[asset.id];
                return (
                  <tr key={asset.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-white truncate max-w-xs">{asset.fileName}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-xs">{asset.filePath}</div>
                    </td>
                    <td className="p-3 text-slate-400">
                      <div>{asset.resolution} • {asset.fps}fps</div>
                      <div className="text-[10px] text-slate-500 uppercase">{asset.codec}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700 text-[10px]">
                        {asset.aiTag}
                      </span>
                    </td>
                    <td className="p-3">
                      {vote === 'use' && (
                        <span className="px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> USE (TIMELINE)
                        </span>
                      )}
                      {vote === 'transform' && (
                        <span className="px-2 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[10px] flex items-center gap-1 w-fit">
                          <Wand2 className="w-3 h-3" /> TRANSFORM (FX)
                        </span>
                      )}
                      {vote === 'archive' && (
                        <span className="px-2 py-1 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-[10px] flex items-center gap-1 w-fit">
                          <Archive className="w-3 h-3" /> VOID (ARCHIVE)
                        </span>
                      )}
                      {!vote && (
                        <span className="text-slate-500 text-[10px] italic">UNCLASSIFIED</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleVote(asset.id, 'use')}
                          className={`p-1.5 rounded transition-all ${vote === 'use' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-emerald-300'}`}
                          title="Classify as Use"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleVote(asset.id, 'transform')}
                          className={`p-1.5 rounded transition-all ${vote === 'transform' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-amber-300'}`}
                          title="Classify as Transform"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleVote(asset.id, 'archive')}
                          className={`p-1.5 rounded transition-all ${vote === 'archive' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-rose-300'}`}
                          title="Classify as Void"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
